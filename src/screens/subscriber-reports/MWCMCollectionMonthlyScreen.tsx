import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {ChartBarBig, Filter, CheckCircle, ChevronDown, Printer} from 'lucide-react-native';
import {getPayments} from '../../api/billing';
import {getConnections} from '../../api/connections';
import ReportLayout, {KpiRow, KpiCard} from '../../components/ReportLayout';
import OptionPickerSheet from '../../components/OptionPickerSheet';
import SubscriberReportPrintModal, {PrintColumn} from '../../components/SubscriberReportPrintModal';

const ACCENT: [string, string] = ['#6366F1', '#3B82F6'];

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

interface MonthCollectionRecord {
  key: string;
  month: string;
  year: string;
  count: number;
  amount: number;
}

function januaryFirst(): string {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function MWCMCollectionMonthlyScreen() {
  const [payments, setPayments] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fromDate, setFromDate] = useState(januaryFirst);
  const [toDate, setToDate] = useState(today);
  const [connectionType, setConnectionType] = useState('both');

  const [connectionPicker, setConnectionPicker] = useState(false);
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

  const connTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    connections.forEach((c: any) => {
      if (c.id) {
        map[c.id] = c.connectionType || '';
      }
    });
    return map;
  }, [connections]);

  const allRecords: MonthCollectionRecord[] = useMemo(() => {
    const map = new Map<string, {count: number; amount: number}>();
    payments.forEach((p: any) => {
      const d = new Date(p.paymentDate);
      if (isNaN(d.getTime())) {
        return;
      }
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = map.get(key) || {count: 0, amount: 0};
      entry.count += 1;
      entry.amount += Number(p.amount) || 0;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, e]) => {
        const [yr, mth] = key.split('-');
        return {
          key,
          month: MONTH_NAMES[Number(mth) - 1] || mth,
          year: yr,
          count: e.count,
          amount: e.amount,
        };
      });
  }, [payments]);

  const filteredData = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

    const counts = new Map<string, number>();
    const amounts = new Map<string, number>();

    payments.forEach((p: any) => {
      const connType = connTypeMap[p.subscriberId || ''] || 'internet';
      const typeMatch = connectionType === 'both' || connType === connectionType;
      if (!typeMatch) {
        return;
      }
      const d = new Date(p.paymentDate);
      if (isNaN(d.getTime())) {
        return;
      }
      if (from && !isNaN(from.getTime()) && d < from) {
        return;
      }
      if (to && !isNaN(to.getTime()) && d > to) {
        return;
      }
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts.set(key, (counts.get(key) || 0) + 1);
      amounts.set(key, (amounts.get(key) || 0) + (Number(p.amount) || 0));
    });

    return allRecords
      .filter(r => counts.has(r.key))
      .map(r => ({...r, count: counts.get(r.key) || 0, amount: amounts.get(r.key) || 0}));
  }, [allRecords, payments, connTypeMap, connectionType, fromDate, toDate]);

  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const printColumns: PrintColumn<MonthCollectionRecord>[] = [
    {header: '#', render: (_: MonthCollectionRecord, i: number) => i + 1},
    {header: 'Month', render: item => item.month},
    {header: 'Year', render: item => item.year},
    {header: 'No. of Collections', align: 'right', render: item => item.count},
    {header: 'Total Amount (PKR)', align: 'right', render: item => item.amount.toLocaleString()},
  ];

  const resetFilters = () => {
    setFromDate(januaryFirst());
    setToDate(today());
    setConnectionType('both');
  };

  return (
    <ReportLayout
      title="Month Wise Collection Monthly"
      subtitle="Monthly collected money from all subscribers in a single entry per month"
      icon={ChartBarBig}
      accent={ACCENT}
      refreshing={refreshing}
      onRefresh={() => load(true)}>
      <KpiRow>
        <KpiCard label="Total Months" value={filteredData.length} icon={ChartBarBig} bg="#E0E7FF" fg="#6366F1" />
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
              <Text style={styles.listTitle}>Month Wise Collection Monthly List</Text>
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
            <ChartBarBig size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>No monthly collections found</Text>
            <Text style={styles.emptySub}>Try adjusting the filters.</Text>
          </View>
        ) : (
          filteredData.map((item, index) => (
            <View key={item.key} style={styles.logCard}>
              <View style={styles.logTop}>
                <View style={styles.monthInfo}>
                  <Text style={styles.subName} numberOfLines={1}>
                    {item.month} {item.year}
                  </Text>
                  <Text style={styles.subId} numberOfLines={1}>
                    #{index + 1}
                  </Text>
                </View>
                <View style={styles.amountBadge}>
                  <Text style={styles.amountBadgeText}>PKR {item.amount.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Month</Text>
                  <Text style={styles.metaValue}>{item.month}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Year</Text>
                  <Text style={styles.metaValue}>{item.year}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>No. of Collections</Text>
                  <Text style={styles.metaValue}>{item.count}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Total Amount</Text>
                  <Text style={styles.metaValue}>PKR {item.amount.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <SubscriberReportPrintModal
        visible={printOpen}
        onClose={() => setPrintOpen(false)}
        title="MONTH WISE COLLECTION MONTHLY"
        subtitle={`From: ${fromDate || '—'} — To: ${toDate || '—'}`}
        accent="#4F46E5"
        emptyMessage="No monthly collections found for the selected criteria."
        jobName="Month-Wise-Collection-Monthly-Report"
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
  monthInfo: {flex: 1, marginRight: 8},
  subName: {fontSize: 14, fontWeight: '700', color: '#111827'},
  subId: {fontSize: 12, color: '#6B7280', fontFamily: 'monospace', marginTop: 1},
  amountBadge: {
    backgroundColor: '#E0E7FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  amountBadgeText: {fontSize: 12, fontWeight: '700', color: '#4338CA'},
  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 10},
  metaItem: {flexBasis: '45%', flexGrow: 1},
  metaLabel: {fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase'},
  metaValue: {fontSize: 13, color: '#111827', fontWeight: '500', marginTop: 1},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyText: {fontSize: 15, fontWeight: '600', color: '#6B7280', marginTop: 10},
  emptySub: {fontSize: 12, color: '#9CA3AF', marginTop: 4},
});
