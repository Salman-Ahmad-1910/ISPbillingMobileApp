import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {FileX2, Filter, Search, CheckCircle, ChevronDown, Printer} from 'lucide-react-native';
import {getConnections} from '../../api/connections';
import {areasApi} from '../../api/network';
import {getBills} from '../../api/billing';
import ReportLayout, {KpiRow, KpiCard, GreenButton} from '../../components/ReportLayout';
import OptionPickerSheet from '../../components/OptionPickerSheet';
import SubscriberReportPrintModal, {PrintColumn} from '../../components/SubscriberReportPrintModal';

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const ACCENT: [string, string] = ['#F43F5E', '#EA580C'];
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

const MONTH_OPTIONS = MONTH_NAMES.map(name => ({label: name, value: name}));

const TYPE_OPTIONS = [
  {label: 'All', value: 'all'},
  {label: 'Internet', value: 'internet'},
  {label: 'TV Cable', value: 'tv_cable'},
];

const CONNECTION_OPTIONS = [
  {label: 'Both', value: 'both'},
  {label: 'Internet', value: 'internet'},
  {label: 'TV Cable', value: 'tv_cable'},
];

interface NotGeneratedRecord {
  id: string;
  internetId: string;
  name: string;
  address: string;
  sublocality: string;
  connectionType: string;
  amount: number;
  rechargeDate: string;
}

function getMonthYear(dateStr?: string): {month: string; year: string} | null {
  if (!dateStr) {
    return null;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return null;
  }
  return {month: MONTH_NAMES[d.getMonth()], year: String(d.getFullYear())};
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

export default function NotGeneratedCollectionsScreen() {
  const [connections, setConnections] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const [filterMonth, setFilterMonth] = useState(() => MONTH_NAMES[new Date().getMonth()]);
  const [filterYear, setFilterYear] = useState(() => String(new Date().getFullYear()));
  const [reportType, setReportType] = useState('all');
  const [sublocality, setSublocality] = useState('all');
  const [connectionType, setConnectionType] = useState('both');
  const [historyFromDate, setHistoryFromDate] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [historyToDate, setHistoryToDate] = useState(() => `${new Date().getFullYear()}-12-31`);

  const [monthPicker, setMonthPicker] = useState(false);
  const [yearPicker, setYearPicker] = useState(false);
  const [reportPicker, setReportPicker] = useState(false);
  const [sublocalityPicker, setSublocalityPicker] = useState(false);
  const [connectionPicker, setConnectionPicker] = useState(false);
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
      const results = await Promise.allSettled([getConnections(), areasApi.list(), getBills()]);
      if (results[0].status === 'fulfilled') {
        setConnections(results[0].value as any[]);
      }
      if (results[1].status === 'fulfilled') {
        setAreas(results[1].value as any[]);
      }
      if (results[2].status === 'fulfilled') {
        setBills(results[2].value as any[]);
      }
      if (results.every(r => r.status === 'rejected')) {
        Alert.alert('Error', 'Failed to load collections');
      }
    } catch {
      Alert.alert('Error', 'Failed to load collections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(String(new Date().getFullYear()));
    connections.forEach((c: any) => {
      const my = getMonthYear(c.rechargeDate || c.installationDate);
      if (my) {
        years.add(my.year);
      }
    });
    return Array.from(years).sort().reverse();
  }, [connections]);

  const areaName = useCallback(
    (areaId: string) => {
      const area = areas.find((a: any) => a.id === areaId);
      if (area) {
        return area.subLocality || area.locality || areaId.slice(0, 8);
      }
      return areaId;
    },
    [areas],
  );

  const generatedIds = useMemo(() => {
    const ids = new Set<string>();
    const names = new Set<string>();
    const zeroUuid = '00000000-0000-0000-0000-000000000000';
    bills.forEach((b: any) => {
      if (b.month !== filterMonth || String(b.year) !== filterYear) {
        return;
      }
      if (b.status && b.status !== 'Created') {
        return;
      }
      if (b.connectionId && b.connectionId !== zeroUuid) {
        ids.add(b.connectionId);
      }
      if (b.subscriberIds) {
        try {
          JSON.parse(b.subscriberIds).forEach((id: string) => ids.add(id));
        } catch {
          // ignore malformed subscriberIds
        }
      }
      if (b.connectionName) {
        String(b.connectionName)
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
          .forEach((name: string) => names.add(name));
      }
    });
    return {ids, names};
  }, [bills, filterMonth, filterYear]);

  const allRecords: NotGeneratedRecord[] = useMemo(() => {
    const result: NotGeneratedRecord[] = [];
    connections.forEach((c: any) => {
      if (c.status === 'deactivated') {
        return;
      }
      if (generatedIds.ids.has(c.id)) {
        return;
      }
      if (generatedIds.names.has(c.name)) {
        return;
      }
      let amount = 0;
      if (c.connectionType === 'tv_cable') {
        amount = c.amount || 0;
      } else if (c.connectionType === 'internet') {
        amount = c.sameAmount || 0;
      } else {
        amount = (c.amount || 0) + (c.sameAmount || 0);
      }
      result.push({
        id: c.id,
        internetId: c.internetId || '',
        name: c.name,
        address: c.address || '',
        sublocality: areaName(c.sublocalityId || ''),
        connectionType: c.connectionType,
        amount,
        rechargeDate: c.rechargeDate || c.installationDate || '',
      });
    });
    return result;
  }, [connections, generatedIds, areaName]);

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
    if (!showReport) {
      return [];
    }
    return allRecords.filter(item => {
      const typeMatch = reportType === 'all' || item.connectionType === reportType;
      const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;
      const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;

      const parsed = new Date(item.rechargeDate);
      if (isNaN(parsed.getTime())) {
        return false;
      }
      const from = historyFromDate ? new Date(`${historyFromDate}T00:00:00`) : null;
      const to = historyToDate ? new Date(`${historyToDate}T23:59:59.999`) : null;
      if (from && !isNaN(from.getTime()) && parsed < from) {
        return false;
      }
      if (to && !isNaN(to.getTime()) && parsed > to) {
        return false;
      }
      return typeMatch && connectionMatch && sublocalityMatch;
    });
  }, [allRecords, reportType, sublocality, connectionType, historyFromDate, historyToDate, showReport]);

  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filteredData.slice((safePage - 1) * pageSize, safePage * pageSize);

  const printColumns: PrintColumn<NotGeneratedRecord>[] = [
    {header: '#', render: (_: NotGeneratedRecord, i: number) => i + 1},
    {header: 'Subscriber Name', render: item => item.name || '—'},
    {header: 'Internet ID', render: item => item.internetId || '—'},
    {header: 'Amount (PKR)', align: 'right', render: item => item.amount.toLocaleString()},
    {header: 'Address', render: item => item.address || '—'},
    {header: 'Sublocality', render: item => item.sublocality || '—'},
    {header: 'Connection Type', render: item => capitalize(item.connectionType)},
    {header: 'Recharge Date', render: item => formatDate(item.rechargeDate)},
  ];

  const sublocalityOptions = allSublocalities.map(loc => ({label: loc, value: loc}));
  const yearOptions = availableYears.map(y => ({label: y, value: y}));

  const resetFilters = () => {
    setFilterMonth(MONTH_NAMES[new Date().getMonth()]);
    setFilterYear(String(new Date().getFullYear()));
    setReportType('all');
    setSublocality('all');
    setConnectionType('both');
    setHistoryFromDate(`${new Date().getFullYear()}-01-01`);
    setHistoryToDate(`${new Date().getFullYear()}-12-31`);
    setShowReport(false);
    setCurrentPage(1);
  };

  return (
    <ReportLayout
      title="Not Generated Collections"
      subtitle="Subscribers whose collections were not generated for the selected month"
      icon={FileX2}
      accent={ACCENT}
      refreshing={refreshing}
      onRefresh={() => load(true)}>
      <KpiRow>
        <KpiCard label="Total Records" value={filteredData.length} icon={FileX2} bg="#FFE4E6" fg="#E11D48" />
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
            <Text style={styles.label}>Month</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setMonthPicker(true)} activeOpacity={0.85}>
              <Text style={styles.selectText} numberOfLines={1}>
                {filterMonth}
              </Text>
              <ChevronDown size={15} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>Year</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setYearPicker(true)} activeOpacity={0.85}>
              <Text style={styles.selectText} numberOfLines={1}>
                {filterYear}
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
            <Text style={styles.label}>From Date</Text>
            <TextInput
              style={styles.input}
              value={historyFromDate}
              onChangeText={setHistoryFromDate}
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
              value={historyToDate}
              onChangeText={setHistoryToDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </ScrollView>
        <View style={styles.applyRow}>
          <GreenButton
            label="Show Report"
            icon={FileX2}
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
        visible={monthPicker}
        title="Select Month"
        options={MONTH_OPTIONS}
        value={filterMonth}
        onSelect={setFilterMonth}
        onClose={() => setMonthPicker(false)}
      />
      <OptionPickerSheet
        visible={yearPicker}
        title="Select Year"
        options={yearOptions}
        value={filterYear}
        onSelect={setFilterYear}
        onClose={() => setYearPicker(false)}
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
              <Text style={styles.listTitle}>Not Generated Collection History</Text>
              <Text style={styles.listCount}>
                Month: {filterMonth} {filterYear} — From: {historyFromDate || '—'} — To: {historyToDate || '—'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.printBtn, !showReport && styles.printBtnDisabled]}
              onPress={() => setPrintOpen(true)}
              disabled={!showReport}
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
        ) : !showReport ? (
          <View style={styles.empty}>
            <FileX2 size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>Select filters and press Show Report</Text>
            <Text style={styles.emptySub}>Generate the not generated collections report.</Text>
          </View>
        ) : paginated.length === 0 ? (
          <View style={styles.empty}>
            <Search size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>No not generated collections found</Text>
            <Text style={styles.emptySub}>Try adjusting the filters.</Text>
          </View>
        ) : (
          paginated.map((item, index) => (
            <View key={item.id} style={styles.logCard}>
              <View style={styles.logTop}>
                <View style={styles.subInfo}>
                  <Text style={styles.subName} numberOfLines={1}>
                    {item.name || '—'}
                  </Text>
                  <Text style={styles.subId} numberOfLines={1}>
                    {item.internetId || '—'}
                  </Text>
                </View>
                <View style={styles.amountBadge}>
                  <Text style={styles.amountBadgeText}>PKR {item.amount.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Recharge Date</Text>
                  <Text style={styles.metaValue}>{formatDate(item.rechargeDate)}</Text>
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
        title="NOT GENERATED COLLECTIONS"
        subtitle={`Month: ${filterMonth} ${filterYear} — From: ${historyFromDate || '—'} — To: ${historyToDate || '—'}`}
        accent="#E11D48"
        emptyMessage="No not generated collections found for the selected criteria."
        jobName="Not-Generated-Collections-Report"
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
  printBtnDisabled: {opacity: 0.5},
  printBtnText: {fontSize: 12, fontWeight: '700', color: '#F43F5E'},
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
    backgroundColor: '#FFE4E6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  amountBadgeText: {fontSize: 12, fontWeight: '700', color: '#BE123C'},
  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 10},
  metaItem: {flexBasis: '45%', flexGrow: 1},
  metaItemWide: {flexBasis: '100%'},
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
  pageSizeChipActive: {borderColor: '#F43F5E', backgroundColor: '#FFF1F2'},
  pageSizeText: {fontSize: 12, color: '#6B7280'},
  pageSizeTextActive: {color: '#E11D48', fontWeight: '700'},
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
