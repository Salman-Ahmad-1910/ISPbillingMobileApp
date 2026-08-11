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
  FileText,
  BarChart3,
  ClipboardCheck,
  ScrollText,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  Pencil,
  Trash2,
  Calendar,
  Layers,
  Tag,
  User,
  Coins,
  Eye,
} from 'lucide-react-native';
import {
  getEntries,
  updateEntry,
  deleteEntry,
  getHeads,
  getSubHeads,
} from '../../api/accounts';
import {getTransactionTypes} from '../../api/billing';
import {AccountEntry, AccountHead, AccountSubHead, TransactionType} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';

const PAGE_SIZES = [5, 10, 20, 50, 100];

const ACCENT = '#8B5CF6';
const ACCENT_LIGHT = '#F5F3FF';
const GRADIENT: [string, string] = ['#8B5CF6', '#7C3AED'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function parseDateStr(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDateLabel(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const fmtPKR = (n: number) => new Intl.NumberFormat('en-US').format(Number(n) || 0);

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

function AccountReportsDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="accountReportsHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8B5CF6" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#4F46E5" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#4F46E5" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#accountReportsHeroGrad)" />
      </Svg>
    </View>
  );
}

type DatePickerSheetProps = {
  visible: boolean;
  value: string;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
};

function DatePickerSheet({visible, value, onSelect, onClose}: DatePickerSheetProps) {
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  useEffect(() => {
    if (visible) {
      const d = value ? parseDateStr(value) : new Date();
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [visible, value]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  const selected = value ? parseDateStr(value) : null;
  const todayStr = toDateStr(new Date());

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Select Date</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.sheetClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateNav}>
            <TouchableOpacity style={styles.dateNavBtn} onPress={prevMonth}>
              <ChevronLeft size={16} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.dateNavLabel}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity style={styles.dateNavBtn} onPress={nextMonth}>
              <ChevronRight size={16} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={styles.dayRow}>
            {DAY_NAMES.map(d => (
              <Text key={d} style={styles.dayName}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.dayGrid}>
            {cells.map((day, index) => {
              if (day === null) {
                return <View key={`blank-${index}`} style={styles.dayCell} />;
              }
              const isSelected =
                selected !== null &&
                day === selected.getDate() &&
                viewMonth === selected.getMonth() &&
                viewYear === selected.getFullYear();
              const isToday =
                toDateStr(new Date(viewYear, viewMonth, day)) === todayStr;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                  onPress={() =>
                    onSelect(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
                  }>
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isToday && !isSelected && styles.dayTextToday,
                    ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.dateTodayBtn}
            onPress={() => onSelect(toDateStr(new Date()))}>
            <Text style={styles.dateTodayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

interface FormState {
  headId: string;
  headName: string;
  subHeadId: string;
  subHeadName: string;
  date: string;
  description: string;
  amount: string;
  txnTypeId: string;
  txnTypeName: string;
}

export default function AccountReportsScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const [entries, setEntries] = useState<AccountEntry[]>([]);
  const [heads, setHeads] = useState<AccountHead[]>([]);
  const [subHeads, setSubHeads] = useState<AccountSubHead[]>([]);
  const [txnTypes, setTxnTypes] = useState<TransactionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterHead, setFilterHead] = useState('All');
  const [filterSubHead, setFilterSubHead] = useState('All');
  const [filterUser, setFilterUser] = useState('All');
  const [filterTxnType, setFilterTxnType] = useState('All');
  const [fromDate, setFromDate] = useState<string>(
    () => toDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  );
  const [toDate, setToDate] = useState<string>(() => toDateStr(new Date()));
  const [showReport, setShowReport] = useState(false);

  const [filterOpen, setFilterOpen] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'from' | 'to' | 'form' | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'head' | 'subHead' | 'txnType' | 'user' | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AccountEntry | null>(null);
  const [form, setForm] = useState<FormState>({
    headId: '',
    headName: '',
    subHeadId: '',
    subHeadName: '',
    date: '',
    description: '',
    amount: '',
    txnTypeId: '',
    txnTypeName: '',
  });
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
      const [entryData, headData, subHeadData, txnData] = await Promise.all([
        getEntries(),
        getHeads().catch(() => [] as AccountHead[]),
        getSubHeads().catch(() => [] as AccountSubHead[]),
        getTransactionTypes().catch(() => [] as TransactionType[]),
      ]);
      setEntries(entryData);
      setHeads(headData);
      setSubHeads(subHeadData);
      setTxnTypes(txnData);
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
    }, [fetchData]),
  );

  const getHeadName = (headId: string) =>
    heads.find(h => h.id === headId)?.masterAccount || headId;
  const getSubHeadName = (subHeadId: string) =>
    subHeads.find(s => s.id === subHeadId)?.subMasterAccount || subHeadId;
  const getTxnTypeName = (txnTypeId: string) =>
    txnTypes.find(t => t.id === txnTypeId)?.paymentChannel || txnTypeId;

  const usersList = [...new Set(entries.map(e => e.addBy).filter(Boolean))];

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterHead, filterSubHead, filterUser, filterTxnType, fromDate, toDate]);

  const filteredData = entries.filter(e => {
    if (filterHead !== 'All' && e.head !== filterHead) return false;
    if (filterSubHead !== 'All' && e.subHead !== filterSubHead) return false;
    if (filterUser !== 'All' && e.addBy !== filterUser) return false;
    if (filterTxnType !== 'All' && e.transactionType !== filterTxnType) return false;
    if (fromDate && e.date < fromDate) return false;
    if (toDate && e.date > toDate) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const headName = getHeadName(e.head).toLowerCase();
      const subHeadName = getSubHeadName(e.subHead).toLowerCase();
      const description = (e.description || '').toLowerCase();
      if (
        !headName.includes(q) &&
        !subHeadName.includes(q) &&
        !description.includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const totalAmount = filteredData.reduce((s, e) => s + Number(e.amount || 0), 0);

  const activeFilterCount = [
    filterHead !== 'All',
    filterSubHead !== 'All',
    filterUser !== 'All',
    filterTxnType !== 'All',
  ].filter(Boolean).length;

  const statCards = [
    {
      key: 'entries',
      label: 'Entries Found',
      value: String(filteredData.length),
      icon: BarChart3,
      gradient: ['#8B5CF6', '#7C3AED'] as [string, string],
    },
    {
      key: 'amount',
      label: 'Total Amount',
      value: `PKR ${fmtPKR(totalAmount)}`,
      icon: ClipboardCheck,
      gradient: ['#10B981', '#16A34A'] as [string, string],
    },
    {
      key: 'period',
      label: 'Period',
      value: `${formatDateLabel(fromDate)} - ${formatDateLabel(toDate)}`,
      icon: ScrollText,
      gradient: ['#3B82F6', '#06B6D4'] as [string, string],
    },
  ];

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginated = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  const subHeadOptionsFor = (headId: string) =>
    subHeads.filter(s => s.masterAccountId === headId);

  const openEdit = (entry: AccountEntry) => {
    setEditing(entry);
    setForm({
      headId: entry.head || '',
      headName: getHeadName(entry.head) || '',
      subHeadId: entry.subHead || '',
      subHeadName: getSubHeadName(entry.subHead) || '',
      date: entry.date || toDateStr(new Date()),
      description: entry.description || '',
      amount: entry.amount != null ? String(entry.amount) : '',
      txnTypeId: entry.transactionType || '',
      txnTypeName: getTxnTypeName(entry.transactionType) || '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!form.headId) {
      Alert.alert('Error', 'Please select an account head');
      return;
    }
    if (!form.subHeadId) {
      Alert.alert('Error', 'Please select a sub head');
      return;
    }
    if (!form.date.trim()) {
      Alert.alert('Error', 'Date is required');
      return;
    }
    const amount = parseFloat(form.amount);
    if (!form.amount.trim() || Number.isNaN(amount)) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await updateEntry(editing.id, {
        head: form.headId,
        subHead: form.subHeadId,
        description: form.description,
        date: form.date.trim(),
        addBy: editing.addBy,
        editBy: 'Admin',
        amount,
        transactionType: form.txnTypeId || undefined,
      });
      setFormOpen(false);
      setEditing(null);
      fetchData(false);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to update entry';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (entry: AccountEntry) => {
    Alert.alert('Delete Account Entry', 'Delete this account entry?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEntry(entry.id);
            fetchData(false);
          } catch (err: any) {
            const msg =
              err.response?.data?.message ||
              err.response?.data?.error ||
              'Failed to delete entry';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  const filteredPickerOptions = (target: 'head' | 'subHead' | 'txnType') => {
    const q = pickerQuery.trim().toLowerCase();
    if (target === 'head') {
      const opts = heads;
      if (!q) return opts;
      return opts.filter(h => (h.masterAccount || '').toLowerCase().includes(q));
    }
    if (target === 'subHead') {
      const opts = form.headId ? subHeadOptionsFor(form.headId) : [];
      if (!q) return opts;
      return opts.filter(s => (s.subMasterAccount || '').toLowerCase().includes(q));
    }
    const opts = txnTypes;
    if (!q) return opts;
    return opts.filter(t => (t.paymentChannel || '').toLowerCase().includes(q));
  };

  const pickerTitle = (target: 'head' | 'subHead' | 'txnType') => {
    if (target === 'head') return 'Select Account Head';
    if (target === 'subHead') return 'Select Sub Head';
    return 'Select Transaction Type';
  };

  const pickerPlaceholder = (target: 'head' | 'subHead' | 'txnType') => {
    if (target === 'head') return 'Search heads...';
    if (target === 'subHead') return 'Search sub heads...';
    return 'Search transaction types...';
  };

  const handlePickerSelect = (
    target: 'head' | 'subHead' | 'txnType',
    id: string,
    name: string,
  ) => {
    if (target === 'head') {
      setForm(prev => ({
        ...prev,
        headId: id,
        headName: name,
        subHeadId: '',
        subHeadName: '',
      }));
    } else if (target === 'subHead') {
      setForm(prev => ({...prev, subHeadId: id, subHeadName: name}));
    } else {
      setForm(prev => ({...prev, txnTypeId: id, txnTypeName: name}));
    }
    setPickerTarget(null);
    setPickerQuery('');
  };

  const renderFilterRow = (
    label: string,
    value: string,
    icon: React.ReactNode,
    onPress: () => void,
  ) => (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <TouchableOpacity style={styles.filterSelect} onPress={onPress}>
        {icon}
        <Text style={styles.filterSelectText} numberOfLines={1}>
          {value}
        </Text>
        <ChevronDown size={16} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  const renderItem = ({item, index}: {item: AccountEntry; index: number}) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.rowIndex}>{index + 1 + (currentPage - 1) * pageSize}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.cardDate}>{item.date}</Text>
          <Text style={styles.cardHead} numberOfLines={1}>
            {getHeadName(item.head)}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
            <Pencil size={15} color="#7C3AED" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Trash2 size={15} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Sub Head</Text>
        <View style={styles.infoValueRow}>
          <Tag size={13} color="#6B7280" />
          <Text style={styles.infoValue} numberOfLines={1}>
            {getSubHeadName(item.subHead)}
          </Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Description</Text>
        <Text style={styles.infoValue} numberOfLines={2}>
          {item.description || '-'}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Transaction Type</Text>
        <View style={styles.infoValueRow}>
          <Coins size={13} color="#6B7280" />
          <Text style={styles.infoValue} numberOfLines={1}>
            {getTxnTypeName(item.transactionType)}
          </Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Add By</Text>
        <View style={styles.infoValueRow}>
          <User size={13} color="#6B7280" />
          <Text style={styles.infoValue} numberOfLines={1}>
            {item.addBy || '-'}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerHint}>Entry #{index + 1 + (currentPage - 1) * pageSize}</Text>
        <Text style={styles.totalValue}>PKR {fmtPKR(item.amount)}</Text>
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
          <Text style={styles.headerTitle}>Account Reports</Text>
          <Text style={styles.headerCount}>{filteredData.length} entries</Text>
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
            colors={[ACCENT]}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.heroHeader}>
              <GradientView colors={GRADIENT} style={styles.heroIconBox}>
                <FileText size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Account Reports</Text>
                <Text style={styles.heroSubtitle}>
                  View and print account entries by period.
                </Text>
              </View>
            </View>

            <AccountReportsDivider />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}>
              {statCards.map(card => (
                <View key={card.key} style={styles.statCard}>
                  <GradientView colors={card.gradient} style={styles.statIcon}>
                    <card.icon size={18} color="#FFFFFF" />
                  </GradientView>
                  <View style={styles.statInfo}>
                    <Text style={styles.statLabel}>{card.label}</Text>
                    <Text style={[styles.statValue, card.key === 'period' && styles.statValueSmall]} numberOfLines={1}>
                      {card.value}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.toolbar}>
              <View style={styles.searchBox}>
                <Search size={16} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
                <Filter size={15} color="#7C3AED" />
                <Text style={styles.filterBtnText} numberOfLines={1}>
                  {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
                </Text>
                <ChevronDown size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.showRow}>
              <GradientButton
                colors={['#10B981', '#16A34A']}
                style={styles.showBtn}
                onPress={() => setShowReport(true)}>
                <Eye size={16} color="#FFFFFF" />
                <Text style={styles.showBtnText} numberOfLines={1}>
                  Show
                </Text>
              </GradientButton>
              {showReport ? (
                <TouchableOpacity
                  style={styles.hideBtn}
                  onPress={() => setShowReport(false)}>
                  <Text style={styles.hideBtnText}>Hide Report</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          !showReport ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>Report hidden</Text>
              <Text style={styles.emptyText}>
                Press Show to view account entries for the selected filters.
              </Text>
            </View>
          ) : error ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={styles.emptyTitle}>Failed to load account entries</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No entries found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your filters, dates, or search.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          showReport && filteredData.length > 0 ? (
            <View style={styles.pagination}>
              <Text style={styles.paginationInfo}>
                Showing {filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
                {'   '}Total: PKR {fmtPKR(totalAmount)}
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
                    style={[styles.pageNum, currentPage === page && {backgroundColor: ACCENT}]}
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
          ) : null
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
                  {active ? <Check size={16} color={ACCENT} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Filters sheet */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, styles.filterSheet]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter Report</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.filterBody}>
              {renderFilterRow(
                'Account Head',
                filterHead === 'All'
                  ? 'All Heads'
                  : getHeadName(filterHead),
                <Layers size={16} color="#7C3AED" />,
                () => {
                  setPickerQuery('');
                  setPickerTarget('head');
                },
              )}

              {renderFilterRow(
                'Sub Head',
                filterSubHead === 'All'
                  ? 'All Sub Heads'
                  : getSubHeadName(filterSubHead),
                <Tag size={16} color="#7C3AED" />,
                () => {
                  setPickerQuery('');
                  setPickerTarget('subHead');
                },
              )}

              {renderFilterRow(
                'User',
                filterUser === 'All'
                  ? 'All Users'
                  : filterUser,
                <User size={16} color="#7C3AED" />,
                () => {
                  setPickerQuery('');
                  setPickerTarget('user');
                },
              )}

              {renderFilterRow(
                'Transaction Type',
                filterTxnType === 'All'
                  ? 'All Types'
                  : getTxnTypeName(filterTxnType),
                <Coins size={16} color="#7C3AED" />,
                () => {
                  setPickerQuery('');
                  setPickerTarget('txnType');
                },
              )}

              {renderFilterRow(
                'From Date',
                formatDateLabel(fromDate),
                <Calendar size={16} color="#7C3AED" />,
                () => setDatePickerTarget('from'),
              )}

              {renderFilterRow(
                'To Date',
                formatDateLabel(toDate),
                <Calendar size={16} color="#7C3AED" />,
                () => setDatePickerTarget('to'),
              )}

              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => {
                    setFilterHead('All');
                    setFilterSubHead('All');
                    setFilterUser('All');
                    setFilterTxnType('All');
                    setFromDate(toDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
                    setToDate(toDateStr(new Date()));
                  }}>
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
                <GradientButton
                  colors={['#10B981', '#16A34A']}
                  style={styles.applyBtn}
                  onPress={() => setFilterOpen(false)}>
                  <Check size={16} color="#FFFFFF" />
                  <Text style={styles.applyBtnText}>Apply</Text>
                </GradientButton>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* User picker sheet */}
      <Modal
        visible={pickerTarget === 'user'}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerTarget(null)}>
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, styles.pickerSheet]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select User</Text>
              <TouchableOpacity onPress={() => setPickerTarget(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearch}>
              <Search size={16} color="#6B7280" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Search users..."
                placeholderTextColor="#9CA3AF"
                value={pickerQuery}
                onChangeText={setPickerQuery}
                autoFocus
              />
            </View>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => {
                  setFilterUser('All');
                  setPickerTarget(null);
                  setPickerQuery('');
                }}>
                <View style={styles.sheetOptionRow}>
                  <Text
                    style={[
                      styles.sheetOptionText,
                      filterUser === 'All' && styles.sheetOptionTextActive,
                    ]}>
                    All Users
                  </Text>
                  {filterUser === 'All' ? <Check size={16} color={ACCENT} /> : null}
                </View>
              </TouchableOpacity>
              {usersList
                .filter(u => {
                  const q = pickerQuery.trim().toLowerCase();
                  if (!q) return true;
                  return u.toLowerCase().includes(q);
                })
                .map(user => {
                  const active = filterUser === user;
                  return (
                    <TouchableOpacity
                      key={user}
                      style={styles.sheetOption}
                      onPress={() => {
                        setFilterUser(user);
                        setPickerTarget(null);
                        setPickerQuery('');
                      }}>
                      <View style={styles.sheetOptionRow}>
                        <User size={16} color="#6B7280" />
                        <Text
                          style={[
                            styles.sheetOptionText,
                            active && styles.sheetOptionTextActive,
                          ]}>
                          {user}
                        </Text>
                        {active ? <Check size={16} color={ACCENT} /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              {usersList.length === 0 && (
                <Text style={styles.pickerEmpty}>No users found</Text>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Head / SubHead / TxnType picker sheet */}
      <Modal
        visible={pickerTarget === 'head' || pickerTarget === 'subHead' || pickerTarget === 'txnType'}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerTarget(null)}>
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, styles.pickerSheet]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{pickerTitle(pickerTarget as any)}</Text>
              <TouchableOpacity onPress={() => setPickerTarget(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearch}>
              <Search size={16} color="#6B7280" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder={pickerPlaceholder(pickerTarget as any)}
                placeholderTextColor="#9CA3AF"
                value={pickerQuery}
                onChangeText={setPickerQuery}
                autoFocus
              />
            </View>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              {pickerTarget !== null &&
                pickerTarget !== 'user' &&
                filteredPickerOptions(pickerTarget).map(option => {
                  const id = 'id' in option ? option.id : '';
                  const name =
                    pickerTarget === 'head'
                      ? (option as AccountHead).masterAccount
                      : pickerTarget === 'subHead'
                        ? (option as AccountSubHead).subMasterAccount
                        : (option as TransactionType).paymentChannel || (option as TransactionType).transaction;
                  const active =
                    pickerTarget === 'head'
                      ? form.headId === id
                      : pickerTarget === 'subHead'
                        ? form.subHeadId === id
                        : form.txnTypeId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={styles.sheetOption}
                      onPress={() => handlePickerSelect(pickerTarget, id, name)}>
                      <View style={styles.sheetOptionRow}>
                        <Text
                          style={[
                            styles.sheetOptionText,
                            active && styles.sheetOptionTextActive,
                          ]}
                          numberOfLines={1}>
                          {name}
                        </Text>
                        {active ? <Check size={16} color={ACCENT} /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              {pickerTarget === 'subHead' && form.headId === '' && (
                <Text style={styles.pickerEmpty}>
                  Select an account head first to choose its sub heads.
                </Text>
              )}
              {pickerTarget !== null &&
                pickerTarget !== 'user' &&
                filteredPickerOptions(pickerTarget).length === 0 && (
                  <Text style={styles.pickerEmpty}>No results found</Text>
                )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* From / To date picker */}
      <DatePickerSheet
        visible={datePickerTarget !== null}
        value={datePickerTarget === 'from' ? fromDate : toDate}
        onSelect={dateStr => {
          if (datePickerTarget === 'from') {
            setFromDate(dateStr);
          } else if (datePickerTarget === 'to') {
            setToDate(dateStr);
          }
          setDatePickerTarget(null);
        }}
        onClose={() => setDatePickerTarget(null)}
      />

      {/* Edit entry form */}
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
                <GradientView colors={GRADIENT} style={styles.formSheetIcon}>
                  <FileText size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>Edit Account Entry</Text>
              </View>
              <TouchableOpacity onPress={() => setFormOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Account Head *</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() => {
                    setPickerQuery('');
                    setPickerTarget('head');
                  }}>
                  <Layers size={16} color="#7C3AED" />
                  <Text
                    style={[
                      styles.formSelectText,
                      !form.headId && styles.formSelectPlaceholder,
                    ]}
                    numberOfLines={1}>
                    {form.headId ? form.headName || form.headId : 'Select a head'}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Sub Account Head *</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() => {
                    setPickerQuery('');
                    setPickerTarget('subHead');
                  }}>
                  <Tag size={16} color="#7C3AED" />
                  <Text
                    style={[
                      styles.formSelectText,
                      !form.subHeadId && styles.formSelectPlaceholder,
                    ]}
                    numberOfLines={1}>
                    {form.subHeadId
                      ? form.subHeadName || form.subHeadId
                      : form.headId
                        ? 'Select a sub head'
                        : 'Select head first'}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date *</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() => setDatePickerTarget('form')}>
                  <Calendar size={16} color="#7C3AED" />
                  <Text style={styles.formSelectText} numberOfLines={1}>
                    {form.date ? formatDateLabel(form.date) : 'Select a date'}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={form.description}
                  onChangeText={t => setForm(prev => ({...prev, description: t}))}
                  placeholder="Enter description..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Amount (PKR) *</Text>
                <TextInput
                  style={styles.formInput}
                  keyboardType="numeric"
                  value={form.amount}
                  onChangeText={t => {
                    if (t === '' || /^\d*\.?\d*$/.test(t)) {
                      setForm(prev => ({...prev, amount: t}));
                    }
                  }}
                  placeholder="Enter amount"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Transaction Type</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() => {
                    setPickerQuery('');
                    setPickerTarget('txnType');
                  }}>
                  <Coins size={16} color="#7C3AED" />
                  <Text
                    style={[
                      styles.formSelectText,
                      !form.txnTypeId && styles.formSelectPlaceholder,
                    ]}
                    numberOfLines={1}>
                    {form.txnTypeId
                      ? form.txnTypeName || form.txnTypeId
                      : 'Select a type'}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
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
                    <Text style={styles.saveBtnText}>Update</Text>
                  )}
                </GradientButton>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Form date picker */}
      <DatePickerSheet
        visible={datePickerTarget === 'form'}
        value={form.date || toDateStr(new Date())}
        onSelect={dateStr => {
          setForm(prev => ({...prev, date: dateStr}));
          setDatePickerTarget(null);
        }}
        onClose={() => setDatePickerTarget(null)}
      />
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
  statInfo: {flex: 1},
  statLabel: {fontSize: 11, color: '#6B7280', fontWeight: '500'},
  statValue: {fontSize: 17, fontWeight: '700', color: '#111827'},
  statValueSmall: {fontSize: 13},
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
    borderColor: '#DDD6FE',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 5,
    maxWidth: 140,
    flexShrink: 0,
  },
  filterBtnText: {fontSize: 12, color: '#374151', fontWeight: '600', flexShrink: 1},
  showRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  showBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexShrink: 0,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  showBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginLeft: 6},
  hideBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  hideBtnText: {fontSize: 13, color: '#374151', fontWeight: '600'},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 4},
  rowIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1},
  cardDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    marginBottom: 2,
  },
  cardHead: {fontSize: 15, fontWeight: '600', color: '#111827'},
  cardActions: {flexDirection: 'row', gap: 8},
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5F3FF',
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
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 125},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
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
  footerHint: {fontSize: 11, color: '#9CA3AF'},
  totalValue: {fontSize: 16, fontWeight: '700', color: '#7C3AED'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280', textAlign: 'center'},
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: ACCENT,
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
  filterSheet: {maxHeight: '90%'},
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
  sheetOptionTextActive: {color: '#7C3AED', fontWeight: '600'},
  filterBody: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20},
  filterRow: {marginBottom: 14},
  filterLabel: {fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6},
  filterSelect: {
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
  filterSelectText: {flex: 1, fontSize: 15, color: '#111827'},
  filterActions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8},
  resetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  resetBtnText: {fontSize: 14, color: '#374151', fontWeight: '600'},
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 6,
  },
  applyBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
  dateNav: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 16},
  dateNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNavLabel: {fontSize: 15, fontWeight: '600', color: '#111827'},
  dayRow: {flexDirection: 'row', paddingHorizontal: 20, marginTop: 16},
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  dayGrid: {flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginTop: 4},
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {fontSize: 14, color: '#111827'},
  dayTextSelected: {color: '#FFFFFF', fontWeight: '700'},
  dayCellSelected: {
    backgroundColor: ACCENT,
    borderRadius: 8,
  },
  dayTextToday: {color: ACCENT, fontWeight: '700'},
  dateTodayBtn: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: ACCENT_LIGHT,
    alignItems: 'center',
  },
  dateTodayBtnText: {color: '#7C3AED', fontSize: 14, fontWeight: '700'},
});
