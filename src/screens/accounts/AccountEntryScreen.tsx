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
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import {useFocusEffect, useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  BookOpen,
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  Calendar,
  FileText,
  DollarSign,
  X,
} from 'lucide-react-native';
import {useAuth} from '../../context/AuthContext';
import {
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  getHeads,
  getSubHeads,
  getStaff,
} from '../../api/accounts';
import {getTransactionTypes} from '../../api/billing';
import {AccountEntry, AccountHead, AccountSubHead, Staff, TransactionType} from '../../types';
import {GradientView} from '../../components/GradientView';
import {GradientButton} from '../../components/GradientButton';

const PAGE_SIZES = [5, 10, 20, 50, 100];

const FILTER_BY_OPTIONS = ['All', 'Add By', 'Edit By'];

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

function AccountEntryDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="accountEntryHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8B5CF6" stopOpacity="1" />
            <Stop offset="0.6" stopColor="#4F46E5" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#4F46E5" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#accountEntryHeroGrad)" />
      </Svg>
    </View>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  colors: [string, string];
  icon: React.ReactNode;
};

function StatCard({label, value, colors, icon}: StatCardProps) {
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

type SelectSheetState = {
  title: string;
  options: {id: string; name: string}[];
  selected: string;
  onSelect: (v: string) => void;
} | null;

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

export default function AccountEntryScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const {companyId, user} = useAuth();

  const [entries, setEntries] = useState<AccountEntry[]>([]);
  const [heads, setHeads] = useState<AccountHead[]>([]);
  const [subHeads, setSubHeads] = useState<AccountSubHead[]>([]);
  const [txnTypes, setTxnTypes] = useState<TransactionType[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [pageInput, setPageInput] = useState('');

  // Filters
  const [filterHead, setFilterHead] = useState('All');
  const [filterSubHead, setFilterSubHead] = useState('All');
  const [filterUser, setFilterUser] = useState('All');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterBy, setFilterBy] = useState('All');

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AccountEntry | null>(null);
  const [formHeadId, setFormHeadId] = useState('');
  const [formSubHeadId, setFormSubHeadId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formTxnTypeId, setFormTxnTypeId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Select sheet state
  const [selectSheet, setSelectSheet] = useState<SelectSheetState>(null);

  const openDrawer = () => {
    nav.dispatch(DrawerActions.openDrawer());
  };

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const [entriesData, headsData, subHeadsData, txnData, staffData] = await Promise.all([
        getEntries().catch(() => []),
        getHeads().catch(() => []),
        getSubHeads().catch(() => []),
        getTransactionTypes().catch(() => []),
        getStaff().catch(() => []),
      ]);
      setEntries(entriesData);
      setHeads(headsData);
      setSubHeads(subHeadsData);
      setTxnTypes(txnData);
      setStaffList(staffData);
    } catch (err: any) {
      const reason =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load account entries. Check your connection and try again.';
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

  // Derive unique users from staff + entries
  const usersList = useMemo(() => {
    const names = new Set<string>();
    staffList.forEach(s => {
      if (s.name) names.add(s.name);
    });
    entries.forEach(e => {
      if (e.addBy) names.add(e.addBy);
      if (e.editBy && e.editBy !== '-') names.add(e.editBy);
    });
    if (user?.name) names.add(user.name);
    return Array.from(names).sort();
  }, [staffList, entries, user?.name]);

  // Derived sub-head options for the form
  const subHeadOptions = useMemo(() => {
    if (!formHeadId) return [];
    return subHeads.filter(s => s.masterAccountId === formHeadId);
  }, [formHeadId, subHeads]);

  // Helper display functions
  const getHeadName = (headId: string) => {
    const head = heads.find(h => h.id === headId);
    return head?.masterAccount || headId;
  };

  const getSubHeadName = (subHeadId: string) => {
    const sub = subHeads.find(s => s.id === subHeadId);
    return sub?.subMasterAccount || subHeadId;
  };

  // Filtering
  const filteredData = useMemo(() => {
    return entries.filter(e => {
      if (filterHead !== 'All' && e.head !== filterHead) return false;
      if (filterSubHead !== 'All' && e.subHead !== filterSubHead) return false;
      if (filterUser !== 'All') {
        if (filterBy === 'Add By' && e.addBy !== filterUser) return false;
        if (filterBy === 'Edit By' && e.editBy !== filterUser) return false;
        if (filterBy === 'All' && e.addBy !== filterUser && e.editBy !== filterUser) return false;
      }
      if (filterFromDate) {
        if (e.date < filterFromDate) return false;
      }
      if (filterToDate) {
        if (e.date > filterToDate) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const head = heads.find(h => h.id === e.head);
        const sub = subHeads.find(s => s.id === e.subHead);
        return (
          (head?.masterAccount || e.head).toLowerCase().includes(q) ||
          (sub?.subMasterAccount || e.subHead).toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    entries,
    filterHead,
    filterSubHead,
    filterUser,
    filterBy,
    filterFromDate,
    filterToDate,
    search,
    heads,
    subHeads,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const totalEntries = entries.length;
  const totalAmount = entries.reduce((s, e) => s + (e.amount || 0), 0);
  const totalTxnTypes = new Set(entries.map(e => e.transactionType)).size;

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handlePageSize = (val: number) => {
    setPageSize(val);
    setPage(1);
  };

  const submitPage = () => {
    const p = parseInt(pageInput, 10);
    if (p && p >= 1 && p <= totalPages) {
      setPage(p);
      setPageInput('');
    }
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setFormHeadId('');
    setFormSubHeadId('');
    setFormDate('');
    setFormDescription('');
    setFormAmount('');
    setFormTxnTypeId('');
    setFormOpen(true);
  };

  const openEditDialog = (item: AccountEntry) => {
    setEditingItem(item);
    setFormHeadId(item.head);
    setFormSubHeadId(item.subHead);
    setFormDate(item.date || '');
    setFormDescription(item.description || '');
    setFormAmount(String(item.amount || ''));
    setFormTxnTypeId(item.transactionType || '');
    setFormOpen(true);
  };

  const onHeadChange = (v: string) => {
    setFormHeadId(v);
    const matching = subHeads.filter(s => s.masterAccountId === v);
    setFormSubHeadId(matching.length > 0 ? matching[0].id : '');
  };

  const handleSave = async () => {
    if (!formHeadId || !formSubHeadId || !formAmount) {
      Alert.alert('Error', 'Account head, sub head, and amount are required.');
      return;
    }
    setIsSaving(true);
    try {
      const currentUser = user?.name || 'Admin';
      const payload = {
        head: formHeadId,
        subHead: formSubHeadId,
        description: formDescription,
        date: formDate || new Date().toISOString().split('T')[0],
        addBy: editingItem ? editingItem.addBy : currentUser,
        editBy: editingItem ? currentUser : '-',
        amount: parseFloat(formAmount),
        transactionType: formTxnTypeId,
        companyId: companyId ?? undefined,
      };
      if (editingItem) {
        await updateEntry(editingItem.id, payload);
        Alert.alert('Success', 'Entry updated.');
      } else {
        await createEntry(payload);
        Alert.alert('Success', 'Entry added.');
      }
      setFormOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to save entry';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (item: AccountEntry) => {
    Alert.alert(
      'Delete Account Entry',
      `Delete entry for ${getHeadName(item.head)} / ${getSubHeadName(item.subHead)}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(item.id);
              Alert.alert('Success', 'Entry deleted.');
              fetchData();
            } catch (err: any) {
              const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                'Failed to delete entry';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  const kpiCards = [
    {
      label: 'Total Entries',
      value: String(totalEntries),
      colors: ['#3B82F6', '#4F46E5'] as [string, string],
      icon: <FileText size={16} color="#FFFFFF" />,
    },
    {
      label: 'Total Amount',
      value: `PKR ${totalAmount.toLocaleString()}`,
      colors: ['#10B981', '#16A34A'] as [string, string],
      icon: <DollarSign size={16} color="#FFFFFF" />,
    },
    {
      label: 'Transaction Types',
      value: String(totalTxnTypes),
      colors: ['#F59E0B', '#EA580C'] as [string, string],
      icon: <FileText size={16} color="#FFFFFF" />,
    },
  ];

  if (loading && !entries.length) {
    return (
      <View style={styles.centered}>
        <GradientView colors={['#8B5CF6', '#4F46E5']} style={styles.loadingIconBox}>
          <BookOpen size={24} color="#FFFFFF" />
        </GradientView>
        <ActivityIndicator size="large" color="#8B5CF6" style={styles.loadingSpinner} />
        <Text style={styles.loadingText}>Loading account entries...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <GradientView colors={['#166534', '#22c55e']} style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Account Entry</Text>
          <Text style={styles.headerCount}>{entries.length} total</Text>
        </View>
      </GradientView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={['#8B5CF6']}
          />
        }
        contentContainerStyle={styles.list}>
        {/* Hero */}
        <View style={styles.heroHeader}>
          <GradientView colors={['#8B5CF6', '#4F46E5']} style={styles.heroIconBox}>
            <BookOpen size={20} color="#FFFFFF" />
          </GradientView>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>Account Entry</Text>
            <Text style={styles.heroSubtitle}>
              Manage all account transactions and entries
            </Text>
          </View>
        </View>

        <AccountEntryDivider />

        {/* Summary Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}>
          {kpiCards.map(kpi => (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              colors={kpi.colors}
              icon={kpi.icon}
            />
          ))}
        </ScrollView>

        {/* Filters */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Filters</Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity
                style={styles.filterBtn}
                onPress={() => {
                  setFilterHead('All');
                  setFilterSubHead('All');
                  setFilterUser('All');
                  setFilterFromDate('');
                  setFilterToDate('');
                  setFilterBy('All');
                }}>
                <Text style={styles.filterBtnText}>Reset</Text>
              </TouchableOpacity>
              <GradientButton
                colors={['#10B981', '#16A34A']}
                style={styles.sectionAddBtn}
                onPress={openAddDialog}>
                <PlusCircle size={16} color="#FFFFFF" />
                <Text style={styles.sectionAddBtnText} numberOfLines={1}>
                  Add Entry
                </Text>
              </GradientButton>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Account Head</Text>
              <TouchableOpacity
                style={[styles.formSelect, {height: 44}]}
                onPress={() =>
                  setSelectSheet({
                    title: 'Select account head',
                    options: [{id: 'All', name: 'All'}, ...heads.map(h => ({id: h.id, name: h.masterAccount}))],
                    selected: filterHead,
                    onSelect: setFilterHead,
                  })
                }>
                <Text
                  style={filterHead === 'All' ? [styles.formSelectValue, styles.formSelectPlaceholder] : styles.formSelectValue}
                  numberOfLines={1}>
                  {filterHead === 'All' ? 'All' : (heads.find(h => h.id === filterHead)?.masterAccount || 'All')}
                </Text>
                <ChevronDown size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Sub Head</Text>
              <TouchableOpacity
                style={[styles.formSelect, {height: 44}]}
                onPress={() =>
                  setSelectSheet({
                    title: 'Select sub head',
                    options: [{id: 'All', name: 'All'}, ...subHeads.map(s => ({id: s.id, name: s.subMasterAccount}))],
                    selected: filterSubHead,
                    onSelect: setFilterSubHead,
                  })
                }>
                <Text
                  style={filterSubHead === 'All' ? [styles.formSelectValue, styles.formSelectPlaceholder] : styles.formSelectValue}
                  numberOfLines={1}>
                  {filterSubHead === 'All' ? 'All' : (subHeads.find(s => s.id === filterSubHead)?.subMasterAccount || 'All')}
                </Text>
                <ChevronDown size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Users</Text>
              <TouchableOpacity
                style={[styles.formSelect, {height: 44}]}
                onPress={() =>
                  setSelectSheet({
                    title: 'Select user',
                    options: [{id: 'All', name: 'All'}, ...usersList.map(u => ({id: u, name: u}))],
                    selected: filterUser,
                    onSelect: setFilterUser,
                  })
                }>
                <Text
                  style={[styles.formSelectValue, filterUser === 'All' && styles.formSelectPlaceholder]}
                  numberOfLines={1}>
                  {filterUser === 'All' ? 'All' : filterUser}
                </Text>
                <ChevronDown size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroupDate}>
              <Text style={styles.filterLabel}>From Date</Text>
              <View style={styles.dateInputWrap}>
                <Calendar size={16} color="#6B7280" style={styles.dateIcon} />
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                  value={filterFromDate}
                  onChangeText={setFilterFromDate}
                />
              </View>
            </View>

            <View style={styles.filterGroupDate}>
              <Text style={styles.filterLabel}>To Date</Text>
              <View style={styles.dateInputWrap}>
                <Calendar size={16} color="#6B7280" style={styles.dateIcon} />
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                  value={filterToDate}
                  onChangeText={setFilterToDate}
                />
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Filter By</Text>
              <TouchableOpacity
                style={[styles.formSelect, {height: 44}]}
                onPress={() =>
                  setSelectSheet({
                    title: 'Filter by',
                    options: FILTER_BY_OPTIONS.map(o => ({id: o, name: o})),
                    selected: filterBy,
                    onSelect: setFilterBy,
                  })
                }>
                <Text style={styles.formSelectValue} numberOfLines={1}>
                  {filterBy}
                </Text>
                <ChevronDown size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Table */}
        <View style={styles.tableCard}>
          <View style={styles.tableToolbar}>
            <View style={styles.pageSizeRow}>
              <Text style={styles.pageSizeLabel}>Show</Text>
              <TouchableOpacity style={styles.pageSizeSelect} onPress={() => setPageSizeOpen(true)}>
                <Text style={styles.pageSizeSelectText}>{pageSize}</Text>
                <ChevronDown size={16} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.pageSizeLabel}>entries</Text>
            </View>

            <View style={styles.searchWrap}>
              <Search size={16} color="#6B7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by head, sub head or description..."
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
          </View>

          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colId]}>#</Text>
              <Text style={[styles.tableHeaderText, styles.colHead]}>Head</Text>
              <Text style={[styles.tableHeaderText, styles.colSubHead]}>Sub Head</Text>
              <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
              <Text style={[styles.tableHeaderText, styles.colDate]}>Date</Text>
              <Text style={[styles.tableHeaderText, styles.colUser]}>Add By</Text>
              <Text style={[styles.tableHeaderText, styles.colUser]}>Edit By</Text>
              <Text style={[styles.tableHeaderText, styles.colAction]}>Action</Text>
            </View>

            {paginatedData.length === 0 ? (
              <View style={styles.emptyState}>
                <BookOpen size={36} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>
                  {search || filterHead !== 'All' || filterSubHead !== 'All' || filterUser !== 'All'
                    ? 'No matching entries found'
                    : 'No account entries found'}
                </Text>
                {search || filterHead !== 'All' || filterSubHead !== 'All' || filterUser !== 'All' ? (
                  <Text style={styles.emptyText}>Try adjusting your search or filters.</Text>
                ) : (
                  <Text style={styles.emptyText}>Tap "Add Entry" to create one.</Text>
                )}
              </View>
            ) : (
              paginatedData.map((item, index) => (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={[styles.rowCellMono, styles.colId]}>{index + 1 + (page - 1) * pageSize}</Text>
                  <Text style={[styles.rowCellText, styles.colHead]} numberOfLines={1}>
                    {getHeadName(item.head)}
                  </Text>
                  <Text style={[styles.rowCellText, styles.colSubHead]} numberOfLines={1}>
                    {getSubHeadName(item.subHead)}
                  </Text>
                  <Text style={[styles.rowCellText, styles.colDesc]} numberOfLines={2}>
                    {item.description || '---'}
                  </Text>
                  <Text style={[styles.rowCellText, styles.colDate]}>{item.date || '---'}</Text>
                  <Text style={[styles.rowCellText, styles.colUser]} numberOfLines={1}>
                    {item.addBy || '---'}
                  </Text>
                  <Text style={[styles.rowCellText, styles.colUser]} numberOfLines={1}>
                    {item.editBy || '---'}
                  </Text>
                  <View style={styles.colAction}>
                    <View style={styles.rowActions}>
                      <TouchableOpacity style={[styles.actionBtn, styles.actionBtnEdit]} onPress={() => openEditDialog(item)}>
                        <Pencil size={14} color="#2563EB" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(item)}>
                        <Trash2 size={14} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {filteredData.length > 0 ? (
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              pageInput={pageInput}
              totalItems={filteredData.length}
              accent="#10B981"
              onPageChange={p => {
                setPage(p);
                setPageInput('');
              }}
              onPageSizePress={() => setPageSizeOpen(true)}
              onPageInput={setPageInput}
              onPageSubmit={submitPage}
            />
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
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
                    handlePageSize(size);
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

      {/* Select Sheet */}
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
                const active = option.id === selectSheet!.selected;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.sheetOption}
                    onPress={() => {
                      selectSheet!.onSelect(option.id);
                      setSelectSheet(null);
                    }}>
                    <Text
                      style={[
                        styles.sheetOptionText,
                        active && styles.sheetOptionTextActive,
                      ]}
                      numberOfLines={1}>
                      {option.name}
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

      {/* Add/Edit Form */}
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
                <GradientView colors={['#8B5CF6', '#4F46E5']} style={styles.formSheetIcon}>
                  <BookOpen size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>
                  {editingItem ? 'Edit Account Entry' : 'Add Account Entry'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFormOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.sheetScroll}
              keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Account Head *</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() =>
                    setSelectSheet({
                      title: 'Select account head',
                      options: heads.map(h => ({id: h.id, name: h.masterAccount})),
                      selected: formHeadId,
                      onSelect: onHeadChange,
                    })
                  }>
                  <Text
                    style={formHeadId ? styles.formSelectValue : styles.formSelectPlaceholder}
                    numberOfLines={1}>
                    {formHeadId ? (heads.find(h => h.id === formHeadId)?.masterAccount || 'Select head') : 'Select head'}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Sub Account Head *</Text>
                <TouchableOpacity
                  style={[styles.formSelect, !formHeadId && {opacity: 0.5}]}
                  disabled={!formHeadId}
                  onPress={() =>
                    setSelectSheet({
                      title: 'Select sub account head',
                      options: subHeadOptions.map(s => ({id: s.id, name: s.subMasterAccount})),
                      selected: formSubHeadId,
                      onSelect: setFormSubHeadId,
                    })
                  }>
                  <Text
                    style={formSubHeadId ? styles.formSelectValue : styles.formSelectPlaceholder}
                    numberOfLines={1}>
                    {formSubHeadId
                      ? (subHeads.find(s => s.id === formSubHeadId)?.subMasterAccount || 'Select sub head')
                      : 'Select sub head'}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date</Text>
                <View style={styles.dateInputWrap}>
                  <Calendar size={16} color="#6B7280" style={styles.dateIcon} />
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                    value={formDate}
                    onChangeText={setFormDate}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder="Enter description..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.formLabel}>Amount *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter amount"
                    placeholderTextColor="#9CA3AF"
                    value={formAmount}
                    onChangeText={setFormAmount}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.formLabel}>Transaction Type</Text>
                  <TouchableOpacity
                    style={styles.formSelect}
                    onPress={() =>
                      setSelectSheet({
                        title: 'Select transaction type',
                        options: txnTypes.map(t => ({id: t.id, name: t.paymentChannel || '---'})),
                        selected: formTxnTypeId,
                        onSelect: setFormTxnTypeId,
                      })
                    }>
                    <Text
                      style={formTxnTypeId ? styles.formSelectValue : styles.formSelectPlaceholder}
                      numberOfLines={1}>
                      {formTxnTypeId
                        ? (txnTypes.find(t => t.id === formTxnTypeId)?.paymentChannel || 'Select type')
                        : 'Select type'}
                    </Text>
                    <ChevronDown size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setFormOpen(false)}
                  disabled={isSaving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <GradientButton
                  colors={['#10B981', '#16A34A']}
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={isSaving || !formHeadId || !formSubHeadId || !formAmount}>
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editingItem ? 'Update' : 'Add'}</Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingSpinner: {marginTop: 12},
  loadingText: {fontSize: 14, color: '#6B7280'},
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
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
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
    minWidth: 160,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statLabel: {fontSize: 10, color: '#9CA3AF', fontWeight: '500'},
  statValue: {fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 2},
  statInfo: {flex: 1},
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  filterBtnText: {fontSize: 12, color: '#6B7280', fontWeight: '600'},
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
  filterRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 4,
    paddingRight: 16,
  },
  filterGroup: {
    minWidth: 140,
  },
  filterGroupDate: {
    minWidth: 130,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  formSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formSelectValue: {flex: 1, fontSize: 15, color: '#111827', marginRight: 8},
  formSelectPlaceholder: {flex: 1, fontSize: 15, color: '#9CA3AF', marginRight: 8},
  dateInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
  },
  dateIcon: {marginRight: 6},
  dateInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  tableToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
  },
  searchIcon: {marginRight: 6},
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  pageSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  pageSizeLabel: {fontSize: 12, color: '#6B7280'},
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
  pageSizeSelectText: {fontSize: 13, color: '#111827', fontWeight: '600', marginRight: 6},
  tableContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowCellMono: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  rowCellText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  colId: {width: 30, maxWidth: 30},
  colHead: {flex: 2, minWidth: 90},
  colSubHead: {flex: 2, minWidth: 90},
  colDesc: {flex: 2, minWidth: 120},
  colDate: {flex: 1.2, minWidth: 80},
  colUser: {flex: 1.2, minWidth: 80},
  colAction: {width: 70, maxWidth: 70},
  rowActions: {flexDirection: 'row', gap: 4},
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnEdit: {backgroundColor: '#EFF6FF'},
  actionBtnDanger: {backgroundColor: '#FEF2F2'},
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyTitle: {fontSize: 15, fontWeight: '600', color: '#374151'},
  emptyText: {fontSize: 12, color: '#9CA3AF', textAlign: 'center'},
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    marginTop: 16,
  },
  errorText: {fontSize: 13, color: '#B91C1C'},
  pagination: {paddingTop: 12},
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
    justifyContent: 'space-between',
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
  formGroupHalf: {flex: 1},
  formRow: {
    flexDirection: 'row',
    gap: 14,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
