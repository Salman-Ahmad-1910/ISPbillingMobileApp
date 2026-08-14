import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {HandCoins, Filter, Search, CheckCircle, ChevronDown, Printer} from 'lucide-react-native';
import {getPayments} from '../../api/billing';
import {getConnections} from '../../api/connections';
import ReportLayout, {KpiRow, KpiCard} from '../../components/ReportLayout';
import OptionPickerSheet from '../../components/OptionPickerSheet';
import SubscriberReportPrintModal, {PrintColumn} from '../../components/SubscriberReportPrintModal';

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const ACCENT: [string, string] = ['#14B8A6', '#059669'];

const MONTHS = [
  {value: '1', label: 'January'},
  {value: '2', label: 'February'},
  {value: '3', label: 'March'},
  {value: '4', label: 'April'},
  {value: '5', label: 'May'},
  {value: '6', label: 'June'},
  {value: '7', label: 'July'},
  {value: '8', label: 'August'},
  {value: '9', label: 'September'},
  {value: '10', label: 'October'},
  {value: '11', label: 'November'},
  {value: '12', label: 'December'},
];

const REPORT_OPTIONS = [
  {label: 'All', value: 'all'},
  {label: 'Paid', value: 'paid'},
  {label: 'Pending', value: 'pending'},
  {label: 'Overdue', value: 'overdue'},
];

const CONNECTION_OPTIONS = [
  {label: 'Both', value: 'both'},
  {label: 'Internet', value: 'internet'},
  {label: 'TV Cable', value: 'tv_cable'},
];

const SORT_OPTIONS = [
  {label: 'By Bill ID', value: 'bill_id'},
  {label: 'Receiving Date', value: 'receiving_date'},
];

interface MonthCollectionRecord {
  key: string;
  id: string;
  subscriberName: string;
  subscriberId: string;
  connectionId: string;
  billId: string;
  amount: number;
  generatedMonth: string;
  collectionMonth: string;
  collectionDate: string;
  address: string;
  sublocality: string;
  connectionType: string;
  collectedBy: string;
  status: string;
}

function formatDate(ts: string): string {
  if (!ts) {
    return '—';
  }
  const d = new Date(ts);
  if (isNaN(d.getTime())) {
    return ts;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function firstOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function MonthlyCollectionsScreen() {
  const [payments, setPayments] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [generatedMonth, setGeneratedMonth] = useState('');
  const [collectionMonth, setCollectionMonth] = useState('');
  const [reportType, setReportType] = useState('all');
  const [sublocality, setSublocality] = useState('all');
  const [connectionType, setConnectionType] = useState('both');
  const [selectedUser, setSelectedUser] = useState('all');
  const [sortBy, setSortBy] = useState('bill_id');

  const [generatedMonthPicker, setGeneratedMonthPicker] = useState(false);
  const [collectionMonthPicker, setCollectionMonthPicker] = useState(false);
  const [reportPicker, setReportPicker] = useState(false);
  const [sublocalityPicker, setSublocalityPicker] = useState(false);
  const [connectionPicker, setConnectionPicker] = useState(false);
  const [userPicker, setUserPicker] = useState(false);
  const [sortPicker, setSortPicker] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [payData, connData] = await Promise.all([getPayments(), getConnections()]);
      setPayments(payData as any[]);
      setConnections(connData as any[]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load collections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allRecords: MonthCollectionRecord[] = useMemo(
    () =>
      payments.map((p: any) => {
        const paymentDate = p.paymentDate || p.createdAt || p.created_at || '';
        const pm = paymentDate ? String(new Date(paymentDate).getMonth() + 1) : '';
        const conn = connections.find((c: any) => c.id === p.subscriberId);
        return {
          key: p.id,
          id: p.id,
          subscriberName: p.subscriberName || conn?.name || '',
          subscriberId: conn?.internetId || '',
          connectionId: p.subscriberId || p.connectionId || '',
          billId: String(p.billNo || '') || p.id?.slice(0, 8) || '',
          amount: Number(p.amount) || 0,
          generatedMonth: pm,
          collectionMonth: pm,
          collectionDate: paymentDate,
          address: p.address || conn?.address || '',
          sublocality: p.areaName || '',
          connectionType: conn?.connectionType || 'internet',
          collectedBy: p.collectedByName || '',
          status: 'paid',
        };
      }),
    [payments, connections],
  );

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => {
      if (r.sublocality) set.add(r.sublocality);
    });
    return Array.from(set);
  }, [allRecords]);

  const allUsers = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => {
      if (r.collectedBy) set.add(r.collectedBy);
    });
    return Array.from(set);
  }, [allRecords]);

  const sortedRecords = useMemo(() => {
    const sorted = [...allRecords];
    if (sortBy === 'bill_id') {
      sorted.sort((a, b) => a.billId.localeCompare(b.billId));
    } else if (sortBy === 'receiving_date') {
      sorted.sort((a, b) => new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime());
    }
    return sorted;
  }, [allRecords, sortBy]);

  const filteredData = useMemo(() => {
    return sortedRecords.filter(item => {
      if (generatedMonth && item.generatedMonth !== generatedMonth) return false;
      if (collectionMonth && item.collectionMonth !== collectionMonth) return false;
      if (reportType !== 'all' && item.status !== reportType) return false;
      if (sublocality !== 'all' && item.sublocality !== sublocality) return false;
      if (connectionType !== 'both' && item.connectionType !== connectionType) return false;
      if (selectedUser !== 'all' && item.collectedBy !== selectedUser) return false;

      const monthActive = !!generatedMonth || !!collectionMonth;
      const itemDate = new Date(item.collectionDate);
      const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
      const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
      if (monthActive) return true;
      if (from && !isNaN(from.getTime()) && itemDate < from) return false;
      if (to && !isNaN(to.getTime()) && itemDate > to) return false;
      return true;
    });
  }, [sortedRecords, generatedMonth, collectionMonth, reportType, sublocality, connectionType, selectedUser, fromDate, toDate]);

  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const printColumns: PrintColumn<MonthCollectionRecord>[] = [
    {header: '#', render: (_: MonthCollectionRecord, i: number) => i + 1},
    {header: 'Subscriber Name', render: item => item.subscriberName || '—'},
    {header: 'Bill ID', render: item => item.billId || '—'},
    {header: 'Amount (PKR)', align: 'right', render: item => item.amount.toLocaleString()},
    {header: 'Generated Month', render: item => MONTHS.find(m => m.value === item.generatedMonth)?.label || '—'},
    {header: 'Collection Month', render: item => MONTHS.find(m => m.value === item.collectionMonth)?.label || '—'},
    {header: 'Collection Date', render: item => formatDate(item.collectionDate)},
    {header: 'Address', render: item => item.address || '—'},
    {header: 'Sublocality', render: item => item.sublocality || '—'},
    {header: 'Connection Type', render: item => capitalize(item.connectionType)},
    {header: 'Collected By', render: item => item.collectedBy || '—'},
    {header: 'Status', render: item => capitalize(item.status)},
  ];

  const sublocalityOptions = allSublocalities.map(loc => ({label: loc, value: loc}));
  const userOptions = allUsers.map(user => ({label: user, value: user}));

  const resetFilters = () => {
    setFromDate(firstOfMonth());
    setToDate(today());
    setGeneratedMonth('');
    setCollectionMonth('');
    setReportType('all');
    setSublocality('all');
    setConnectionType('both');
    setSelectedUser('all');
    setSortBy('bill_id');
  };

  return (
    <ReportLayout
      title="Monthly Collections"
      subtitle="View and manage monthly collections"
      icon={HandCoins}
      accent={ACCENT}
      refreshing={refreshing}
      onRefresh={() => load(true)}>
      <KpiRow>
        <KpiCard label="Total Connections" value={filteredData.length} icon={HandCoins} bg="#CCFBF1" fg="#0D9488" />
        <KpiCard
          label="Total Amount"
          value={`PKR ${totalAmount.toLocaleString()}`}
          icon={CheckCircle}
          bg="#FEF3C7"
          fg="#D97706"
        />
      </KpiRow>

      <View style={styles.card}>
        <View style={styles.filterHeader}>
          <Filter size={15} color="#374151" />
          <Text style={styles.filterTitle}>Filters</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <View style={styles.filterField}>
            <Text style={styles.label}>From Date</Text>
            <TextInput
              style={styles.input}
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>To Date</Text>
            <TextInput
              style={styles.input}
              value={toDate}
              onChangeText={setToDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>Generated Month</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setGeneratedMonthPicker(true)}
              activeOpacity={0.85}>
              <Text style={[styles.selectText, !generatedMonth && styles.placeholder]}>
                {generatedMonth
                  ? MONTHS.find(m => m.value === generatedMonth)?.label || generatedMonth
                  : 'Select month'}
              </Text>
              <ChevronDown size={15} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>Collection Month</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setCollectionMonthPicker(true)}
              activeOpacity={0.85}>
              <Text style={[styles.selectText, !collectionMonth && styles.placeholder]}>
                {collectionMonth
                  ? MONTHS.find(m => m.value === collectionMonth)?.label || collectionMonth
                  : 'Select month'}
              </Text>
              <ChevronDown size={15} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>Report Type</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setReportPicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, reportType === 'all' && styles.placeholder]}>
                {REPORT_OPTIONS.find(o => o.value === reportType)?.label || reportType}
              </Text>
              <ChevronDown size={15} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>Sublocality</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setSublocalityPicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, sublocality === 'all' && styles.placeholder]} numberOfLines={1}>
                {sublocality === 'all'
                  ? 'All'
                  : sublocalityOptions.find(o => o.value === sublocality)?.label || sublocality}
              </Text>
              <ChevronDown size={15} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>Connection Type</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setConnectionPicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, connectionType === 'both' && styles.placeholder]}>
                {CONNECTION_OPTIONS.find(o => o.value === connectionType)?.label || connectionType}
              </Text>
              <ChevronDown size={15} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>Users</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setUserPicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, selectedUser === 'all' && styles.placeholder]} numberOfLines={1}>
                {selectedUser === 'all'
                  ? 'All'
                  : userOptions.find(o => o.value === selectedUser)?.label || selectedUser}
              </Text>
              <ChevronDown size={15} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>Sort By</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setSortPicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, sortBy === 'bill_id' && styles.placeholder]}>
                {SORT_OPTIONS.find(o => o.value === sortBy)?.label || sortBy}
              </Text>
              <ChevronDown size={15} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </ScrollView>
        <View style={styles.applyRow}>
          <TouchableOpacity style={styles.resetBtn} onPress={resetFilters} activeOpacity={0.85}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      <OptionPickerSheet
        visible={generatedMonthPicker}
        title="Select Generated Month"
        options={MONTHS}
        value={generatedMonth}
        emptyLabel="All Months"
        onSelect={setGeneratedMonth}
        onClose={() => setGeneratedMonthPicker(false)}
      />
      <OptionPickerSheet
        visible={collectionMonthPicker}
        title="Select Collection Month"
        options={MONTHS}
        value={collectionMonth}
        emptyLabel="All Months"
        onSelect={setCollectionMonth}
        onClose={() => setCollectionMonthPicker(false)}
      />
      <OptionPickerSheet
        visible={reportPicker}
        title="Select Report Type"
        options={REPORT_OPTIONS}
        value={reportType}
        emptyLabel="All"
        onSelect={setReportType}
        onClose={() => setReportPicker(false)}
      />
      <OptionPickerSheet
        visible={sublocalityPicker}
        title="Select Sublocality"
        options={sublocalityOptions}
        value={sublocality}
        emptyLabel="All"
        onSelect={setSublocality}
        onClose={() => setSublocalityPicker(false)}
      />
      <OptionPickerSheet
        visible={connectionPicker}
        title="Select Connection Type"
        options={CONNECTION_OPTIONS}
        value={connectionType}
        emptyLabel="Both"
        onSelect={setConnectionType}
        onClose={() => setConnectionPicker(false)}
      />
      <OptionPickerSheet
        visible={userPicker}
        title="Select User"
        options={userOptions}
        value={selectedUser}
        emptyLabel="All"
        onSelect={setSelectedUser}
        onClose={() => setUserPicker(false)}
      />
      <OptionPickerSheet
        visible={sortPicker}
        title="Sort By"
        options={SORT_OPTIONS}
        value={sortBy}
        emptyLabel="By Bill ID"
        onSelect={setSortBy}
        onClose={() => setSortPicker(false)}
      />

      <View style={styles.card}>
        <View style={styles.listHeader}>
          <View style={styles.listHeaderRow}>
            <View style={styles.listHeaderInfo}>
              <Text style={styles.listTitle}>Month Wise Collection History</Text>
              <Text style={styles.listCount}>
                From: {fromDate || '—'} — To: {toDate || '—'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.printBtn}
              onPress={() => setPrintOpen(true)}
              activeOpacity={0.85}>
              <Printer size={15} color={ACCENT[0]} />
              <Text style={styles.printBtnText}>Print</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={ACCENT[0]} />
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.empty}>
            <HandCoins size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>No month wise collection records found</Text>
            <Text style={styles.emptySub}>Try adjusting the filters.</Text>
          </View>
        ) : (
          filteredData.map(item => (
            <View key={item.key} style={styles.logCard}>
              <View style={styles.logTop}>
                <View style={styles.subInfo}>
                  <Text style={styles.subName} numberOfLines={1}>
                    {item.subscriberName || '—'}
                  </Text>
                  <Text style={styles.subId} numberOfLines={1}>
                    Bill #{item.billId || '—'}
                  </Text>
                </View>
                <View style={styles.amountBadge}>
                  <Text style={styles.amountBadgeText}>PKR {item.amount.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Generated Month</Text>
                  <Text style={styles.metaValue}>
                    {MONTHS.find(m => m.value === item.generatedMonth)?.label || '—'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Collection Month</Text>
                  <Text style={styles.metaValue}>
                    {MONTHS.find(m => m.value === item.collectionMonth)?.label || '—'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Collection Date</Text>
                  <Text style={styles.metaValue}>{formatDate(item.collectionDate)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Connection Type</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {item.connectionType}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Sublocality</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {item.sublocality || '—'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Collected By</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {item.collectedBy || '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.metaGrid}>
                <View style={styles.metaItemWide}>
                  <Text style={styles.metaLabel}>Address</Text>
                  <Text style={styles.metaValue} numberOfLines={2}>
                    {item.address || '—'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <SubscriberReportPrintModal
        visible={printOpen}
        onClose={() => setPrintOpen(false)}
        title="MONTH WISE COLLECTION REPORT"
        subtitle={`From: ${fromDate || '—'} — To: ${toDate || '—'}`}
        accent="#0D9488"
        emptyMessage="No month wise collection records found for the selected criteria."
        jobName="Month-Wise-Collection-Report"
        columns={printColumns}
        data={filteredData}
      />
    </ReportLayout>
  );
}

const styles = StyleSheet.create({
  center: {paddingVertical: 40, justifyContent: 'center', alignItems: 'center'},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  filterHeader: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12},
  filterTitle: {fontSize: 14, fontWeight: '700', color: '#111827'},
  filterScroll: {flexDirection: 'row', gap: 10, paddingBottom: 2},
  filterField: {width: 160},
  label: {fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 5},
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    color: '#111827',
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  selectText: {fontSize: 13, color: '#111827', flex: 1, marginRight: 6},
  placeholder: {color: '#9CA3AF'},
  applyRow: {flexDirection: 'row', gap: 10, marginTop: 6},
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
  },
  resetText: {fontSize: 13, fontWeight: '600', color: '#374151'},
  listHeader: {marginBottom: 10},
  listHeaderRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
  listHeaderInfo: {flex: 1},
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  printBtnText: {fontSize: 12, fontWeight: '700', color: '#14B8A6'},
  listTitle: {fontSize: 15, fontWeight: '700', color: '#111827'},
  listCount: {fontSize: 12, color: '#6B7280', marginTop: 2},
  logCard: {
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  logTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  subInfo: {flex: 1, marginRight: 8},
  subName: {fontSize: 14, fontWeight: '700', color: '#111827'},
  subId: {fontSize: 12, color: '#6B7280', fontFamily: 'monospace', marginTop: 1},
  amountBadge: {
    backgroundColor: '#CCFBF1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  amountBadgeText: {fontSize: 12, fontWeight: '700', color: '#0F766E'},
  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 10},
  metaItem: {flexBasis: '45%', flexGrow: 1},
  metaItemWide: {flexBasis: '100%'},
  metaLabel: {fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase'},
  metaValue: {fontSize: 13, color: '#111827', fontWeight: '500', marginTop: 1},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyText: {fontSize: 15, fontWeight: '600', color: '#6B7280', marginTop: 10},
  emptySub: {fontSize: 12, color: '#9CA3AF', marginTop: 4},
});
