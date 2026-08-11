import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
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
  FileCog,
  ListChecks,
  Search,
  Plus,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import {useAuth} from '../../context/AuthContext';
import {
  getTransactionTypes,
  createTransactionType,
  updateTransactionType,
  deleteTransactionType,
} from '../../api/billing';
import {TransactionType} from '../../types';
import {GradientView} from '../../components/GradientView';
import {GradientButton} from '../../components/GradientButton';

const PAGE_SIZES = [10, 25, 50, 100];

const PAYMENT_CHANNELS = [
  'Al Habib Bank',
  'Allied Bank',
  'Askari Bank',
  'Bank Al-Falah',
  'Bank Al-Habib',
  'Bank Islami',
  'Bank of Punjab',
  'Bank of Khyber',
  'Dubai Islamic Bank',
  'Faysal Bank',
  'Habib Bank (HBL)',
  'Habib Metro',
  'JS Bank',
  'MCB Bank',
  'Meezan Bank',
  'National Bank (NBP)',
  'Samba Bank',
  'Silk Bank',
  'Sindh Bank',
  'Soneri Bank',
  'Standard Chartered',
  'Summit Bank',
  'United Bank (UBL)',
  'Easypaisa',
  'JazzCash',
  'U-Paisa',
  'SadaPay',
  'NayaPay',
  'Keenu',
  'Cash',
  'Other',
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

function TransactionTypeDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="transactionTypeGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#6366F1" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#4F46E5" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#4F46E5" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#transactionTypeGrad)" />
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

function StatCard({
  label,
  value,
  colors,
  icon,
}: {
  label: string;
  value: string;
  colors: [string, string];
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.statCard}>
      <GradientView colors={colors} style={styles.statIconBox}>
        {icon}
      </GradientView>
      <View style={styles.statInfo}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function Row({item, index}: {item: TransactionType; index: number}) {
  const rowNum = index + 1;
  return (
    <View style={styles.tableRow}>
      <View style={styles.rowCellId}>
        <Text style={styles.rowCellMono}>{rowNum}</Text>
      </View>
      <View style={styles.rowCellTx}>
        <Text style={styles.rowCellText} numberOfLines={1}>
          {item.transaction || item.title || '---'}
        </Text>
      </View>
      <View style={styles.rowCellChannel}>
        <Text style={styles.rowCellText} numberOfLines={1}>
          {item.paymentChannel || '---'}
        </Text>
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnEdit]}
          onPress={() => {}}>
          <Pencil size={14} color="#2563EB" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnDanger]}
          onPress={() => {}}>
          <Trash2 size={14} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TransactionTypeScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const {companyId} = useAuth();

  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formTransaction, setFormTransaction] = useState('');
  const [formPaymentChannel, setFormPaymentChannel] = useState('');
  const [channelSheet, setChannelSheet] = useState<SelectSheetState>(null);

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
      const data = await getTransactionTypes().catch(() => []);
      setTransactionTypes(data);
    } catch {
      Alert.alert('Error', 'Failed to load transaction types');
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactionTypes;
    return transactionTypes.filter(r => {
      const tx = (r.transaction || '').toLowerCase();
      const title = (r.title || '').toLowerCase();
      const channel = (r.paymentChannel || '').toLowerCase();
      return tx.includes(q) || title.includes(q) || channel.includes(q);
    });
  }, [transactionTypes, search]);

  const totalTypes = transactionTypes.length;
  const totalChannels = PAYMENT_CHANNELS.length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const getVisiblePages = () => {
    const pages: number[] = [];
    const start = Math.max(1, page - 1);
    const end = Math.min(totalPages, page + 1);
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handlePageSize = (val: string) => {
    setPageSize(Number(val));
    setPage(1);
  };

  const openAddDialog = () => {
    setEditingId(null);
    setFormTransaction('');
    setFormPaymentChannel('');
    setShowDialog(true);
  };

  const openEditDialog = (record: TransactionType) => {
    setEditingId(record.id);
    setFormTransaction(record.transaction || '');
    setFormPaymentChannel(record.paymentChannel || '');
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formTransaction.trim()) {
      Alert.alert('Error', 'Transaction field is required');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        transaction: formTransaction.trim(),
        paymentChannel: formPaymentChannel,
      };
      if (editingId) {
        await updateTransactionType(editingId, payload);
        Alert.alert('Success', 'Transaction type updated.');
      } else {
        await createTransactionType(payload);
        Alert.alert('Success', 'Transaction type created.');
      }
      setShowDialog(false);
      setEditingId(null);
      setFormTransaction('');
      setFormPaymentChannel('');
      fetchData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.response?.data?.error || 'Failed to save';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Transaction Type',
      'Are you sure you want to delete this transaction type?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransactionType(id);
              Alert.alert('Success', 'Transaction type deleted.');
              fetchData();
            } catch {
              Alert.alert('Error', 'Failed to delete transaction type.');
            }
          },
        },
      ],
    );
  };

  const renderRow = (item: TransactionType, index: number) => (
    <View style={styles.tableRow} key={item.id}>
      <View style={styles.rowCellId}>
        <Text style={styles.rowCellMono}>{index + 1}</Text>
      </View>
      <View style={styles.rowCellTx}>
        <Text style={styles.rowCellText} numberOfLines={1}>
          {item.transaction || item.title || '---'}
        </Text>
      </View>
      <View style={styles.rowCellChannel}>
        <Text style={styles.rowCellText} numberOfLines={1}>
          {item.paymentChannel || '---'}
        </Text>
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnEdit]}
          onPress={() => openEditDialog(item)}>
          <Pencil size={14} color="#2563EB" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnDanger]}
          onPress={() => handleDelete(item.id)}>
          <Trash2 size={14} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const kpiCards = [
    {
      label: 'Transaction Types',
      value: String(totalTypes),
      colors: ['#6366F1', '#4F46E5'] as [string, string],
      icon: <FileCog size={16} color="#FFFFFF" />,
    },
    {
      label: 'Payment Channels',
      value: String(totalChannels),
      colors: ['#3B82F6', '#06B6D4'] as [string, string],
      icon: <ListChecks size={16} color="#FFFFFF" />,
    },
    {
      label: 'Filtered',
      value: String(filtered.length),
      colors: ['#F59E0B', '#EA580C'] as [string, string],
      icon: <Search size={16} color="#FFFFFF" />,
    },
  ];

  if (loading && !transactionTypes.length) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading transaction types...</Text>
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
          <Text style={styles.headerTitle}>Transaction Type</Text>
          <Text style={styles.headerCount}>{totalTypes} type(s)</Text>
        </View>
      </GradientView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={['#6366F1']}
          />
        }
        contentContainerStyle={styles.list}>
        <View style={styles.heroHeader}>
          <GradientView colors={['#6366F1', '#4F46E5']} style={styles.heroIconBox}>
            <FileCog size={20} color="#FFFFFF" />
          </GradientView>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>Transaction Type</Text>
            <Text style={styles.heroSubtitle}>
              Manage transaction types and payment channels.
            </Text>
          </View>
        </View>

        <TransactionTypeDivider />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScroll}>
          {kpiCards.map((kpi, i) => (
            <StatCard
              key={i}
              label={kpi.label}
              value={kpi.value}
              colors={kpi.colors}
              icon={kpi.icon}
            />
          ))}
        </ScrollView>

        <View style={styles.listCard}>
          <View style={styles.searchSectionStacked}>
            <View style={styles.searchInputWrap}>
              <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search transactions..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={handleSearch}
              />
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => handleSearch('')}>
                  <X size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.toolbarActions}>
              <TouchableOpacity
                style={styles.pageSizeSelect}
                onPress={() => setPageSizeOpen(true)}>
                <Text style={styles.pageSizeSelectText}>{pageSize}</Text>
                <ChevronDown size={16} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.pageSizeLabel}>entries</Text>
              <GradientButton
                colors={['#10B981', '#059669']}
                style={styles.addBtn}
                onPress={openAddDialog}>
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Transaction</Text>
              </GradientButton>
            </View>
          </View>

          {loading ? (
            <View style={styles.historyLoading}>
              <ActivityIndicator size="small" color="#6366F1" />
            </View>
          ) : paginatedData.length > 0 ? (
            <View>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>#</Text>
                <Text style={[styles.tableHeaderText, {flex: 2}]}>Transaction</Text>
                <Text style={[styles.tableHeaderText, {flex: 2}]}>Payment Channel</Text>
                <Text style={[styles.tableHeaderText, {flex: 1, textAlign: 'right'}]}>
                  Actions
                </Text>
              </View>
              {paginatedData.map((item, index) => renderRow(item, index))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <FileCog size={40} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>
                {search
                  ? 'No matching transaction types found'
                  : 'No transaction types yet'}
              </Text>
              <Text style={styles.emptyText}>
                {search
                  ? 'Try adjusting your search'
                  : 'Click "Add Transaction" to create one.'}
              </Text>
            </View>
          )}
        </View>

        {paginatedData.length > 0 ? (
          <View style={styles.pagination}>
            <Text style={styles.paginationInfo}>
              Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
            </Text>

            <View style={styles.pageControls}>
              <TouchableOpacity
                style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                disabled={page === 1}
                onPress={() => setPage(prev => Math.max(1, prev - 1))}>
                <ChevronLeft size={14} color={page === 1 ? '#D1D5DB' : '#374151'} />
                <Text
                  style={[
                    styles.pageBtnText,
                    page === 1 && styles.pageBtnTextDisabled,
                  ]}>
                  Previous
                </Text>
              </TouchableOpacity>

              {getVisiblePages().map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.pageNum, page === p && styles.pageNumActive]}
                  onPress={() => setPage(p)}>
                  <Text
                    style={[
                      styles.pageNumText,
                      page === p && styles.pageNumTextActive,
                    ]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}

              {page + 3 < totalPages ? (
                <>
                  <Text style={styles.ellipsis}>...</Text>
                  <TouchableOpacity
                    style={styles.pageNum}
                    onPress={() => setPage(totalPages)}>
                    <Text style={styles.pageNumText}>{totalPages}</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  page === totalPages && styles.pageBtnDisabled,
                ]}
                disabled={page === totalPages}
                onPress={() => setPage(prev => Math.min(totalPages, prev + 1))}>
                <Text
                  style={[
                    styles.pageBtnText,
                    page === totalPages && styles.pageBtnTextDisabled,
                  ]}>
                  Next
                </Text>
                <ChevronRight size={14} color={page === totalPages ? '#D1D5DB' : '#374151'} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Page Size Sheet */}
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
                    setPage(1);
                    setPageSizeOpen(false);
                  }}>
                  <Text
                    style={[
                      styles.sheetOptionText,
                      active && styles.sheetOptionTextActive,
                    ]}>
                    {size} per page
                  </Text>
                  {active ? <Check size={16} color="#6366F1" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Payment Channel Sheet */}
      <Modal
        visible={!!channelSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setChannelSheet(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{channelSheet?.title}</Text>
              <TouchableOpacity onPress={() => setChannelSheet(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll}>
              {channelSheet?.options.map(option => {
                const active = option.id === channelSheet!.selected;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.sheetOption}
                    onPress={() => {
                      channelSheet!.onSelect(option.id);
                      setChannelSheet(null);
                    }}>
                    <Text
                      style={[
                        styles.sheetOptionText,
                        active && styles.sheetOptionTextActive,
                      ]}>
                      {option.name}
                    </Text>
                    {active ? <Check size={16} color="#6366F1" /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add / Edit Dialog */}
      <Modal
        visible={showDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDialog(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {editingId ? 'Edit Transaction Type' : 'Add Transaction'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDialog(false);
                  setEditingId(null);
                }}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.sheetScroll}
              keyboardShouldPersistTaps="handled">
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Transaction</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Cash Collection"
                  placeholderTextColor="#9CA3AF"
                  value={formTransaction}
                  onChangeText={setFormTransaction}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Payment Channel / Bank</Text>
                <TouchableOpacity
                  style={styles.selectField}
                  onPress={() =>
                    setChannelSheet({
                      title: 'Select payment channel',
                      options: PAYMENT_CHANNELS.map(ch => ({id: ch, name: ch})),
                      selected: formPaymentChannel,
                      onSelect: v => setFormPaymentChannel(v),
                    })
                  }>
                  <Text style={styles.selectFieldText}>
                    {formPaymentChannel || 'Select a bank or payment channel...'}
                  </Text>
                  <ChevronDown size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <GradientButton
                colors={['#10B981', '#059669']}
                style={styles.submitBtn}
                onPress={handleSave}
                disabled={isSaving || !formTransaction.trim()}>
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Save</Text>
                )}
              </GradientButton>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {marginTop: 12, fontSize: 14, color: '#6B7280'},
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
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  heroSubtitle: {fontSize: 12, color: '#6B7280', marginTop: 2},
  heroDivider: {marginHorizontal: 20, marginBottom: 4},
  statsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  statCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statInfo: {},
  statLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  searchSectionStacked: {
    marginBottom: 12,
    gap: 10,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
  },
  searchIcon: {marginRight: 8},
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 10,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
    minWidth: 68,
  },
  pageSizeSelectText: {fontSize: 13, color: '#111827', fontWeight: '600', marginRight: 8},
  pageSizeLabel: {fontSize: 12, color: '#6B7280'},
  addBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  addBtnText: {color: '#FFFFFF', fontSize: 12, fontWeight: '600'},
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowCellId: {
    flex: 1,
    maxWidth: 40,
  },
  rowCellTx: {
    flex: 2,
    paddingHorizontal: 8,
  },
  rowCellChannel: {
    flex: 2,
    paddingHorizontal: 8,
  },
  rowCellMono: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  rowCellText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  rowActions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnEdit: {
    backgroundColor: '#EFF6FF',
  },
  actionBtnDanger: {
    backgroundColor: '#FEF2F2',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyStateIcon: {marginBottom: 8},
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  emptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  list: {paddingHorizontal: 0, paddingBottom: 30},
  historyLoading: {alignItems: 'center', paddingVertical: 20},
  pagination: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  paginationInfo: {fontSize: 13, color: '#6B7280', marginBottom: 10},
  pageControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
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
  pageNumActive: {backgroundColor: '#6366F1', borderColor: '#6366F1'},
  pageNumText: {fontSize: 12, color: '#374151'},
  pageNumTextActive: {color: '#FFFFFF', fontWeight: '600'},
  ellipsis: {paddingHorizontal: 4, color: '#6B7280'},
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
    maxHeight: '85%',
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
  sheetScroll: {paddingHorizontal: 20, paddingBottom: 20},
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetOptionText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  sheetOptionTextActive: {color: '#6366F1', fontWeight: '600'},
  field: {marginTop: 12},
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectFieldText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  submitBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
