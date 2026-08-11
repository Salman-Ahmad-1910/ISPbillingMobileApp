import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {ComponentType} from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import {useFocusEffect, useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  Layers,
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
import {
  getHeads,
  createHead,
  updateHead,
  deleteHead,
  getSubHeads,
  createSubHead,
  updateSubHead,
  deleteSubHead,
} from '../../api/accounts';
import {AccountHead, AccountSubHead} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';

const PAGE_SIZES = [5, 10, 20, 50, 100];

const ACCOUNT_TYPES = [
  'Assets Account',
  'Expense Account',
  'Revenue/Income Account',
  'Liabilities Account',
  'Equity Account',
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

function AccountHeadDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="accountHeadHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8B5CF6" stopOpacity="1" />
            <Stop offset="0.6" stopColor="#4F46E5" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#4F46E5" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#accountHeadHeroGrad)" />
      </Svg>
    </View>
  );
}

type StatCard = {
  key: string;
  label: string;
  value: string;
  icon: ComponentType<{size?: number; color?: string; strokeWidth?: number}>;
  gradient: [string, string];
};

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  pageInput: string;
  totalItems: number;
  accent: string;
  onPageChange: (page: number) => void;
  onPageSizePress: () => void;
  onPageInput: (t: string) => void;
  onPageSubmit: () => void;
};

function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  pageInput,
  totalItems,
  accent,
  onPageChange,
  onPageSizePress,
  onPageInput,
  onPageSubmit,
}: PaginationProps) {
  const getVisiblePages = () => {
    const pages: number[] = [];
    const startPage = Math.max(1, currentPage - 3);
    const endPage = Math.min(totalPages, currentPage + 3);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <View style={styles.pagination}>
      <Text style={styles.paginationInfo}>
        Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
        {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
      </Text>

      <View style={styles.pageControls}>
        <TouchableOpacity
          style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
          disabled={currentPage === 1}
          onPress={() => onPageChange(Math.max(1, currentPage - 1))}>
          <ChevronLeft size={14} color={currentPage === 1 ? '#D1D5DB' : '#374151'} />
          <Text style={[styles.pageBtnText, currentPage === 1 && styles.pageBtnTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        {getVisiblePages().map(page => (
          <TouchableOpacity
            key={page}
            style={[styles.pageNum, currentPage === page && {backgroundColor: accent}]}
            onPress={() => onPageChange(page)}>
            <Text style={[styles.pageNumText, currentPage === page && styles.pageNumTextActive]}>
              {page}
            </Text>
          </TouchableOpacity>
        ))}

        {currentPage + 3 < totalPages ? (
          <>
            <Text style={styles.ellipsis}>...</Text>
            <TouchableOpacity style={styles.pageNum} onPress={() => onPageChange(totalPages)}>
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
                onPageInput(text);
              }
            }}
            onSubmitEditing={onPageSubmit}
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
            onPress={onPageSubmit}>
            <ArrowRight size={14} color="#374151" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
          disabled={currentPage === totalPages}
          onPress={() => onPageChange(Math.min(totalPages, currentPage + 1))}>
          <Text style={[styles.pageBtnText, currentPage === totalPages && styles.pageBtnTextDisabled]}>
            Next
          </Text>
          <ChevronRight size={14} color={currentPage === totalPages ? '#D1D5DB' : '#374151'} />
        </TouchableOpacity>
      </View>

      <View style={styles.pageSizeRow}>
        <Text style={styles.pageSizeLabel}>Show</Text>
        <TouchableOpacity style={styles.pageSizeSelect} onPress={onPageSizePress}>
          <Text style={styles.pageSizeSelectText}>{pageSize}</Text>
          <ChevronDown size={16} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.pageSizeLabel}>entries</Text>
      </View>
    </View>
  );
}

export default function AccountHeadScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();

  const [heads, setHeads] = useState<AccountHead[]>([]);
  const [subHeads, setSubHeads] = useState<AccountSubHead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [headSearch, setHeadSearch] = useState('');
  const [headPage, setHeadPage] = useState(1);
  const [headPageSize, setHeadPageSize] = useState(10);
  const [headPageInput, setHeadPageInput] = useState('');

  const [subSearch, setSubSearch] = useState('');
  const [subPage, setSubPage] = useState(1);
  const [subPageSize, setSubPageSize] = useState(10);
  const [subPageInput, setSubPageInput] = useState('');

  const [headSizeOpen, setHeadSizeOpen] = useState(false);
  const [subSizeOpen, setSubSizeOpen] = useState(false);

  const [headFormOpen, setHeadFormOpen] = useState(false);
  const [editingHead, setEditingHead] = useState<AccountHead | null>(null);
  const [headMaster, setHeadMaster] = useState('');
  const [headType, setHeadType] = useState('');
  const [headDescription, setHeadDescription] = useState('');

  const [subFormOpen, setSubFormOpen] = useState(false);
  const [editingSubHead, setEditingSubHead] = useState<AccountSubHead | null>(null);
  const [subMaster, setSubMaster] = useState('');
  const [subHeadId, setSubHeadId] = useState('');
  const [subBudget, setSubBudget] = useState('');
  const [subDescription, setSubDescription] = useState('');

  const [savingHead, setSavingHead] = useState(false);
  const [savingSub, setSavingSub] = useState(false);

  const [selectSheet, setSelectSheet] = useState<{
    key: string;
    title: string;
    options: {label: string; value: string}[];
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
      setError(null);
      const [headData, subHeadData] = await Promise.all([
        getHeads().catch(() => []),
        getSubHeads().catch(() => []),
      ]);
      setHeads(headData);
      setSubHeads(subHeadData);
    } catch (err: any) {
      const reason =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load account heads. Check your connection and try again.';
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
    setHeadPage(1);
  }, [headSearch]);

  useEffect(() => {
    setSubPage(1);
  }, [subSearch]);

  const filteredHeads = heads.filter(h => {
    if (!headSearch.trim()) {
      return true;
    }
    const q = headSearch.toLowerCase();
    return (
      h.masterAccount.toLowerCase().includes(q) ||
      h.accountType.toLowerCase().includes(q) ||
      (h.description || '').toLowerCase().includes(q)
    );
  });

  const filteredSubHeads = subHeads.filter(s => {
    if (!subSearch.trim()) {
      return true;
    }
    const q = subSearch.toLowerCase();
    return (
      s.subMasterAccount.toLowerCase().includes(q) ||
      s.masterAccount.toLowerCase().includes(q) ||
      s.accountType.toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q)
    );
  });

  const headTotalPages = Math.max(1, Math.ceil(filteredHeads.length / headPageSize));
  const headsPaginated = filteredHeads.slice((headPage - 1) * headPageSize, headPage * headPageSize);

  const subTotalPages = Math.max(1, Math.ceil(filteredSubHeads.length / subPageSize));
  const subHeadsPaginated = filteredSubHeads.slice((subPage - 1) * subPageSize, subPage * subPageSize);

  const statCards: StatCard[] = [
    {key: 'heads', label: 'Total Heads', value: String(heads.length), icon: Layers, gradient: ['#8B5CF6', '#4F46E5']},
    {key: 'subheads', label: 'Total Sub Heads', value: String(subHeads.length), icon: Layers, gradient: ['#3B82F6', '#06B6D4']},
    {key: 'types', label: 'Account Types', value: String(new Set(heads.map(h => h.accountType)).size), icon: Layers, gradient: ['#10B981', '#16A34A']},
  ];

  const openAddHead = () => {
    setEditingHead(null);
    setHeadMaster('');
    setHeadType('');
    setHeadDescription('');
    setHeadFormOpen(true);
  };

  const openEditHead = (item: AccountHead) => {
    setEditingHead(item);
    setHeadMaster(item.masterAccount);
    setHeadType(item.accountType);
    setHeadDescription(item.description || '');
    setHeadFormOpen(true);
  };

  const handleSaveHead = async () => {
    if (!headMaster.trim() || !headType) {
      Alert.alert('Error', 'Master account and account type are required.');
      return;
    }
    setSavingHead(true);
    try {
      const payload = {
        masterAccount: headMaster.trim(),
        accountType: headType,
        description: headDescription,
      };
      if (editingHead) {
        await updateHead(editingHead.id, payload);
      } else {
        await createHead(payload);
      }
      setHeadFormOpen(false);
      setEditingHead(null);
      fetchData(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to save account head';
      Alert.alert('Error', msg);
    } finally {
      setSavingHead(false);
    }
  };

  const handleDeleteHead = (item: AccountHead) => {
    Alert.alert('Delete Account Head', `Delete "${item.masterAccount}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHead(item.id);
            fetchData(false);
          } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete account head';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  const openAddSub = () => {
    setEditingSubHead(null);
    setSubMaster('');
    setSubHeadId('');
    setSubBudget('');
    setSubDescription('');
    setSubFormOpen(true);
  };

  const openEditSub = (item: AccountSubHead) => {
    setEditingSubHead(item);
    setSubMaster(item.subMasterAccount);
    setSubHeadId(item.masterAccountId);
    setSubBudget(item.budget || '');
    setSubDescription(item.description || '');
    setSubFormOpen(true);
  };

  const handleSaveSub = async () => {
    if (!subMaster.trim() || !subHeadId) {
      Alert.alert('Error', 'Sub master account and master account are required.');
      return;
    }
    const head = heads.find(h => h.id === subHeadId);
    setSavingSub(true);
    try {
      const payload = {
        subMasterAccount: subMaster.trim(),
        masterAccountId: subHeadId,
        masterAccount: head?.masterAccount || '',
        accountType: head?.accountType || '',
        budget: subBudget,
        description: subDescription,
      };
      if (editingSubHead) {
        await updateSubHead(editingSubHead.id, payload);
      } else {
        await createSubHead(payload);
      }
      setSubFormOpen(false);
      setEditingSubHead(null);
      fetchData(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to save sub head';
      Alert.alert('Error', msg);
    } finally {
      setSavingSub(false);
    }
  };

  const handleDeleteSub = (item: AccountSubHead) => {
    Alert.alert('Delete Account Sub Head', `Delete "${item.subMasterAccount}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSubHead(item.id);
            fetchData(false);
          } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete sub head';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  const selectedSubHead = heads.find(h => h.id === subHeadId);

  const submitHeadPage = () => {
    const page = parseInt(headPageInput, 10);
    if (page && page >= 1 && page <= headTotalPages) {
      setHeadPage(page);
      setHeadPageInput('');
    }
  };

  const submitSubPage = () => {
    const page = parseInt(subPageInput, 10);
    if (page && page >= 1 && page <= subTotalPages) {
      setSubPage(page);
      setSubPageInput('');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
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
          <Text style={styles.headerTitle}>Account Head</Text>
          <Text style={styles.headerCount}>{heads.length + subHeads.length} total</Text>
        </View>
      </GradientView>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#8B5CF6']} />
        }>
        <View style={styles.heroHeader}>
          <GradientView colors={['#8B5CF6', '#4F46E5']} style={styles.heroIconBox}>
            <Layers size={20} color="#FFFFFF" />
          </GradientView>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>Account Head</Text>
            <Text style={styles.heroSubtitle}>Manage account heads and sub heads</Text>
          </View>
        </View>

        <AccountHeadDivider />

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

        {/* ========== ACCOUNT HEADS ========== */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account Heads</Text>
            <GradientButton
              colors={['#10B981', '#16A34A']}
              style={styles.sectionAddBtn}
              onPress={openAddHead}>
              <PlusCircle size={16} color="#FFFFFF" />
              <Text style={styles.sectionAddBtnText} numberOfLines={1}>
                Add Head
              </Text>
            </GradientButton>
          </View>

          <View style={styles.searchBox}>
            <Search size={16} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search heads..."
              placeholderTextColor="#9CA3AF"
              value={headSearch}
              onChangeText={setHeadSearch}
            />
          </View>

          {headsPaginated.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyTitle}>No account heads found</Text>
              <Text style={styles.emptyText}>
                {headSearch ? 'Try adjusting your search' : 'Add your first account head'}
              </Text>
            </View>
          ) : (
            headsPaginated.map((item, index) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.rowIndex}>{index + 1 + (headPage - 1) * headPageSize}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {item.masterAccount}
                    </Text>
                    <Text style={styles.cardType}>{item.accountType}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditHead(item)}>
                      <Pencil size={15} color="#059669" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteHead(item)}>
                      <Trash2 size={15} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
                {item.description ? (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
            ))
          )}

          {filteredHeads.length > 0 ? (
            <PaginationControls
              currentPage={headPage}
              totalPages={headTotalPages}
              pageSize={headPageSize}
              pageInput={headPageInput}
              totalItems={filteredHeads.length}
              accent="#10B981"
              onPageChange={setHeadPage}
              onPageSizePress={() => setHeadSizeOpen(true)}
              onPageInput={setHeadPageInput}
              onPageSubmit={submitHeadPage}
            />
          ) : null}
        </View>

        {/* ========== ACCOUNT SUB HEADS ========== */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account Sub Heads</Text>
            <GradientButton
              colors={['#3B82F6', '#06B6D4']}
              style={styles.sectionAddBtn}
              onPress={openAddSub}>
              <PlusCircle size={16} color="#FFFFFF" />
              <Text style={styles.sectionAddBtnText} numberOfLines={1}>
                Add Sub Head
              </Text>
            </GradientButton>
          </View>

          <View style={styles.searchBox}>
            <Search size={16} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search sub heads..."
              placeholderTextColor="#9CA3AF"
              value={subSearch}
              onChangeText={setSubSearch}
            />
          </View>

          {subHeadsPaginated.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🗂️</Text>
              <Text style={styles.emptyTitle}>No sub heads found</Text>
              <Text style={styles.emptyText}>
                {subSearch ? 'Try adjusting your search' : 'Add your first sub head'}
              </Text>
            </View>
          ) : (
            subHeadsPaginated.map((item, index) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.rowIndexBlue}>{index + 1 + (subPage - 1) * subPageSize}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {item.subMasterAccount}
                    </Text>
                    <Text style={styles.cardSub} numberOfLines={1}>
                      {item.masterAccount || '—'}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.editBtnBlue} onPress={() => openEditSub(item)}>
                      <Pencil size={15} color="#2563EB" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteSub(item)}>
                      <Trash2 size={15} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.cardInfoRow}>
                  {item.budget ? (
                    <Text style={styles.cardBudget}>
                      Budget: Rs. {Number(item.budget).toLocaleString()}
                    </Text>
                  ) : (
                    <Text style={styles.cardBudgetMuted}>No budget set</Text>
                  )}
                  <Text style={styles.cardType}>{item.accountType}</Text>
                </View>
                {item.description ? (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
            ))
          )}

          {filteredSubHeads.length > 0 ? (
            <PaginationControls
              currentPage={subPage}
              totalPages={subTotalPages}
              pageSize={subPageSize}
              pageInput={subPageInput}
              totalItems={filteredSubHeads.length}
              accent="#3B82F6"
              onPageChange={setSubPage}
              onPageSizePress={() => setSubSizeOpen(true)}
              onPageInput={setSubPageInput}
              onPageSubmit={submitSubPage}
            />
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Head page size sheet */}
      <Modal
        visible={headSizeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setHeadSizeOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Show entries</Text>
              <TouchableOpacity onPress={() => setHeadSizeOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {PAGE_SIZES.map(size => {
              const active = headPageSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  style={styles.sheetOption}
                  onPress={() => {
                    setHeadPageSize(size);
                    setHeadPage(1);
                    setHeadSizeOpen(false);
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

      {/* Sub head page size sheet */}
      <Modal
        visible={subSizeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSubSizeOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Show entries</Text>
              <TouchableOpacity onPress={() => setSubSizeOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {PAGE_SIZES.map(size => {
              const active = subPageSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  style={styles.sheetOption}
                  onPress={() => {
                    setSubPageSize(size);
                    setSubPage(1);
                    setSubSizeOpen(false);
                  }}>
                  <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}>
                    {size} per page
                  </Text>
                  {active ? <Check size={16} color="#3B82F6" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Add/Edit Head form */}
      <Modal
        visible={headFormOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setHeadFormOpen(false)}>
        <KeyboardAvoidingView
          style={styles.formOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formSheet}>
            <View style={styles.formSheetHeader}>
              <View style={styles.formSheetTitleRow}>
                <GradientView colors={['#8B5CF6', '#4F46E5']} style={styles.formSheetIcon}>
                  <Layers size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>
                  {editingHead ? 'Edit Account Head' : 'Add Account Head'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setHeadFormOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Master Account *</Text>
                <TextInput
                  style={styles.formInput}
                  value={headMaster}
                  onChangeText={setHeadMaster}
                  placeholder="Enter master account name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Account Type *</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() =>
                    setSelectSheet({
                      key: 'headType',
                      title: 'Select account type',
                      options: ACCOUNT_TYPES.map(t => ({label: t, value: t})),
                      selected: headType,
                      onSelect: v => setHeadType(v),
                    })
                  }>
                  <Text
                    style={headType ? styles.formSelectValue : styles.formSelectPlaceholder}
                    numberOfLines={1}>
                    {headType || 'Select account type'}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={headDescription}
                  onChangeText={setHeadDescription}
                  placeholder="Enter description..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setHeadFormOpen(false)}
                  disabled={savingHead}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <GradientButton
                  colors={['#10B981', '#16A34A']}
                  style={styles.saveBtn}
                  onPress={handleSaveHead}
                  disabled={savingHead}>
                  {savingHead ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editingHead ? 'Update' : 'Add'}</Text>
                  )}
                </GradientButton>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add/Edit Sub Head form */}
      <Modal
        visible={subFormOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSubFormOpen(false)}>
        <KeyboardAvoidingView
          style={styles.formOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formSheet}>
            <View style={styles.formSheetHeader}>
              <View style={styles.formSheetTitleRow}>
                <GradientView colors={['#3B82F6', '#06B6D4']} style={styles.formSheetIcon}>
                  <Layers size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>
                  {editingSubHead ? 'Edit Account Sub Head' : 'Add Account Sub Head'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSubFormOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Sub Master Account *</Text>
                <TextInput
                  style={styles.formInput}
                  value={subMaster}
                  onChangeText={setSubMaster}
                  placeholder="Enter sub master account name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Master Account *</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() =>
                    setSelectSheet({
                      key: 'subHead',
                      title: 'Select master account',
                      options: heads.map(h => ({label: h.masterAccount, value: h.id})),
                      selected: subHeadId,
                      onSelect: v => setSubHeadId(v),
                    })
                  }>
                  <Text
                    style={subHeadId ? styles.formSelectValue : styles.formSelectPlaceholder}
                    numberOfLines={1}>
                    {selectedSubHead?.masterAccount || 'Select master account'}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {selectedSubHead ? (
                <View style={styles.formInfoBox}>
                  <Text style={styles.formInfoText}>
                    Account Type: <Text style={styles.formInfoStrong}>{selectedSubHead.accountType}</Text>
                  </Text>
                </View>
              ) : null}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Budget</Text>
                <TextInput
                  style={styles.formInput}
                  value={subBudget}
                  onChangeText={setSubBudget}
                  placeholder="Enter budget amount"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={subDescription}
                  onChangeText={setSubDescription}
                  placeholder="Enter description..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setSubFormOpen(false)}
                  disabled={savingSub}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <GradientButton
                  colors={['#3B82F6', '#06B6D4']}
                  style={styles.saveBtn}
                  onPress={handleSaveSub}
                  disabled={savingSub}>
                  {savingSub ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editingSubHead ? 'Update' : 'Add'}</Text>
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
                    <Text
                      style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}
                      numberOfLines={1}>
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
  list: {paddingHorizontal: 16, paddingTop: 4, paddingBottom: 30},
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
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
  heroDivider: {marginHorizontal: 4, marginBottom: 4},
  statsRow: {paddingHorizontal: 12, paddingTop: 14, gap: 10},
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
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {fontSize: 17, fontWeight: '700', color: '#111827'},
  sectionAddBtn: {
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
  sectionAddBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginLeft: 6},
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center'},
  rowIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  rowIndexBlue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1},
  cardName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  cardSub: {fontSize: 12, color: '#6B7280', marginTop: 2},
  cardType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cardBudget: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardBudgetMuted: {fontSize: 12, color: '#9CA3AF'},
  cardDescription: {fontSize: 12, color: '#6B7280', marginTop: 6},
  cardActions: {flexDirection: 'row', gap: 8},
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnBlue: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
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
  empty: {alignItems: 'center', paddingVertical: 30},
  emptyIcon: {fontSize: 40, marginBottom: 10},
  emptyTitle: {fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280', textAlign: 'center'},
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    marginTop: 16,
  },
  errorText: {fontSize: 13, color: '#B91C1C'},
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
  formLabel: {fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6},
  formInput: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827',
  },
  formTextArea: {minHeight: 80, textAlignVertical: 'top'},
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
  formInfoBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  formInfoText: {fontSize: 13, color: '#6B7280'},
  formInfoStrong: {fontWeight: '600', color: '#374151'},
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
