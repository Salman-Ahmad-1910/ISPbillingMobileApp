import React, {useCallback, useMemo, useState} from 'react';
import {View, Text, TouchableOpacity, ScrollView, StyleSheet} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  Receipt,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Eye,
  CalendarDays,
  ChevronDown,
  Package,
  Inbox,
} from 'lucide-react-native';
import ReportLayout, {KpiRow, KpiCard, GreenButton} from '../../components/ReportLayout';
import OptionPickerSheet from '../../components/OptionPickerSheet';
import {getSales} from '../../api/subscribers';
import {Sale, SaleItem} from '../../types';

const ACCENT: [string, string] = ['#0D9488', '#059669'];

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function monthOptions(count = 24) {
  const options: {label: string; value: string}[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    options.push({
      label: `${MONTH_LABELS[d.getMonth()]} ${y}`,
      value: `${y}-${m}`,
    });
  }
  return options;
}

function monthLabel(value: string) {
  if (!value) return '';
  const [y, m] = value.split('-').map(Number);
  return `${MONTH_LABELS[(m || 1) - 1]} ${y}`;
}

function fmtDate(value: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${String(d.getDate()).padStart(2, '0')} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtMoney(n: number) {
  return (Number(n) || 0).toLocaleString();
}

export default function SaleReportScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthPicker, setMonthPicker] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      setSales(await getSales());
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const filteredData = useMemo(() => {
    if (!showReport) return [];
    return (sales || []).filter(s => {
      const d = new Date(s.date);
      if (Number.isNaN(d.getTime())) return false;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === month;
    });
  }, [sales, showReport, month]);

  const totalRevenue = filteredData.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const totalTax = filteredData.reduce((sum, s) => sum + (Number(s.taxAmount) || 0), 0);

  const resetReport = () => {
    setShowReport(false);
  };

  return (
    <ReportLayout
      title="Abstract Sale"
      subtitle="View monthly sales summary across all transactions"
      icon={Receipt}
      accent={ACCENT}
      refreshing={refreshing}
      onRefresh={() => fetchData(true)}>
      <KpiRow>
        <KpiCard
          label="Total Sales"
          value={filteredData.length.toLocaleString()}
          icon={ShoppingCart}
          bg="#CCFBF1"
          fg="#0D9488"
        />
        <KpiCard
          label="Total Revenue"
          value={`PKR ${fmtMoney(totalRevenue)}`}
          icon={TrendingUp}
          bg="#D1FAE5"
          fg="#059669"
        />
        <KpiCard
          label="Total Tax"
          value={`PKR ${fmtMoney(totalTax)}`}
          icon={DollarSign}
          bg="#DBEAFE"
          fg="#2563EB"
        />
      </KpiRow>

      <View style={styles.card}>
        <View style={styles.filterHeader}>
          <CalendarDays size={15} color="#374151" />
          <Text style={styles.filterTitle}>Report Filters</Text>
        </View>
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <Text style={styles.label}>Month</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setMonthPicker(true)}
              activeOpacity={0.85}>
              <Text style={styles.selectText}>{monthLabel(month)}</Text>
              <ChevronDown size={15} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.applyRow}>
          <GreenButton label="Show Report" icon={Eye} onPress={() => setShowReport(true)} />
          {showReport ? (
            <TouchableOpacity style={styles.resetBtn} onPress={resetReport} activeOpacity={0.85}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {showReport ? (
        <View style={styles.card}>
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.listTitle}>Sales for {monthLabel(month)}</Text>
              <Text style={styles.listCount}>
                {filteredData.length} sale{filteredData.length === 1 ? '' : 's'} found
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.center}>
              <Inbox size={28} color="#9CA3AF" />
              <Text style={styles.emptyText}>Loading sales data...</Text>
            </View>
          ) : filteredData.length === 0 ? (
            <View style={styles.center}>
              <Package size={28} color="#9CA3AF" />
              <Text style={styles.emptyText}>No sales found for {monthLabel(month)}.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.tableHead}>
                  <Text style={[styles.th, styles.thIndex]}>#</Text>
                  <Text style={styles.th}>Date</Text>
                  <Text style={styles.th}>Customer</Text>
                  <Text style={styles.th}>Payment Method</Text>
                  <Text style={styles.th}>Items</Text>
                  <Text style={[styles.th, styles.thRight]}>Total (PKR)</Text>
                  <Text style={[styles.th, styles.thRight]}>Tax (PKR)</Text>
                </View>
                {filteredData.map((item, index) => {
                  const items = (item.items || []) as SaleItem[];
                  const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
                  const summary = items.slice(0, 2)
                    .map(it => `${it.productName} x${it.quantity}`)
                    .join(', ');
                  return (
                    <View key={item.id} style={styles.tableRow}>
                      <Text style={[styles.td, styles.thIndex]}>{index + 1}</Text>
                      <Text style={[styles.td, styles.tdDim]}>{fmtDate(item.date)}</Text>
                      <Text style={[styles.td, styles.tdStrong]}>{item.subscriberName || 'Unknown'}</Text>
                      <Text style={styles.td}>
                        {item.paymentMethod || '—'}
                        {item.isInstallment ? ' (Installment)' : ''}
                      </Text>
                      <View style={[styles.td, styles.tdWrap]}>
                        <Text style={styles.td}>
                          {totalQty} item{totalQty === 1 ? '' : 's'}
                        </Text>
                        <Text style={styles.tdDim} numberOfLines={1}>
                          {summary}
                          {items.length > 2 ? '...' : ''}
                        </Text>
                      </View>
                      <Text style={[styles.td, styles.tdRight, styles.tdStrong]}>
                        {fmtMoney(item.totalAmount)}
                      </Text>
                      <Text style={[styles.td, styles.tdRight, styles.tdDim]}>
                        {fmtMoney(item.taxAmount)}
                      </Text>
                    </View>
                  );
                })}
                <View style={[styles.tableRow, styles.tableFoot]}>
                  <Text style={[styles.td, styles.tdStrong, styles.tdRight, styles.footLabel]}>
                    Total
                  </Text>
                  <Text style={[styles.td, styles.tdStrong, styles.tdRight]}>{fmtMoney(totalRevenue)}</Text>
                  <Text style={[styles.td, styles.tdStrong, styles.tdRight]}>{fmtMoney(totalTax)}</Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      ) : null}

      <OptionPickerSheet
        visible={monthPicker}
        title="Select Month"
        options={monthOptions()}
        value={month}
        onSelect={setMonth}
        onClose={() => setMonthPicker(false)}
      />
    </ReportLayout>
  );
}

const styles = StyleSheet.create({
  center: {paddingVertical: 40, justifyContent: 'center', alignItems: 'center', gap: 8},
  emptyText: {fontSize: 13, color: '#9CA3AF'},
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
  filterRow: {flexDirection: 'row', gap: 10},
  filterField: {flex: 1},
  label: {fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 5},
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
  applyRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12},
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  resetText: {fontSize: 13, fontWeight: '600', color: '#374151'},
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listTitle: {fontSize: 15, fontWeight: '700', color: '#111827'},
  listCount: {fontSize: 12, color: '#6B7280', marginTop: 2},
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  th: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 110,
    maxWidth: 150,
  },
  thIndex: {minWidth: 32, maxWidth: 32},
  thRight: {textAlign: 'right'},
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 6,
  },
  tableFoot: {backgroundColor: '#F0FDFA', borderBottomWidth: 0},
  footLabel: {flexGrow: 1},
  td: {
    fontSize: 12,
    color: '#374151',
    paddingHorizontal: 10,
    minWidth: 110,
    maxWidth: 150,
  },
  tdWrap: {minWidth: 150, maxWidth: 150},
  tdDim: {color: '#6B7280'},
  tdStrong: {fontWeight: '700'},
  tdRight: {textAlign: 'right'},
});
