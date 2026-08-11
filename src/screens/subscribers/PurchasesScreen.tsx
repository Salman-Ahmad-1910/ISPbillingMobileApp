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
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import {useFocusEffect, useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  ShoppingCart,
  DollarSign,
  Receipt,
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  Wallet,
} from 'lucide-react-native';
import {
  getPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
  updatePurchaseStatus,
  getVendors,
  getProducts,
} from '../../api/inventory';
import {Purchase, PurchaseItem, Vendor, Product} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';

const PAGE_SIZES = [5, 10, 20, 50, 100];

type FilterOption = {label: string; value: string};

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  {label: 'All Statuses', value: 'all'},
  {label: 'Paid', value: 'paid'},
  {label: 'Unpaid', value: 'unpaid'},
  {label: 'Partial', value: 'partial'},
];

const STATUS_OPTIONS: FilterOption[] = [
  {label: 'Unpaid', value: 'unpaid'},
  {label: 'Paid', value: 'paid'},
  {label: 'Partial', value: 'partial'},
];

const FOC_OPTIONS: FilterOption[] = [
  {label: 'Normal', value: 'normal'},
  {label: 'FOC', value: 'foc'},
];

interface ItemForm {
  productId: string;
  productName: string;
  quantity: string;
  purchasePrice: string;
  sellingPrice: string;
  focNormal: string;
  serialNumber: string;
}

interface PurchaseFormValues {
  vendorId: string;
  vendorName: string;
  billId: string;
  batch: string;
  purchaseDate: string;
  discount: string;
  salesTax: string;
  wthTax: string;
  status: string;
  items: ItemForm[];
}

const emptyForm: PurchaseFormValues = {
  vendorId: '',
  vendorName: '',
  billId: '',
  batch: '',
  purchaseDate: '',
  discount: '',
  salesTax: '',
  wthTax: '',
  status: 'unpaid',
  items: [],
};

type SelectSheetState = {
  key: string;
  title: string;
  options: FilterOption[];
  selected: string;
  onSelect: (v: string) => void;
} | null;

const STATUS_COLORS: Record<string, string> = {
  paid: '#10B981',
  unpaid: '#EF4444',
  partial: '#F59E0B',
};

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

function PurchasesDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="purchasesHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8B5CF6" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#7C3AED" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#purchasesHeroGrad)" />
      </Svg>
    </View>
  );
}

export default function PurchasesScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filtered, setFiltered] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [form, setForm] = useState<PurchaseFormValues>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectSheet, setSelectSheet] = useState<SelectSheetState>(null);

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
      const [purchaseData, vendorData, productData] = await Promise.all([
        getPurchases().catch(() => []),
        getVendors().catch(() => []),
        getProducts().catch(() => []),
      ]);
      setPurchases(purchaseData);
      setVendors(vendorData);
      setProducts(productData);
      setFiltered(purchaseData);
    } catch (err: any) {
      const reason =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load purchases. Check your connection and try again.';
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
  }, [search, statusFilter]);

  useEffect(() => {
    let result = purchases;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        p =>
          (p.billId || '').toLowerCase().includes(q) ||
          (p.purchaseNumber || '').toLowerCase().includes(q) ||
          (p.vendorName || '').toLowerCase().includes(q),
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    setFiltered(result);
  }, [purchases, search, statusFilter]);

  const kpiData = useMemo(() => {
    const totalRecords = filtered.length;
    const totalAmount = filtered.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const avg = totalRecords > 0 ? Math.round(totalAmount / totalRecords) : 0;
    return [
      {label: 'Total Purchases', value: String(totalRecords), icon: ShoppingCart, gradient: ['#8B5CF6', '#7C3AED']},
      {label: 'Total Amount', value: `PKR ${totalAmount.toLocaleString()}`, icon: DollarSign, gradient: ['#10B981', '#16A34A']},
      {label: 'Avg Per Purchase', value: `PKR ${avg.toLocaleString()}`, icon: Receipt, gradient: ['#F59E0B', '#EA580C']},
    ];
  }, [filtered]);

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

  const setField = (key: keyof PurchaseFormValues, value: any) => {
    setForm(prev => ({...prev, [key]: value}));
  };

  const setItemField = (index: number, key: keyof ItemForm, value: any) => {
    setForm(prev => {
      const items = prev.items.map((it, i) => (i === index ? {...it, [key]: value} : it));
      return {...prev, items};
    });
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {productId: '', productName: '', quantity: '1', purchasePrice: '', sellingPrice: '', focNormal: 'normal', serialNumber: ''},
      ],
    }));
  };

  const removeItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const itemsTotal = () => {
    return form.items.reduce((sum, it) => sum + (parseInt(it.quantity) || 0) * (parseFloat(it.purchasePrice) || 0), 0);
  };

  const totalAmount = () => {
    const subtotal = itemsTotal();
    const discount = parseFloat(form.discount) || 0;
    const salesTax = parseFloat(form.salesTax) || 0;
    const wthTax = parseFloat(form.wthTax) || 0;
    return subtotal - discount + salesTax + wthTax;
  };

  const openAdd = () => {
    setEditing(null);
    setForm({...emptyForm, purchaseDate: new Date().toISOString().split('T')[0]});
    setFormOpen(true);
  };

  const openEdit = (purchase: Purchase) => {
    setEditing(purchase);
    setForm({
      vendorId: purchase.vendorId || '',
      vendorName: purchase.vendorName || '',
      billId: purchase.billId || '',
      batch: purchase.batch || '',
      purchaseDate: purchase.purchaseDate || '',
      discount: String(purchase.discount || ''),
      salesTax: String(purchase.salesTax || ''),
      wthTax: String(purchase.wthTax || ''),
      status: purchase.status || 'unpaid',
      items: (purchase.items || []).map((it: PurchaseItem) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: String(it.quantity || ''),
        purchasePrice: String(it.purchasePrice || ''),
        sellingPrice: String(it.sellingPrice || ''),
        focNormal: it.focNormal || 'normal',
        serialNumber: it.serialNumber || '',
      })),
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.vendorId) {
      Alert.alert('Error', 'Vendor is required.');
      return;
    }
    if (!form.purchaseDate) {
      Alert.alert('Error', 'Purchase date is required.');
      return;
    }
    if (form.items.length === 0) {
      Alert.alert('Error', 'At least one item is required.');
      return;
    }
    for (const item of form.items) {
      if (!item.productId) {
        Alert.alert('Error', 'Select a product for every item.');
        return;
      }
      if ((parseInt(item.quantity) || 0) < 1) {
        Alert.alert('Error', 'Quantity must be at least 1.');
        return;
      }
    }
    setSaving(true);
    try {
      const computedTotal = totalAmount();
      const items = form.items.map(it => ({
        productId: it.productId,
        productName: it.productName,
        quantity: parseInt(it.quantity) || 1,
        purchasePrice: parseFloat(it.purchasePrice) || 0,
        sellingPrice: parseFloat(it.sellingPrice) || 0,
        unitType: products.find(p => p.id === it.productId)?.unitType || 'piece',
        focNormal: it.focNormal,
        serialNumber: it.serialNumber,
        subtotal: (parseInt(it.quantity) || 1) * (parseFloat(it.purchasePrice) || 0),
      }));
      const payload = {
        vendorId: form.vendorId,
        vendorName: form.vendorName || vendors.find(v => v.id === form.vendorId)?.name || '',
        billId: form.billId,
        batch: form.batch,
        purchaseDate: form.purchaseDate,
        discount: parseFloat(form.discount) || 0,
        salesTax: parseFloat(form.salesTax) || 0,
        wthTax: parseFloat(form.wthTax) || 0,
        status: form.status as Purchase['status'],
        totalAmount: computedTotal,
        remainingAmount: form.status === 'paid' ? 0 : computedTotal,
        items,
      };
      if (editing) {
        await updatePurchase(editing.id, payload);
      } else {
        await createPurchase(payload);
      }
      setFormOpen(false);
      setEditing(null);
      fetchData(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to save purchase';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async (purchase: Purchase) => {
    const newStatus = purchase.status === 'paid' ? 'unpaid' : 'paid';
    try {
      await updatePurchaseStatus(purchase.id, newStatus);
      setPurchases(prev => prev.map(p => (p.id === purchase.id ? {...p, status: newStatus} : p)));
      fetchData(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to update payment status';
      Alert.alert('Error', msg);
    }
  };

  const handleDelete = (purchase: Purchase) => {
    Alert.alert(
      'Delete Purchase',
      `Delete purchase ${purchase.purchaseNumber || purchase.billId}? This will revert stock for all items.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePurchase(purchase.id);
              fetchData(false);
            } catch (err: any) {
              const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete purchase';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({item, index}: {item: Purchase; index: number}) => {
    const statusColor = STATUS_COLORS[item.status] || '#6B7280';
    const productNames = (item.items || []).map(i => i.productName).filter(Boolean);
    const productLabel =
      productNames.length > 2
        ? `${productNames.slice(0, 2).join(', ')} +${productNames.length - 2} more`
        : productNames.join(', ');
    const serials = (item.items || []).map(i => i.serialNumber).filter(Boolean);
    const serialLabel =
      serials.length > 2 ? `${serials.slice(0, 2).join(', ')} +${serials.length - 2}` : serials.join(', ');
    const totalQty = (item.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rowIndex}>{index + 1 + (currentPage - 1) * pageSize}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.billId} numberOfLines={1}>
              {item.billId || item.purchaseNumber || '-'}
            </Text>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.vendorName || '-'}
            </Text>
          </View>
          <View style={styles.statusBadge(statusColor)}>
            <Text style={[styles.statusText, {color: statusColor}]}>
              {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : '—'}
            </Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Products</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{productLabel || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{item.purchaseDate || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>SN / MAC</Text>
          <Text style={styles.infoValueMono} numberOfLines={1}>{serialLabel || '—'}</Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.quantityBox}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <Text style={styles.quantityValue}>{totalQty}</Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Total Amount</Text>
            <Text style={styles.priceValue}>PKR {(Number(item.totalAmount) || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.payBtn} onPress={() => handlePay(item)}>
              <Wallet size={14} color="#10B981" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
              <Pencil size={14} color="#7C3AED" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Trash2 size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  const formRow = (label: string, value: any, onChangeText: (t: string) => void, placeholder = '', keyboardType?: 'default' | 'numeric' | 'phone-pad') => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={styles.formInput}
        value={String(value ?? '')}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );

  const selectField = (label: string, display: string, placeholder: string, onPress: () => void) => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TouchableOpacity style={styles.formSelect} onPress={onPress}>
        <Text
          style={display ? styles.formSelectValue : styles.formSelectPlaceholder}
          numberOfLines={1}>
          {display || placeholder}
        </Text>
        <ChevronDown size={16} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <GradientView colors={['#166534', '#22c55e']} style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Purchases</Text>
          <Text style={styles.headerCount}>{filtered.length} total</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginated}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#8B5CF6']} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.heroHeader}>
              <GradientView colors={['#8B5CF6', '#7C3AED']} style={styles.heroIconBox}>
                <ShoppingCart size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Purchases</Text>
                <Text style={styles.heroSubtitle}>
                  Manage purchase orders from vendors.
                </Text>
              </View>
            </View>

            <PurchasesDivider />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}>
              {kpiData.map(card => (
                <View key={card.label} style={styles.statCard}>
                  <GradientView colors={card.gradient as [string, string]} style={styles.statIcon}>
                    <card.icon size={18} color="#FFFFFF" />
                  </GradientView>
                  <View>
                    <Text style={styles.statLabel}>{card.label}</Text>
                    <Text style={styles.statValue}>{card.value}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}>
              <View style={styles.filters}>
                <TouchableOpacity
                  style={styles.filterSelect}
                  onPress={() => setSelectSheet({
                    key: 'statusFilter',
                    title: 'Status',
                    options: STATUS_FILTER_OPTIONS,
                    selected: statusFilter,
                    onSelect: setStatusFilter,
                  })}>
                  <Text style={styles.filterSelectText}>
                    {STATUS_FILTER_OPTIONS.find(o => o.value === statusFilter)?.label || 'Status'}
                  </Text>
                  <ChevronDown size={14} color="#6B7280" />
                </TouchableOpacity>
                <View style={styles.filterField}>
                  <Search size={16} color="#6B7280" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search bill, vendor..."
                    placeholderTextColor="#9CA3AF"
                    value={search}
                    onChangeText={setSearch}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.toolbar}>
              <GradientButton
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.addBtn}
                onPress={openAdd}>
                <PlusCircle size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText} numberOfLines={1}>
                  Add Purchase
                </Text>
              </GradientButton>
            </View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={styles.emptyTitle}>Failed to load purchases</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyTitle}>No purchases found</Text>
              <Text style={styles.emptyText}>
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your search'
                  : 'Add your first purchase'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.pagination}>
            <Text style={styles.paginationInfo}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} purchases
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
                  style={[styles.pageNum, currentPage === page && {backgroundColor: '#8B5CF6'}]}
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
                  {active ? <Check size={16} color="#8B5CF6" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Add/Edit Purchase form */}
      <Modal
        visible={formOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView
          style={styles.formOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formSheet}>
            <View style={styles.formSheetHeader}>
              <View style={styles.formSheetTitleRow}>
                <GradientView colors={['#8B5CF6', '#7C3AED']} style={styles.formSheetIcon}>
                  <ShoppingCart size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>
                  {editing ? `Edit Purchase: ${editing.purchaseNumber || editing.billId}` : 'Add New Purchase'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFormOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              {selectField(
                'Vendor *',
                vendors.find(v => v.id === form.vendorId)?.name || form.vendorName,
                'Select a vendor',
                () => {
                  setSelectSheet({
                    key: 'vendor',
                    title: 'Select vendor',
                    options: vendors.map(v => ({label: v.name, value: v.id})),
                    selected: form.vendorId,
                    onSelect: (v) => setField('vendorId', v),
                  });
                },
              )}
              <View style={styles.formRow2}>
                <View style={styles.formGroupFlex}>
                  {formRow('Bill ID', form.billId, t => setField('billId', t), 'e.g., BILL-001')}
                </View>
                <View style={styles.formGroupFlex}>
                  {formRow('Batch', form.batch, t => setField('batch', t), 'e.g., BATCH-001')}
                </View>
              </View>
              {formRow('Purchase Date *', form.purchaseDate, t => setField('purchaseDate', t), 'YYYY-MM-DD')}

              <Text style={styles.formSectionLabel}>Products</Text>
              {form.items.length === 0 ? (
                <Text style={styles.formEmptyText}>No products added yet.</Text>
              ) : (
                form.items.map((item, index) => (
                  <View key={index} style={styles.itemBox}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemTitle}>Item {index + 1}</Text>
                      <TouchableOpacity style={styles.removeItemBtn} onPress={() => removeItem(index)}>
                        <Trash2 size={14} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                    {selectField(
                      'Product *',
                      products.find(p => p.id === item.productId)?.name || item.productName,
                      'Select a product',
                      () => {
                        setSelectSheet({
                          key: `product:${index}`,
                          title: 'Select product',
                          options: products.map(p => ({label: p.name, value: p.id})),
                          selected: item.productId,
                          onSelect: (v) => {
                            const product = products.find(p => p.id === v);
                            setItemField(index, 'productId', v);
                            setItemField(index, 'productName', product?.name || '');
                            setItemField(index, 'sellingPrice', String(product?.salePrice ?? product?.price ?? ''));
                          },
                        });
                      },
                    )}
                    <View style={styles.formRow3}>
                      <View style={styles.formGroupFlex}>
                        {formRow('Quantity *', item.quantity, t => {
                          if (t === '' || /^\d+$/.test(t)) {
                            setItemField(index, 'quantity', t);
                          }
                        }, '1', 'numeric')}
                      </View>
                      <View style={styles.formGroupFlex}>
                        {formRow('Purchase Price *', item.purchasePrice, t => setItemField(index, 'purchasePrice', t), '0', 'numeric')}
                      </View>
                      <View style={styles.formGroupFlex}>
                        {formRow('Selling Price *', item.sellingPrice, t => setItemField(index, 'sellingPrice', t), '0', 'numeric')}
                      </View>
                    </View>
                    <View style={styles.formRow2}>
                      <View style={styles.formGroupFlex}>
                        {selectField(
                          'FOC/Normal',
                          FOC_OPTIONS.find(o => o.value === item.focNormal)?.label || 'Normal',
                          'Normal',
                          () => {
                            setSelectSheet({
                              key: `foc:${index}`,
                              title: 'FOC / Normal',
                              options: FOC_OPTIONS,
                              selected: item.focNormal,
                              onSelect: (v) => setItemField(index, 'focNormal', v),
                            });
                          },
                        )}
                      </View>
                      <View style={styles.formGroupFlex}>
                        {formRow('Serial / MAC', item.serialNumber, t => setItemField(index, 'serialNumber', t), 'e.g., SN-001')}
                      </View>
                    </View>
                    <View style={styles.itemSubtotal}>
                      <Text style={styles.itemSubtotalLabel}>Amount</Text>
                      <Text style={styles.itemSubtotalValue}>
                        PKR {((parseInt(item.quantity) || 0) * (parseFloat(item.purchasePrice) || 0)).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
                <PlusCircle size={16} color="#8B5CF6" />
                <Text style={styles.addItemBtnText}>Add Item</Text>
              </TouchableOpacity>

              <View style={styles.formRow2}>
                <View style={styles.formGroupFlex}>
                  {formRow('Discount', form.discount, t => setField('discount', t), '0', 'numeric')}
                </View>
                <View style={styles.formGroupFlex}>
                  {formRow('Sales Tax', form.salesTax, t => setField('salesTax', t), '0', 'numeric')}
                </View>
              </View>
              <View style={styles.formRow2}>
                <View style={styles.formGroupFlex}>
                  {formRow('Wth Tax', form.wthTax, t => setField('wthTax', t), '0', 'numeric')}
                </View>
                <View style={styles.formGroupFlex}>
                  {selectField(
                    'Status',
                    STATUS_OPTIONS.find(o => o.value === form.status)?.label || '',
                    'Select status',
                    () => {
                      setSelectSheet({
                        key: 'status',
                        title: 'Select status',
                        options: STATUS_OPTIONS,
                        selected: form.status,
                        onSelect: (v) => setField('status', v),
                      });
                    },
                  )}
                </View>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>PKR {totalAmount().toLocaleString()}</Text>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setFormOpen(false)}
                  disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <GradientButton
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editing ? 'Update' : 'Add Purchase'}</Text>
                  )}
                </GradientButton>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
                    {active ? <Check size={16} color="#8B5CF6" /> : null}
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
  statValue: {fontSize: 18, fontWeight: '700', color: '#111827'},
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
    minWidth: 200,
    flex: 1,
  },
  filterSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 42,
    minWidth: 140,
    justifyContent: 'space-between',
  },
  filterSelectText: {flex: 1, fontSize: 13, color: '#111827', marginRight: 4},
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexShrink: 0,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginLeft: 6},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 6},
  rowIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
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
  statusBadge: (color: string) => ({
    backgroundColor: `${color}20`,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  }),
  statusText: {fontSize: 11, fontWeight: '600'},
  infoRow: {flexDirection: 'row', paddingVertical: 5},
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 80},
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
  priceBox: {alignItems: 'flex-end', flex: 1, paddingHorizontal: 8},
  priceLabel: {fontSize: 11, color: '#9CA3AF'},
  priceValue: {fontSize: 13, fontWeight: '700', color: '#111827'},
  cardActions: {flexDirection: 'row', gap: 6},
  payBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#D1FAE5',
  },
  editBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#EDE9FE',
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FEF2F2',
  },
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280', textAlign: 'center'},
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
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
  sheetOptionTextActive: {color: '#8B5CF6', fontWeight: '600'},
  sheetEmpty: {paddingVertical: 30, alignItems: 'center'},
  sheetEmptyText: {fontSize: 13, color: '#9CA3AF'},
  formOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  formSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '95%',
  },
  formSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  formSheetTitleRow: {flexDirection: 'row', alignItems: 'center', flex: 1},
  formSheetIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  formSheetTitle: {fontSize: 16, fontWeight: '600', color: '#111827', flex: 1},
  formBody: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40},
  formGroup: {marginBottom: 14},
  formGroupFlex: {flex: 1},
  formRow2: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
  formRow3: {flexDirection: 'row', gap: 8, alignItems: 'flex-start'},
  formLabel: {fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6},
  formInput: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827',
  },
  formSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formSelectValue: {flex: 1, fontSize: 15, color: '#111827', marginRight: 8},
  formSelectPlaceholder: {flex: 1, fontSize: 15, color: '#9CA3AF', marginRight: 8},
  formSectionLabel: {fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 4, marginBottom: 10},
  formEmptyText: {fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16},
  itemBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemTitle: {fontSize: 13, fontWeight: '600', color: '#8B5CF6'},
  removeItemBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemSubtotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  itemSubtotalLabel: {fontSize: 12, color: '#9CA3AF'},
  itemSubtotalValue: {fontSize: 14, fontWeight: '700', color: '#111827'},
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C4B5FD',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 14,
    backgroundColor: '#FAF5FF',
  },
  addItemBtnText: {fontSize: 14, color: '#8B5CF6', fontWeight: '600', marginLeft: 6},
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  totalLabel: {fontSize: 14, fontWeight: '600', color: '#6B7280'},
  totalValue: {fontSize: 18, fontWeight: '700', color: '#7C3AED'},
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {fontSize: 14, color: '#DC2626', fontWeight: '600'},
  saveBtn: {
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  saveBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
});
