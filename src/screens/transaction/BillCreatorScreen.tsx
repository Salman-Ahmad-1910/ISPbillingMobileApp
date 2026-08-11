import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import {useFocusEffect, useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  FileText,
  PlusCircle,
  Trash2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import {useAuth} from '../../context/AuthContext';
import {getConnections} from '../../api/connections';
import {areasApi} from '../../api/network';
import {createBills, deleteBills} from '../../api/billing';
import {Connection, Area} from '../../types';
import {GradientView} from '../../components/GradientView';
import {GradientButton} from '../../components/GradientButton';
import {BillInvoiceModal, BillInvoiceRow} from '../../components/BillInvoiceModal';

const PAGE_SIZES = [10, 50, 100];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BILL_TYPE_OPTIONS = [
  {id: 'all', name: 'All'},
  {id: 'both', name: 'Both'},
  {id: 'internet', name: 'Internet'},
  {id: 'tv_cable', name: 'Cable'},
];

const TYPE_LABELS: Record<string, string> = {
  tv_cable: 'Cable',
  internet: 'Internet',
  both: 'Both',
};

function getCurrentMonthYear(): {month: string; year: string} {
  const now = new Date();
  return {month: MONTHS[now.getMonth()], year: String(now.getFullYear())};
}

function getMonthYear(dateStr?: string): {month: string; year: string} | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return {month: MONTHS[d.getMonth()], year: String(d.getFullYear())};
}

function formatMoney(n: number): string {
  return `PKR ${(Number.isFinite(n) ? n : 0).toLocaleString()}`;
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function DoorMenuIcon({open}: {open: boolean}) {
  const slide = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [open, slide]);

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [-3, 3],
  });

  return (
    <View style={styles.doorIconBox}>
      <Animated.View style={[styles.doorIconLine, {transform: [{translateX}]}]} />
    </View>
  );
}

function BillCreatorDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="billCreatorGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8B5CF6" stopOpacity={1} />
            <Stop offset="0.7" stopColor="#7C3AED" stopOpacity={0.6} />
            <Stop offset="1" stopColor="#7C3AED" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#billCreatorGrad)" />
      </Svg>
    </View>
  );
}

type SelectSheetState = {
  title: string;
  options: {id: string; name: string}[];
  selected: string;
  onSelect: (v: string) => void;
} | null;

interface BillRow {
  id: string;
  month: string;
  year: string;
  amount: number;
  subscribers: number;
  connectionType: string;
  sublocality: string;
  status: 'Created' | 'Deleted';
  date: string;
  createdBy: string;
  connections: Connection[];
}

export default function BillCreatorScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const {user, companies, companyId} = useAuth();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [filterMonth, setFilterMonth] = useState(() => getCurrentMonthYear().month);
  const [filterYear, setFilterYear] = useState(() => getCurrentMonthYear().year);
  const [filterBillType, setFilterBillType] = useState('all');
  const [filterSublocality, setFilterSublocality] = useState('all');

  const [monthSheet, setMonthSheet] = useState<SelectSheetState>(null);
  const [yearSheet, setYearSheet] = useState<SelectSheetState>(null);
  const [billTypeSheet, setBillTypeSheet] = useState<SelectSheetState>(null);
  const [sublocalitySheet, setSublocalitySheet] = useState<SelectSheetState>(null);

  const [invoiceData, setInvoiceData] = useState<{
    rows: BillInvoiceRow[];
    month: string;
    year: string;
    billTypeLabel: string;
    areaLabel: string;
  } | null>(null);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  const openDrawer = () => {
    nav.dispatch(DrawerActions.openDrawer());
  };

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [connData, areaData] = await Promise.all([
        getConnections().catch(() => [] as Connection[]),
        areasApi.list().catch(() => [] as Area[]),
      ]);
      setConnections(connData || []);
      setAreas(areaData || []);
    } catch {
      Alert.alert('Error', 'Failed to load bill creator data');
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

  useEffect(() => {
    setCurrentPage(1);
  }, [filterMonth, filterYear, filterBillType, filterSublocality]);

  const currentCompany = useMemo(() => {
    return companies.find(c => c.id === companyId) || null;
  }, [companies, companyId]);

  const companyName = useMemo(() => {
    return user?.company?.name || currentCompany?.name || 'Unknown';
  }, [user, currentCompany]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(String(new Date().getFullYear()));
    connections.forEach(c => {
      const my = getMonthYear(c.rechargeDate || c.installationDate);
      if (my) {
        years.add(my.year);
      }
    });
    return Array.from(years).sort().reverse();
  }, [connections]);

  const billRows = useMemo(() => {
    const groups: Record<
      string,
      {amount: number; subscribers: number; connectionType: string; sublocality: string; connections: Connection[]}
    > = {};

    const isDefaultView = filterSublocality === 'all' && filterBillType === 'all';
    const selectedMonth = filterMonth === 'all' ? getCurrentMonthYear().month : filterMonth;
    const selectedYear = filterYear === 'all' ? getCurrentMonthYear().year : filterYear;

    connections.forEach(c => {
      if (filterSublocality !== 'all' && c.sublocalityId !== filterSublocality) return;

      const area = areas.find(a => a.id === c.sublocalityId);
      const subName = area?.subLocality || area?.locality || 'Unknown';

      const typeLabel = TYPE_LABELS[c.connectionType] || 'Both';

      if (filterBillType !== 'all') {
        const typeMap: Record<string, string> = {
          internet: 'Internet',
          tv_cable: 'Cable',
          both: 'Both',
        };
        if (typeLabel !== typeMap[filterBillType]) return;
      }

      let groupKey: string;
      if (isDefaultView) {
        groupKey = typeLabel;
      } else if (filterSublocality === 'all') {
        groupKey = `${selectedMonth}_${selectedYear}_${typeLabel}`;
      } else {
        groupKey = `${selectedMonth}_${selectedYear}_${typeLabel}_${c.sublocalityId || 'all'}`;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          amount: 0,
          subscribers: 0,
          connectionType: typeLabel,
          sublocality: isDefaultView ? 'All' : subName,
          connections: [],
        };
      }

      if (c.connectionType === 'tv_cable') {
        groups[groupKey].amount += Number(c.amount) || 0;
      } else if (c.connectionType === 'internet') {
        groups[groupKey].amount += Number(c.sameAmount) || 0;
      } else {
        groups[groupKey].amount += (Number(c.amount) || 0) + (Number(c.sameAmount) || 0);
      }

      groups[groupKey].subscribers += 1;
      groups[groupKey].connections.push(c);
    });

    return Object.entries(groups).map(([, group], idx) => ({
      id: `BC-${String(idx + 1).padStart(4, '0')}`,
      month: selectedMonth,
      year: selectedYear,
      amount: group.amount,
      subscribers: group.subscribers,
      connectionType: group.connectionType,
      sublocality: group.sublocality,
      status: 'Created' as const,
      date: new Date().toISOString().split('T')[0],
      createdBy: companyName,
      connections: group.connections,
    }));
  }, [connections, areas, companyName, filterMonth, filterYear, filterBillType, filterSublocality]);

  const totalSubscribers = useMemo(
    () => billRows.reduce((sum, r) => sum + r.subscribers, 0),
    [billRows],
  );

  const totalPages = Math.max(1, Math.ceil(billRows.length / pageSize));
  const paginatedData = billRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getVisiblePages = () => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, currentPage + 1);
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  };

  const handlePageSubmit = () => {
    const n = parseInt(pageInput, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= totalPages) {
      setCurrentPage(n);
    }
    setPageInput('');
  };

  const buildGroupedBills = () =>
    billRows.map(row => ({
      connectionIds: row.connections.map(c => c.id),
      connectionType: row.connectionType,
      amount: row.amount,
      subscribers: row.subscribers,
      sublocality: row.sublocality,
    }));

  const handleCreate = async () => {
    if (billRows.length === 0) {
      Alert.alert('No subscribers', 'No subscribers match the current filters.');
      return;
    }
    if (!companyId) {
      Alert.alert('Error', 'Company not selected.');
      return;
    }
    Alert.alert(
      'Create Bills',
      `Create ${billRows.length} bill entry(ies) for ${totalSubscribers} subscriber(s)?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Create',
          onPress: async () => {
            setIsCreating(true);
            try {
              await createBills(companyId, {
                groupedBills: buildGroupedBills(),
                month: filterMonth === 'all' ? undefined : filterMonth,
                year: filterYear === 'all' ? undefined : filterYear,
                billType: filterBillType === 'all' ? undefined : filterBillType,
                sublocalityId: filterSublocality === 'all' ? undefined : filterSublocality,
              });
              setInvoiceData({
                rows: billRows.map(row => ({
                  id: row.id,
                  month: row.month,
                  year: row.year,
                  amount: row.amount,
                  subscribers: row.subscribers,
                  connectionType: row.connectionType,
                  sublocality: row.sublocality,
                })),
                month: filterMonth === 'all' ? 'All' : filterMonth,
                year: filterYear === 'all' ? '' : filterYear,
                billTypeLabel:
                  BILL_TYPE_OPTIONS.find(o => o.id === filterBillType)?.name || 'All',
                areaLabel:
                  filterSublocality === 'all'
                    ? ''
                    : areas.find(a => a.id === filterSublocality)?.subLocality ||
                        areas.find(a => a.id === filterSublocality)?.locality ||
                        filterSublocality,
              });
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.response?.data?.message || err?.response?.data?.error || 'Failed to create bills',
              );
            } finally {
              setIsCreating(false);
            }
          },
        },
      ],
    );
  };

  const handleDelete = async () => {
    if (billRows.length === 0) {
      Alert.alert('No subscribers', 'No subscribers match the current filters.');
      return;
    }
    if (!companyId) {
      Alert.alert('Error', 'Company not selected.');
      return;
    }
    Alert.alert('Delete Bills', `Delete ${billRows.length} bill entry(ies)?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteBills(companyId, {
              groupedBills: buildGroupedBills(),
              month: filterMonth === 'all' ? undefined : filterMonth,
              year: filterYear === 'all' ? undefined : filterYear,
              billType: filterBillType === 'all' ? undefined : filterBillType,
              sublocalityId: filterSublocality === 'all' ? undefined : filterSublocality,
            });
            Alert.alert('Success', `${billRows.length} bill entry(ies) deleted.`);
          } catch (err: any) {
            Alert.alert(
              'Error',
              err?.response?.data?.message || err?.response?.data?.error || 'Failed to delete bills',
            );
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  const renderBillRow = ({item}: {item: BillRow}) => {
    const typeBadge =
      item.connectionType === 'Internet'
        ? styles.typeBadgeInternet
        : item.connectionType === 'Cable'
        ? styles.typeBadgeCable
        : styles.typeBadgeBoth;
    const typeText =
      item.connectionType === 'Internet'
        ? styles.typeBadgeInternetText
        : item.connectionType === 'Cable'
        ? styles.typeBadgeCableText
        : styles.typeBadgeBothText;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.billTagBox}>
            <Text style={styles.billTagText}>{item.id}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardSub} numberOfLines={1}>
              {item.connectionType} • {item.sublocality}
            </Text>
          </View>
          <View style={styles.statusBadgeCreated}>
            <Text style={styles.statusBadgeCreatedText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Period</Text>
          <Text style={styles.infoValue}>
            {item.month} {item.year}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Amount</Text>
          <Text style={styles.infoValueBold}>{formatMoney(item.amount)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Subscribers</Text>
          <Text style={styles.infoValue}>{item.subscribers}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Connection Type</Text>
          <View style={typeBadge}>
            <Text style={typeText}>{item.connectionType}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sublocality</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {item.sublocality}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date</Text>
          <Text style={styles.infoValue}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created/Deleted by</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {item.createdBy}
          </Text>
        </View>
      </View>
    );
  };

  const renderFilterField = (
    label: string,
    value: string,
    placeholder: string,
    onPress: () => void,
  ) => (
    <View style={styles.filterField}>
      <Text style={styles.filterLabel}>{label}</Text>
      <TouchableOpacity style={styles.selectField} onPress={onPress}>
        <Text style={styles.selectFieldText} numberOfLines={1}>
          {value}
        </Text>
        <ChevronDown size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading bill data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GradientView colors={['#166534', '#22c55e']} style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Bill Creator</Text>
          <Text style={styles.headerCount}>
            {billRows.length} entry(ies) | {totalSubscribers} subscriber(s)
          </Text>
        </View>
      </GradientView>

      <FlatList
        data={paginatedData}
        keyExtractor={item => item.id}
        renderItem={renderBillRow}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#7C3AED']} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.heroHeader}>
              <GradientView colors={['#8B5CF6', '#7C3AED']} style={styles.heroIconBox}>
                <FileText size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Bill Creator</Text>
                <Text style={styles.heroSubtitle}>Create and manage monthly bills for subscribers.</Text>
              </View>
            </View>

            <BillCreatorDivider />

            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>Filters</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}>
                {renderFilterField(
                  'Month',
                  filterMonth === 'all' ? 'All Months' : filterMonth,
                  'All Months',
                  () =>
                    setMonthSheet({
                      title: 'Select month',
                      options: [{id: 'all', name: 'All Months'}, ...MONTHS.map(m => ({id: m, name: m}))],
                      selected: filterMonth,
                      onSelect: v => setFilterMonth(v),
                    }),
                )}
                {renderFilterField(
                  'Year',
                  filterYear === 'all' ? 'All Years' : filterYear,
                  'All Years',
                  () =>
                    setYearSheet({
                      title: 'Select year',
                      options: [{id: 'all', name: 'All Years'}, ...availableYears.map(y => ({id: y, name: y}))],
                      selected: filterYear,
                      onSelect: v => setFilterYear(v),
                    }),
                )}
                {renderFilterField(
                  'Bill Type',
                  BILL_TYPE_OPTIONS.find(o => o.id === filterBillType)?.name || 'All',
                  'All',
                  () =>
                    setBillTypeSheet({
                      title: 'Select bill type',
                      options: BILL_TYPE_OPTIONS,
                      selected: filterBillType,
                      onSelect: v => setFilterBillType(v),
                    }),
                )}
                {renderFilterField(
                  'Sublocality',
                  filterSublocality === 'all'
                    ? 'All Sublocality'
                    : areas.find(a => a.id === filterSublocality)?.subLocality ||
                        areas.find(a => a.id === filterSublocality)?.locality ||
                        filterSublocality.slice(0, 8),
                  'All Sublocality',
                  () =>
                    setSublocalitySheet({
                      title: 'Select sublocality',
                      options: [
                        {id: 'all', name: 'All Sublocality'},
                        ...areas.map(a => ({
                          id: a.id,
                          name: a.subLocality || a.locality || a.id.slice(0, 8),
                        })),
                      ],
                      selected: filterSublocality,
                      onSelect: v => setFilterSublocality(v),
                    }),
                )}
              </ScrollView>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  {billRows.length} entry(ies) | {totalSubscribers} subscriber(s)
                </Text>
              </View>

              <View style={styles.actionRow}>
                <GradientButton
                  colors={['#10B981', '#059669']}
                  style={[styles.createBtn, billRows.length === 0 && styles.btnDisabled]}
                  disabled={isCreating || isDeleting || billRows.length === 0}
                  onPress={handleCreate}>
                  {isCreating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <PlusCircle size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.createBtnText}>{isCreating ? 'Creating...' : 'Create'}</Text>
                </GradientButton>
                <GradientButton
                  colors={['#EF4444', '#B91C1C']}
                  style={[styles.deleteBtn, billRows.length === 0 && styles.btnDisabled]}
                  disabled={isCreating || isDeleting || billRows.length === 0}
                  onPress={handleDelete}>
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Trash2 size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.deleteBtnText}>{isDeleting ? 'Deleting...' : 'Delete'}</Text>
                </GradientButton>
              </View>
            </View>

            {billRows.length > 0 ? (
              <View style={styles.listTitleRow}>
                <Text style={styles.listTitle}>Bill Entries</Text>
                <Text style={styles.listCount}>{billRows.length} entry(ies)</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>No results</Text>
            <Text style={styles.emptyText}>
              No bill entries match the current filters.
            </Text>
          </View>
        }
        ListFooterComponent={
          billRows.length > 0 ? (
            <View style={styles.pagination}>
              <Text style={styles.paginationInfo}>
                Showing {billRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, billRows.length)} of {billRows.length} entries
              </Text>

              <View style={styles.pageControls}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  disabled={currentPage === 1}
                  onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}>
                  <ChevronLeft size={14} color={currentPage === 1 ? '#D1D5DB' : '#374151'} />
                  <Text style={[styles.pageBtnText, currentPage === 1 && styles.pageBtnTextDisabled]}>
                    Previous
                  </Text>
                </TouchableOpacity>

                {getVisiblePages().map(page => (
                  <TouchableOpacity
                    key={page}
                    style={[styles.pageNum, currentPage === page && styles.pageNumActive]}
                    onPress={() => setCurrentPage(page)}>
                    <Text style={[styles.pageNumText, currentPage === page && styles.pageNumTextActive]}>
                      {page}
                    </Text>
                  </TouchableOpacity>
                ))}

                {currentPage + 3 < totalPages ? (
                  <>
                    <Text style={styles.ellipsis}>...</Text>
                    <TouchableOpacity style={styles.pageNum} onPress={() => setCurrentPage(totalPages)}>
                      <Text style={styles.pageNumText}>{totalPages}</Text>
                    </TouchableOpacity>
                  </>
                ) : null}

                <View style={styles.goTo}>
                  <TextInput
                    style={styles.goToInput}
                    placeholder="Go"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={pageInput}
                    onChangeText={text => {
                      if (text === '' || /^\d+$/.test(text)) {
                        setPageInput(text);
                      }
                    }}
                    onSubmitEditing={handlePageSubmit}
                  />
                  <TouchableOpacity
                    style={[
                      styles.goToBtn,
                      (!pageInput || parseInt(pageInput, 10) < 1 || parseInt(pageInput, 10) > totalPages) &&
                        styles.pageBtnDisabled,
                    ]}
                    disabled={
                      !pageInput || parseInt(pageInput, 10) < 1 || parseInt(pageInput, 10) > totalPages
                    }
                    onPress={handlePageSubmit}>
                    <Text style={styles.goToBtnText}>Go</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  disabled={currentPage === totalPages}
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>
                  <Text style={[styles.pageBtnText, currentPage === totalPages && styles.pageBtnTextDisabled]}>
                    Next
                  </Text>
                  <ChevronRight size={14} color={currentPage === totalPages ? '#D1D5DB' : '#374151'} />
                </TouchableOpacity>
              </View>

              <View style={styles.pageSizeRow}>
                <Text style={styles.pageSizeLabel}>Show</Text>
                <TouchableOpacity style={styles.pageSizeSelect} onPress={() => setPageSizeOpen(true)}>
                  <Text style={styles.pageSizeSelectText}>{pageSize}</Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.pageSizeLabel}>entries</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Filter select sheets */}
      <Modal
        visible={!!monthSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setMonthSheet(null)}>
        <SelectSheet sheet={monthSheet} onClose={() => setMonthSheet(null)} />
      </Modal>

      <Modal
        visible={!!yearSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setYearSheet(null)}>
        <SelectSheet sheet={yearSheet} onClose={() => setYearSheet(null)} />
      </Modal>

      <Modal
        visible={!!billTypeSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setBillTypeSheet(null)}>
        <SelectSheet sheet={billTypeSheet} onClose={() => setBillTypeSheet(null)} />
      </Modal>

      <Modal
        visible={!!sublocalitySheet}
        transparent
        animationType="slide"
        onRequestClose={() => setSublocalitySheet(null)}>
        <SelectSheet sheet={sublocalitySheet} onClose={() => setSublocalitySheet(null)} />
      </Modal>

      {/* Page size sheet */}
      <Modal
        visible={pageSizeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPageSizeOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Rows per page</Text>
              <TouchableOpacity onPress={() => setPageSizeOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {PAGE_SIZES.map(size => {
              const active = pageSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  style={styles.sheetOption}
                  onPress={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                    setPageSizeOpen(false);
                  }}>
                  <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}>
                    {size} per page
                  </Text>
                  {active ? <Check size={16} color="#7C3AED" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Bill invoice preview + print */}
      <BillInvoiceModal
        visible={!!invoiceData}
        onClose={() => setInvoiceData(null)}
        rows={invoiceData?.rows || []}
        periodMonth={invoiceData?.month || getCurrentMonthYear().month}
        periodYear={invoiceData?.year || ''}
        billTypeLabel={invoiceData?.billTypeLabel || 'All'}
        areaLabel={invoiceData?.areaLabel || ''}
        company={currentCompany}
      />
    </View>
  );
}

function SelectSheet({
  sheet,
  onClose,
}: {
  sheet: SelectSheetState;
  onClose: () => void;
}) {
  if (!sheet) return null;
  return (
    <View style={styles.sheetOverlay}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{sheet.title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.sheetClose}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.sheetScroll}>
          {sheet.options.map(option => {
            const active = option.id === sheet.selected;
            return (
              <TouchableOpacity
                key={option.id}
                style={styles.sheetOption}
                onPress={() => {
                  sheet.onSelect(option.id);
                  onClose();
                }}>
                <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}>
                  {option.name}
                </Text>
                {active ? <Check size={16} color="#7C3AED" /> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6'},
  loadingText: {marginTop: 12, fontSize: 14, color: '#6B7280'},
  header: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 50,
    marginLeft: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#166534',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#166534', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doorIconBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doorIconLine: {
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  headerInfo: {paddingRight: 8},
  headerTitle: {fontSize: 16, fontWeight: '700', color: '#FFFFFF'},
  headerCount: {fontSize: 12, color: '#A7F3D0'},
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  heroIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  heroInfo: {flex: 1},
  heroTitle: {fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: -0.5},
  heroSubtitle: {fontSize: 12, color: '#6B7280', marginTop: 2},
  heroDivider: {marginHorizontal: 20, marginBottom: 4},
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
  },
  filterCardTitle: {fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 10},
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterField: {width: 170},
  filterLabel: {fontSize: 11, color: '#9CA3AF', marginBottom: 4},
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  selectFieldText: {flex: 1, fontSize: 13, color: '#111827', marginRight: 8},
  summaryRow: {marginTop: 14, alignItems: 'flex-end'},
  summaryText: {fontSize: 12, color: '#6B7280'},
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  createBtn: {
    flex: 1,
    gap: 6,
    borderRadius: 10,
    paddingVertical: 12,
  },
  createBtnText: {fontSize: 14, fontWeight: '700', color: '#FFFFFF'},
  deleteBtn: {
    flex: 1,
    gap: 6,
    borderRadius: 10,
    paddingVertical: 12,
  },
  deleteBtnText: {fontSize: 14, fontWeight: '700', color: '#FFFFFF'},
  btnDisabled: {opacity: 0.5},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100},
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 4,
    marginTop: 18,
    marginBottom: 8,
  },
  listTitle: {fontSize: 16, fontWeight: '700', color: '#111827'},
  listCount: {fontSize: 12, color: '#9CA3AF'},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  billTagBox: {
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  billTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1, marginLeft: 8},
  cardSub: {fontSize: 12, color: '#9CA3AF'},
  statusBadgeCreated: {
    borderRadius: 999,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeCreatedText: {fontSize: 11, color: '#047857', fontWeight: '700'},
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  infoLabel: {fontSize: 12, color: '#9CA3AF'},
  infoValue: {fontSize: 13, color: '#374151', fontWeight: '600', flexShrink: 1, marginLeft: 12},
  infoValueBold: {fontSize: 14, color: '#111827', fontWeight: '700', marginLeft: 12},
  typeBadgeInternet: {
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  typeBadgeInternetText: {fontSize: 11, color: '#1D4ED8', fontWeight: '700'},
  typeBadgeCable: {
    borderRadius: 999,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  typeBadgeCableText: {fontSize: 11, color: '#C2410C', fontWeight: '700'},
  typeBadgeBoth: {
    borderRadius: 999,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  typeBadgeBothText: {fontSize: 11, color: '#6D28D9', fontWeight: '700'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 40, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280', textAlign: 'center'},
  pagination: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginTop: 4,
  },
  paginationInfo: {fontSize: 12, color: '#6B7280', textAlign: 'center', marginBottom: 10},
  pageControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pageBtnText: {fontSize: 12, color: '#374151', fontWeight: '600'},
  pageBtnTextDisabled: {color: '#D1D5DB'},
  pageBtnDisabled: {opacity: 0.5},
  pageNum: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pageNumText: {fontSize: 13, color: '#374151', fontWeight: '600'},
  pageNumActive: {backgroundColor: '#7C3AED', borderColor: '#7C3AED'},
  pageNumTextActive: {color: '#FFFFFF'},
  ellipsis: {fontSize: 13, color: '#9CA3AF'},
  goTo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goToInput: {
    width: 44,
    height: 32,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 13,
    color: '#111827',
    padding: 0,
  },
  goToBtn: {
    height: 32,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  goToBtnText: {fontSize: 12, color: '#374151', fontWeight: '600'},
  pageSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  pageSizeLabel: {fontSize: 12, color: '#6B7280'},
  pageSizeSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 56,
  },
  pageSizeSelectText: {fontSize: 13, color: '#111827', fontWeight: '600'},
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 4,
  },
  sheetTitle: {fontSize: 16, fontWeight: '700', color: '#111827'},
  sheetClose: {fontSize: 16, color: '#9CA3AF', paddingHorizontal: 4},
  sheetScroll: {flexGrow: 0},
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetOptionText: {fontSize: 15, color: '#374151'},
  sheetOptionTextActive: {color: '#7C3AED', fontWeight: '700'},
});
