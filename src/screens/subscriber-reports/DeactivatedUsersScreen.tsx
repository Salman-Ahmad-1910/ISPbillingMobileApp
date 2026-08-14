import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {UserX, Filter, Search, BadgePercent, ChevronDown, Printer} from 'lucide-react-native';
import {getConnections} from '../../api/connections';
import ReportLayout, {KpiRow, KpiCard} from '../../components/ReportLayout';
import OptionPickerSheet from '../../components/OptionPickerSheet';
import SubscriberReportPrintModal, {PrintColumn} from '../../components/SubscriberReportPrintModal';

const ACCENT: [string, string] = ['#EF4444', '#E11D48'];

const CONNECTION_OPTIONS = [
  {label: 'Both', value: 'both'},
  {label: 'Internet', value: 'internet'},
  {label: 'TV Cable', value: 'tv_cable'},
];

const BAD_DEBT_OPTIONS = [
  {label: 'All', value: 'all'},
  {label: 'Yes', value: 'yes'},
  {label: 'No', value: 'no'},
];

interface DeactivatedRecord {
  id: string;
  internetId: string;
  name: string;
  cnic: string;
  address: string;
  leavingDate: string;
  reason: string;
  comments: string;
  mobile: string;
  connectionType: string;
  amount: number;
  badDebt: boolean;
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

export default function DeactivatedUsersScreen() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [connectionType, setConnectionType] = useState('both');
  const [badDebtFilter, setBadDebtFilter] = useState('all');

  const [connectionPicker, setConnectionPicker] = useState(false);
  const [badDebtPicker, setBadDebtPicker] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getConnections();
      setConnections(data as any[]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load connections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deactivatedData: DeactivatedRecord[] = useMemo(
    () =>
      connections
        .filter((c: any) => c.status === 'deactivated')
        .map((c: any) => ({
          id: c.id,
          internetId: c.internetId || '',
          name: c.name || '',
          cnic: c.cnic || '',
          address: c.address || '',
          leavingDate: c.leavingDate || c.updatedAt || '',
          reason: c.deactivationReason || '',
          comments: c.comments || '',
          mobile: c.mobile || c.cell || '',
          connectionType: c.connectionType || 'both',
          amount: Number(c.remainingAmount) || 0,
          badDebt: !!c.badDebt,
        })),
    [connections],
  );

  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return deactivatedData.filter(item => {
      const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;
      const badDebtMatch =
        badDebtFilter === 'all' ||
        (badDebtFilter === 'yes' && item.badDebt) ||
        (badDebtFilter === 'no' && !item.badDebt);
      const searchMatch =
        !q ||
        `${item.name || ''} ${item.internetId || ''} ${item.cnic || ''} ${item.id || ''}`
          .toLowerCase()
          .includes(q);
      return connectionMatch && badDebtMatch && searchMatch;
    });
  }, [deactivatedData, connectionType, badDebtFilter, searchTerm]);

  const resetFilters = () => {
    setSearchTerm('');
    setConnectionType('both');
    setBadDebtFilter('all');
  };

  const printColumns: PrintColumn<DeactivatedRecord>[] = [
    {header: '#', render: (_: DeactivatedRecord, i: number) => i + 1},
    {header: 'Internet ID', render: item => item.internetId || '—'},
    {header: 'Name', render: item => item.name || '—'},
    {header: 'CNIC', render: item => item.cnic || '—'},
    {header: 'Address', render: item => item.address || '—'},
    {header: 'Leaving Date', render: item => formatDate(item.leavingDate)},
    {header: 'Reason', render: item => item.reason || '—'},
    {header: 'Mobile No', render: item => item.mobile || '—'},
    {header: 'Amount (PKR)', align: 'right', render: item => item.amount.toLocaleString()},
    {header: 'Bad Debt', render: item => (item.badDebt ? 'Yes' : 'No')},
  ];

  return (
    <ReportLayout
      title="Deactivate Users List"
      subtitle="View deactivated user accounts and their details"
      icon={UserX}
      accent={ACCENT}
      refreshing={refreshing}
      onRefresh={() => load(true)}>
      <KpiRow>
        <KpiCard label="Total Deactivated" value={filteredData.length} icon={UserX} bg="#FEE2E2" fg="#DC2626" />
      </KpiRow>

      <View style={styles.card}>
        <View style={styles.filterHeader}>
          <Filter size={15} color="#374151" />
          <Text style={styles.filterTitle}>Filters</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <View style={styles.filterField}>
            <Text style={styles.label}>Search</Text>
            <View style={styles.searchBox}>
              <Search size={14} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Name, ID, or CNIC..."
                placeholderTextColor="#9CA3AF"
              />
            </View>
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
            <Text style={styles.label}>Bad Debt</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setBadDebtPicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, badDebtFilter === 'all' && styles.placeholder]}>
                {BAD_DEBT_OPTIONS.find(o => o.value === badDebtFilter)?.label || badDebtFilter}
              </Text>
              <ChevronDown size={15} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </ScrollView>
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
      <OptionPickerSheet
        visible={badDebtPicker}
        title="Select Bad Debt"
        options={BAD_DEBT_OPTIONS}
        value={badDebtFilter}
        emptyLabel="All"
        onSelect={setBadDebtFilter}
        onClose={() => setBadDebtPicker(false)}
      />

      <View style={styles.card}>
        <View style={styles.listHeader}>
          <View style={styles.listHeaderInfo}>
            <Text style={styles.listTitle}>Deactivation History</Text>
            <Text style={styles.listCount}>{filteredData.length} deactivated subscribers</Text>
          </View>
          <View style={styles.listHeaderActions}>
            <TouchableOpacity style={styles.resetBtn} onPress={resetFilters} activeOpacity={0.85}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
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
            <UserX size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>No deactivated users found</Text>
            <Text style={styles.emptySub}>Try adjusting the filters.</Text>
          </View>
        ) : (
          filteredData.map(item => (
            <View key={item.id} style={styles.logCard}>
              <View style={styles.logTop}>
                <Text style={styles.subName} numberOfLines={1}>
                  {item.name || '—'}
                </Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{item.connectionType}</Text>
                </View>
              </View>
              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Internet ID</Text>
                  <Text style={styles.metaValue}>{item.internetId || '—'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>CNIC</Text>
                  <Text style={styles.metaValue}>{item.cnic || '—'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Leaving Date</Text>
                  <Text style={styles.metaValue}>{formatDate(item.leavingDate)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Mobile No</Text>
                  <Text style={styles.metaValue}>{item.mobile || '—'}</Text>
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
              <View style={styles.metaGrid}>
                <View style={styles.metaItemWide}>
                  <Text style={styles.metaLabel}>Reason</Text>
                  <Text style={styles.metaValue} numberOfLines={2}>
                    {item.reason || '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.metaGrid}>
                <View style={styles.metaItemWide}>
                  <Text style={styles.metaLabel}>Comments</Text>
                  <Text style={styles.metaValue} numberOfLines={2}>
                    {item.comments || '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.badgeRow}>
                <View style={styles.amountBox}>
                  <Text style={styles.amountLabel}>Amount</Text>
                  <Text style={styles.amountValue}>PKR {item.amount.toLocaleString()}</Text>
                </View>
                <View style={[styles.badDebtBox, item.badDebt ? styles.badDebtYes : styles.badDebtNo]}>
                  <BadgePercent size={12} color={item.badDebt ? '#B91C1C' : '#4B5563'} />
                  <Text style={[styles.badDebtText, {color: item.badDebt ? '#B91C1C' : '#4B5563'}]}>
                    {item.badDebt ? 'Bad Debt' : 'Not Bad Debt'}
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
        title="DEACTIVATED USERS REPORT"
        subtitle={`${filteredData.length} deactivated subscribers`}
        accent="#DC2626"
        emptyMessage="No deactivated user records found for the selected criteria."
        jobName="Deactivated-Users-Report"
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
  filterField: {width: 170},
  label: {fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 5},
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchInput: {flex: 1, paddingVertical: 9, fontSize: 13, color: '#111827'},
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
  listHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10},
  listHeaderInfo: {flex: 1},
  listHeaderActions: {flexDirection: 'row', alignItems: 'center', gap: 8},
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  printBtnText: {fontSize: 12, fontWeight: '700', color: '#EF4444'},
  listTitle: {fontSize: 15, fontWeight: '700', color: '#111827'},
  listCount: {fontSize: 12, color: '#6B7280', marginTop: 2},
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  resetText: {fontSize: 12, fontWeight: '600', color: '#374151'},
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
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {fontSize: 11, fontWeight: '700', color: '#DC2626', textTransform: 'capitalize'},
  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 10},
  metaItem: {flexBasis: '45%', flexGrow: 1},
  metaItemWide: {flexBasis: '100%'},
  metaLabel: {fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase'},
  metaValue: {fontSize: 13, color: '#111827', fontWeight: '500', marginTop: 1},
  badgeRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 8},
  amountBox: {flex: 1},
  amountLabel: {fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase'},
  amountValue: {fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 1},
  badDebtBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badDebtYes: {backgroundColor: '#FEE2E2'},
  badDebtNo: {backgroundColor: '#F3F4F6'},
  badDebtText: {fontSize: 11, fontWeight: '700'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyText: {fontSize: 15, fontWeight: '600', color: '#6B7280', marginTop: 10},
  emptySub: {fontSize: 12, color: '#9CA3AF', marginTop: 4},
});
