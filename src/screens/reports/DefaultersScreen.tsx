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
  TriangleAlert,
  ChevronDown,
  Check,
  Calendar as CalendarIcon,
  Download,
  Printer,
} from 'lucide-react-native';
import {useAuth} from '../../context/AuthContext';
import {getDealerCollections} from '../../api/collections';
import {areasApi} from '../../api/network';
import {Area, DealerCollection} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';

type FilterOption = {label: string; value: string};

interface DefaulterRecord {
  id: string;
  dealerName: string;
  subscriberName: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  category: 'Defaulter' | 'Bad Debt';
}

const REPORT_TYPE_OPTIONS: FilterOption[] = [
  {label: 'All', value: 'all'},
  {label: 'Defaulters', value: 'Defaulter'},
  {label: 'Bad Debt', value: 'Bad Debt'},
];

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

function CollectionsDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="defaultersHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#F59E0B" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#EF4444" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#EF4444" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#defaultersHeroGrad)" />
      </Svg>
    </View>
  );
}

function formatMoney(n: number): string {
  return `PKR ${(Number.isFinite(n) ? n : 0).toLocaleString()}`;
}

function formatDate(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getDaysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

const PAGE_SIZES = [5, 10, 20, 50, 100];

export default function DefaultersScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const {companyId, user} = useAuth();

  const [collections, setCollections] = useState<DealerCollection[]>([]);
  const [filtered, setFiltered] = useState<DefaulterRecord[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportType, setReportType] = useState('all');
  const [selectedLocality, setSelectedLocality] = useState('all');
  const [selectSheet, setSelectSheet] = useState<{
    key: string;
    title: string;
    options: FilterOption[];
    selected: string;
    onSelect: (v: string) => void;
  } | null>(null);

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
      const [collectionData, areaData] = await Promise.all([
        getDealerCollections().catch(() => []),
        areasApi.list().catch(() => []),
      ]);
      setCollections(collectionData);
      setAreas(areaData);
    } catch {
      Alert.alert('Error', 'Failed to load defaulters data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {fetchData();}, [fetchData]));

  const defaulterData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return collections
      .filter(item => {
        const dueDate = new Date(item.collectionDate);
        return item.settlementStatus === 'pending' && dueDate < today;
      })
      .map(item => {
        const dueDate = new Date(item.collectionDate);
        const daysOverdue = getDaysSince(item.collectionDate);
        return {
          id: item.id,
          dealerName: item.dealerName || 'Unknown',
          subscriberName: item.subscriberName || '',
          amount: item.amount || 0,
          dueDate: item.collectionDate || '',
          daysOverdue,
          category: (daysOverdue >= 90 ? 'Bad Debt' : 'Defaulter') as 'Defaulter' | 'Bad Debt',
        };
      });
  }, [collections]);

  useEffect(() => {
    let result = [...defaulterData];

    if (fromDate) {
      result = result.filter(item => (item.dueDate || '').slice(0, 10) >= fromDate);
    }
    if (toDate) {
      result = result.filter(item => (item.dueDate || '').slice(0, 10) <= toDate);
    }
    if (reportType !== 'all') {
      result = result.filter(item => item.category === reportType);
    }

    setFiltered(result);
    setCurrentPage(1);
  }, [defaulterData, fromDate, toDate, reportType]);

  const totalRecords = filtered.length;
  const totalReceivable = filtered.reduce((sum, item) => sum + (item.amount || 0), 0);

  const exportExcel = () => {
    if (filtered.length === 0) {
      Alert.alert('No data', 'No records to export.');
      return;
    }
    const headers = ['Dealer Name', 'Subscriber Name', 'Amount', 'Due Date', 'Days Overdue', 'Category'];
    const rows = filtered.map(item => [
      item.dealerName,
      item.subscriberName,
      String(item.amount),
      item.dueDate,
      String(item.daysOverdue),
      item.category,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    console.log(csvContent);
    Alert.alert('Success', `Exported ${filtered.length} records.`);
  };

  const handlePrint = () => {
    Alert.alert('Print', 'Print report');
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getVisiblePages = () => {
    const pages: number[] = [];
    const startPage = Math.max(1, currentPage - 3);
    const endPage = Math.min(totalPages, currentPage + 3);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const handlePageSubmit = () => {
    const page = parseInt(pageInput, 10);
    if (page && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput('');
    }
  };

  const renderItem = ({item}: {item: DefaulterRecord}) => {
    const statusColor = item.category === 'Bad Debt' ? '#DC2626' : '#F59E0B';
    const statusBg = item.category === 'Bad Debt' ? '#FEF2F2' : '#FFFBEB';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rowIndex}>#{item.id?.slice(0, 6).toUpperCase()}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.dealerName}</Text>
          </View>
          <View style={[styles.cardActions, {opacity: 1}]}>
            <View style={{borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: statusBg}}>
              <Text style={[styles.statusText, {color: statusColor}]}>{item.category}</Text>
            </View>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Subscriber</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{item.subscriberName || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Amount</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{formatMoney(item.amount)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Due Date</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{formatDate(item.dueDate)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Days Overdue</Text>
          <Text style={[styles.infoValue, {color: item.daysOverdue >= 90 ? '#DC2626' : '#F59E0B', fontWeight: '700'}]}>
            {item.daysOverdue} days
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <GradientView colors={['#DC2626', '#F59E0B']} style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
            <DoorMenuIcon open={drawerStatus === 'open'} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Defaulters</Text>
            <Text style={styles.headerCount}>Report</Text>
          </View>
        </GradientView>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GradientView colors={['#DC2626', '#F59E0B']} style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Defaulters</Text>
          <Text style={styles.headerCount}>{totalRecords} records</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginated}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#F59E0B']} />
        }
        ListHeaderComponent={
          <View>
            {/* Hero Header */}
            <View style={styles.heroHeader}>
              <GradientView colors={['#F59E0B', '#EF4444']} style={styles.heroIconBox}>
                <TriangleAlert size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Dealers Defaulters</Text>
                <Text style={styles.heroSubtitle}>View defaulting dealers and bad debts</Text>
              </View>
            </View>

            <CollectionsDivider />

            {/* Filter Row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterRowContainer}>
              <View style={styles.filterRow}>
                <View style={styles.filterField}>
                  <CalendarIcon size={14} color="#6B7280" style={styles.filterIcon} />
                  <TextInput
                    style={styles.filterInput}
                    placeholder="From Date"
                    placeholderTextColor="#9CA3AF"
                    value={fromDate}
                    onChangeText={setFromDate}
                  />
                </View>
                <View style={styles.filterField}>
                  <CalendarIcon size={14} color="#6B7280" style={styles.filterIcon} />
                  <TextInput
                    style={styles.filterInput}
                    placeholder="To Date"
                    placeholderTextColor="#9CA3AF"
                    value={toDate}
                    onChangeText={setToDate}
                  />
                </View>
                <TouchableOpacity
                  style={styles.filterSelect}
                  onPress={() => setSelectSheet({
                    key: 'reportType',
                    title: 'Report Type',
                    options: REPORT_TYPE_OPTIONS,
                    selected: reportType,
                    onSelect: setReportType,
                  })}>
                  <Text style={styles.filterSelectText}>
                    {REPORT_TYPE_OPTIONS.find(o => o.value === reportType)?.label || 'Report Type'}
                  </Text>
                  <ChevronDown size={14} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.filterSelect}
                  onPress={() => setSelectSheet({
                    key: 'locality',
                    title: 'Locality',
                    options: [{label: 'All Localities', value: 'all'}, ...areas.map(a => ({label: a.locality || a.city, value: a.id}))],
                    selected: selectedLocality,
                    onSelect: setSelectedLocality,
                  })}>
                  <Text style={styles.filterSelectText}>
                    {selectedLocality === 'all' ? 'All Localities' : (areas.find(a => a.id === selectedLocality)?.locality || areas.find(a => a.id === selectedLocality)?.city || selectedLocality)}
                  </Text>
                  <ChevronDown size={14} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Filter Actions */}
            <View style={styles.filterActions}>
              <GradientButton
                colors={['#10B981', '#16A34A']}
                style={styles.applyBtn}
                onPress={() => {}}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </GradientButton>
              <TouchableOpacity style={styles.exportBtn} onPress={exportExcel}>
                <Download size={14} color="#991B1B" />
                <Text style={styles.exportBtnText}>Excel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportBtn} onPress={handlePrint}>
                <Printer size={14} color="#991B1B" />
                <Text style={styles.exportBtnText}>Print</Text>
              </TouchableOpacity>
            </View>

            {/* Stat cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}>
              <View style={[styles.statCard, {minWidth: 140}]}>
                <GradientView colors={['#F59E0B', '#EF4444']} style={styles.statIcon}>
                  <TriangleAlert size={18} color="#FFFFFF" />
                </GradientView>
                <View>
                  <Text style={styles.statLabel}>No of Defaulters</Text>
                  <Text style={styles.statValue}>{totalRecords}</Text>
                </View>
              </View>
              <View style={[styles.statCard, {minWidth: 140}]}>
                <GradientView colors={['#F59E0B', '#EF4444']} style={styles.statIcon}>
                  <TriangleAlert size={18} color="#FFFFFF" />
                </GradientView>
                <View>
                  <Text style={styles.statLabel}>Receivable Amount</Text>
                  <Text style={styles.statValue}>{formatMoney(totalReceivable)}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyTitle}>No defaulters found</Text>
            <Text style={styles.emptyText}>
              No overdue collections match your criteria
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.pagination}>
            <Text style={styles.paginationInfo}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} records
            </Text>
            <View style={styles.pageControls}>
              <TouchableOpacity
                style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                disabled={currentPage === 1}
                onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}>
                <ChevronDown size={14} color={currentPage === 1 ? '#D1D5DB' : '#374151'} style={{transform: [{rotate: '270deg'}]}} />
                <Text style={[styles.pageBtnText, currentPage === 1 && styles.pageBtnTextDisabled]}>
                  Previous
                </Text>
              </TouchableOpacity>

              {getVisiblePages().map(page => (
                <TouchableOpacity
                  key={page}
                  style={[
                    styles.pageNum,
                    currentPage === page && {backgroundColor: '#F59E0B'},
                  ]}
                  onPress={() => setCurrentPage(page)}>
                  <Text
                    style={[
                      styles.pageNumText,
                      currentPage === page && styles.pageNumTextActive,
                    ]}>
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
                  placeholder="Go to"
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
                    (!pageInput ||
                      parseInt(pageInput, 10) < 1 ||
                      parseInt(pageInput, 10) > totalPages) &&
                      styles.pageBtnDisabled,
                  ]}
                  disabled={
                    !pageInput ||
                    parseInt(pageInput, 10) < 1 ||
                    parseInt(pageInput, 10) > totalPages
                  }
                  onPress={handlePageSubmit}>
                  <Text style={[{fontSize: 14, color: '#374151'}]}>Go</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                disabled={currentPage === totalPages}
                onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>
                <Text
                  style={[
                    styles.pageBtnText,
                    currentPage === totalPages && styles.pageBtnTextDisabled,
                  ]}>
                  Next
                </Text>
                <ChevronDown size={14} color={currentPage === totalPages ? '#D1D5DB' : '#374151'} style={{transform: [{rotate: '90deg'}]}} />
              </TouchableOpacity>
            </View>

            <View style={styles.pageSizeRow}>
              <Text style={styles.pageSizeLabel}>Rows per page</Text>
              <TouchableOpacity style={styles.pageSizeSelect} onPress={() => setPageSizeOpen(true)}>
                <Text style={styles.pageSizeSelectText}>{pageSize}</Text>
                <ChevronDown size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        }
      />

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
                  {active ? <Check size={16} color="#F59E0B" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Select sheet */}
      <Modal
        visible={!!selectSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectSheet(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{selectSheet?.title}</Text>
              <TouchableOpacity onPress={() => setSelectSheet(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll}>
              {selectSheet?.options.map(option => {
                const active = option.value === selectSheet!.selected;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.sheetOption}
                    onPress={() => {
                      selectSheet!.onSelect(option.value);
                      setSelectSheet(null);
                    }}>
                    <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]} numberOfLines={1}>
                      {option.label}
                    </Text>
                    {active ? <Check size={16} color="#F59E0B" /> : null}
                  </TouchableOpacity>
                );
              })}
              {selectSheet && selectSheet.options.length === 0 ? (
                <View style={styles.sheetEmpty}>
                  <Text style={styles.sheetEmptyText}>No options available</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6'},
  header: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    marginTop: 50, marginLeft: 16, paddingVertical: 8, paddingHorizontal: 8,
    backgroundColor: '#991B1B', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#991B1B', shadowOffset: {width: 0, height: 4},
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
  headerCount: {fontSize: 12, color: '#FCA5A5'},
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
  filterRowContainer: {
    paddingTop: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  filterField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 42,
    flex: 1,
    minWidth: 110,
  },
  filterIcon: {marginRight: 6},
  filterInput: {flex: 1, paddingVertical: 8, fontSize: 13, color: '#111827'},
  filterSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 42,
    flex: 1,
    minWidth: 110,
    justifyContent: 'space-between',
  },
  filterSelectText: {flex: 1, fontSize: 13, color: '#111827', marginRight: 4},
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  applyBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexShrink: 0,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  applyBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600'},
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  exportBtnText: {fontSize: 13, color: '#991B1B', fontWeight: '600'},
  statsRow: {paddingHorizontal: 16, paddingTop: 14, gap: 10},
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 10,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  statLabel: {fontSize: 11, color: '#6B7280', fontWeight: '500'},
  statValue: {fontSize: 18, fontWeight: '700', color: '#111827'},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  rowIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1},
  cardName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  infoRow: {flexDirection: 'row', paddingVertical: 5},
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 110},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  statusText: {fontSize: 11, fontWeight: '600'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280'},
  pagination: {paddingTop: 6},
  paginationInfo: {fontSize: 13, color: '#6B7280', marginBottom: 10},
  pageControls: {flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'},
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  pageBtnDisabled: {opacity: 0.5},
  pageBtnText: {fontSize: 12, color: '#374151', fontWeight: '500'},
  pageBtnTextDisabled: {color: '#D1D5DB'},
  pageNum: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNumText: {fontSize: 12, color: '#374151'},
  pageNumTextActive: {color: '#FFFFFF', fontWeight: '600'},
  ellipsis: {paddingHorizontal: 4, color: '#6B7280'},
  goTo: {flexDirection: 'row', alignItems: 'center', gap: 4},
  goToInput: {
    width: 52,
    height: 32,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 12,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    paddingVertical: 0,
  },
  goToBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageSizeRow: {flexDirection: 'row', alignItems: 'center', marginTop: 12},
  pageSizeLabel: {fontSize: 12, color: '#6B7280', marginRight: 8},
  pageSizeSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 84,
  },
  pageSizeSelectText: {fontSize: 13, color: '#111827', fontWeight: '600', marginRight: 8},
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '75%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sheetTitle: {fontSize: 16, fontWeight: '600', color: '#111827'},
  sheetClose: {fontSize: 16, color: '#6B7280', padding: 4},
  sheetScroll: {paddingBottom: 20},
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetOptionText: {fontSize: 15, color: '#374151', fontWeight: '500', flex: 1, marginRight: 8},
  sheetOptionTextActive: {color: '#F59E0B', fontWeight: '600'},
  sheetEmpty: {paddingVertical: 30, alignItems: 'center'},
  sheetEmptyText: {fontSize: 13, color: '#9CA3AF'},
});
