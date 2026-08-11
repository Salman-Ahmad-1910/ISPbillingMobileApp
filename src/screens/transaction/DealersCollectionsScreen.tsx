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
  Handshake,
  Wallet,
  DollarSign,
  UserCheck,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Printer,
  Landmark,
  Smartphone,
  CreditCard,
  CalendarDays,
  Receipt,
} from 'lucide-react-native';
import {useAuth} from '../../context/AuthContext';
import {getDealers} from '../../api/dealers';
import {getDealerCollections, createDealerCollection, updateDealerCollection, deleteDealerCollection} from '../../api/collections';
import {getRecoveryOfficers} from '../../api/messages';
import {areasApi} from '../../api/network';
import {Dealer, DealerCollection, Area, RecoveryOfficer} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';
import {PrintReceiptDialog} from '../../components/PrintReceiptDialog';

const PAGE_SIZES = [5, 10, 25, 50, 100];

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PAYMENT_TYPE_OPTIONS = [
  {id: 'cash', name: 'Cash'},
  {id: 'bank', name: 'Bank'},
  {id: 'easypaisa', name: 'Easypaisa'},
  {id: 'jazzcash', name: 'JazzCash'},
];

const STATUS_OPTIONS = [
  {id: 'pending', name: 'Unpaid'},
  {id: 'settled', name: 'Paid'},
];

function formatMoney(n: number): string {
  return `PKR ${(Number.isFinite(n) ? n : 0).toLocaleString()}`;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function parseDateStr(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDate(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatMonthYear(iso?: string): string {
  if (!iso) return '---';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '---';
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function capitalize(value?: string): string {
  if (!value) return '---';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

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

function DealersCollectionsDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="dealersCollectionsGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#F59E0B" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#EA580C" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#EA580C" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#dealersCollectionsGrad)" />
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

  const selectedDay = value ? parseDateStr(value).getDate() : 0;
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
                day === selectedDay &&
                viewMonth === parseDateStr(value).getMonth() &&
                viewYear === parseDateStr(value).getFullYear();
              const isToday = toDateStr(new Date(viewYear, viewMonth, day)) === todayStr;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                  onPress={() =>
                    onSelect(
                      `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                    )
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

          <TouchableOpacity style={styles.dateTodayBtn} onPress={() => onSelect(toDateStr(new Date()))}>
            <Text style={styles.dateTodayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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

export default function DealersCollectionsScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const {user, companies, companyId} = useAuth();

  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [collections, setCollections] = useState<DealerCollection[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [recoveryOfficers, setRecoveryOfficers] = useState<RecoveryOfficer[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [dealerSearch, setDealerSearch] = useState('');
  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);

  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [receiveAmount, setReceiveAmount] = useState(0);
  const [receiveDate, setReceiveDate] = useState(toDateStr(new Date()));
  const [receiveTxType, setReceiveTxType] = useState('cash');
  const [receiveStatus, setReceiveStatus] = useState<'pending' | 'settled'>('pending');
  const [receiveComment, setReceiveComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [receiveDateOpen, setReceiveDateOpen] = useState(false);
  const [txTypeSheet, setTxTypeSheet] = useState<SelectSheetState>(null);
  const [statusSheet, setStatusSheet] = useState<SelectSheetState>(null);

  const [editCollection, setEditCollection] = useState<DealerCollection | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editAmount, setEditAmount] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [editStatus, setEditStatus] = useState<'pending' | 'settled'>('pending');

  const [printCollection, setPrintCollection] = useState<DealerCollection | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
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
      const [dealerData, areaData, officerData] = await Promise.all([
        getDealers().catch(() => []),
        areasApi.list().catch(() => []),
        getRecoveryOfficers().catch(() => []),
      ]);
      setDealers(dealerData);
      setAreas(areaData);
      setRecoveryOfficers(officerData);
    } catch {
      Alert.alert('Error', 'Failed to load dealer collections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!selectedDealerId) return;
    setLoadingHistory(true);
    try {
      const data = await getDealerCollections().catch(() => []);
      setCollections(data);
    } catch {
      Alert.alert('Error', 'Failed to load payment history');
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedDealerId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  useEffect(() => {
    if (selectedDealerId) {
      setCurrentPage(1);
      fetchHistory();
    } else {
      setCollections([]);
    }
  }, [selectedDealerId, fetchHistory]);

  const filteredDealers = useMemo(() => {
    const q = dealerSearch.trim().toLowerCase();
    if (!q) return [];
    return dealers
      .filter(d => {
        const id = (d.id || '').toLowerCase();
        const name = (d.name || '').toLowerCase();
        const phone = (d.phone || '').toLowerCase();
        const cnic = (d.cnic || '').toLowerCase();
        return id.includes(q) || name.includes(q) || phone.includes(q) || cnic.includes(q);
      })
      .slice(0, 20);
  }, [dealers, dealerSearch]);

  const selectedDealer = useMemo(() => {
    if (!selectedDealerId) return null;
    return dealers.find(d => d.id === selectedDealerId) || null;
  }, [dealers, selectedDealerId]);

  const dealerCollections = useMemo(() => {
    if (!selectedDealerId) return [];
    return collections.filter(c => c.dealerId === selectedDealerId);
  }, [collections, selectedDealerId]);

  const totalDealers = dealers.length;
  const totalCollections = collections.length;
  const totalAmount = useMemo(
    () => collections.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
    [collections],
  );
  const totalWalletBalance = useMemo(
    () => dealers.reduce((sum, d) => sum + (Number(d.walletBalance) || 0), 0),
    [dealers],
  );

  const recoveryOfficerName = useMemo(() => {
    if (!selectedDealer) return user?.name || '---';
    if (selectedDealer.areaId) {
      const area = areas.find(a => a.id === selectedDealer.areaId);
      if (area && area.recoveryOfficerId) {
        const officer = recoveryOfficers.find(o => o.id === area.recoveryOfficerId);
        if (officer) return officer.name;
      }
    }
    const officer = recoveryOfficers.find(o => o.id === user?.id);
    return officer?.name || user?.name || '---';
  }, [selectedDealer, areas, recoveryOfficers, user]);

  const activeCompany = useMemo(() => {
    return companies.find(c => c.id === companyId) || null;
  }, [companies, companyId]);

  const resetReceiveFields = () => {
    setReceiveAmount(0);
    setReceiveDate(toDateStr(new Date()));
    setReceiveTxType('cash');
    setReceiveStatus('pending');
    setReceiveComment('');
  };

  const handleReceive = async () => {
    if (!selectedDealer || !user) return;
    if (!receiveAmount || receiveAmount <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    setIsSaving(true);
    try {
      await createDealerCollection({
        dealerId: selectedDealer.id,
        dealerName: selectedDealer.name,
        dealerAddress: selectedDealer.address || '',
        amount: receiveAmount,
        collectionDate: receiveDate,
        settlementStatus: receiveStatus,
        transactionType: receiveTxType as 'cash' | 'bank' | 'easypaisa' | 'jazzcash',
        comment: receiveComment,
        receivedById: user.id,
        receivedByName: user.name || recoveryOfficerName,
      });
      Alert.alert('Success', 'Payment received and recorded.');
      setShowReceiveDialog(false);
      resetReceiveFields();
      fetchHistory();
      fetchData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.response?.data?.error || 'Failed to record payment';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditOpen = (col: DealerCollection) => {
    setEditCollection(col);
    setEditAmount(Number(col.amount) || 0);
    setEditComment(col.comment || '');
    setEditStatus(col.settlementStatus as 'pending' | 'settled');
    setShowEditDialog(true);
  };

  const handleEditSave = async () => {
    if (!editCollection) return;
    if (!editAmount || editAmount <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    setIsSaving(true);
    try {
      await updateDealerCollection(editCollection.id, {
        ...editCollection,
        amount: editAmount,
        comment: editComment,
        settlementStatus: editStatus,
      });
      Alert.alert('Success', 'Collection entry updated.');
      setShowEditDialog(false);
      setEditCollection(null);
      fetchHistory();
      fetchData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.response?.data?.error || 'Failed to update entry';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = (col: DealerCollection) => {
    const newStatus = col.settlementStatus === 'settled' ? 'pending' : 'settled';
    Alert.alert(
      'Update Status',
      `Change status to ${newStatus === 'settled' ? 'Paid' : 'Unpaid'}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await updateDealerCollection(col.id, {...col, settlementStatus: newStatus});
              Alert.alert('Success', `Status changed to ${newStatus}.`);
              fetchHistory();
            } catch {
              Alert.alert('Error', 'Failed to update status.');
            }
          },
        },
      ],
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this collection entry?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDealerCollection(id);
            Alert.alert('Success', 'Collection entry deleted.');
            fetchHistory();
            fetchData();
          } catch {
            Alert.alert('Error', 'Failed to delete entry.');
          }
        },
      },
    ]);
  };

  const totalPages = Math.max(1, Math.ceil(dealerCollections.length / pageSize));
  const paginatedData = dealerCollections.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getVisiblePages = () => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, currentPage + 1);
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  };

  const handlePageSubmit = () => {
    const n = parseInt(pageInput, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= totalPages) {
      setCurrentPage(n);
    }
    setPageInput('');
  };

  const renderHistoryItem = ({item, index}: {item: DealerCollection; index: number}) => {
    const col = item;
    const isPaid = col.settlementStatus === 'settled';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.billTagBox, isPaid ? styles.paidTagBox : styles.pendingTagBox]}>
            <Text style={[styles.billTagText, isPaid ? styles.paidTagText : styles.pendingTagText]}>
              Bill #{index + 1}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {col.dealerName || '---'}
            </Text>
            <Text style={styles.cardSub}>
              {col.dealerId?.slice(0, 8) || '---'} • {formatMonthYear(col.collectionDate)} •{' '}
              {capitalize(col.transactionType)}
            </Text>
          </View>
          <View style={isPaid ? styles.badgePaid : styles.badgePending}>
            <Text style={isPaid ? styles.badgePaidText : styles.badgePendingText}>
              {isPaid ? 'Paid' : 'Unpaid'}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {col.dealerAddress || '---'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Received</Text>
          <Text style={styles.infoValue}>{formatMoney(Number(col.amount) || 0)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Pay Date</Text>
          <Text style={styles.infoValue}>{formatDate(col.collectionDate)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Comment</Text>
          <Text style={styles.infoValue} numberOfLines={2}>
            {col.comment || '---'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Received By</Text>
          <Text style={styles.infoValue}>{col.receivedByName || '---'}</Text>
        </View>

        <View style={styles.cardActionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrint]}
            onPress={() => {
              setPrintCollection(col);
              setShowPrintDialog(true);
            }}>
            <Printer size={16} color="#D97706" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnToggle]}
            onPress={() => handleToggleStatus(col)}>
            <Receipt size={16} color="#0D9488" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditOpen(col)}>
            <Pencil size={16} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnDanger} onPress={() => handleDelete(col.id)}>
            <Trash2 size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDealerInfo = () => {
    if (!selectedDealer) return null;
    const remaining = Number(selectedDealer.remainingAmount) || 0;
    return (
      <View style={styles.subscriberCard}>
        <View style={styles.subscriberGrid}>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Dealer ID</Text>
            <Text style={styles.subscriberValueMono}>
              {selectedDealer.id?.slice(0, 8) || '---'}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Name</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {selectedDealer.name}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Phone</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {selectedDealer.phone || '---'}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>CNIC</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {selectedDealer.cnic || '---'}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Balance</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {formatMoney(Number(selectedDealer.walletBalance) || 0)}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Remaining</Text>
            <Text
              style={[styles.subscriberValue, remaining > 0 ? styles.remainingDue : styles.remainingPaid]}
              numberOfLines={1}>
              {formatMoney(remaining)}
            </Text>
          </View>
          <View style={styles.subscriberCellWide}>
            <Text style={styles.subscriberLabel}>Address</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {selectedDealer.address || '---'}
            </Text>
          </View>
        </View>

        <View style={styles.actionBar}>
          <View style={styles.receivingRow}>
            <UserCheck size={16} color="#6B7280" />
            <Text style={styles.receivingText} numberOfLines={1}>
              Receiving as: <Text style={styles.receivingName}>{recoveryOfficerName}</Text>
            </Text>
          </View>
          <View style={styles.actionButtons}>
            <GradientButton
              colors={['#10B981', '#059669']}
              style={styles.receiveBtn}
              onPress={() => setShowReceiveDialog(true)}>
              <DollarSign size={16} color="#FFFFFF" />
              <Text style={styles.receiveBtnText}>Receive Payment</Text>
            </GradientButton>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading dealer collections...</Text>
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
          <Text style={styles.headerTitle}>Dealer Collections</Text>
          <Text style={styles.headerCount}>{totalDealers} dealer(s)</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginatedData}
        keyExtractor={item => item.id}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#059669']} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.heroHeader}>
              <GradientView colors={['#F59E0B', '#EA580C']} style={styles.heroIconBox}>
                <Handshake size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Dealer Collections</Text>
                <Text style={styles.heroSubtitle}>
                  Receive payments from dealers. Recovery Officer:{' '}
                  <Text style={styles.heroSubtitleStrong}>{recoveryOfficerName}</Text>
                </Text>
              </View>
            </View>

            <DealersCollectionsDivider />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsScroll}>
              <StatCard
                label="Total Dealers"
                value={String(totalDealers)}
                colors={['#F59E0B', '#EA580C']}
                icon={<Handshake size={16} color="#FFFFFF" />}
              />
              <StatCard
                label="Collections"
                value={String(totalCollections)}
                colors={['#3B82F6', '#06B6D4']}
                icon={<Wallet size={16} color="#FFFFFF" />}
              />
              <StatCard
                label="Total Collected"
                value={formatMoney(totalAmount)}
                colors={['#10B981', '#059669']}
                icon={<DollarSign size={16} color="#FFFFFF" />}
              />
              <StatCard
                label="Remaining Amount"
                value={formatMoney(totalWalletBalance)}
                colors={['#8B5CF6', '#7C3AED']}
                icon={<UserCheck size={16} color="#FFFFFF" />}
              />
            </ScrollView>

            <View style={styles.searchCard}>
              <Text style={styles.searchLabel}>Search Dealer</Text>
              <View style={styles.searchInputWrap}>
                <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Type dealer ID, name, phone, or CNIC..."
                  placeholderTextColor="#9CA3AF"
                  value={dealerSearch}
                  onChangeText={text => {
                    setDealerSearch(text);
                    if (selectedDealerId) setSelectedDealerId(null);
                  }}
                />
                {dealerSearch.length > 0 ? (
                  <TouchableOpacity onPress={() => setDealerSearch('')}>
                    <X size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {filteredDealers.length > 0 ? (
                <View style={styles.suggestions}>
                  {filteredDealers.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      style={styles.suggestionRow}
                      onPress={() => {
                        setSelectedDealerId(d.id);
                        setDealerSearch('');
                      }}>
                      <Text style={styles.suggestionId}>{d.id.slice(0, 8)}</Text>
                      <Text style={styles.suggestionName} numberOfLines={1}>
                        {d.name}
                      </Text>
                      {d.phone ? <Text style={styles.suggestionPhone}>• {d.phone}</Text> : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {selectedDealer ? (
                <View style={styles.selectedChip}>
                  <Text style={styles.selectedChipId}>{selectedDealer.id.slice(0, 8)}</Text>
                  <Text style={styles.selectedChipDot}>•</Text>
                  <Text style={styles.selectedChipName} numberOfLines={1}>
                    {selectedDealer.name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedDealerId(null)}>
                    <X size={14} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {renderDealerInfo()}

            {selectedDealer ? (
              <View style={styles.listTitleRow}>
                <Text style={styles.listTitle}>{selectedDealer.name}&apos;s Payment History</Text>
                <Text style={styles.listCount}>{dealerCollections.length} entry(ies)</Text>
              </View>
            ) : null}

            {selectedDealer && loadingHistory ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator size="small" color="#059669" />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          selectedDealer ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyTitle}>No payment history found</Text>
              <Text style={styles.emptyText}>Receive a payment to see it here.</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No Dealer Selected</Text>
              <Text style={styles.emptyText}>
                Search and select a dealer to receive payments and view history.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          dealerCollections.length > 0 ? (
            <View style={styles.pagination}>
              <Text style={styles.paginationInfo}>
                Showing {dealerCollections.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, dealerCollections.length)} of{' '}
                {dealerCollections.length} entries
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
                    style={[styles.pageNum, currentPage === page && styles.pageNumActive]}
                    onPress={() => setCurrentPage(page)}>
                    <Text style={[styles.pageNumText, currentPage === page && styles.pageNumTextActive]}>
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
                    placeholder="Go"
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
                      (!pageInput || parseInt(pageInput, 10) < 1 || parseInt(pageInput, 10) > totalPages) &&
                        styles.pageBtnDisabled,
                    ]}
                    disabled={
                      !pageInput || parseInt(pageInput, 10) < 1 || parseInt(pageInput, 10) > totalPages
                    }
                    onPress={handlePageSubmit}>
                    <Text style={styles.goToBtnText}>Go</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  disabled={currentPage === totalPages}
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>
                  <Text style={[styles.pageBtnText, currentPage === totalPages && styles.pageBtnTextDisabled]}>
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
          ) : null
        }
      />

      {/* Receive Payment Dialog */}
      <Modal
        visible={showReceiveDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReceiveDialog(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Receive Payment</Text>
              <TouchableOpacity onPress={() => setShowReceiveDialog(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.fieldGrid2}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Dealer ID</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedDealer?.id?.slice(0, 8) || ''}
                    editable={false}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Dealer Name</Text>
                  <TextInput style={styles.fieldInput} value={selectedDealer?.name || ''} editable={false} />
                </View>
              </View>

              <View style={styles.fieldGrid2}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Address</Text>
                  <TextInput style={styles.fieldInput} value={selectedDealer?.address || '---'} editable={false} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Wallet Balance</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={formatMoney(Number(selectedDealer?.walletBalance) || 0)}
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Received By</Text>
                <TextInput style={styles.fieldInput} value={recoveryOfficerName} editable={false} />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Amount (PKR)</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  placeholder="Enter amount"
                  placeholderTextColor="#9CA3AF"
                  value={receiveAmount ? String(receiveAmount) : ''}
                  onChangeText={text => setReceiveAmount(parseFloat(text) || 0)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Pay Date</Text>
                <TouchableOpacity style={styles.dateField} onPress={() => setReceiveDateOpen(true)}>
                  <CalendarDays size={16} color="#6B7280" />
                  <Text style={styles.dateFieldText}>{formatDate(receiveDate)}</Text>
                  <ChevronDown size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Payment Type</Text>
                <TouchableOpacity
                  style={styles.selectField}
                  onPress={() =>
                    setTxTypeSheet({
                      title: 'Select payment type',
                      options: PAYMENT_TYPE_OPTIONS,
                      selected: receiveTxType,
                      onSelect: v => setReceiveTxType(v),
                    })
                  }>
                  <Text style={styles.selectFieldText}>
                    {PAYMENT_TYPE_OPTIONS.find(o => o.id === receiveTxType)?.name || 'Select'}
                  </Text>
                  <ChevronDown size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Status</Text>
                <TouchableOpacity
                  style={styles.selectField}
                  onPress={() =>
                    setStatusSheet({
                      title: 'Select status',
                      options: STATUS_OPTIONS,
                      selected: receiveStatus,
                      onSelect: v => setReceiveStatus(v as 'pending' | 'settled'),
                    })
                  }>
                  <Text style={styles.selectFieldText}>
                    {STATUS_OPTIONS.find(o => o.id === receiveStatus)?.name || 'Select'}
                  </Text>
                  <ChevronDown size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Comment</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldTextarea]}
                  placeholder="Add a comment..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={receiveComment}
                  onChangeText={setReceiveComment}
                />
              </View>

              <GradientButton
                colors={['#10B981', '#059669']}
                style={styles.submitBtn}
                onPress={handleReceive}
                disabled={isSaving || !receiveAmount}>
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Receive</Text>
                )}
              </GradientButton>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Collection Entry Dialog */}
      <Modal
        visible={showEditDialog}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowEditDialog(false);
          setEditCollection(null);
        }}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Collection Entry</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditDialog(false);
                  setEditCollection(null);
                }}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.fieldGrid2}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Bill #</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={editCollection?.id?.slice(0, 8).toUpperCase() || ''}
                    editable={false}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Dealer</Text>
                  <TextInput style={styles.fieldInput} value={editCollection?.dealerName || ''} editable={false} />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Amount (PKR)</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  value={editAmount ? String(editAmount) : ''}
                  onChangeText={text => setEditAmount(parseFloat(text) || 0)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Status</Text>
                <TouchableOpacity
                  style={styles.selectField}
                  onPress={() =>
                    setStatusSheet({
                      title: 'Select status',
                      options: STATUS_OPTIONS,
                      selected: editStatus,
                      onSelect: v => setEditStatus(v as 'pending' | 'settled'),
                    })
                  }>
                  <Text style={styles.selectFieldText}>
                    {STATUS_OPTIONS.find(o => o.id === editStatus)?.name || 'Select'}
                  </Text>
                  <ChevronDown size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Comment</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldTextarea]}
                  placeholder="Add a comment..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={editComment}
                  onChangeText={setEditComment}
                />
              </View>

              <GradientButton
                colors={['#10B981', '#059669']}
                style={styles.submitBtn}
                onPress={handleEditSave}
                disabled={isSaving || !editAmount}>
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Changes</Text>
                )}
              </GradientButton>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment type sheet */}
      <Modal
        visible={!!txTypeSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setTxTypeSheet(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{txTypeSheet?.title}</Text>
              <TouchableOpacity onPress={() => setTxTypeSheet(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll}>
              {txTypeSheet?.options.map(option => {
                const active = option.id === txTypeSheet!.selected;
                const Icon =
                  option.id === 'bank'
                    ? Landmark
                    : option.id === 'easypaisa' || option.id === 'jazzcash'
                    ? Smartphone
                    : CreditCard;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.sheetOption}
                    onPress={() => {
                      txTypeSheet!.onSelect(option.id);
                      setTxTypeSheet(null);
                    }}>
                    <View style={styles.sheetOptionIcon}>
                      <Icon size={16} color={active ? '#059669' : '#6B7280'} />
                    </View>
                    <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}>
                      {option.name}
                    </Text>
                    {active ? <Check size={16} color="#059669" /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status sheet */}
      <Modal
        visible={!!statusSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusSheet(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{statusSheet?.title}</Text>
              <TouchableOpacity onPress={() => setStatusSheet(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll}>
              {statusSheet?.options.map(option => {
                const active = option.id === statusSheet!.selected;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.sheetOption}
                    onPress={() => {
                      statusSheet!.onSelect(option.id);
                      setStatusSheet(null);
                    }}>
                    <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}>
                      {option.name}
                    </Text>
                    {active ? <Check size={16} color="#059669" /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Receive date picker */}
      <DatePickerSheet
        visible={receiveDateOpen}
        value={receiveDate}
        onSelect={dateStr => {
          setReceiveDate(dateStr);
          setReceiveDateOpen(false);
        }}
        onClose={() => setReceiveDateOpen(false)}
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
                  {active ? <Check size={16} color="#059669" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Print collection receipt dialog */}
      <PrintReceiptDialog
        visible={showPrintDialog}
        onClose={() => {
          setShowPrintDialog(false);
          setPrintCollection(null);
        }}
        collection={printCollection}
        company={activeCompany}
        dealerName={selectedDealer?.name}
        collectorName={recoveryOfficerName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6'},
  loadingText: {marginTop: 12, fontSize: 14, color: '#6B7280'},
  header: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 50,
    marginLeft: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#166534',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
  heroSubtitleStrong: {fontWeight: '600', color: '#374151'},
  heroDivider: {marginHorizontal: 20, marginBottom: 4},
  statsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  statCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
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
  statLabel: {fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.3},
  statValue: {fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2},
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
  },
  searchLabel: {fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8},
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
  searchInput: {flex: 1, fontSize: 14, color: '#111827', paddingVertical: 10},
  suggestions: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    maxHeight: 220,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  suggestionName: {flex: 1, fontSize: 13, color: '#374151', marginLeft: 8},
  suggestionPhone: {fontSize: 12, color: '#9CA3AF', marginLeft: 8},
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  selectedChipId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  selectedChipDot: {fontSize: 12, color: '#9CA3AF'},
  selectedChipName: {flexShrink: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  subscriberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  subscriberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  subscriberCell: {width: '33.33%', paddingRight: 8, marginBottom: 12},
  subscriberCellWide: {width: '100%', paddingRight: 8, marginBottom: 12},
  subscriberLabel: {fontSize: 11, color: '#9CA3AF', marginBottom: 2},
  subscriberValue: {fontSize: 13, color: '#374151', fontWeight: '600'},
  subscriberValueMono: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  remainingDue: {color: '#DC2626'},
  remainingPaid: {color: '#16A34A'},
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  receivingRow: {flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 160},
  receivingText: {fontSize: 12, color: '#6B7280'},
  receivingName: {fontWeight: '600', color: '#374151'},
  actionButtons: {flexDirection: 'row', alignItems: 'center', gap: 8},
  receiveBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  receiveBtnText: {color: '#FFFFFF', fontSize: 12, fontWeight: '600'},
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listTitle: {fontSize: 16, fontWeight: '600', color: '#111827', flexShrink: 1},
  listCount: {fontSize: 12, color: '#6B7280', marginLeft: 8},
  historyLoading: {alignItems: 'center', paddingVertical: 20},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  billTagBox: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
  },
  pendingTagBox: {backgroundColor: '#FEF3C7'},
  paidTagBox: {backgroundColor: '#D1FAE5'},
  billTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  pendingTagText: {color: '#B45309'},
  paidTagText: {color: '#047857'},
  cardInfo: {flex: 1},
  cardName: {fontSize: 14, fontWeight: '600', color: '#111827'},
  cardSub: {fontSize: 12, color: '#9CA3AF', marginTop: 1},
  badgePending: {
    borderRadius: 999,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePendingText: {fontSize: 10, color: '#FFFFFF', fontWeight: '700'},
  badgePaid: {
    borderRadius: 999,
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePaidText: {fontSize: 10, color: '#FFFFFF', fontWeight: '700'},
  infoRow: {flexDirection: 'row', paddingVertical: 3},
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 100},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnPrint: {backgroundColor: '#FEFCE8'},
  actionBtnToggle: {backgroundColor: '#F0FDFA'},
  actionBtnDanger: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280', textAlign: 'center'},
  pagination: {paddingTop: 16},
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
  pageNumActive: {backgroundColor: '#059669', borderColor: '#059669'},
  pageNumText: {fontSize: 12, color: '#374151'},
  pageNumTextActive: {color: '#FFFFFF', fontWeight: '600'},
  ellipsis: {paddingHorizontal: 4, color: '#6B7280'},
  goTo: {flexDirection: 'row', alignItems: 'center', gap: 4},
  goToInput: {
    width: 44,
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
  goToBtnText: {fontSize: 12, color: '#374151', fontWeight: '600'},
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
    minWidth: 68,
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
  sheetOptionIcon: {width: 28},
  sheetOptionText: {fontSize: 15, color: '#374151', fontWeight: '500', flex: 1, marginRight: 8},
  sheetOptionTextActive: {color: '#059669', fontWeight: '600'},
  fieldGrid2: {flexDirection: 'row', gap: 10, marginTop: 12},
  field: {flex: 1, marginTop: 12},
  fieldLabel: {fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6},
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
  fieldTextarea: {minHeight: 70, textAlignVertical: 'top'},
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  dateFieldText: {flex: 1, fontSize: 14, color: '#111827'},
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
  selectFieldText: {flex: 1, fontSize: 14, color: '#111827'},
  submitBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
  },
  submitBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700'},
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  dateNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNavLabel: {fontSize: 15, fontWeight: '600', color: '#111827'},
  dayRow: {flexDirection: 'row', paddingHorizontal: 16, marginTop: 12},
  dayName: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  dayGrid: {flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 4},
  dayCell: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellSelected: {
    backgroundColor: '#059669',
    borderRadius: 10,
  },
  dayText: {fontSize: 14, color: '#374151'},
  dayTextSelected: {color: '#FFFFFF', fontWeight: '700'},
  dayTextToday: {color: '#059669', fontWeight: '700'},
  dateTodayBtn: {
    alignSelf: 'center',
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  dateTodayBtnText: {fontSize: 13, color: '#059669', fontWeight: '600'},
});
