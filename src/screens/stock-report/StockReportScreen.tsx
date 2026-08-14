import React, {useCallback, useMemo, useState} from 'react';
import {View, Text, TouchableOpacity, ScrollView, StyleSheet} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  Warehouse,
  Boxes,
  Package,
  DollarSign,
  Eye,
  CalendarDays,
  ChevronDown,
  Inbox,
} from 'lucide-react-native';
import ReportLayout, {KpiRow, KpiCard, GreenButton} from '../../components/ReportLayout';
import OptionPickerSheet from '../../components/OptionPickerSheet';
import {getPurchasedProducts} from '../../api/inventory';
import {PurchasedProduct} from '../../types';

const ACCENT: [string, string] = ['#0284C7', '#2563EB'];

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

function fmtMoney(n: number) {
  return (Number(n) || 0).toLocaleString();
}

export default function StockReportScreen() {
  const [products, setProducts] = useState<PurchasedProduct[]>([]);
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
      setProducts(await getPurchasedProducts());
    } catch {
      setProducts([]);
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
    return (products || []).filter(p => (p.purchaseDate || '').startsWith(month));
  }, [products, showReport, month]);

  const totalStock = filteredData.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const totalValue = filteredData.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0);

  const resetReport = () => {
    setShowReport(false);
  };

  return (
    <ReportLayout
      title="Abstract Stock"
      subtitle="View monthly stock summary across all products"
      icon={Warehouse}
      accent={ACCENT}
      refreshing={refreshing}
      onRefresh={() => fetchData(true)}>
      <KpiRow>
        <KpiCard
          label="Total Items"
          value={filteredData.length.toLocaleString()}
          icon={Boxes}
          bg="#E0F2FE"
          fg="#0284C7"
        />
        <KpiCard
          label="Total Stock"
          value={totalStock.toLocaleString()}
          icon={Package}
          bg="#D1FAE5"
          fg="#059669"
        />
        <KpiCard
          label="Total Value"
          value={`PKR ${fmtMoney(totalValue)}`}
          icon={DollarSign}
          bg="#EDE9FE"
          fg="#7C3AED"
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
              <Text style={styles.listTitle}>Stock for {monthLabel(month)}</Text>
              <Text style={styles.listCount}>
                {filteredData.length} item{filteredData.length === 1 ? '' : 's'} found
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.center}>
              <Inbox size={28} color="#9CA3AF" />
              <Text style={styles.emptyText}>Loading stock data...</Text>
            </View>
          ) : filteredData.length === 0 ? (
            <View style={styles.center}>
              <Package size={28} color="#9CA3AF" />
              <Text style={styles.emptyText}>No stock found for {monthLabel(month)}.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.tableHead}>
                  <Text style={[styles.th, styles.thIndex]}>#</Text>
                  <Text style={styles.th}>Product</Text>
                  <Text style={styles.th}>Vendor</Text>
                  <Text style={styles.th}>Purchase Date</Text>
                  <Text style={styles.th}>Batch</Text>
                  <Text style={styles.th}>SN / MAC</Text>
                  <Text style={[styles.th, styles.thCenter]}>Stock</Text>
                  <Text style={[styles.th, styles.thRight]}>Price (PKR)</Text>
                </View>
                {filteredData.map((item, index) => (
                  <View key={item.purchaseItemId || item.id} style={styles.tableRow}>
                    <Text style={[styles.td, styles.thIndex, styles.tdDim]}>{index + 1}</Text>
                    <Text style={[styles.td, styles.tdStrong]} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.td} numberOfLines={1}>{item.vendorName || '—'}</Text>
                    <Text style={[styles.td, styles.tdDim]}>{item.purchaseDate || '—'}</Text>
                    <Text style={[styles.td, styles.tdDim]} numberOfLines={1}>{item.batch || '—'}</Text>
                    <Text style={[styles.td, styles.tdMono, styles.tdDim]} numberOfLines={1}>
                      {item.serialNumber || '—'}
                    </Text>
                    <Text style={[styles.td, styles.tdCenter, styles.tdStrong]}>
                      {Number(item.stock) || 0}
                    </Text>
                    <Text style={[styles.td, styles.tdRight, styles.tdStrong]}>
                      {fmtMoney(item.price)}
                    </Text>
                  </View>
                ))}
                <View style={[styles.tableRow, styles.tableFoot]}>
                  <Text style={[styles.td, styles.tdStrong, styles.tdRight, styles.footLabel]}>
                    Total
                  </Text>
                  <Text style={[styles.td, styles.tdCenter, styles.tdStrong]}>{totalStock.toLocaleString()}</Text>
                  <Text style={[styles.td, styles.tdRight, styles.tdStrong]}>{fmtMoney(totalValue)}</Text>
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
    minWidth: 100,
    maxWidth: 130,
  },
  thIndex: {minWidth: 32, maxWidth: 32},
  thCenter: {textAlign: 'center'},
  thRight: {textAlign: 'right'},
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 6,
  },
  tableFoot: {backgroundColor: '#F0F9FF', borderBottomWidth: 0},
  footLabel: {flexGrow: 1},
  td: {
    fontSize: 12,
    color: '#374151',
    paddingHorizontal: 10,
    minWidth: 100,
    maxWidth: 130,
  },
  tdMono: {fontFamily: 'monospace'},
  tdDim: {color: '#6B7280'},
  tdStrong: {fontWeight: '700'},
  tdCenter: {textAlign: 'center'},
  tdRight: {textAlign: 'right'},
});
