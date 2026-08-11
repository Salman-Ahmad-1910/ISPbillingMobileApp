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
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Receipt,
  Search,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  Printer,
  Loader,
  X,
} from 'lucide-react-native';
import {getSales, deleteSale, addSaleToCollection, getInstallmentForSale} from '../../api/subscribers';
import {Sale} from '../../types';
import {GradientView} from '../../components/GradientView';

const PAGE_SIZES = [5, 10, 20, 50];

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

function SalesDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="salesHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#10B981" stopOpacity={1} />
            <Stop offset="0.7" stopColor="#22C55E" stopOpacity={0.6} />
            <Stop offset="1" stopColor="#22C55E" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#salesHeroGrad)" />
      </Svg>
    </View>
  );
}

const fmtPKR = (n: number) => new Intl.NumberFormat('en-US').format(Number(n) || 0);

export default function SalesScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filtered, setFiltered] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [installmentInfo, setInstallmentInfo] = useState<any>(null);
  const [, setPrintSize] = useState<'a4' | 'thermal'>('a4');
  const [printVisible, setPrintVisible] = useState(false);
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);

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
      const data = await getSales();
      setSales(data);
    } catch {
      Alert.alert('Error', 'Failed to load sales data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {fetchData();}, [fetchData]));

  useEffect(() => {
    let result = sales;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        s =>
          String(s.id || '').toLowerCase().startsWith(q) ||
          String(s.subscriberName || '').toLowerCase().startsWith(q),
      );
    }
    setFiltered(result);
    setCurrentPage(1);
  }, [sales, search]);

  const totalRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  }, [sales]);

  const totalTransactions = useMemo(() => {
    return sales.length;
  }, [sales]);

  const avgPerTransaction = useMemo(() => {
    if (totalTransactions === 0) return 0;
    return Math.round(totalRevenue / totalTransactions);
  }, [totalRevenue, totalTransactions]);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Sale', 'Are you sure you want to delete this sale entry?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSale(id);
            setSales(prev => prev.filter(s => s.id !== id));
            Alert.alert('Deleted', 'Sale entry deleted.');
          } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  const handleAddToCollection = async (sale: Sale) => {
    if (!sale.subscriberId) {
      Alert.alert('Error', 'No subscriber associated with this sale');
      return;
    }
    setIsAddingToCollection(true);
    try {
      await addSaleToCollection({
        subscriberId: sale.subscriberId,
        subscriberName: sale.subscriberName || 'Walk-in',
        amount: Number(sale.totalAmount) || 0,
        paymentDate: sale.date || new Date().toISOString(),
        method: sale.paymentMethod || 'cash',
      });
      Alert.alert('Success', `PKR ${fmtPKR(sale.totalAmount)} added to collection.`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to add to collection';
      Alert.alert('Error', msg);
    } finally {
      setIsAddingToCollection(false);
    }
  };

  const handleViewInstallment = async (sale: Sale) => {
    if (!sale.isInstallment || !sale.subscriberId) {
      setInstallmentInfo(null);
      return;
    }
    try {
      const data = await getInstallmentForSale(sale.subscriberId, '', sale.id);
      const payload = data?.data || data;
      const instData = payload?.installment || payload;
      if (instData && instData.id) {
        setInstallmentInfo({
          id: instData.id,
          planName: instData.planName,
          totalInstallments: instData.totalInstallments,
          paidInstallments: instData.paidInstallments,
          nextInstallment: instData.nextInstallment,
          installmentAmount: instData.installmentAmount,
          totalAmount: instData.totalAmount,
          status: instData.status,
          subscriberName: instData.subscriberName,
          saleId: instData.saleId,
        });
      } else {
        setInstallmentInfo(null);
      }
    } catch {
      setInstallmentInfo(null);
    }
  };

  const openDetail = (sale: Sale) => {
    setSelectedSale(sale);
    setInstallmentInfo(null);
    setDetailVisible(true);
    if (sale.isInstallment) {
      handleViewInstallment(sale);
    }
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

  const renderItem = ({item}: {item: Sale}) => {
    const totalQty = (item.items || []).reduce((sum: number, i: any) => sum + (Number(i.quantity) || 0), 0);
    const itemsSubtotal = (item.items || []).reduce(
      (sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
      0,
    );
    const displayAmount = Number(item.totalAmount) || itemsSubtotal + (Number(item.taxAmount) || 0);
    let increasePercent = 0;
    if (item.isInstallment && itemsSubtotal > 0) {
      increasePercent = Math.round(((displayAmount - (Number(item.taxAmount) || 0)) / itemsSubtotal - 1) * 100);
    }
    const serials = (item.items || [])
      .map(i => i.serialNumber)
      .filter(Boolean)
      .flatMap((s: any) =>
        String(s)
          .split(',')
          .map((x: string) => x.trim())
          .filter(Boolean),
      );
    const uniqueSerials = [...new Set(serials as string[])];
    const singleSerial = uniqueSerials[0] || '';

    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetail(item)}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.subscriberName || 'Walk-in'}
            </Text>
            <Text style={styles.cardId}>#{item.id}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.cardAmount}>PKR {fmtPKR(displayAmount)}</Text>
            {item.isInstallment && increasePercent > 0 && (
              <Text style={styles.cardIncrease}>+{increasePercent}%</Text>
            )}
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date</Text>
          <Text style={styles.infoValue}>{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Payment</Text>
          <View style={styles.paymentBadge}>
            <Text style={styles.paymentText}>{item.paymentMethod}</Text>
            {item.isInstallment && (
              <Text style={styles.installmentBadge}>Installment</Text>
            )}
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Items</Text>
          <Text style={styles.infoValue}>{totalQty} item{totalQty !== 1 ? 's' : ''}</Text>
        </View>
        {singleSerial ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SN / MAC</Text>
            <Text style={[styles.infoValue, styles.serialText]} numberOfLines={1}>
              {singleSerial}
            </Text>
          </View>
        ) : null}
        <View style={styles.cardFooter}>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => openDetail(item)}>
              <Pencil size={14} color="#2563EB" />
              <Text style={styles.editBtnText}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item.id)}>
              <Trash2 size={14} color="#E11D48" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10B981" />
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
          <Text style={styles.headerTitle}>Sales</Text>
          <Text style={styles.headerCount}>{filtered.length} transactions</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginated}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#10B981']} />
        }
        ListHeaderComponent={
          <View>
            {/* Hero Header */}
            <View style={styles.heroHeader}>
              <GradientView colors={['#10B981', '#22C55E']} style={styles.heroIconBox}>
                <ShoppingCart size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Sales</Text>
                <Text style={styles.heroSubtitle}>View and manage all point-of-sale transactions.</Text>
              </View>
            </View>

            <SalesDivider />

            {/* Stat cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}>
              <View style={styles.statCard}>
                <GradientView colors={['#10B981', '#16A34A']} style={styles.statIcon}>
                  <TrendingUp size={18} color="#FFFFFF" />
                </GradientView>
                <View>
                  <Text style={styles.statLabel}>Total Revenue</Text>
                  <Text style={styles.statValue}>PKR {fmtPKR(totalRevenue)}</Text>
                </View>
              </View>
              <View style={styles.statCard}>
                <GradientView colors={['#3B82F6', '#2563EB']} style={styles.statIcon}>
                  <Receipt size={18} color="#FFFFFF" />
                </GradientView>
                <View>
                  <Text style={styles.statLabel}>Transactions</Text>
                  <Text style={styles.statValue}>{totalTransactions}</Text>
                </View>
              </View>
              <View style={styles.statCard}>
                <GradientView colors={['#F59E0B', '#EA580C']} style={styles.statIcon}>
                  <DollarSign size={18} color="#FFFFFF" />
                </GradientView>
                <View>
                  <Text style={styles.statLabel}>Avg Per Transaction</Text>
                  <Text style={[styles.statValue, {color: '#D97706'}]}>
                    PKR {fmtPKR(avgPerTransaction)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Transaction History */}
            <Text style={styles.sectionHeading}>Transaction History</Text>

            {/* Search */}
            <View style={styles.toolbar}>
              <View style={styles.searchBox}>
                <Search size={16} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by sales ID or customer name..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>No sales found</Text>
            <Text style={styles.emptyText}>
              {search ? 'Try adjusting your search' : 'No sales transactions yet'}
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.pagination}>
            <Text style={styles.paginationInfo}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} sales
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
                  style={[
                    styles.pageNum,
                    currentPage === page && {backgroundColor: '#10B981'},
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
                  {active ? <Check size={16} color="#10B981" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Sale Detail Bottom Sheet */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setDetailVisible(false);
          setSelectedSale(null);
          setInstallmentInfo(null);
        }}>
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.detailSheetHeader}>
              <Text style={styles.detailSheetTitle}>Transaction Details</Text>
              <TouchableOpacity
                onPress={() => {
                  setDetailVisible(false);
                  setSelectedSale(null);
                  setInstallmentInfo(null);
                }}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedSale && (
              <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
                {/* Header info */}
                <View style={styles.detailHeader}>
                  <Text style={styles.detailCustomer}>
                    {selectedSale.subscriberName || 'Walk-in'}
                  </Text>
                  <Text style={styles.detailDate}>
                    {selectedSale.date ? new Date(selectedSale.date).toLocaleDateString() : ''}
                  </Text>
                  <View style={styles.detailBadges}>
                    <View style={styles.paymentBadge}>
                      <Text style={styles.paymentText}>{selectedSale.paymentMethod}</Text>
                    </View>
                    <Text style={styles.detailId}>#{selectedSale.id}</Text>
                    {selectedSale.isInstallment && (
                      <View style={styles.installmentBadge}>
                        <Text>Installment</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Items */}
                <Text style={styles.sectionTitle}>Items</Text>
                {(selectedSale.items || []).map((item, idx) => {
                  const price = Number(item.price) || 0;
                  const qty = Number(item.quantity) || 0;
                  const net = price * qty;
                  const taxPercent = Number((item as any).taxPercent) || 0;
                  const sst = net * (taxPercent / 100);
                  const payable = net + sst;

                  return (
                    <View key={item.id || idx} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName}>{item.productName}</Text>
                        <Text style={styles.itemQty}>x{qty}</Text>
                      </View>
                      <View style={styles.itemDetails}>
                        <View style={styles.itemRow}>
                          <Text style={styles.itemLabel}>Unit Price</Text>
                          <Text style={styles.itemValue}>PKR {fmtPKR(price)}</Text>
                        </View>
                        <View style={styles.itemRow}>
                          <Text style={styles.itemLabel}>Amount</Text>
                          <Text style={styles.itemValue}>PKR {fmtPKR(net)}</Text>
                        </View>
                        {sst > 0 && (
                          <View style={styles.itemRow}>
                            <Text style={styles.itemLabel}>Tax ({taxPercent}%)</Text>
                            <Text style={styles.itemValue}>PKR {fmtPKR(sst)}</Text>
                          </View>
                        )}
                        <View style={[styles.itemRow, styles.itemTotalRow]}>
                          <Text style={styles.itemTotalLabel}>Payable</Text>
                          <Text style={styles.itemTotalValue}>PKR {fmtPKR(payable)}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Installment Details */}
                {selectedSale.isInstallment && installmentInfo && (
                  <View style={styles.installmentSection}>
                    <Text style={styles.sectionTitle}>Installment Details</Text>
                    <View style={styles.installmentCard}>
                      <View style={styles.instRow}>
                        <Text style={styles.instLabel}>Plan</Text>
                        <Text style={styles.instValue}>{installmentInfo.planName}</Text>
                      </View>
                      <View style={styles.instRow}>
                        <Text style={styles.instLabel}>Selling Price (Subtotal)</Text>
                        <Text style={styles.instValue}>
                          PKR {fmtPKR((Number(selectedSale.totalAmount) || 0) - (Number(selectedSale.taxAmount) || 0))}
                        </Text>
                      </View>
                      <View style={styles.instRow}>
                        <Text style={styles.instLabel}>Total Amount (incl. increase)</Text>
                        <Text style={[styles.instValue, styles.instBold]}>
                          PKR {fmtPKR(installmentInfo.totalAmount)}
                        </Text>
                      </View>
                      <View style={styles.instRow}>
                        <Text style={styles.instLabel}>Amount per Installment</Text>
                        <Text style={[styles.instValue, styles.instBlue]}>
                          PKR {fmtPKR(installmentInfo.installmentAmount)}
                        </Text>
                      </View>
                      <View style={styles.instDivider} />
                      <View style={styles.instRow}>
                        <Text style={styles.instLabel}>Total Installments</Text>
                        <Text style={styles.instValue}>{installmentInfo.totalInstallments}</Text>
                      </View>
                      <View style={styles.instRow}>
                        <Text style={styles.instLabel}>Paid</Text>
                        <Text style={[styles.instValue, styles.instGreen]}>
                          {installmentInfo.paidInstallments} / {installmentInfo.totalInstallments}
                        </Text>
                      </View>
                      <View style={styles.instRow}>
                        <Text style={styles.instLabel}>Remaining</Text>
                        <Text style={[styles.instValue, styles.instAmber]}>
                          {installmentInfo.totalInstallments - installmentInfo.paidInstallments} / {installmentInfo.totalInstallments}
                        </Text>
                      </View>
                      {installmentInfo.nextInstallment > 0 && (
                        <View style={styles.instRow}>
                          <Text style={styles.instLabel}>Next Installment #</Text>
                          <Text style={styles.instValue}>{installmentInfo.nextInstallment}</Text>
                        </View>
                      )}
                      <View style={styles.instDivider} />
                      <View style={styles.instRow}>
                        <Text style={styles.instLabel}>Paid Amount</Text>
                        <Text style={[styles.instValue, styles.instGreen]}>
                          PKR {fmtPKR(installmentInfo.paidInstallments * installmentInfo.installmentAmount)}
                        </Text>
                      </View>
                      <View style={styles.instRow}>
                        <Text style={styles.instLabel}>Remaining Amount</Text>
                        <Text style={[styles.instValue, styles.instAmber]}>
                          PKR {fmtPKR((installmentInfo.totalInstallments - installmentInfo.paidInstallments) * installmentInfo.installmentAmount)}
                        </Text>
                      </View>
                      <View style={styles.instRow}>
                        <Text style={styles.instLabel}>Status</Text>
                        <Text style={styles.instValue}>{installmentInfo.status}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Totals */}
                <View style={styles.totalsSection}>
                  <Text style={styles.sectionTitle}>Order Summary</Text>
                  <View style={styles.totalsCard}>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Items</Text>
                      <Text style={styles.totalValue}>
                        {(selectedSale.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)}
                      </Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Subtotal</Text>
                      <Text style={styles.totalValue}>
                        PKR {fmtPKR((Number(selectedSale.totalAmount) || 0) - (Number(selectedSale.taxAmount) || 0))}
                      </Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Tax</Text>
                      <Text style={styles.totalValue}>PKR {fmtPKR(selectedSale.taxAmount)}</Text>
                    </View>
                    <View style={[styles.totalRow, styles.totalFinalRow]}>
                      <Text style={styles.totalFinalLabel}>Total</Text>
                      <Text style={styles.totalFinalValue}>PKR {fmtPKR(selectedSale.totalAmount)}</Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={styles.printBtn}
                    onPress={() => {
                      setPrintSize('a4');
                      setPrintVisible(true);
                    }}>
                    <Printer size={16} color="#2563EB" />
                    <Text style={styles.printBtnText}>Print</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.collectionBtn}
                    onPress={() => handleAddToCollection(selectedSale)}
                    disabled={isAddingToCollection || !selectedSale.subscriberId}>
                    {isAddingToCollection ? (
                      <Loader size={16} color="#FFFFFF" />
                    ) : null}
                    <Text style={styles.collectionBtnText}>
                      {isAddingToCollection ? 'Adding...' : 'Add to Collection'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => {
                      setDetailVisible(false);
                      setSelectedSale(null);
                      setInstallmentInfo(null);
                    }}>
                    <Text style={styles.closeBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Print Size Selection Modal */}
      <Modal
        visible={printVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPrintVisible(false)}>
        <View style={styles.detailOverlay}>
          <View style={styles.printSheet}>
            <Text style={styles.printSheetTitle}>Print Receipt</Text>
            <Text style={styles.printSheetDesc}>Choose your paper size to print the sale receipt.</Text>
            <View style={styles.printOptions}>
              <TouchableOpacity
                style={styles.printOptionBtn}
                onPress={() => {
                  setPrintVisible(false);
                  Alert.alert('Print', 'A4 receipt printing would open in the browser. In production, use react-native-print.');
                }}>
                <Text style={styles.printOptionText}>A4 Size</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.printOptionBtn}
                onPress={() => {
                  setPrintVisible(false);
                  Alert.alert('Print', 'Thermal receipt printing would open in the browser. In production, use react-native-print.');
                }}>
                <Text style={styles.printOptionText}>Thermal / 80mm</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setPrintVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 50,
    marginLeft: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#166534',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#166534',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
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
    minWidth: 170,
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
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  cardInfo: {flex: 1},
  cardName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  cardId: {fontSize: 11, color: '#9CA3AF', fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'})},
  cardRight: {alignItems: 'flex-end'},
  cardAmount: {fontSize: 15, fontWeight: '700', color: '#111827'},
  cardIncrease: {fontSize: 11, color: '#D97706'},
  infoRow: {flexDirection: 'row', paddingVertical: 5},
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 100},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  serialText: {
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    fontSize: 12,
  },
  paymentBadge: {flexDirection: 'row', alignItems: 'center', gap: 8},
  paymentText: {fontSize: 12, color: '#374151', fontWeight: '500', textTransform: 'capitalize'},
  installmentBadge: {
    fontSize: 10,
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 6,
  },
  cardActions: {flexDirection: 'row', gap: 8},
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#DBEAFE',
  },
  editBtnText: {fontSize: 12, fontWeight: '500', color: '#2563EB'},
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FFE4E6',
  },
  deleteBtnText: {fontSize: 12, fontWeight: '500', color: '#E11D48'},
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
  sheetOptionTextActive: {color: '#10B981', fontWeight: '600'},
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  detailSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailSheetTitle: {fontSize: 16, fontWeight: '600', color: '#111827'},
  detailContent: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40},
  detailHeader: {marginBottom: 16},
  detailCustomer: {fontSize: 18, fontWeight: '700', color: '#111827'},
  detailDate: {fontSize: 13, color: '#6B7280', marginTop: 4},
  detailBadges: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8},
  detailId: {fontSize: 12, color: '#9CA3AF', fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'})},
  sectionTitle: {fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12},
  itemCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  itemHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  itemName: {fontSize: 14, fontWeight: '600', color: '#111827', flex: 1},
  itemQty: {fontSize: 12, color: '#6B7280', backgroundColor: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4},
  itemDetails: {gap: 4},
  itemRow: {flexDirection: 'row', justifyContent: 'space-between'},
  itemLabel: {fontSize: 12, color: '#9CA3AF'},
  itemValue: {fontSize: 12, color: '#374151', fontWeight: '500'},
  itemTotalRow: {borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 4, marginTop: 4},
  itemTotalLabel: {fontSize: 13, fontWeight: '600', color: '#111827'},
  itemTotalValue: {fontSize: 13, fontWeight: '600', color: '#111827'},
  installmentSection: {marginTop: 12},
  installmentCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  instRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4},
  instLabel: {fontSize: 12, color: '#6B7280', flex: 1},
  instValue: {fontSize: 12, color: '#111827', fontWeight: '500', textAlign: 'right'},
  instBold: {fontWeight: '700'},
  instBlue: {color: '#2563EB'},
  instGreen: {color: '#059669'},
  instAmber: {color: '#D97706'},
  instDivider: {borderTopWidth: 1, borderTopColor: '#BFDBFE', marginVertical: 4},
  totalsSection: {marginTop: 12},
  totalsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  totalRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3},
  totalLabel: {fontSize: 12, color: '#9CA3AF'},
  totalValue: {fontSize: 12, color: '#374151', fontWeight: '500'},
  totalFinalRow: {borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 6, marginTop: 4},
  totalFinalLabel: {fontSize: 14, fontWeight: '700', color: '#111827'},
  totalFinalValue: {fontSize: 14, fontWeight: '700', color: '#111827'},
  detailActions: {flexDirection: 'row', gap: 8, marginTop: 16, paddingBottom: 20},
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
  },
  printBtnText: {fontSize: 14, fontWeight: '600', color: '#2563EB'},
  collectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
  },
  collectionBtnText: {fontSize: 14, fontWeight: '600', color: '#FFFFFF'},
  closeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  closeBtnText: {fontSize: 14, fontWeight: '600', color: '#374151'},
  printSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  printSheetTitle: {fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8},
  printSheetDesc: {fontSize: 13, color: '#6B7280', marginBottom: 16},
  printOptions: {gap: 10},
  printOptionBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  printOptionText: {fontSize: 14, fontWeight: '600', color: '#374151'},
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelBtnText: {fontSize: 14, color: '#DC2626', fontWeight: '600'},
  formGroup: {marginBottom: 14},
  formLabel: {fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6},
  formInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
});