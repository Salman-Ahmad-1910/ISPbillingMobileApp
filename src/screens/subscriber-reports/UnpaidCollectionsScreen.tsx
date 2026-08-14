import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {Wallet, Filter, Search, CheckCircle, ChevronDown, Printer} from 'lucide-react-native';
import {getConnections} from '../../api/connections';
import {areasApi} from '../../api/network';
import {getBillingInvoices} from '../../api/subscribers';
import ReportLayout, {KpiRow, KpiCard, GreenButton} from '../../components/ReportLayout';
import OptionPickerSheet from '../../components/OptionPickerSheet';
import SubscriberReportPrintModal, {PrintColumn} from '../../components/SubscriberReportPrintModal';

const ACCENT: [string, string] = ['#F59E0B', '#EA580C'];
const PAGE_SIZES = [10, 50, 100];

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

const TYPE_OPTIONS = [
  {label: 'All', value: 'all'},
  {label: 'Internet', value: 'internet'},
  {label: 'TV Cable', value: 'tv_cable'},
];

interface UnpaidRecord {
  id: string;
  subscriberId: string;
  subscriberName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  billingPeriod: string;
  sublocality: string;
  connectionType: string;
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

function parseDateStr(value: string): Date | null {
  if (!value) {
    return null;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  const parts = value.trim().split(/[\s,]+/);
  if (parts.length >= 3) {
    const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === (parts[0] || '').toLowerCase());
    const day = Number(parts[1]);
    const year = Number(parts[2]);
    if (monthIdx >= 0 && day && year) {
      const d = new Date(year, monthIdx, day);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
  }
  const fallback = new Date(value);
  return isNaN(fallback.getTime()) ? null : fallback;
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

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default function UnpaidCollectionsScreen() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const [fromDate, setFromDate] = useState(lastYearJan1);
  const [toDate, setToDate] = useState(today);
  const [sublocality, setSublocality] = useState('all');
  const [reportType, setReportType] = useState('all');

  const [sublocalityPicker, setSublocalityPicker] = useState(false);
  const [reportPicker, setReportPicker] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    const map: Record<string, {sublocality: string; connectionType: string}> = {};
    connections.forEach((c: any) => {
      const area = areas.find((a: any) => a.id === (c.sublocalityId || ''));
      const sub = area ? area.subLocality || area.locality || c.sublocalityId || '' : '';
      map[c.id] = {sublocality: sub, connectionType: c.connectionType || ''};
    });
    return map;
  }, [connections, areas]);

  const unpaidRecords: UnpaidRecord[] = useMemo(() => {
    const map = new Map<string, UnpaidRecord>();
    invoices.forEach((inv: any) => {
      if (inv.status === 'paid' || Number(inv.remainingAmount) <= 0) {
        return;
      }
      const conn = connMap[inv.subscriberId] || {};
      const amount = Number(inv.amount) || 0;
      const paid = Number(inv.paidAmount) || 0;
      const remaining = Number(inv.remainingAmount) || 0;
      const period = inv.billingPeriod || '';
      const due = inv.dueDate || '';
      const existing = map.get(inv.subscriberId);
      if (existing) {
        existing.amount += amount;
        existing.paidAmount += paid;
        existing.remainingAmount += remaining;
        if (period && !existing.billingPeriod.includes(period)) {
          existing.billingPeriod = existing.billingPeriod ? `${existing.billingPeriod}, ${period}` : period;
        }
        if (!existing.dueDate || (due && new Date(due) < new Date(existing.dueDate))) {
          existing.dueDate = due;
        }
      } else {
        map.set(inv.subscriberId, {
          id: inv.subscriberId,
          subscriberId: inv.subscriberId,
          subscriberName: inv.subscriberName || '',
          amount,
          paidAmount: paid,
          remainingAmount: remaining,
          dueDate: due,
          billingPeriod: period,
          sublocality: conn.sublocality || '',
          connectionType: conn.connectionType || '',
        });
      }
    });
    return Array.from(map.values());
  }, [invoices, connMap]);

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    unpaidRecords.forEach(r => {
      if (r.sublocality) {
        set.add(r.sublocality);
      }
    });
    return Array.from(set).sort();
  }, [unpaidRecords]);

  const filteredData = useMemo(() => {
    if (!showReport) {
      return [];
    }
    return unpaidRecords.filter(item => {
      const itemDate = parseDateStr(item.dueDate);
      if (!itemDate) {
        return false;
      }
      const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
      const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
      if (from && !isNaN(from.getTime()) && itemDate < from) {
        return false;
      }
      if (to && !isNaN(to.getTime()) && itemDate > to) {
        return false;
      }
      const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
      const typeMatch = reportType === 'all' || item.connectionType === reportType;
      return sublocalityMatch && typeMatch;
    });
  }, [unpaidRecords, fromDate, toDate, sublocality, reportType, showReport]);

  const totalAmount = filteredData.reduce((sum, item) => sum + item.remainingAmount, 0);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filteredData.slice((safePage - 1) * pageSize, safePage * pageSize);

  const sublocalityOptions = allSublocalities.map(loc => ({label: loc, value: loc}));

  const printColumns: PrintColumn<UnpaidRecord>[] = [
    {header: '#', render: (_item, index) => String(index + 1), align: 'right'},
    {header: 'Subscriber Name', render: item => item.subscriberName || '—'},
    {header: 'Billing Period', render: item => item.billingPeriod || '—'},
    {header: 'Amount (PKR)', render: item => item.amount.toLocaleString(), align: 'right'},
    {header: 'Paid (PKR)', render: item => item.paidAmount.toLocaleString(), align: 'right'},
    {header: 'Remaining (PKR)', render: item => item.remainingAmount.toLocaleString(), align: 'right'},
    {header: 'Due Date', render: item => formatDate(item.dueDate)},
    {header: 'Sublocality', render: item => item.sublocality || '—'},
    {header: 'Connection Type', render: item => capitalize(item.connectionType || '—')},
  ];

  const resetFilters = () => {
    setFromDate(lastYearJan1());
    setToDate(today());
    setSublocality('all');
    setReportType('all');
    setShowReport(false);
    setCurrentPage(1);
  };

  return (
    <ReportLayout
      title="Unpaid Collections"
      subtitle="Subscribers with pending collection amounts"
      icon={Wallet}
      accent={ACCENT}
      refreshing={refreshing}
      onRefresh={() => load(true)}>
      <KpiRow>
        <KpiCard label="Total Records" value={filteredData.length} icon={Wallet} bg="#FEF3C7" fg="#D97706" />
        <KpiCard
          label="Total Unpaid Amount"
          value={`PKR ${totalAmount.toLocaleString()}`}
          icon={CheckCircle}
          bg="#FFE4E6"
          fg="#E11D48"
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
            <Text style={styles.label}>Report Type</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setReportPicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, reportType === 'all' && styles.placeholder]}>
                {TYPE_OPTIONS.find(o => o.value === reportType)?.label || reportType}
              </Text>
              <ChevronDown size={15} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </ScrollView>
        <View style={styles.applyRow}>
          <GreenButton
            label="Show Report"
            icon={Wallet}
            onPress={() => {
              setShowReport(true);
              setCurrentPage(1);
            }}
          />
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
        visible={reportPicker}
        title="Select Report Type"
        options={TYPE_OPTIONS}
        value={reportType}
        emptyLabel="All"
        onSelect={setReportType}
        onClose={() => setReportPicker(false)}
      />

      <View style={styles.card}>
        <View style={styles.listHeaderRow}>
          <View style={styles.listHeaderInfo}>
            <Text style={styles.listTitle}>Unpaid Collection History</Text>
            <Text style={styles.listCount}>
              {showReport
                ? `From: ${fromDate || '—'} — To: ${toDate || '—'}`
                : 'Select the filters above and press Show Report to generate the report.'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.printBtn, {backgroundColor: ACCENT[0]}, !showReport && styles.printBtnDisabled]}
            onPress={() => setPrintOpen(true)}
            disabled={!showReport}
            activeOpacity={0.85}>
            <Printer size={14} color="#FFFFFF" />
            <Text style={styles.printBtnText}>Print</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={ACCENT[0]} />
          </View>
        ) : !showReport ? (
          <View style={styles.empty}>
            <Wallet size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>Select filters and press Show Report</Text>
            <Text style={styles.emptySub}>Generate the unpaid collections report.</Text>
          </View>
        ) : paginated.length === 0 ? (
          <View style={styles.empty}>
            <Search size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>No unpaid collections found</Text>
            <Text style={styles.emptySub}>Try adjusting the filters.</Text>
          </View>
        ) : (
          paginated.map(item => (
            <View key={item.id} style={styles.logCard}>
              <View style={styles.logTop}>
                <View style={styles.subInfo}>
                  <Text style={styles.subName} numberOfLines={1}>
                    {item.subscriberName || '—'}
                  </Text>
                  <Text style={styles.subId} numberOfLines={1}>
                    {item.billingPeriod || '—'}
                  </Text>
                </View>
                <View style={[styles.typeBadge, {backgroundColor: '#FEE2E2'}]}>
                  <Text style={[styles.typeBadgeText, {color: '#B91C1C'}]}>
                    PKR {item.remainingAmount.toLocaleString()}
                  </Text>
                </View>
              </View>
              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Amount</Text>
                  <Text style={styles.metaValue}>PKR {item.amount.toLocaleString()}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Paid</Text>
                  <Text style={styles.metaValue}>PKR {item.paidAmount.toLocaleString()}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Due Date</Text>
                  <Text style={styles.metaValue}>{formatDate(item.dueDate)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Connection Type</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {item.connectionType || '—'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Sublocality</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {item.sublocality || '—'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        {showReport && filteredData.length > 0 ? (
          <View style={styles.pagination}>
            <Text style={styles.pageInfo}>
              Showing {(safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, filteredData.length)} of{' '}
              {filteredData.length} records
            </Text>
            <View style={styles.pageSizeRow}>
              {PAGE_SIZES.map(size => (
                <TouchableOpacity
                  key={size}
                  style={[styles.pageSizeChip, pageSize === size && styles.pageSizeChipActive]}
                  onPress={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}>
                  <Text style={[styles.pageSizeText, pageSize === size && styles.pageSizeTextActive]}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.pageNav}>
              <TouchableOpacity
                style={[styles.pageNavBtn, safePage === 1 && styles.btnDisabled]}
                onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}>
                <Text style={styles.pageNavText}>Prev</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>
                Page {safePage} of {totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.pageNavBtn, safePage === totalPages && styles.btnDisabled]}
                onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}>
                <Text style={styles.pageNavText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      <SubscriberReportPrintModal
        visible={printOpen}
        onClose={() => setPrintOpen(false)}
        title="UNPAID COLLECTIONS"
        subtitle={`From: ${fromDate || '—'} — To: ${toDate || '—'}`}
        accent={ACCENT[0]}
        columns={printColumns}
        data={filteredData}
        jobName="unpaid-collections-report"
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
  printBtnDisabled: {opacity: 0.45},
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
  typeBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {fontSize: 12, fontWeight: '700'},
  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 10},
  metaItem: {flexBasis: '45%', flexGrow: 1},
  metaLabel: {fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase'},
  metaValue: {fontSize: 13, color: '#111827', fontWeight: '500', marginTop: 1},
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  pageInfo: {fontSize: 12, color: '#6B7280'},
  pageSizeRow: {flexDirection: 'row', gap: 6},
  pageSizeChip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pageSizeChipActive: {borderColor: '#F59E0B', backgroundColor: '#FFFBEB'},
  pageSizeText: {fontSize: 12, color: '#6B7280'},
  pageSizeTextActive: {color: '#D97706', fontWeight: '700'},
  pageNav: {flexDirection: 'row', alignItems: 'center', gap: 6},
  pageNavBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pageNavText: {fontSize: 12, fontWeight: '600', color: '#374151'},
  btnDisabled: {opacity: 0.5},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyText: {fontSize: 15, fontWeight: '600', color: '#6B7280', marginTop: 10},
  emptySub: {fontSize: 12, color: '#9CA3AF', marginTop: 4},
});
