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
  PackageOpen,
  Boxes,
  Package as PackageIcon,
  Layers,
  Search,
  PlusCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  Trash2,
} from 'lucide-react-native';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getBrands,
  getProductTypes,
  getUnitTypes,
  getSerialNumberPool,
  getNextSerialNumber,
  addSerialNumbers,
  deleteSerialNumberEntry,
} from '../../api/inventory';
import {Product, Brand, ProductType, UnitType, SerialNumberPoolEntry} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';

const PAGE_SIZES = [5, 10, 20, 50, 100];

type FilterOption = {label: string; value: string};

const emptyForm: Partial<Product> = {
  name: '',
  category: '',
  barcode: '',
  brandId: '',
  brandName: '',
  productTypeId: '',
  productTypeName: '',
  unitType: 'piece',
  serialNumber: '',
  purchasePrice: 0,
  salePrice: 0,
  discount: 0,
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

function ProductsDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="productsHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#10B981" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#16A34A" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#16A34A" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#productsHeroGrad)" />
      </Svg>
    </View>
  );
}

export default function ProductsScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [fetchingNextSn, setFetchingNextSn] = useState(false);
  const [selectSheet, setSelectSheet] = useState<{
    key: 'brandId' | 'productTypeId' | 'unitType';
    title: string;
    options: FilterOption[];
  } | null>(null);

  // SN Pool modal state
  const [snPoolOpen, setSnPoolOpen] = useState(false);
  const [poolEntries, setPoolEntries] = useState<SerialNumberPoolEntry[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolRaw, setPoolRaw] = useState('');
  const [poolSaving, setPoolSaving] = useState(false);

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
      const [productData, brandData, productTypeData, unitTypeData] = await Promise.all([
        getProducts(),
        getBrands().catch(() => []),
        getProductTypes().catch(() => []),
        getUnitTypes().catch(() => []),
      ]);
      setProducts(productData);
      setBrands(brandData);
      setProductTypes(productTypeData);
      setUnitTypes(unitTypeData);
    } catch {
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {fetchData();}, [fetchData]));

  useEffect(() => {
    let result = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q) ||
          (p.brandName || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          (p.productTypeName || '').toLowerCase().includes(q) ||
          (p.serialNumber || '').toLowerCase().includes(q),
      );
    }
    setFiltered(result);
    setCurrentPage(1);
  }, [products, search]);

  const totalStock = useMemo(
    () => products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0),
    [products],
  );

  const categoriesCount = useMemo(
    () => new Set(products.map(p => (p.productTypeName || p.category || '')).filter(Boolean)).size,
    [products],
  );

  const statCards: {key: string; label: string; value: number; icon: any; gradient: [string, string]}[] = [
    {key: 'total', label: 'Total Products', value: products.length, icon: PackageOpen, gradient: ['#10B981', '#16A34A']},
    {key: 'stock', label: 'Total Stock', value: totalStock, icon: Boxes, gradient: ['#3B82F6', '#0891B2']},
    {key: 'categories', label: 'Categories', value: categoriesCount, icon: PackageIcon, gradient: ['#A855F7', '#7C3AED']},
  ];

  const handleDelete = (product: Product) => {
    Alert.alert('Delete Product', `Delete ${product.name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProduct(product.id);
            setProducts(prev => prev.filter(p => p.id !== product.id));
          } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete product';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  const setField = (key: keyof Product, value: any) => {
    setForm(prev => ({...prev, [key]: value}));
  };

  const openAdd = () => {
    setEditing(null);
    setForm({...emptyForm});
    setFormOpen(true);
    setFetchingNextSn(true);
    getNextSerialNumber()
      .then(sn => {
        if (sn) {
          setForm(prev => ({...prev, serialNumber: sn}));
        }
      })
      .catch(() => {})
      .finally(() => setFetchingNextSn(false));
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({...emptyForm, ...product});
    setFormOpen(true);
  };

  const openSelectSheet = (key: 'brandId' | 'productTypeId' | 'unitType') => {
    if (key === 'brandId') {
      setSelectSheet({
        key,
        title: 'Search brand...',
        options: brands.map(b => ({label: b.name, value: b.id})),
      });
    } else if (key === 'productTypeId') {
      setSelectSheet({
        key,
        title: 'Search product type...',
        options: productTypes.map(pt => ({label: pt.name, value: pt.id})),
      });
    } else {
      setSelectSheet({
        key,
        title: 'Search unit type...',
        options: unitTypes.map(ut => ({label: ut.name, value: ut.name})),
      });
    }
  };

  const onSelectSheetPick = (value: string) => {
    if (selectSheet) {
      if (selectSheet.key === 'brandId') {
        const brand = brands.find(b => b.id === value);
        setField('brandId', value);
        setField('brandName', brand?.name || '');
      } else if (selectSheet.key === 'productTypeId') {
        const pt = productTypes.find(t => t.id === value);
        setField('productTypeId', value);
        setField('productTypeName', pt?.name || '');
      } else {
        setField('unitType', value);
      }
    }
    setSelectSheet(null);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }
    setSaving(true);
    try {
      const selectedType = productTypes.find(t => t.id === form.productTypeId);
      const payload: Partial<Product> = {
        ...form,
        name: form.name.trim(),
        barcode: (form.barcode || '').trim(),
        brandId: form.brandId || '',
        brandName: form.brandName || '',
        productTypeId: form.productTypeId || '',
        productTypeName: form.productTypeName || '',
        category: selectedType?.name || form.productTypeName || form.category || '',
        unitType: form.unitType || 'piece',
        serialNumber: (form.serialNumber || '').trim(),
        price: parseFloat(String(form.salePrice)) || parseFloat(String(form.price)) || 0,
        salePrice: parseFloat(String(form.salePrice)) || 0,
        purchasePrice: parseFloat(String(form.purchasePrice)) || 0,
        discount: parseFloat(String(form.discount)) || 0,
      };
      if (editing) {
        await updateProduct(editing.id, payload);
      } else {
        await createProduct(payload);
      }
      setFormOpen(false);
      setEditing(null);
      fetchData(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to save product';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const loadPool = useCallback(async () => {
    setPoolLoading(true);
    try {
      setPoolEntries(await getSerialNumberPool());
    } catch {
      Alert.alert('Error', 'Failed to load serial number pool');
    } finally {
      setPoolLoading(false);
    }
  }, []);

  const openSnPool = () => {
    setPoolRaw('');
    setSnPoolOpen(true);
    loadPool();
  };

  const parsedNumbers = useMemo(
    () =>
      poolRaw
        .split(/[\s,;_/-]+/)
        .map(s => s.trim())
        .filter(Boolean),
    [poolRaw],
  );
  const uniqueCount = useMemo(() => new Set(parsedNumbers).size, [parsedNumbers]);
  const availableCount = useMemo(
    () => poolEntries.filter(e => e.status === 'available').length,
    [poolEntries],
  );

  const handleAddPoolNumbers = async () => {
    if (uniqueCount === 0) {
      return;
    }
    setPoolSaving(true);
    try {
      await addSerialNumbers(parsedNumbers);
      setPoolRaw('');
      await loadPool();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to add serial numbers';
      Alert.alert('Error', msg);
    } finally {
      setPoolSaving(false);
    }
  };

  const handleDeletePoolEntry = (entry: SerialNumberPoolEntry) => {
    Alert.alert('Remove Serial Number', `Remove ${entry.serialNumber} from the pool?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSerialNumberEntry(entry.id);
            await loadPool();
          } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to remove serial number';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
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

  const renderItem = ({item}: {item: Product}) => {
    const typeName = item.productTypeName || item.category || '-';
    return (
      <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.rowIndex} numberOfLines={1}>{item.barcode || '-'}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          </View>
        </View>
        <View style={styles.brandRow}>
          <Text style={styles.brandName} numberOfLines={1}>{item.brandName || '-'}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText} numberOfLines={1}>{typeName}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Purchase Price</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            PKR {(item.purchasePrice || 0).toLocaleString()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sale Price</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            PKR {((item.salePrice ?? item.price) || 0).toLocaleString()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>SN / MAC</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{item.serialNumber || '-'}</Text>
        </View>
        {(item.discount || 0) > 0 ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Discount</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              PKR {(item.discount || 0).toLocaleString()}
            </Text>
          </View>
        ) : null}
        <View style={styles.cardFooter}>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item)}>
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

  const selectField = (
    label: string,
    display: string,
    placeholder: string,
    onPress: () => void,
  ) => (
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

  const chipRow = (
    label: string,
    options: FilterOption[],
    selected: string,
    onSelect: (v: string) => void,
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map(o => {
          const active = o.value === selected;
          return (
            <TouchableOpacity
              key={o.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(o.value)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <GradientView colors={['#166534', '#22c55e']} style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Products</Text>
          <Text style={styles.headerCount}>{filtered.length} total</Text>
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
              <GradientView colors={['#10B981', '#16A34A']} style={styles.heroIconBox}>
                <PackageOpen size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Products</Text>
                <Text style={styles.heroSubtitle}>Manage your inventory of products and services.</Text>
              </View>
            </View>

            <ProductsDivider />

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

            {/* Search + SN Pool + Add */}
            <View style={styles.toolbar}>
              <View style={styles.searchBox}>
                <Search size={16} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filter by name, category, or brand..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <TouchableOpacity style={styles.poolBtn} onPress={openSnPool}>
                <Layers size={15} color="#7C3AED" />
                <Text style={styles.poolBtnText}>Pool</Text>
              </TouchableOpacity>
              <GradientButton
                colors={['#10B981', '#16A34A']}
                style={styles.addBtn}
                onPress={openAdd}>
                <PlusCircle size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText} numberOfLines={1}>
                  Add
                </Text>
              </GradientButton>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>
              {search ? 'Try adjusting your search' : 'Add your first product'}
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.pagination}>
            <Text style={styles.paginationInfo}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} products
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

      {/* Add/Edit Product form */}
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
                <GradientView colors={['#10B981', '#16A34A']} style={styles.formSheetIcon}>
                  <PackageOpen size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>{editing ? 'Edit' : 'Add'} Product</Text>
              </View>
              <TouchableOpacity onPress={() => setFormOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              {formRow('Product Barcode', form.barcode, t => setField('barcode', t), 'e.g., 8901234567890')}
              {formRow('Product Name *', form.name, t => setField('name', t), 'e.g., TP-Link Router')}
              {selectField(
                'Brand',
                form.brandName || '',
                'Search brand...',
                () => openSelectSheet('brandId'),
              )}
              {selectField(
                'Product Type',
                form.productTypeName || '',
                'Search product type...',
                () => openSelectSheet('productTypeId'),
              )}
              {unitTypes.length > 0 ? (
                selectField(
                  'Unit Type',
                  form.unitType || '',
                  'Search unit type...',
                  () => openSelectSheet('unitType'),
                )
              ) : (
                chipRow('Unit Type', [
                  {label: 'Per Piece', value: 'piece'},
                  {label: 'Per Meter', value: 'meter'},
                ], form.unitType || 'piece', v => setField('unitType', v))
              )}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  SN / MAC{!editing ? '  (auto from pool)' : ''}
                </Text>
                <View style={styles.formInputWrap}>
                  <TextInput
                    style={styles.formInput}
                    value={String(form.serialNumber ?? '')}
                    onChangeText={t => setField('serialNumber', t)}
                    placeholder="e.g., 00:1A:2B:3C:4D:5E"
                    placeholderTextColor="#9CA3AF"
                    editable={!fetchingNextSn}
                  />
                  {fetchingNextSn ? (
                    <ActivityIndicator size="small" color="#10B981" style={styles.inputSpinner} />
                  ) : null}
                </View>
              </View>
              <View style={styles.formRow2}>
                {formRow('Purchase Price (PKR)', form.purchasePrice, t => setField('purchasePrice', t), '0', 'numeric')}
                {formRow('Sale Price (PKR)', form.salePrice, t => setField('salePrice', t), '0', 'numeric')}
              </View>
              {formRow('Discount (PKR)', form.discount, t => setField('discount', t), '0', 'numeric')}
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
                    <Text style={styles.saveBtnText}>{editing ? 'Update' : 'Save Product'}</Text>
                  )}
                </GradientButton>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Brand / Product Type / Unit Type select sheet */}
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
                const active =
                  (selectSheet.key === 'brandId' && option.value === form.brandId) ||
                  (selectSheet.key === 'productTypeId' && option.value === form.productTypeId) ||
                  (selectSheet.key === 'unitType' && option.value === form.unitType);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.sheetOption}
                    onPress={() => onSelectSheetPick(option.value)}>
                    <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]} numberOfLines={1}>
                      {option.label}
                    </Text>
                    {active ? <Check size={16} color="#10B981" /> : null}
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

      {/* SN Number Pool modal */}
      <Modal
        visible={snPoolOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSnPoolOpen(false)}>
        <View style={styles.formOverlay}>
          <View style={styles.poolSheet}>
            <View style={styles.formSheetHeader}>
              <View style={styles.formSheetTitleRow}>
                <GradientView colors={['#A855F7', '#7C3AED']} style={styles.formSheetIcon}>
                  <Layers size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>SN Number Pool</Text>
              </View>
              <TouchableOpacity onPress={() => setSnPoolOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.poolDescription}>
                Add many serial numbers at once. Separate each one with a space, dash (-), comma, or new line.
                When a new product is added with an empty SN field, the next available number is assigned automatically.
              </Text>

              <View style={styles.poolStatsRow}>
                <Text style={styles.poolStatsText}>
                  Available: <Text style={styles.poolStatsStrong}>{availableCount}</Text> / {poolEntries.length} total
                </Text>
                {uniqueCount > 0 ? (
                  <Text style={styles.poolStatsText}>
                    Parsed: <Text style={styles.poolStatsStrong}>{uniqueCount}</Text> unique
                  </Text>
                ) : null}
              </View>

              <TextInput
                style={styles.poolTextarea}
                placeholder={'e.g., SN-1001 SN-1002 SN-1003\nSN1004-SN1005, SN1006'}
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                value={poolRaw}
                onChangeText={setPoolRaw}
              />

              <GradientButton
                colors={['#A855F7', '#7C3AED']}
                style={styles.poolAddBtn}
                onPress={handleAddPoolNumbers}
                disabled={poolSaving || uniqueCount === 0}>
                {poolSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    Add {uniqueCount || ''} Serial Number{uniqueCount === 1 ? '' : 's'}
                  </Text>
                )}
              </GradientButton>

              <View style={styles.poolListHeader}>
                <Text style={styles.poolListHeaderText}>Serial Number</Text>
                <Text style={styles.poolListHeaderText}>Status</Text>
                <Text style={styles.poolListHeaderText}>Action</Text>
              </View>
              {poolLoading ? (
                <View style={styles.poolEmpty}>
                  <ActivityIndicator size="small" color="#A855F7" />
                </View>
              ) : poolEntries.length === 0 ? (
                <View style={styles.poolEmpty}>
                  <Text style={styles.sheetEmptyText}>No serial numbers in the pool yet.</Text>
                </View>
              ) : (
                poolEntries.map(entry => {
                  const isAvailable = entry.status === 'available';
                  return (
                    <View key={entry.id} style={styles.poolEntryRow}>
                      <Text style={styles.poolEntrySerial} numberOfLines={1}>
                        {entry.serialNumber}
                      </Text>
                      <View style={[styles.poolBadge, isAvailable ? styles.poolBadgeAvailable : styles.poolBadgeUsed]}>
                        <Text style={[styles.poolBadgeText, isAvailable ? styles.poolBadgeTextAvailable : styles.poolBadgeTextUsed]}>
                          {isAvailable ? 'Available' : 'Used'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.poolDeleteBtn}
                        onPress={() => handleDeletePoolEntry(entry)}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
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
  statValue: {fontSize: 20, fontWeight: '700', color: '#111827'},
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
  poolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C4B5FD',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexShrink: 0,
  },
  poolBtnText: {color: '#7C3AED', fontSize: 12, fontWeight: '600', marginLeft: 5},
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
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  rowIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    marginRight: 10,
    maxWidth: 110,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1},
  cardName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  brandRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 6},
  brandName: {flex: 1, fontSize: 12, color: '#6B7280', marginRight: 8},
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
  },
  typeBadgeText: {fontSize: 11, fontWeight: '600', color: '#047857'},
  infoRow: {flexDirection: 'row', paddingVertical: 5},
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 110},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  cardFooter: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, marginTop: 6,
  },
  cardActions: {flexDirection: 'row', gap: 8},
  editBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6,
    backgroundColor: '#D1FAE5',
  },
  editBtnText: {fontSize: 12, fontWeight: '500', color: '#047857'},
  deleteBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: {fontSize: 12, fontWeight: '500', color: '#EF4444'},
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
  sheetOptionTextActive: {color: '#10B981', fontWeight: '600'},
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
    maxHeight: '92%',
  },
  poolSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
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
  formGroup: {marginBottom: 14},
  formRow2: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
  formLabel: {fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6},
  formInput: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827',
  },
  formInputWrap: {position: 'relative', justifyContent: 'center'},
  inputSpinner: {position: 'absolute', right: 12},
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
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB',
  },
  chipActive: {backgroundColor: '#10B981', borderColor: '#10B981'},
  chipText: {fontSize: 13, color: '#6B7280', fontWeight: '500'},
  chipTextActive: {color: '#FFFFFF'},
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
  poolDescription: {fontSize: 12, color: '#6B7280', marginBottom: 12},
  poolStatsRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10},
  poolStatsText: {fontSize: 12, color: '#6B7280'},
  poolStatsStrong: {color: '#111827', fontWeight: '700'},
  poolTextarea: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827',
    minHeight: 100, marginBottom: 12,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  poolAddBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  poolListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  poolListHeaderText: {flex: 1, fontSize: 12, fontWeight: '600', color: '#6B7280'},
  poolEmpty: {paddingVertical: 24, alignItems: 'center'},
  poolEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  poolEntrySerial: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  poolBadge: {paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginRight: 8},
  poolBadgeAvailable: {backgroundColor: '#D1FAE5'},
  poolBadgeUsed: {backgroundColor: '#F3F4F6'},
  poolBadgeText: {fontSize: 11, fontWeight: '600'},
  poolBadgeTextAvailable: {color: '#047857'},
  poolBadgeTextUsed: {color: '#6B7280'},
  poolDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
