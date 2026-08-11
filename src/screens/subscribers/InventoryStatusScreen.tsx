import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import {useFocusEffect, useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  ClipboardCheck,
  Package,
  CheckCircle,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
} from 'lucide-react-native';
import {getPurchasedProducts} from '../../api/inventory';
import {PurchasedProduct} from '../../types';
import {GradientView} from '../../components/GradientView';

const PAGE_SIZES = [10, 25, 50, 100];

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

function InventoryStatusDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="invStatusHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#F43F5E" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#DC2626" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#DC2626" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#invStatusHeroGrad)" />
      </Svg>
    </View>
  );
}

export default function InventoryStatusScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const [items, setItems] = useState<PurchasedProduct[]>([]);
  const [filtered, setFiltered] = useState<PurchasedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [maxQuantity, setMaxQuantity] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
      setError(null);
      const data = await getPurchasedProducts();
      setItems(data);
      setFiltered(data);
    } catch (err: any) {
      const reason =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load inventory status. Check your connection and try again.';
      setError(reason);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchData]),
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, vendorFilter, batchFilter, maxQuantity]);

  useEffect(() => {
    let result = items;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }

    if (vendorFilter.trim()) {
      const lower = vendorFilter.toLowerCase();
      result = result.filter(p => (p.vendorName || '').toLowerCase().includes(lower));
    }

    if (batchFilter.trim()) {
      const lower = batchFilter.toLowerCase();
      result = result.filter(p => (p.batch || '').toLowerCase().includes(lower));
    }

    if (maxQuantity !== '') {
      const max = parseInt(maxQuantity, 10);
      if (!isNaN(max)) {
        result = result.filter(p => (Number(p.stock) || 0) < max);
      }
    }

    setFiltered(result);
  }, [items, search, vendorFilter, batchFilter, maxQuantity]);

  const inStockCount = items.filter(p => Number(p.stock) > 0).length;
  const lowStockCount = items.filter(p => Number(p.stock) > 0 && Number(p.stock) <= 5).length;

  const statCards: {key: string; label: string; value: string; icon: any; gradient: [string, string]}[] = [
    {key: 'total', label: 'Total Items', value: String(items.length), icon: Package, gradient: ['#F43F5E', '#DC2626']},
    {key: 'inStock', label: 'In Stock', value: String(inStockCount), icon: CheckCircle, gradient: ['#10B981', '#16A34A']},
    {key: 'lowStock', label: 'Low Stock', value: String(lowStockCount), icon: AlertTriangle, gradient: ['#F59E0B', '#EA580C']},
  ];

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

  const renderItem = ({item, index}: {item: PurchasedProduct; index: number}) => {
    const qty = Number(item.stock) || 0;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rowIndex}>{index + 1 + (currentPage - 1) * pageSize}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.billId} numberOfLines={1}>
              {item.billId || item.purchaseNumber || '-'}
            </Text>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Vendor</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{item.vendorName || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Purchase Date</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{item.purchaseDate || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Batch</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{item.batch || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>SN / MAC</Text>
          <Text style={styles.infoValueMono} numberOfLines={1}>{item.serialNumber || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Damage Qty</Text>
          <Text style={styles.infoValue} numberOfLines={1}>0</Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.quantityBox}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <Text style={[styles.quantityValue, qty === 0 && styles.quantityValueZero]}>
              {qty}
            </Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Purchase Price</Text>
            <Text style={styles.priceValue}>
              PKR {(Number(item.purchasePrice) || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Selling Price</Text>
            <Text style={styles.priceValue}>
              PKR {(Number(item.price) || 0).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F43F5E" />
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
          <Text style={styles.headerTitle}>Inventory Status</Text>
          <Text style={styles.headerCount}>{filtered.length} total</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginated}
        keyExtractor={item => item.purchaseItemId || item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#F43F5E']} />
        }
        ListHeaderComponent={
          <View>
            {/* Hero Header */}
            <View style={styles.heroHeader}>
              <GradientView colors={['#F43F5E', '#DC2626']} style={styles.heroIconBox}>
                <ClipboardCheck size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Inventory Status</Text>
                <Text style={styles.heroSubtitle}>
                  View stock levels per purchase item.
                </Text>
              </View>
            </View>

            <InventoryStatusDivider />

            {/* Stat cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}>
              {statCards.map(card => (
                <View key={card.key} style={styles.statCard}>
                  <GradientView colors={card.gradient} style={styles.statIcon}>
                    <card.icon size={18} color="#FFFFFF" />
                  </GradientView>
                  <View>
                    <Text style={styles.statLabel}>{card.label}</Text>
                    <Text style={styles.statValue}>{card.value}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}>
              <View style={styles.filters}>
                <View style={styles.filterField}>
                  <Search size={16} color="#6B7280" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search product name..."
                    placeholderTextColor="#9CA3AF"
                    value={search}
                    onChangeText={setSearch}
                  />
                </View>
                <View style={styles.filterField}>
                  <Search size={16} color="#6B7280" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Filter vendor..."
                    placeholderTextColor="#9CA3AF"
                    value={vendorFilter}
                    onChangeText={setVendorFilter}
                  />
                </View>
                <View style={styles.filterField}>
                  <Search size={16} color="#6B7280" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Filter batch..."
                    placeholderTextColor="#9CA3AF"
                    value={batchFilter}
                    onChangeText={setBatchFilter}
                  />
                </View>
                <View style={styles.filterField}>
                  <Search size={16} color="#6B7280" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Less than qty"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={maxQuantity}
                    onChangeText={text => {
                      if (text === '' || /^\d+$/.test(text)) {
                        setMaxQuantity(text);
                      }
                    }}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={styles.emptyTitle}>Failed to load inventory status</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No items found</Text>
              <Text style={styles.emptyText}>
                {search || vendorFilter || batchFilter || maxQuantity
                  ? 'Try adjusting your filters'
                  : 'No purchased products available'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.pagination}>
            <Text style={styles.paginationInfo}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries
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
                  style={[styles.pageNum, currentPage === page && {backgroundColor: '#F43F5E'}]}
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
                  <ArrowRight size={14} color="#374151" />
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
              <Text style={styles.sheetTitle}>Show entries</Text>
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
                  {active ? <Check size={16} color="#F43F5E" /> : null}
                </TouchableOpacity>
              );
            })}
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
    backgroundColor: '#166534', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)',
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
    minWidth: 150,
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
  statValue: {fontSize: 20, fontWeight: '700', color: '#111827'},
  filterScroll: {paddingHorizontal: 16, paddingTop: 14},
  filters: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  filterField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    minWidth: 180,
    flex: 1,
  },
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 6},
  rowIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F43F5E',
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1},
  billId: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    marginBottom: 2,
  },
  cardName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  infoRow: {flexDirection: 'row', paddingVertical: 5},
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 105},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  infoValueMono: {
    flex: 1, fontSize: 12, color: '#374151', fontWeight: '500',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, marginTop: 6,
  },
  quantityBox: {alignItems: 'flex-start'},
  quantityLabel: {fontSize: 11, color: '#9CA3AF'},
  quantityValue: {fontSize: 16, fontWeight: '700', color: '#111827'},
  quantityValueZero: {color: '#9CA3AF'},
  priceBox: {alignItems: 'flex-end', flex: 1},
  priceLabel: {fontSize: 11, color: '#9CA3AF'},
  priceValue: {fontSize: 13, fontWeight: '700', color: '#111827'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280', textAlign: 'center'},
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F43F5E',
  },
  retryBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
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
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetOptionText: {fontSize: 15, color: '#374151', fontWeight: '500'},
  sheetOptionTextActive: {color: '#F43F5E', fontWeight: '600'},
});
