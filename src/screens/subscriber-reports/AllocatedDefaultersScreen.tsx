import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {TriangleAlert, Filter, Search, CheckCircle, ChevronDown, Printer} from 'lucide-react-native';
import {getSubscribers} from '../../api/subscribers';
import ReportLayout, {KpiRow, KpiCard} from '../../components/ReportLayout';
import OptionPickerSheet from '../../components/OptionPickerSheet';
import SubscriberReportPrintModal, {PrintColumn} from '../../components/SubscriberReportPrintModal';

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const ACCENT: [string, string] = ['#F59E0B', '#EA580C'];

const REPORT_OPTIONS = [
  {label: 'Defaulter', value: 'defaulter'},
  {label: 'Bad Debt', value: 'bad_debt'},
];

const CONNECTION_OPTIONS = [
  {label: 'Both', value: 'both'},
  {label: 'Internet', value: 'internet'},
  {label: 'TV Cable', value: 'tv_cable'},
];

interface AllocatedDefaulterRecord {
  key: string;
  id: string;
  subscriberName: string;
  subscriberId: string;
  phone: string;
  address: string;
  sublocality: string;
  connectionType: string;
  allocatedDate: string;
  amount: number;
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

function statusStyle(status: string): {bg: string; fg: string} {
  const s = (status || '').toLowerCase();
  if (s === 'overdue' || s === 'deactivated') {
    return {bg: '#FEE2E2', fg: '#B91C1C'};
  }
  if (s === 'active') {
    return {bg: '#DCFCE7', fg: '#15803D'};
  }
  if (s === 'suspended') {
    return {bg: '#FEF3C7', fg: '#B45309'};
  }
  return {bg: '#F3F4F6', fg: '#4B5563'};
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

export default function AllocatedDefaultersScreen() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [reportType, setReportType] = useState('defaulter');
  const [sublocality, setSublocality] = useState('all');
  const [connectionType, setConnectionType] = useState('both');

  const [sublocalityPicker, setSublocalityPicker] = useState(false);
  const [reportPicker, setReportPicker] = useState(false);
  const [connectionPicker, setConnectionPicker] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getSubscribers();
      setSubscribers(data as any[]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load subscribers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getDaysSinceUpdate = (updatedAt: string): number => {
    if (!updatedAt) {
      return 0;
    }
    const updateDate = new Date(updatedAt);
    const now = new Date();
    const diffTime = now.getTime() - updateDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    subscribers.forEach((s: any) => {
      const loc = s.areaName;
      if (loc) set.add(loc);
    });
    return Array.from(set);
  }, [subscribers]);

  const allDefaulters: AllocatedDefaulterRecord[] = useMemo(
    () =>
      subscribers
        .filter((s: any) => Number(s.balance) > 0)
        .map((s: any) => ({
          key: s.id,
          id: s.id,
          subscriberName: s.name || '',
          subscriberId: s.subscriber_identity || s.id || '',
          phone: s.phone || '',
          address: s.installationAddress || '',
          sublocality: s.areaName || '',
          connectionType: s.connectionType || 'internet',
          allocatedDate: s.updatedAt || s.connectionDate || '',
          amount: Number(s.balance) || 0,
          status: s.status || 'active',
        })),
    [subscribers],
  );

  const defaultersByType = useMemo(() => {
    return allDefaulters.filter(item => {
      const daysSince = getDaysSinceUpdate(item.allocatedDate);
      if (reportType === 'defaulter') return daysSince >= 90;
      if (reportType === 'bad_debt') return daysSince > 90;
      return true;
    });
  }, [allDefaulters, reportType]);

  const filteredData = useMemo(() => {
    return defaultersByType.filter(item => {
      if (sublocality !== 'all' && item.sublocality !== sublocality) return false;
      if (connectionType !== 'both' && item.connectionType !== connectionType) return false;
      const itemDate = new Date(item.allocatedDate);
      const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
      const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
      if (from && !isNaN(from.getTime()) && itemDate < from) return false;
      if (to && !isNaN(to.getTime()) && itemDate > to) return false;
      return true;
    });
  }, [defaultersByType, sublocality, connectionType, fromDate, toDate]);

  const totalReceivable = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const printColumns: PrintColumn<AllocatedDefaulterRecord>[] = [
    {header: '#', render: (_: AllocatedDefaulterRecord, i: number) => i + 1},
    {header: 'Subscriber Name', render: item => item.subscriberName || '—'},
    {header: 'Subscriber ID', render: item => item.subscriberId.slice(0, 8) || '—'},
    {header: 'Phone', render: item => item.phone || '—'},
    {header: 'Address', render: item => item.address || '—'},
    {header: 'Sublocality', render: item => item.sublocality || '—'},
    {header: 'Connection Type', render: item => capitalize(item.connectionType)},
    {header: 'Allocated Date', render: item => formatDate(item.allocatedDate)},
    {header: 'Amount (PKR)', align: 'right', render: item => item.amount.toLocaleString()},
    {header: 'Status', render: item => capitalize(item.status)},
  ];

  const sublocalityOptions = allSublocalities.map(loc => ({label: loc, value: loc}));

  const resetFilters = () => {
    setFromDate(firstOfMonth());
    setToDate(today());
    setReportType('defaulter');
    setSublocality('all');
    setConnectionType('both');
  };

  return (
    <ReportLayout
      title="Allocated Defaulters"
      subtitle="View and manage allocated defaulters"
      icon={TriangleAlert}
      accent={ACCENT}
      refreshing={refreshing}
      onRefresh={() => load(true)}>
      <KpiRow>
        <KpiCard label="No of Defaulters" value={filteredData.length} icon={TriangleAlert} bg="#FEF3C7" fg="#D97706" />
        <KpiCard
          label="Receivable"
          value={`PKR ${totalReceivable.toLocaleString()}`}
          icon={CheckCircle}
          bg="#FEE2E2"
          fg="#DC2626"
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
            <Text style={styles.label}>Select Report</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setReportPicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, reportType === 'defaulter' && styles.placeholder]}>
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
        </ScrollView>
        <View style={styles.applyRow}>
          <TouchableOpacity style={styles.resetBtn} onPress={resetFilters} activeOpacity={0.85}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      <OptionPickerSheet
        visible={reportPicker}
        title="Select Report"
        options={REPORT_OPTIONS}
        value={reportType}
        emptyLabel="Defaulter"
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

      <View style={styles.card}>
        <View style={styles.listHeader}>
          <View style={styles.listHeaderRow}>
            <View style={styles.listHeaderInfo}>
              <Text style={styles.listTitle}>Defaulters History</Text>
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
            <TriangleAlert size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>No allocated defaulters found</Text>
            <Text style={styles.emptySub}>Try adjusting the filters.</Text>
          </View>
        ) : (
          filteredData.map(item => {
            const st = statusStyle(item.status);
            return (
              <View key={item.key} style={styles.logCard}>
                <View style={styles.logTop}>
                  <View style={styles.subInfo}>
                    <Text style={styles.subName} numberOfLines={1}>
                      {item.subscriberName || '—'}
                    </Text>
                    <Text style={styles.subId} numberOfLines={1}>
                      {item.subscriberId.slice(0, 8)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, {backgroundColor: st.bg}]}>
                    <Text style={[styles.statusText, {color: st.fg}]} numberOfLines={1}>
                      {item.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.metaGrid}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Phone</Text>
                    <Text style={styles.metaValue}>{item.phone || '—'}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Connection Type</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      {item.connectionType}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Allocated Date</Text>
                    <Text style={styles.metaValue}>{formatDate(item.allocatedDate)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Amount</Text>
                    <Text style={styles.metaValue}>PKR {item.amount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Sublocality</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      {item.sublocality || '—'}
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
            );
          })
        )}
      </View>

      <SubscriberReportPrintModal
        visible={printOpen}
        onClose={() => setPrintOpen(false)}
        title="ALLOCATED DEFAULTERS REPORT"
        subtitle={`From: ${fromDate || '—'} — To: ${toDate || '—'}`}
        accent="#D97706"
        emptyMessage="No allocated defaulters found for the selected criteria."
        jobName="Allocated-Defaulters-Report"
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
  printBtnText: {fontSize: 12, fontWeight: '700', color: '#F59E0B'},
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
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {fontSize: 11, fontWeight: '700', textTransform: 'capitalize'},
  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 10},
  metaItem: {flexBasis: '45%', flexGrow: 1},
  metaItemWide: {flexBasis: '100%'},
  metaLabel: {fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase'},
  metaValue: {fontSize: 13, color: '#111827', fontWeight: '500', marginTop: 1},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyText: {fontSize: 15, fontWeight: '600', color: '#6B7280', marginTop: 10},
  emptySub: {fontSize: 12, color: '#9CA3AF', marginTop: 4},
});
