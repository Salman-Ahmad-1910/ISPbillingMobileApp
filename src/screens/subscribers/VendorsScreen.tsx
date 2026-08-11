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
  Truck,
  Building,
  Phone,
  Mail,
  MapPin,
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
} from 'lucide-react-native';
import {getVendors, createVendor, updateVendor, deleteVendor} from '../../api/inventory';
import {Vendor} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';

const PAGE_SIZES = [5, 10, 20, 50, 100];

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

function VendorsDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="vendorsHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#06B6D4" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#0D9488" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#0D9488" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#vendorsHeroGrad)" />
      </Svg>
    </View>
  );
}

const emptyForm = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
};

export default function VendorsScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const [items, setItems] = useState<Vendor[]>([]);
  const [filtered, setFiltered] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);

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
      const data = await getVendors();
      setItems(data);
      setFiltered(data);
    } catch (err: any) {
      const reason =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load vendors. Check your connection and try again.';
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
  }, [search]);

  useEffect(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      setFiltered(
        items.filter(
          v =>
            v.name.toLowerCase().includes(q) ||
            (v.contactPerson || '').toLowerCase().includes(q) ||
            (v.email || '').toLowerCase().includes(q) ||
            (v.phone || '').toLowerCase().includes(q),
        ),
      );
    } else {
      setFiltered(items);
    }
  }, [search, items]);

  const withContactCount = items.filter(v => v.contactPerson || v.phone).length;
  const withPhoneCount = items.filter(v => v.phone).length;

  const statCards: {key: string; label: string; value: string; icon: any; gradient: [string, string]}[] = [
    {key: 'total', label: 'Total Vendors', value: String(items.length), icon: Truck, gradient: ['#06B6D4', '#0D9488']},
    {key: 'contact', label: 'With Contact', value: String(withContactCount), icon: Building, gradient: ['#10B981', '#16A34A']},
    {key: 'phone', label: 'With Phone', value: String(withPhoneCount), icon: Phone, gradient: ['#F59E0B', '#EA580C']},
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

  const setField = (key: keyof typeof emptyForm, value: string) => {
    setForm(prev => ({...prev, [key]: value}));
  };

  const openAdd = () => {
    setEditing(null);
    setForm({...emptyForm});
    setFormOpen(true);
  };

  const openEdit = (vendor: Vendor) => {
    setEditing(vendor);
    setForm({
      name: vendor.name,
      contactPerson: vendor.contactPerson || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Vendor name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
      };
      if (editing) {
        await updateVendor(editing.id, payload);
      } else {
        await createVendor(payload);
      }
      setFormOpen(false);
      setEditing(null);
      fetchData(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to save vendor';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (vendor: Vendor) => {
    Alert.alert('Delete Vendor', `Delete ${vendor.name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVendor(vendor.id);
            fetchData(false);
          } catch (err: any) {
            const msg =
              err.response?.data?.message || err.response?.data?.error || 'Failed to delete vendor';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  const renderItem = ({item, index}: {item: Vendor; index: number}) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.rowIndex}>{index + 1 + (currentPage - 1) * pageSize}</Text>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
            <Pencil size={15} color="#0D9488" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Trash2 size={15} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Contact Person</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {item.contactPerson || '-'}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Phone</Text>
        {item.phone ? (
          <View style={styles.infoValueRow}>
            <Phone size={13} color="#6B7280" />
            <Text style={styles.infoValue} numberOfLines={1}>
              {item.phone}
            </Text>
          </View>
        ) : (
          <Text style={styles.infoValueMuted}>-</Text>
        )}
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Email</Text>
        {item.email ? (
          <View style={styles.infoValueRow}>
            <Mail size={13} color="#6B7280" />
            <Text style={styles.infoValue} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
        ) : (
          <Text style={styles.infoValueMuted}>-</Text>
        )}
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Address</Text>
        {item.address ? (
          <View style={styles.infoValueRow}>
            <MapPin size={13} color="#6B7280" />
            <Text style={styles.infoValue} numberOfLines={2}>
              {item.address}
            </Text>
          </View>
        ) : (
          <Text style={styles.infoValueMuted}>-</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  const formRow = (
    label: string,
    value: string,
    onChangeText: (t: string) => void,
    placeholder = '',
    keyboardType?: 'default' | 'email-address' | 'phone-pad',
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={styles.formInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType || 'default'}
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
          <Text style={styles.headerTitle}>Vendors</Text>
          <Text style={styles.headerCount}>{filtered.length} total</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginated}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#06B6D4']} />
        }
        ListHeaderComponent={
          <View>
            {/* Hero Header */}
            <View style={styles.heroHeader}>
              <GradientView colors={['#06B6D4', '#0D9488']} style={styles.heroIconBox}>
                <Truck size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Vendors</Text>
                <Text style={styles.heroSubtitle}>
                  Manage your suppliers and vendors for inventory purchases.
                </Text>
              </View>
            </View>

            <VendorsDivider />

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

            {/* Search + Add */}
            <View style={styles.toolbar}>
              <View style={styles.searchBox}>
                <Search size={16} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search vendors..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <GradientButton
                colors={['#10B981', '#16A34A']}
                style={styles.addBtn}
                onPress={openAdd}>
                <PlusCircle size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText} numberOfLines={1}>
                  Add Vendor
                </Text>
              </GradientButton>
            </View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={styles.emptyTitle}>Failed to load vendors</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🚚</Text>
              <Text style={styles.emptyTitle}>No vendors found</Text>
              <Text style={styles.emptyText}>
                {search ? 'Try adjusting your search' : 'Add your first vendor'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.pagination}>
            <Text style={styles.paginationInfo}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} vendors
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
                  style={[styles.pageNum, currentPage === page && {backgroundColor: '#06B6D4'}]}
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
                  {active ? <Check size={16} color="#06B6D4" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Add/Edit Vendor form */}
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
                <GradientView colors={['#06B6D4', '#0D9488']} style={styles.formSheetIcon}>
                  <Truck size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>
                  {editing ? 'Edit Vendor' : 'Add New Vendor'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFormOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              {formRow('Vendor Name *', form.name, t => setField('name', t), 'e.g., Tech Supplies Inc.')}
              {formRow('Contact Person', form.contactPerson, t => setField('contactPerson', t), 'e.g., John Smith')}
              <View style={styles.formRow2}>
                {formRow('Phone', form.phone, t => setField('phone', t), 'e.g., +1-555-0123', 'phone-pad')}
                {formRow('Email', form.email, t => setField('email', t), 'e.g., contact@techsupplies.com', 'email-address')}
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Address</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  value={form.address}
                  onChangeText={t => setField('address', t)}
                  placeholder="e.g., 123 Business St, Suite 100, City, State 12345"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  textAlignVertical="top"
                />
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
                    <Text style={styles.saveBtnText}>{editing ? 'Update' : 'Save Vendor'}</Text>
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
    color: '#06B6D4',
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardName: {flex: 1, fontSize: 15, fontWeight: '600', color: '#111827'},
  cardActions: {flexDirection: 'row', gap: 8},
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#CCFBF1',
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
  infoValueMuted: {flex: 1, fontSize: 13, color: '#9CA3AF'},
  infoValueRow: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280', textAlign: 'center'},
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#06B6D4',
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
  sheetOptionTextActive: {color: '#06B6D4', fontWeight: '600'},
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
  formGroup: {marginBottom: 14},
  formRow2: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
  formLabel: {fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6},
  formInput: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827',
    flex: 1,
  },
  formTextarea: {
    minHeight: 90,
    paddingVertical: 12,
  },
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
