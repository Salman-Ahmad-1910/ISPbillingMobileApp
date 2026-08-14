import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {FileText, Filter, Search, CheckCircle, ChevronDown, Printer} from 'lucide-react-native';
import {getConnections} from '../../api/connections';
import {areasApi} from '../../api/network';
import {getBillingInvoices} from '../../api/subscribers';
import ReportLayout, {KpiRow, KpiCard} from '../../components/ReportLayout';
import OptionPickerSheet from '../../components/OptionPickerSheet';
import SubscriberReportPrintModal, {PrintColumn} from '../../components/SubscriberReportPrintModal';

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const ACCENT: [string, string] = ['#6366F1', '#3B82F6'];

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
  {label: 'Active', value: 'active'},
  {label: 'Suspended', value: 'suspended'},
  {label: 'Deactivated', value: 'deactivated'},
];

const CONNECTION_OPTIONS = [
  {label: 'Both', value: 'both'},
  {label: 'Internet', value: 'internet'},
  {label: 'TV Cable', value: 'tv_cable'},
];

interface MonthDefaulterRecord {
  key: string;
  id: string;
  subscriberName: string;
  subscriberId: string;
  phone: string;
  address: string;
  sublocality: string;
  connectionType: string;
  month: string;
  amount: number;
  status: string;
}

function resolveAreaName(areas: any[], sublocalityId?: string): string {
  if (!sublocalityId) {
    return '';
  }
  const area = areas.find((a: any) => a.id === sublocalityId);
  if (!area) {
    return '';
  }
  return [area.city, area.zone, area.locality].filter(Boolean).join(', ');
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

export default function MonthWiseDefaultersScreen() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [month, setMonth] = useState('');
  const [sublocality, setSublocality] = useState('all');
  const [reportType, setReportType] = useState('all');
  const [connectionType, setConnectionType] = useState('both');

  const [monthPicker, setMonthPicker] = useState(false);
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
      const [invData, connData, areaData] = await Promise.all([
        getBillingInvoices(),
        getConnections(),
        areasApi.list(),
      ]);
      setInvoices(invData as any[]);
      setConnections(connData as any[]);
      setAreas(areaData as any[]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv: any) => {
      const conn = connections.find((c: any) => c.id === inv.subscriberId);
      const areaName = resolveAreaName(areas, conn?.sublocalityId);
      if (areaName) set.add(areaName);
    });
    return Array.from(set);
  }, [invoices, connections, areas]);

  const allRecords: MonthDefaulterRecord[] = useMemo(
    () =>
      invoices
        .filter((inv: any) => Number(inv.remainingAmount) > 0)
        .map((inv: any) => {
          const conn = connections.find((c: any) => c.id === inv.subscriberId);
          const monthName = String(inv.billingPeriod || '').split(' ')[0];
          const monthValue =
            MONTHS.find(m => m.label.toLowerCase() === monthName.toLowerCase())?.value || '';
          return {
            key: inv.id,
            id: conn?.id || inv.subscriberId || inv.id,
            subscriberName: inv.subscriberName || conn?.name || '',
            subscriberId: conn?.internetId || '',
            phone: conn?.cell || conn?.mobile || '',
            address: conn?.address || '',
            sublocality: resolveAreaName(areas, conn?.sublocalityId),
            connectionType: conn?.connectionType || 'internet',
            month: monthValue,
            amount: Number(inv.remainingAmount) || 0,
            status: conn?.status || inv.status || 'active',
          };
        }),
    [invoices, connections, areas],
  );

  const filteredData = useMemo(() => {
    return allRecords.filter(item => {
      if (month && item.month !== month) return false;
      if (sublocality !== 'all' && item.sublocality !== sublocality) return false;
      if (reportType !== 'all' && item.status !== reportType) return false;
      if (connectionType !== 'both' && item.connectionType !== connectionType) return false;
      return true;
    });
  }, [allRecords, month, sublocality, reportType, connectionType]);

  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const printColumns: PrintColumn<MonthDefaulterRecord>[] = [
    {header: '#', render: (_: MonthDefaulterRecord, i: number) => i + 1},
    {header: 'Subscriber Name', render: item => item.subscriberName || '—'},
    {header: 'Subscriber ID', render: item => item.subscriberId.slice(0, 8) || '—'},
    {header: 'Phone', render: item => item.phone || '—'},
    {header: 'Address', render: item => item.address || '—'},
    {header: 'Sublocality', render: item => item.sublocality || '—'},
    {header: 'Connection Type', render: item => capitalize(item.connectionType)},
    {header: 'Month', render: item => MONTHS.find(m => m.value === item.month)?.label || '—'},
    {header: 'Amount (PKR)', align: 'right', render: item => item.amount.toLocaleString()},
    {header: 'Status', render: item => capitalize(item.status)},
  ];

  const sublocalityOptions = allSublocalities.map(loc => ({label: loc, value: loc}));

  const resetFilters = () => {
    setFromDate(firstOfMonth());
    setToDate(today());
    setMonth('');
    setSublocality('all');
    setReportType('all');
    setConnectionType('both');
  };

  return (
    <ReportLayout
      title="Month Wise Defaulters"
      subtitle="View and manage month wise defaulters"
      icon={FileText}
      accent={ACCENT}
      refreshing={refreshing}
      onRefresh={() => load(true)}>
      <KpiRow>
        <KpiCard label="Total Connections" value={filteredData.length} icon={FileText} bg="#E0E7FF" fg="#6366F1" />
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
            <Text style={styles.label}>Month</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setMonthPicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, !month && styles.placeholder]}>
                {month ? MONTHS.find(m => m.value === month)?.label || month : 'Select month'}
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
            <Text style={styles.label}>Report Type</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setReportPicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, reportType === 'all' && styles.placeholder]}>
                {REPORT_OPTIONS.find(o => o.value === reportType)?.label || reportType}
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
        visible={monthPicker}
        title="Select Month"
        options={MONTHS}
        value={month}
        emptyLabel="All Months"
        onSelect={setMonth}
        onClose={() => setMonthPicker(false)}
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
        visible={reportPicker}
        title="Select Report Type"
        options={REPORT_OPTIONS}
        value={reportType}
        emptyLabel="All"
        onSelect={setReportType}
        onClose={() => setReportPicker(false)}
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
              <Text style={styles.listTitle}>Month Wise Defaulters History</Text>
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
            <FileText size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>No month wise defaulters found</Text>
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
                    <Text style={styles.metaLabel}>Month</Text>
                    <Text style={styles.metaValue}>
                      {MONTHS.find(m => m.value === item.month)?.label || '—'}
                    </Text>
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
          }          )
        )}
      </View>

      <SubscriberReportPrintModal
        visible={printOpen}
        onClose={() => setPrintOpen(false)}
        title="MONTH WISE DEFAULTERS REPORT"
        subtitle={`From: ${fromDate || '—'} — To: ${toDate || '—'}`}
        accent="#4F46E5"
        emptyMessage="No month wise defaulters found for the selected criteria."
        jobName="Month-Wise-Defaulters-Report"
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
  printBtnText: {fontSize: 12, fontWeight: '700', color: '#6366F1'},
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
