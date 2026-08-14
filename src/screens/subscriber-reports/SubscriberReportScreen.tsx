import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {Wallet, Filter, Search, CheckCircle, Trash2, ChevronDown, X} from 'lucide-react-native';
import {getPayments, deletePayment} from '../../api/billing';
import ReportLayout, {KpiRow, KpiCard, GreenButton} from '../../components/ReportLayout';
import OptionPickerSheet from '../../components/OptionPickerSheet';

const ACCENT: [string, string] = ['#3B82F6', '#0891B2'];
const PAGE_SIZES = [10, 50, 100];

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

interface CollectionRecord {
  id: string;
  subscriberName: string;
  connectionId: string;
  billId: number;
  amount: number;
  collectionDate: string;
  address: string;
  sublocality: string;
  connectionType: string;
  collectedBy: string;
  method: string;
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

export default function SubscriberReportScreen() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportType, setReportType] = useState('all');
  const [sublocality, setSublocality] = useState('all');
  const [connectionType, setConnectionType] = useState('both');
  const [selectedUser, setSelectedUser] = useState('all');

  const [sublocalityPicker, setSublocalityPicker] = useState(false);
  const [reportTypePicker, setReportTypePicker] = useState(false);
  const [connectionPicker, setConnectionPicker] = useState(false);
  const [userPicker, setUserPicker] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getPayments();
      setPayments(data as any[]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load payments');
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
    payments.forEach((p: any) => {
      const loc = p.areaName;
      if (loc) set.add(loc);
    });
    return Array.from(set);
  }, [payments]);

  const allUsers = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p: any) => {
      const user = p.collectedByName || p.method;
      if (user) set.add(user);
    });
    return Array.from(set);
  }, [payments]);

  const data: CollectionRecord[] = useMemo(
    () =>
      payments.map((p: any) => ({
        id: p.id,
        subscriberName: p.subscriberName || p.subscriber?.name || '',
        connectionId: p.connectionId || p.subscriberId || '',
        billId: Number(p.billNo) || 0,
        amount: Number(p.amount) || 0,
        collectionDate: p.paymentDate || p.created_at || p.createdAt || '',
        address: p.address || '',
        sublocality: p.areaName || '',
        connectionType: p.connectionType || p.subscriber?.connectionType || 'internet',
        collectedBy: p.collectedByName || '',
        method: p.method || 'cash',
      })),
    [payments],
  );

  const filteredData = useMemo(() => {
    if (!showReport) {
      return [];
    }
    return data.filter(item => {
      const itemDate = new Date(item.collectionDate);
      const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
      const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
      if (from && !isNaN(from.getTime()) && itemDate < from) return false;
      if (to && !isNaN(to.getTime()) && itemDate > to) return false;
      if (reportType !== 'all' && item.connectionType !== reportType) return false;
      if (connectionType !== 'both' && item.connectionType !== connectionType) return false;
      if (sublocality !== 'all' && item.sublocality !== sublocality) return false;
      if (selectedUser !== 'all' && item.collectedBy !== selectedUser) return false;
      return true;
    });
  }, [data, fromDate, toDate, reportType, connectionType, sublocality, selectedUser, showReport]);

  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filteredData.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleDelete = (item: CollectionRecord) => {
    Alert.alert(
      'Delete Entry',
      `Delete the collection entry for "${item.subscriberName}" (Bill #${item.billId || '-'})? This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id);
            try {
              await deletePayment(item.id);
              Alert.alert('Deleted', 'Collection entry deleted successfully.');
              load();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete entry');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setReportType('all');
    setSublocality('all');
    setConnectionType('both');
    setSelectedUser('all');
    setShowReport(false);
    setCurrentPage(1);
  };

  const sublocalityOptions = allSublocalities.map(loc => ({label: loc, value: loc}));
  const userOptions = allUsers.map(user => ({label: user, value: user}));

  return (
    <ReportLayout
      title="Subscriber Report"
      subtitle="View and manage subscriber collections"
      icon={Wallet}
      accent={ACCENT}
      refreshing={refreshing}
      onRefresh={() => load(true)}>
      <KpiRow>
        <KpiCard label="Total Records" value={filteredData.length} icon={CheckCircle} bg="#DBEAFE" fg="#2563EB" />
        <KpiCard
          label="Total Amount"
          value={`PKR ${totalAmount.toLocaleString()}`}
          icon={Wallet}
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
            <Text style={styles.label}>Report Type</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setReportTypePicker(true)} activeOpacity={0.85}>
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
            <Text style={styles.label}>Collected By</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setUserPicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, selectedUser === 'all' && styles.placeholder]} numberOfLines={1}>
                {selectedUser === 'all'
                  ? 'All'
                  : userOptions.find(o => o.value === selectedUser)?.label || selectedUser}
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
            <X size={15} color="#374151" />
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
        visible={reportTypePicker}
        title="Select Report Type"
        options={TYPE_OPTIONS}
        value={reportType}
        emptyLabel="All"
        onSelect={setReportType}
        onClose={() => setReportTypePicker(false)}
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
        title="Select Collected By"
        options={userOptions}
        value={selectedUser}
        emptyLabel="All"
        onSelect={setSelectedUser}
        onClose={() => setUserPicker(false)}
      />

      <View style={styles.card}>
        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listTitle}>Collection History</Text>
            <Text style={styles.listCount}>
              {showReport
                ? `From: ${fromDate || '—'} — To: ${toDate || '—'}`
                : 'Select the filters above and press Show Report to generate the report.'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={ACCENT[0]} />
          </View>
        ) : !showReport ? (
          <View style={styles.empty}>
            <Wallet size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>Select filters and press Show Report</Text>
            <Text style={styles.emptySub}>Generate the subscriber collection report.</Text>
          </View>
        ) : paginated.length === 0 ? (
          <View style={styles.empty}>
            <Search size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>No collection records found</Text>
            <Text style={styles.emptySub}>Try adjusting the filters.</Text>
          </View>
        ) : (
          paginated.map(item => (
            <View key={item.id} style={styles.logCard}>
              <View style={styles.logTop}>
                <Text style={styles.subName} numberOfLines={1}>
                  {item.subscriberName || '—'}
                </Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{item.connectionType}</Text>
                </View>
              </View>
              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Bill ID</Text>
                  <Text style={styles.metaValue}>{item.billId > 0 ? item.billId : '—'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Amount</Text>
                  <Text style={styles.metaValue}>PKR {item.amount.toLocaleString()}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Collection Date</Text>
                  <Text style={styles.metaValue}>{formatDate(item.collectionDate)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Received By</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {item.method || '—'}
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
                <View style={styles.metaItemWide}>
                  <Text style={styles.metaLabel}>Collected By</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {item.collectedBy || '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.restoreRow}>
                <TouchableOpacity
                  style={[styles.deleteBtn, deletingId === item.id && styles.btnDisabled]}
                  onPress={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  activeOpacity={0.85}>
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <>
                      <Trash2 size={14} color="#DC2626" />
                      <Text style={styles.deleteText}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
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
  subName: {fontSize: 14, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8},
  typeBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {fontSize: 11, fontWeight: '700', color: '#2563EB', textTransform: 'capitalize'},
  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 10},
  metaItem: {flexBasis: '45%', flexGrow: 1},
  metaItemWide: {flexBasis: '100%'},
  metaLabel: {fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase'},
  metaValue: {fontSize: 13, color: '#111827', fontWeight: '500', marginTop: 1},
  restoreRow: {flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10},
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteText: {fontSize: 12, fontWeight: '700', color: '#DC2626'},
  btnDisabled: {opacity: 0.5},
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
  pageSizeChipActive: {borderColor: '#2563EB', backgroundColor: '#EFF6FF'},
  pageSizeText: {fontSize: 12, color: '#6B7280'},
  pageSizeTextActive: {color: '#2563EB', fontWeight: '700'},
  pageNav: {flexDirection: 'row', alignItems: 'center', gap: 6},
  pageNavBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pageNavText: {fontSize: 12, fontWeight: '600', color: '#374151'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyText: {fontSize: 15, fontWeight: '600', color: '#6B7280', marginTop: 10},
  emptySub: {fontSize: 12, color: '#9CA3AF', marginTop: 4},
});
