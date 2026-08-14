import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {TriangleAlert, Filter, Search, CheckCircle, ChevronDown, Printer} from 'lucide-react-native';
import {getConnections} from '../../api/connections';
import {areasApi} from '../../api/network';
import {getBillingInvoices} from '../../api/subscribers';
import ReportLayout, {KpiRow, KpiCard} from '../../components/ReportLayout';
import OptionPickerSheet from '../../components/OptionPickerSheet';
import SubscriberReportPrintModal, {PrintColumn} from '../../components/SubscriberReportPrintModal';

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const ACCENT: [string, string] = ['#F43F5E', '#DC2626'];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const CONNECTION_OPTIONS = [
  {label: 'Both', value: 'both'},
  {label: 'Internet', value: 'internet'},
  {label: 'TV Cable', value: 'tv_cable'},
];

interface DefaulterRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  phone: string;
  address: string;
  sublocality: string;
  connectionType: string;
  remainingAmount: number;
  billingPeriods: string;
  dueDate: string;
  lastPaymentDate: string;
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

function billingPeriodDueDate(period: string): Date | null {
  if (!period) {
    return null;
  }
  const parts = period.trim().split(' ');
  const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === (parts[0] || '').toLowerCase());
  const year = Number(parts[1]);
  if (monthIdx < 0 || !year) {
    return null;
  }
  return new Date(year, monthIdx, 30);
}

function lastYearJan1(): string {
  const y = new Date().getFullYear() - 1;
  return `${y}-01-01`;
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  if (s === 'deactivated') {
    return {bg: '#FEE2E2', fg: '#B91C1C'};
  }
  if (s === 'active') {
    return {bg: '#DCFCE7', fg: '#15803D'};
  }
  return {bg: '#F3F4F6', fg: '#4B5563'};
}

export default function SubscribersDefaultersScreen() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fromDate, setFromDate] = useState(lastYearJan1);
  const [toDate, setToDate] = useState(today);
  const [sublocality, setSublocality] = useState('all');
  const [connectionType, setConnectionType] = useState('both');

  const [sublocalityPicker, setSublocalityPicker] = useState(false);
  const [connectionPicker, setConnectionPicker] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const results = await Promise.allSettled([getBillingInvoices(), getConnections(), areasApi.list()]);
      if (results[0].status === 'fulfilled') {
        setInvoices(results[0].value as any[]);
      }
      if (results[1].status === 'fulfilled') {
        setConnections(results[1].value as any[]);
      }
      if (results[2].status === 'fulfilled') {
        setAreas(results[2].value as any[]);
      }
      if (results.every(r => r.status === 'rejected')) {
        Alert.alert('Error', 'Failed to load invoices');
      }
    } catch {
      Alert.alert('Error', 'Failed to load invoices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const connMap = useMemo(() => {
    const map: Record<string, any> = {};
    connections.forEach((c: any) => {
      map[c.id] = {
        name: c.name || '',
        internetId: c.internetId || '',
        phone: c.cell || c.mobile || '',
        address: c.address || '',
        sublocality: resolveAreaName(areas, c.sublocalityId),
        connectionType: c.connectionType || '',
        lastPaymentDate: c.lastPaymentDate || '',
        status: c.status || 'active',
      };
    });
    return map;
  }, [connections, areas]);

  const allRecords: DefaulterRecord[] = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const map = new Map<string, DefaulterRecord>();

    invoices.forEach((inv: any) => {
      if (inv.status === 'paid' || Number(inv.remainingAmount) <= 0) {
        return;
      }
      const due = billingPeriodDueDate(inv.billingPeriod || '');
      if (!due || todayStart <= due) {
        return;
      }
      const conn = connMap[inv.subscriberId] || {};
      const remaining = Number(inv.remainingAmount) || 0;
      const period = inv.billingPeriod || '';
      const dueStr = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;

      const existing = map.get(inv.subscriberId);
      if (existing) {
        existing.remainingAmount += remaining;
        if (period && !existing.billingPeriods.includes(period)) {
          existing.billingPeriods = existing.billingPeriods ? `${existing.billingPeriods}, ${period}` : period;
        }
        if (dueStr < existing.dueDate) {
          existing.dueDate = dueStr;
        }
      } else {
        map.set(inv.subscriberId, {
          id: inv.subscriberId,
          subscriberName: inv.subscriberName || conn.name || '',
          subscriberId: conn.internetId || inv.subscriberId,
          phone: conn.phone || '',
          address: conn.address || '',
          sublocality: conn.sublocality || '',
          connectionType: conn.connectionType || '',
          remainingAmount: remaining,
          billingPeriods: period,
          dueDate: dueStr,
          lastPaymentDate: conn.lastPaymentDate || '',
          status: conn.status || 'active',
        });
      }
    });
    return Array.from(map.values());
  }, [invoices, connMap]);

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => {
      if (r.sublocality) {
        set.add(r.sublocality);
      }
    });
    return Array.from(set);
  }, [allRecords]);

  const filteredData = useMemo(() => {
    return allRecords.filter(item => {
      const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
      const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;

      const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
      const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

      const itemDate = new Date(item.dueDate);
      if (isNaN(itemDate.getTime())) {
        return false;
      }
      if (from && !isNaN(from.getTime()) && itemDate < from) {
        return false;
      }
      if (to && !isNaN(to.getTime()) && itemDate > to) {
        return false;
      }
      return sublocalityMatch && connectionMatch;
    });
  }, [allRecords, sublocality, connectionType, fromDate, toDate]);

  const totalAmount = filteredData.reduce((sum, item) => sum + item.remainingAmount, 0);

  const printColumns: PrintColumn<DefaulterRecord>[] = [
    {header: '#', render: (_item, index) => String(index + 1), align: 'right'},
    {header: 'Subscriber Name', render: item => item.subscriberName},
    {header: 'Subscriber ID', render: item => item.subscriberId.slice(0, 8)},
    {header: 'Phone', render: item => item.phone || '—'},
    {header: 'Address', render: item => item.address || '—'},
    {header: 'Sublocality', render: item => item.sublocality || '—'},
    {header: 'Connection Type', render: item => capitalize(item.connectionType || '—')},
    {header: 'Remaining (PKR)', render: item => item.remainingAmount.toLocaleString(), align: 'right'},
    {header: 'Due Date', render: item => formatDate(item.dueDate)},
    {header: 'Last Payment', render: item => (item.lastPaymentDate ? formatDate(item.lastPaymentDate) : 'Never Paid')},
    {header: 'Status', render: item => capitalize(item.status)},
  ];

  const sublocalityOptions = allSublocalities.map(loc => ({label: loc, value: loc}));

  const resetFilters = () => {
    setFromDate(lastYearJan1());
    setToDate(today());
    setSublocality('all');
    setConnectionType('both');
  };

  return (
    <ReportLayout
      title="Subscribers Defaulters"
      subtitle="Subscribers who have not paid by the 30th of their billing month"
      icon={TriangleAlert}
      accent={ACCENT}
      refreshing={refreshing}
      onRefresh={() => load(true)}>
      <KpiRow>
        <KpiCard label="Total Defaulters" value={filteredData.length} icon={TriangleAlert} bg="#FFE4E6" fg="#E11D48" />
        <KpiCard
          label="Total Outstanding"
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
        <View style={styles.listHeaderRow}>
          <View style={styles.listHeaderInfo}>
            <Text style={styles.listTitle}>Subscribers Defaulters List</Text>
            <Text style={styles.listCount}>
              From: {fromDate || '—'} — To: {toDate || '—'}
            </Text>
          </View>
          <TouchableOpacity style={[styles.printBtn, {backgroundColor: ACCENT[0]}]} onPress={() => setPrintOpen(true)} activeOpacity={0.85}>
            <Printer size={14} color="#FFFFFF" />
            <Text style={styles.printBtnText}>Print</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={ACCENT[0]} />
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.empty}>
            <Search size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>No defaulter subscribers found</Text>
            <Text style={styles.emptySub}>Try adjusting the filters.</Text>
          </View>
        ) : (
          filteredData.map(item => {
            const st = statusStyle(item.status);
            return (
              <View key={item.id} style={styles.logCard}>
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
                      {item.connectionType || '—'}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Remaining Amount</Text>
                    <Text style={styles.metaValue}>PKR {item.remainingAmount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Due Date</Text>
                    <Text style={styles.metaValue}>{formatDate(item.dueDate)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Last Payment</Text>
                    <Text style={styles.metaValue}>{item.lastPaymentDate ? formatDate(item.lastPaymentDate) : 'Never Paid'}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Billing Period</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      {item.billingPeriods || '—'}
                    </Text>
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
        title="SUBSCRIBERS DEFAULTERS"
        subtitle={`From: ${fromDate || '—'} — To: ${toDate || '—'}`}
        accent={ACCENT[0]}
        columns={printColumns}
        data={filteredData}
        jobName="subscribers-defaulters-report"
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
  listHeaderRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 12},
  listHeaderInfo: {flex: 1},
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  printBtnText: {fontSize: 13, fontWeight: '700', color: '#FFFFFF'},
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
