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
  FileText,
  Building2,
  Calendar,
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  Filter,
} from 'lucide-react-native';
import {
  getVendorInvoices,
  createVendorInvoice,
  updateVendorInvoice,
  deleteVendorInvoice,
  getVendors,
  getProducts,
} from '../../api/inventory';
import {VendorInvoice, Vendor, Product} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';

const PAGE_SIZES = [5, 10, 20, 50, 100];

const fmtPKR = (n: number) => new Intl.NumberFormat('en-US').format(Number(n) || 0);

const unitTypeLabel = (u?: string) =>
  u === 'piece'
    ? 'Per Piece'
    : u === 'meter'
      ? 'Per Meter'
      : u === 'kilogram'
        ? 'Per Kg'
        : u === 'liter'
          ? 'Per Liter'
          : u || '—';

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

function VendorInvoicesDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="vendorInvoicesHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#F59E0B" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#EA580C" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#EA580C" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#vendorInvoicesHeroGrad)" />
      </Svg>
    </View>
  );
}

interface FormState {
  vendorId: string;
  vendorName: string;
  invoiceDate: string;
  batch: string;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  unitType: string;
  serialNumber: string;
}

const emptyForm: FormState = {
  vendorId: '',
  vendorName: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  batch: '',
  productId: '',
  productName: '',
  quantity: '1',
  unitPrice: '',
  unitType: '',
  serialNumber: '',
};

export default function VendorInvoicesScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const [items, setItems] = useState<VendorInvoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VendorInvoice | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState<'vendor' | 'product' | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

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
      const [invoices, vendorData, productData] = await Promise.all([
        getVendorInvoices(),
        getVendors().catch(() => [] as Vendor[]),
        getProducts().catch(() => [] as Product[]),
      ]);
      setItems(invoices);
      setFiltered(invoices);
      setVendors(vendorData);
      setProducts(productData);
    } catch (err: any) {
      const reason =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load vendor invoices. Check your connection and try again.';
      setError(reason);
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
  }, [search, vendorFilter]);

  useEffect(() => {
    let result = items;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(q) ||
        (invoice.vendorName || '').toLowerCase().includes(q) ||
        (invoice.items || []).some(item => (item.productName || '').toLowerCase().includes(q)),
      );
    }

    if (vendorFilter.trim()) {
      result = result.filter(invoice => invoice.vendorId === vendorFilter);
    }

    setFiltered(result);
  }, [items, search, vendorFilter]);

  const totalSpent = items.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  const avgPerPurchase = items.length > 0 ? Math.round(totalSpent / items.length) : 0;

  const statCards: {key: string; label: string; value: string; icon: any; gradient: [string, string]}[] = [
    {key: 'total', label: 'Total Invoices', value: String(items.length), icon: ShoppingCart, gradient: ['#F59E0B', '#EA580C']},
    {key: 'spent', label: 'Total Spent', value: `PKR ${fmtPKR(totalSpent)}`, icon: DollarSign, gradient: ['#10B981', '#16A34A']},
    {key: 'avg', label: 'Avg Per Purchase', value: `PKR ${fmtPKR(avgPerPurchase)}`, icon: Receipt, gradient: ['#3B82F6', '#06B6D4']},
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

  const setField = (key: keyof FormState, value: string) => {
    setForm(prev => ({...prev, [key]: value}));
  };

  const filteredVendors = vendors.filter(v => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return true;
    return (v.name || '').toLowerCase().includes(q);
  });

  const filteredProducts = products.filter(p => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return true;
    return (p.name || '').toLowerCase().includes(q);
  });

  const openAdd = () => {
    setEditing(null);
    setForm({...emptyForm});
    setFormOpen(true);
  };

  const openEdit = (invoice: VendorInvoice) => {
    setEditing(invoice);
    const item = invoice.items?.[0];
    setForm({
      vendorId: invoice.vendorId || '',
      vendorName: invoice.vendorName || '',
      invoiceDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
      batch: invoice.batch || '',
      productId: item?.productId || '',
      productName: item?.productName || '',
      quantity: String(item?.quantity || 1),
      unitPrice: item?.unitPrice != null ? String(item.unitPrice) : '',
      unitType: item?.unitType || '',
      serialNumber: item?.serialNumber || '',
    });
    setFormOpen(true);
  };

  const subtotal = (parseFloat(form.quantity) || 0) * (parseFloat(form.unitPrice) || 0);
  const totalAmount = subtotal;

  const handleSave = async () => {
    if (!form.vendorId) {
      Alert.alert('Error', 'Please select a vendor');
      return;
    }
    if (!form.invoiceDate.trim()) {
      Alert.alert('Error', 'Buying date is required');
      return;
    }
    if (!form.productId) {
      Alert.alert('Error', 'Please select a product');
      return;
    }
    const qty = parseFloat(form.quantity) || 0;
    const unitPrice = parseFloat(form.unitPrice) || 0;
    if (qty < 1) {
      Alert.alert('Error', 'Quantity must be at least 1');
      return;
    }
    if (unitPrice < 0) {
      Alert.alert('Error', 'Unit price cannot be negative');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        vendorId: form.vendorId,
        vendorName: form.vendorName || form.vendorId,
        invoiceNumber: editing?.invoiceNumber || '',
        invoiceDate: form.invoiceDate.trim(),
        batch: form.batch.trim(),
        totalAmount,
        items: [
          {
            productId: form.productId,
            productName: form.productName || form.productId,
            quantity: qty,
            unitPrice,
            unitType: form.unitType || 'piece',
            subtotal: qty * unitPrice,
            serialNumber: form.serialNumber,
          },
        ],
      };
      if (editing) {
        await updateVendorInvoice(editing.id, payload);
      } else {
        await createVendorInvoice(payload);
      }
      setFormOpen(false);
      setEditing(null);
      fetchData(false);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to save vendor invoice';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (invoice: VendorInvoice) => {
    Alert.alert(
      'Delete Vendor Invoice',
      `Delete invoice ${invoice.invoiceNumber}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVendorInvoice(invoice.id);
              fetchData(false);
            } catch (err: any) {
              const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                'Failed to delete vendor invoice';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  const selectedVendorFilter = vendors.find(v => v.id === vendorFilter);

  const renderItem = ({item, index}: {item: VendorInvoice; index: number}) => {
    const serials = (item.items || [])
      .map(i => i.serialNumber)
      .filter(Boolean);
    const names = (item.items || []).map(i => i.productName).filter(Boolean);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rowIndex}>{index + 1 + (currentPage - 1) * pageSize}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.invoiceNumber} numberOfLines={1}>
              {item.invoiceNumber}
            </Text>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.vendorName || '-'}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
              <Pencil size={15} color="#D97706" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Trash2 size={15} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Vendor</Text>
          <View style={styles.infoValueRow}>
            <Building2 size={13} color="#6B7280" />
            <Text style={styles.infoValue} numberOfLines={1}>
              {item.vendorName || '-'}
            </Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Buying Date</Text>
          <View style={styles.infoValueRow}>
            <Calendar size={13} color="#6B7280" />
            <Text style={styles.infoValue} numberOfLines={1}>
              {item.invoiceDate || '-'}
            </Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Batch</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {item.batch || '-'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>SN / MAC</Text>
          <Text style={styles.infoValueMono} numberOfLines={1}>
            {serials.length > 0 ? serials.join(', ') : '-'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Products</Text>
          <Text style={styles.infoValue} numberOfLines={2}>
            {names.length > 0 ? names.join(', ') : '-'}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.itemCountBox}>
            <Text style={styles.itemCountLabel}>Items</Text>
            <Text style={styles.itemCountValue}>{(item.items || []).length}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>PKR {fmtPKR(item.totalAmount)}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  const formRow = (
    label: string,
    value: string,
    onChangeText: (t: string) => void,
    placeholder = '',
    keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric',
    editable = true,
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={[styles.formInput, !editable && styles.formInputReadonly]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType || 'default'}
        editable={editable}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <GradientView colors={['#166534', '#22c55e']} style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Vendor Invoices</Text>
          <Text style={styles.headerCount}>{filtered.length} total</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginated}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={['#F59E0B']}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Hero Header */}
            <View style={styles.heroHeader}>
              <GradientView colors={['#F59E0B', '#EA580C']} style={styles.heroIconBox}>
                <ShoppingCart size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Vendor Invoices</Text>
                <Text style={styles.heroSubtitle}>
                  Manage vendor invoices and track product purchases with serial numbers.
                </Text>
              </View>
            </View>

            <VendorInvoicesDivider />

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
                    <Text style={styles.statValue} numberOfLines={1}>
                      {card.value}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Search + Filter + Add */}
            <View style={styles.toolbar}>
              <View style={styles.searchBox}>
                <Search size={16} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search purchases..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
                <Filter size={15} color="#D97706" />
                <Text style={styles.filterBtnText} numberOfLines={1}>
                  {selectedVendorFilter ? selectedVendorFilter.name : 'All Vendors'}
                </Text>
                <ChevronDown size={14} color="#6B7280" />
              </TouchableOpacity>
              <GradientButton
                colors={['#10B981', '#16A34A']}
                style={styles.addBtn}
                onPress={openAdd}>
                <PlusCircle size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText} numberOfLines={1}>
                  Buy a Product
                </Text>
              </GradientButton>
            </View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={styles.emptyTitle}>Failed to load vendor invoices</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyTitle}>No vendor invoices found</Text>
              <Text style={styles.emptyText}>
                {search || vendorFilter ? 'Try adjusting your search' : 'Buy your first product'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.pagination}>
            <Text style={styles.paginationInfo}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} invoices
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
                  style={[styles.pageNum, currentPage === page && {backgroundColor: '#F59E0B'}]}
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
                  {active ? <Check size={16} color="#F59E0B" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Vendor filter sheet */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter by Vendor</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll}>
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => {
                  setVendorFilter('');
                  setFilterOpen(false);
                }}>
                <View style={styles.sheetOptionRow}>
                  <Text
                    style={[
                      styles.sheetOptionText,
                      !vendorFilter && styles.sheetOptionTextActive,
                    ]}>
                    All Vendors
                  </Text>
                  {!vendorFilter ? <Check size={16} color="#F59E0B" /> : null}
                </View>
              </TouchableOpacity>
              {vendors.map(vendor => {
                const active = vendorFilter === vendor.id;
                return (
                  <TouchableOpacity
                    key={vendor.id}
                    style={styles.sheetOption}
                    onPress={() => {
                      setVendorFilter(vendor.id);
                      setFilterOpen(false);
                    }}>
                    <View style={styles.sheetOptionRow}>
                      <Building2 size={16} color="#6B7280" />
                      <Text
                        style={[
                          styles.sheetOptionText,
                          active && styles.sheetOptionTextActive,
                        ]}>
                        {vendor.name}
                      </Text>
                      {active ? <Check size={16} color="#F59E0B" /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Vendor / Product picker sheet */}
      <Modal
        visible={pickerOpen !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(null)}>
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, styles.pickerSheet]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {pickerOpen === 'vendor' ? 'Select Vendor' : 'Select Product'}
              </Text>
              <TouchableOpacity onPress={() => setPickerOpen(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearch}>
              <Search size={16} color="#6B7280" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder={
                  pickerOpen === 'vendor' ? 'Search vendors...' : 'Search products...'
                }
                placeholderTextColor="#9CA3AF"
                value={pickerQuery}
                onChangeText={setPickerQuery}
                autoFocus
              />
            </View>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              {pickerOpen === 'vendor' &&
                filteredVendors.map(vendor => {
                  const active = form.vendorId === vendor.id;
                  return (
                    <TouchableOpacity
                      key={vendor.id}
                      style={styles.sheetOption}
                      onPress={() => {
                        setForm(prev => ({...prev, vendorId: vendor.id, vendorName: vendor.name}));
                        setPickerOpen(null);
                        setPickerQuery('');
                      }}>
                      <View style={styles.sheetOptionRow}>
                        <Building2 size={16} color="#6B7280" />
                        <Text
                          style={[
                            styles.sheetOptionText,
                            active && styles.sheetOptionTextActive,
                          ]}>
                          {vendor.name}
                        </Text>
                        {active ? <Check size={16} color="#F59E0B" /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              {pickerOpen === 'product' &&
                filteredProducts.map(product => {
                  const active = form.productId === product.id;
                  return (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.sheetOption}
                      onPress={() => {
                        const unitPrice = product.purchasePrice || product.price || 0;
                        setForm(prev => ({
                          ...prev,
                          productId: product.id,
                          productName: product.name,
                          unitType: product.unitType || '',
                          unitPrice: String(unitPrice),
                          serialNumber: product.serialNumber || '',
                        }));
                        setPickerOpen(null);
                        setPickerQuery('');
                      }}>
                      <View style={styles.sheetOptionRow}>
                        <Text
                          style={[
                            styles.sheetOptionText,
                            active && styles.sheetOptionTextActive,
                          ]}>
                          {product.name}
                        </Text>
                        {product.stock != null ? (
                          <Text style={styles.pickerSecondary}>
                            Stock: {product.stock}
                          </Text>
                        ) : null}
                        {active ? <Check size={16} color="#F59E0B" /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              {((pickerOpen === 'vendor' && filteredVendors.length === 0) ||
                (pickerOpen === 'product' && filteredProducts.length === 0)) && (
                <Text style={styles.pickerEmpty}>No results found</Text>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add/Edit Vendor Invoice form */}
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
                <GradientView colors={['#F59E0B', '#EA580C']} style={styles.formSheetIcon}>
                  <ShoppingCart size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>
                  {editing ? 'Edit Vendor Invoice' : 'Buy a Product'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFormOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Vendor *</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() => {
                    setPickerQuery('');
                    setPickerOpen('vendor');
                  }}>
                  <Building2 size={16} color="#D97706" />
                  <Text
                    style={[
                      styles.formSelectText,
                      !form.vendorId && styles.formSelectPlaceholder,
                    ]}
                    numberOfLines={1}>
                    {form.vendorId ? form.vendorName || form.vendorId : 'Select a vendor'}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formRow2}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Buying Date *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={form.invoiceDate}
                    onChangeText={t => setField('invoiceDate', t)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Batch</Text>
                  <TextInput
                    style={styles.formInput}
                    value={form.batch}
                    onChangeText={t => setField('batch', t)}
                    placeholder="e.g., BATCH-001"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.productSection}>
                <Text style={styles.sectionLabel}>Product Details</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Product *</Text>
                  <TouchableOpacity
                    style={styles.formSelect}
                    onPress={() => {
                      setPickerQuery('');
                      setPickerOpen('product');
                    }}>
                    <FileText size={16} color="#D97706" />
                    <Text
                      style={[
                        styles.formSelectText,
                        !form.productId && styles.formSelectPlaceholder,
                      ]}
                      numberOfLines={1}>
                      {form.productId ? form.productName || form.productId : 'Select product'}
                    </Text>
                    <ChevronDown size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {formRow(
                  'Unit Type',
                  unitTypeLabel(form.unitType),
                  () => {},
                  '',
                  'default',
                  false,
                )}

                <View style={styles.formRow2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Quantity *</Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="numeric"
                      value={form.quantity}
                      onChangeText={t => {
                        if (t === '' || /^\d*\.?\d*$/.test(t)) {
                          setField('quantity', t);
                        }
                      }}
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Unit Price *</Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="numeric"
                      value={form.unitPrice}
                      onChangeText={t => {
                        if (t === '' || /^\d*\.?\d*$/.test(t)) {
                          setField('unitPrice', t);
                        }
                      }}
                      placeholder={form.productId ? 'Auto from product' : 'Select product first'}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                {formRow('Subtotal', `PKR ${fmtPKR(subtotal)}`, () => {}, '', 'default', false)}
                {formRow(
                  'SN / MAC',
                  form.serialNumber,
                  () => {},
                  'Auto-filled from product',
                  'default',
                  false,
                )}
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalAmountLabel}>Total Amount</Text>
                <Text style={styles.totalAmountValue}>PKR {fmtPKR(totalAmount)}</Text>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setFormOpen(false)}
                  disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <GradientButton
                  colors={['#10B981', '#16A34A']}
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editing ? 'Update' : 'Save'}</Text>
                  )}
                </GradientButton>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    minWidth: 180,
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
  statValue: {fontSize: 17, fontWeight: '700', color: '#111827'},
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
    minWidth: 90,
  },
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 5,
    maxWidth: 140,
    flexShrink: 0,
  },
  filterBtnText: {fontSize: 12, color: '#374151', fontWeight: '600', flexShrink: 1},
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
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
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 4},
  rowIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1},
  invoiceNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    marginBottom: 2,
  },
  cardName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  cardActions: {flexDirection: 'row', gap: 8},
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {flexDirection: 'row', paddingVertical: 5},
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 105},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  infoValueMono: {
    flex: 1, fontSize: 12, color: '#374151', fontWeight: '500',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  infoValueRow: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6},
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 6,
  },
  itemCountBox: {alignItems: 'flex-start'},
  itemCountLabel: {fontSize: 11, color: '#9CA3AF'},
  itemCountValue: {fontSize: 16, fontWeight: '700', color: '#111827'},
  totalBox: {alignItems: 'flex-end'},
  totalLabel: {fontSize: 11, color: '#9CA3AF'},
  totalValue: {fontSize: 16, fontWeight: '700', color: '#B45309'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280', textAlign: 'center'},
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
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
  pickerSheet: {maxHeight: '80%'},
  sheetScroll: {maxHeight: 480},
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetOptionRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  sheetOptionText: {flex: 1, fontSize: 15, color: '#374151', fontWeight: '500'},
  sheetOptionTextActive: {color: '#D97706', fontWeight: '600'},
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginTop: 14,
  },
  pickerSearchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  pickerSecondary: {fontSize: 12, color: '#9CA3AF'},
  pickerEmpty: {
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 14,
    color: '#6B7280',
  },
  formOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  formSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
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
  formSheetTitleRow: {flexDirection: 'row', alignItems: 'center'},
  formSheetIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  formSheetTitle: {fontSize: 16, fontWeight: '600', color: '#111827'},
  formBody: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40},
  formGroup: {marginBottom: 14, flex: 1},
  formRow2: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
  formLabel: {fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6},
  formInput: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827',
  },
  formInputReadonly: {backgroundColor: '#F3F4F6', color: '#6B7280'},
  formSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  formSelectText: {flex: 1, fontSize: 15, color: '#111827'},
  formSelectPlaceholder: {color: '#9CA3AF'},
  productSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
    marginTop: 4,
  },
  totalAmountLabel: {fontSize: 15, color: '#6B7280'},
  totalAmountValue: {fontSize: 18, fontWeight: '700', color: '#B45309'},
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
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
