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
  Users,
  Wallet,
  DollarSign,
  UserCheck,
  CalendarClock,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  HandCoins,
  CalendarDays,
  CreditCard,
  Landmark,
  Smartphone,
  Printer,
} from 'lucide-react-native';
import {useAuth} from '../../context/AuthContext';
import {getConnections} from '../../api/connections';
import {getRecoveryOfficers} from '../../api/messages';
import {areasApi} from '../../api/network';
import {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
  getPromises,
  createPromise,
  updatePromise,
  deletePromise,
  getTransactionTypes,
} from '../../api/billing';
import {
  Connection,
  Payment,
  PromiseEntry,
  Area,
  RecoveryOfficer,
  TransactionType,
} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';
import {PrintReceiptDialog} from '../../components/PrintReceiptDialog';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

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

const PAYMENT_METHODS = [
  {id: 'cash', name: 'Cash'},
  {id: 'bank', name: 'Bank'},
  {id: 'online', name: 'Online'},
];

type HistoryItem =
  | {kind: 'promise'; promise: PromiseEntry}
  | {kind: 'payment'; payment: Payment};

function getMonthsSince(dateStr?: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  if (Number.isNaN(d.getTime())) return 0;
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

function getPackagePrice(c: Connection): number {
  const cable = Number(c.amount) || 0;
  const internet = Number(c.sameAmount) || 0;
  if (c.connectionType === 'tv_cable') return cable;
  if (c.connectionType === 'internet') return internet;
  return cable + internet;
}

function getTotalOwed(c: Connection): number {
  const remaining = Number(c.remainingAmount) || 0;
  const activeDate = c.lastPaymentDate || c.rechargeDate || c.createdAt;
  const months = getMonthsSince(activeDate);
  return remaining + getPackagePrice(c) * Math.max(0, months);
}

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

function SubscriberCollectionsDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="subscriberCollectionsGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#3B82F6" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#06B6D4" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#06B6D4" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#subscriberCollectionsGrad)" />
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
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function SubscriberCollectionsScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const {user, companies, companyId} = useAuth();
  const insets = useSafeAreaInsets();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [recoveryOfficers, setRecoveryOfficers] = useState<RecoveryOfficer[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [promises, setPromises] = useState<PromiseEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [selectedSubscriberId, setSelectedSubscriberId] = useState<string | null>(null);

  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [receiveAmount, setReceiveAmount] = useState(0);
  const [receiveDate, setReceiveDate] = useState(toDateStr(new Date()));
  const [receiveMethod, setReceiveMethod] = useState('cash');
  const [receiveComment, setReceiveComment] = useState('');
  const [selectedTransactionTypeId, setSelectedTransactionTypeId] = useState('');
  const [selectedPromiseId, setSelectedPromiseId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [receiveDateOpen, setReceiveDateOpen] = useState(false);
  const [methodSheet, setMethodSheet] = useState<SelectSheetState>(null);
  const [txnTypeSheet, setTxnTypeSheet] = useState<SelectSheetState>(null);

  const [showPromiseDialog, setShowPromiseDialog] = useState(false);
  const [promiseDate, setPromiseDate] = useState(toDateStr(new Date()));
  const [promiseDescription, setPromiseDescription] = useState('');
  const [isSavingPromise, setIsSavingPromise] = useState(false);
  const [promiseDateOpen, setPromiseDateOpen] = useState(false);

  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState(0);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [printPayment, setPrintPayment] = useState<Payment | null>(null);
  const [printPromise, setPrintPromise] = useState<PromiseEntry | null>(null);
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
      const [connectionData, areaData, officerData, txnTypeData] = await Promise.all([
        getConnections().catch(() => []),
        areasApi.list().catch(() => []),
        getRecoveryOfficers().catch(() => []),
        getTransactionTypes().catch(() => []),
      ]);
      setConnections(connectionData);
      setAreas(areaData);
      setRecoveryOfficers(officerData);
      setTransactionTypes(txnTypeData);
    } catch {
      Alert.alert('Error', 'Failed to load subscriber collections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!selectedSubscriberId) return;
    setLoadingHistory(true);
    try {
      const [paymentData, promiseData] = await Promise.all([
        getPayments().catch(() => []),
        getPromises().catch(() => []),
      ]);
      setPayments(paymentData);
      setPromises(promiseData);
    } catch {
      Alert.alert('Error', 'Failed to load payment history');
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedSubscriberId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  useEffect(() => {
    if (selectedSubscriberId) {
      setCurrentPage(1);
      fetchHistory();
    } else {
      setPayments([]);
      setPromises([]);
    }
  }, [selectedSubscriberId, fetchHistory]);

  const filteredSubscribers = useMemo(() => {
    const q = subscriberSearch.trim().toLowerCase();
    if (!q) return [];
    return connections
      .filter(c => {
        const id = (c.id || '').toLowerCase();
        const name = (c.name || '').toLowerCase();
        return id.includes(q) || name.includes(q) || (c.internetId || '').toLowerCase().includes(q);
      })
      .slice(0, 20);
  }, [connections, subscriberSearch]);

  const selectedSubscriber = useMemo(() => {
    if (!selectedSubscriberId) return null;
    return connections.find(c => c.id === selectedSubscriberId) || null;
  }, [connections, selectedSubscriberId]);

  const subscriberPayments = useMemo(() => {
    if (!selectedSubscriberId) return [];
    return payments.filter(p => p.subscriberId === selectedSubscriberId);
  }, [payments, selectedSubscriberId]);

  const subscriberPromises = useMemo(() => {
    if (!selectedSubscriberId) return [];
    return promises.filter(p => p.subscriberId === selectedSubscriberId && p.status !== 'completed');
  }, [promises, selectedSubscriberId]);

  const historyItems = useMemo(() => {
    const items: HistoryItem[] = [
      ...subscriberPromises.map(p => ({kind: 'promise' as const, promise: p})),
      ...subscriberPayments.map(p => ({kind: 'payment' as const, payment: p})),
    ];
    return items.sort((a, b) => {
      const dateA = a.kind === 'promise' ? a.promise.promiseDate : a.payment.paymentDate;
      const dateB = b.kind === 'promise' ? b.promise.promiseDate : b.payment.paymentDate;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [subscriberPayments, subscriberPromises]);

  const totalSubscribers = connections.length;

  const totalCollections = useMemo(
    () => payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payments],
  );
  const totalAmount = totalCollections;

  const recoveryOfficerName = useMemo(() => {
    if (!selectedSubscriber) return user?.name || '---';
    let officer: RecoveryOfficer | undefined;
    if (selectedSubscriber.sublocalityId) {
      const area = areas.find(a => a.id === selectedSubscriber.sublocalityId);
      if (area) {
        if (area.recoveryOfficerId) {
          officer = recoveryOfficers.find(o => o.id === area.recoveryOfficerId);
        }
        if (!officer) {
          officer = recoveryOfficers.find(o => o.areaId === area.id);
        }
      }
    }
    return officer?.name || user?.name || '---';
  }, [selectedSubscriber, areas, recoveryOfficers, user]);

  const activeCompany = useMemo(() => {
    return companies.find(c => c.id === companyId) || null;
  }, [companies, companyId]);

  const sublocalityName = useMemo(() => {
    if (!selectedSubscriber?.sublocalityId) return '';
    const area = areas.find(a => a.id === selectedSubscriber.sublocalityId);
    return area?.subLocality || area?.locality || '';
  }, [selectedSubscriber, areas]);

  const subscriberRemaining = useMemo(
    () => (selectedSubscriber ? getTotalOwed(selectedSubscriber) : 0),
    [selectedSubscriber],
  );

  const remainingAfterPayment = Math.max(0, subscriberRemaining - receiveAmount);

  const filteredTransactionTypes = useMemo(() => {
    if (!receiveMethod || receiveMethod === 'cash') return [];
    return transactionTypes.filter(t => t.paymentChannel && t.paymentChannel !== 'Cash');
  }, [transactionTypes, receiveMethod]);

  const resetReceiveFields = () => {
    setReceiveAmount(0);
    setReceiveDate(toDateStr(new Date()));
    setReceiveMethod('cash');
    setReceiveComment('');
    setSelectedTransactionTypeId('');
    setSelectedPromiseId(null);
  };

  const handleReceive = async () => {
    if (!selectedSubscriber || !user) return;
    if (!receiveAmount || receiveAmount <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    if (receiveAmount > subscriberRemaining) {
      Alert.alert(
        'Error',
        `Payment amount cannot exceed the remaining amount of ${formatMoney(subscriberRemaining)}.`,
      );
      return;
    }
    setIsSaving(true);
    try {
      await createPayment({
        subscriberId: selectedSubscriber.id,
        subscriberName: selectedSubscriber.name,
        amount: receiveAmount,
        paymentDate: receiveDate,
        method: receiveMethod,
        collectorId: user.id,
      });
      if (selectedPromiseId) {
        const linked = subscriberPromises.find(p => p.id === selectedPromiseId);
        if (linked) {
          await updatePromise(linked.id, {...linked, status: 'completed'});
        }
      }
      Alert.alert('Success', 'Payment received and recorded.');
      setShowReceiveDialog(false);
      resetReceiveFields();
      fetchHistory();
      fetchData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to record payment';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromiseSave = async () => {
    if (!selectedSubscriber || !user) return;
    if (!promiseDate) {
      Alert.alert('Error', 'Please select a promise date.');
      return;
    }
    if (!promiseDescription.trim()) {
      Alert.alert('Error', 'Please enter a description for the promise.');
      return;
    }
    setIsSavingPromise(true);
    try {
      await createPromise({
        subscriberId: selectedSubscriber.id,
        subscriberName: selectedSubscriber.name,
        internetId: selectedSubscriber.internetId,
        phone: selectedSubscriber.mobile || selectedSubscriber.cell || '',
        address: selectedSubscriber.address,
        sublocality: sublocalityName,
        connectionType: selectedSubscriber.connectionType,
        amount: getTotalOwed(selectedSubscriber),
        promiseDate,
        description: promiseDescription.trim(),
        status: 'pending',
        collectorId: user.id,
        collectorName: recoveryOfficerName,
      });
      Alert.alert('Success', 'Promise recorded successfully.');
      setShowPromiseDialog(false);
      setPromiseDate(toDateStr(new Date()));
      setPromiseDescription('');
      fetchHistory();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.response?.data?.error || 'Failed to record promise';
      Alert.alert('Error', msg);
    } finally {
      setIsSavingPromise(false);
    }
  };

  const handleEditSave = async () => {
    if (!editPayment) return;
    if (!editAmount || editAmount <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    setIsSaving(true);
    try {
      await updatePayment(editPayment.id, {...editPayment, amount: editAmount});
      Alert.alert('Success', 'Payment entry updated.');
      setShowEditDialog(false);
      setEditPayment(null);
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

  const handleDelete = (id: string) => {
    Alert.alert('Delete Payment', 'Are you sure you want to delete this payment entry?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePayment(id);
            Alert.alert('Success', 'Payment entry deleted.');
            fetchHistory();
            fetchData();
          } catch {
            Alert.alert('Error', 'Failed to delete entry.');
          }
        },
      },
    ]);
  };

  const handleDeletePromise = (id: string) => {
    Alert.alert('Delete Promise', 'Are you sure you want to delete this promise entry?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePromise(id);
            Alert.alert('Success', 'Promise entry deleted.');
            fetchHistory();
          } catch {
            Alert.alert('Error', 'Failed to delete promise.');
          }
        },
      },
    ]);
  };

  const handleReceivePromise = (promise: PromiseEntry) => {
    setSelectedPromiseId(promise.id);
    setReceiveAmount(promise.amount);
    setReceiveDate(toDateStr(new Date()));
    setReceiveMethod('cash');
    setReceiveComment('');
    setSelectedTransactionTypeId('');
    setShowReceiveDialog(true);
  };

  const totalPages = Math.max(1, Math.ceil(historyItems.length / pageSize));
  const paginatedData = historyItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

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

  const renderHistoryItem = ({item}: {item: HistoryItem}) => {
    if (item.kind === 'promise') {
      const p = item.promise;
      return (
        <View style={[styles.card, styles.promiseCard]}>
          <View style={styles.cardHeader}>
            <View style={[styles.billTagBox, styles.promiseTagBox]}>
              <Text style={styles.promiseTagText}>PROMISE</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={1}>
                {p.subscriberName || selectedSubscriber?.name || '---'}
              </Text>
              <Text style={styles.cardSub}>
                {p.subscriberId?.slice(0, 8) || '---'} • {formatMonthYear(p.promiseDate)}
              </Text>
            </View>
            <View style={styles.badgePending}>
              <Text style={styles.badgePendingText}>Pending</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Amount</Text>
            <Text style={styles.infoValue}>{formatMoney(Number(p.amount) || 0)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Description</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {p.description || '---'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Collector</Text>
            <Text style={styles.infoValue}>{p.collectorName || recoveryOfficerName}</Text>
          </View>

          <View style={styles.cardActionRow}>
            <GradientButton
              colors={['#10B981', '#059669']}
              style={styles.smallBtn}
              onPress={() => handleReceivePromise(p)}>
              <DollarSign size={14} color="#FFFFFF" />
              <Text style={styles.smallBtnText}>Receive</Text>
            </GradientButton>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrint]}
              onPress={() => {
                setPrintPayment(null);
                setPrintPromise(p);
                setShowPrintDialog(true);
              }}>
              <Printer size={16} color="#D97706" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnDanger} onPress={() => handleDeletePromise(p.id)}>
              <Trash2 size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const pay = item.payment;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.billTagBox, styles.paidTagBox]}>
            <Text style={styles.paidTagText}>Bill #{pay.billNo || '---'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {pay.subscriberName || selectedSubscriber?.name || '---'}
            </Text>
            <Text style={styles.cardSub}>
              {pay.subscriberId?.slice(0, 8) || '---'} • {formatMonthYear(pay.paymentDate)} •{' '}
              {(pay.method || 'cash').toLowerCase()}
            </Text>
          </View>
          <View style={styles.badgePaid}>
            <Text style={styles.badgePaidText}>Paid</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Amount</Text>
          <Text style={styles.infoValue}>{formatMoney(Number(pay.amount) || 0)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date</Text>
          <Text style={styles.infoValue}>{formatDate(pay.paymentDate)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Received By</Text>
          <Text style={styles.infoValue}>{pay.collectedByName || recoveryOfficerName}</Text>
        </View>

        <View style={styles.cardActionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrint]}
            onPress={() => {
              setPrintPromise(null);
              setPrintPayment(pay);
              setShowPrintDialog(true);
            }}>
            <Printer size={16} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setEditPayment(pay);
              setEditAmount(Number(pay.amount) || 0);
              setShowEditDialog(true);
            }}>
            <Pencil size={16} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnDanger} onPress={() => handleDelete(pay.id)}>
            <Trash2 size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSubscriberInfo = () => {
    if (!selectedSubscriber) return null;
    return (
      <View style={styles.subscriberCard}>
        <View style={styles.subscriberGrid}>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Subscriber ID</Text>
            <Text style={styles.subscriberValueMono}>
              {selectedSubscriber.id?.slice(0, 8) || '---'}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Name</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {selectedSubscriber.name}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Internet ID</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {selectedSubscriber.internetId || '---'}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Mobile</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {selectedSubscriber.mobile || selectedSubscriber.cell || '---'}
            </Text>
          </View>
          <View style={styles.subscriberCellWide}>
            <Text style={styles.subscriberLabel}>Address</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {selectedSubscriber.address || '---'}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Remaining</Text>
            <Text
              style={[
                styles.subscriberValue,
                subscriberRemaining > 0 ? styles.remainingDue : styles.remainingPaid,
              ]}>
              {formatMoney(subscriberRemaining)}
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
            <TouchableOpacity style={styles.promiseBtn} onPress={() => setShowPromiseDialog(true)}>
              <CalendarClock size={16} color="#0D9488" />
              <Text style={styles.promiseBtnText}>Make Promise</Text>
            </TouchableOpacity>
            <GradientButton
              colors={['#10B981', '#059669']}
              style={styles.receiveBtn}
              onPress={() => {
                setSelectedPromiseId(null);
                setShowReceiveDialog(true);
              }}>
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
        <Text style={styles.loadingText}>Loading subscriber collections...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GradientView colors={['#166534', '#22c55e']} style={[styles.header, {paddingTop: insets.top + 8}]}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Subscriber Collections</Text>
          <Text style={styles.headerCount}>{totalSubscribers} subscriber(s)</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginatedData}
        keyExtractor={(item, index) =>
          item.kind === 'promise' ? `p-${item.promise.id}` : `pay-${item.payment.id}-${index}`
        }
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#059669']} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.heroHeader}>
              <GradientView colors={['#3B82F6', '#06B6D4']} style={styles.heroIconBox}>
                <HandCoins size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Subscriber Collections</Text>
                <Text style={styles.heroSubtitle}>
                  Receive payments from subscribers. Recovery Officer:{' '}
                  <Text style={styles.heroSubtitleStrong}>{recoveryOfficerName}</Text>
                </Text>
              </View>
            </View>

            <SubscriberCollectionsDivider />

            <View style={styles.statsRow}>
              <StatCard
                label="Subscribers"
                value={String(totalSubscribers)}
                colors={['#3B82F6', '#06B6D4']}
                icon={<Users size={16} color="#FFFFFF" />}
              />
              <StatCard
                label="Collections"
                value={String(payments.length)}
                colors={['#10B981', '#059669']}
                icon={<Wallet size={16} color="#FFFFFF" />}
              />
              <StatCard
                label="Total Collected"
                value={formatMoney(totalAmount)}
                colors={['#F59E0B', '#EA580C']}
                icon={<DollarSign size={16} color="#FFFFFF" />}
              />
            </View>

            <View style={styles.searchCard}>
              <Text style={styles.searchLabel}>Search Subscriber</Text>
              <View style={styles.searchInputWrap}>
                <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Type subscriber ID or name..."
                  placeholderTextColor="#9CA3AF"
                  value={subscriberSearch}
                  onChangeText={text => {
                    setSubscriberSearch(text);
                    if (selectedSubscriberId) setSelectedSubscriberId(null);
                  }}
                />
                {subscriberSearch.length > 0 ? (
                  <TouchableOpacity onPress={() => setSubscriberSearch('')}>
                    <X size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {filteredSubscribers.length > 0 ? (
                <View style={styles.suggestions}>
                  {filteredSubscribers.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.suggestionRow}
                      onPress={() => {
                        setSelectedSubscriberId(c.id);
                        setSubscriberSearch('');
                      }}>
                      <Text style={styles.suggestionId}>{c.id.slice(0, 8)}</Text>
                      <Text style={styles.suggestionName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      {c.cell || c.mobile ? (
                        <Text style={styles.suggestionPhone}>• {c.cell || c.mobile}</Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {selectedSubscriber ? (
                <View style={styles.selectedChip}>
                  <Text style={styles.selectedChipId}>{selectedSubscriber.id.slice(0, 8)}</Text>
                  <Text style={styles.selectedChipDot}>•</Text>
                  <Text style={styles.selectedChipName} numberOfLines={1}>
                    {selectedSubscriber.name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedSubscriberId(null)}>
                    <X size={14} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {renderSubscriberInfo()}

            {selectedSubscriber ? (
              <View style={styles.listTitleRow}>
                <Text style={styles.listTitle}>{selectedSubscriber.name}&apos;s Payment History</Text>
                <Text style={styles.listCount}>{historyItems.length} entry(ies)</Text>
              </View>
            ) : null}

            {selectedSubscriber && loadingHistory ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator size="small" color="#059669" />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          selectedSubscriber ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyTitle}>No payment history found</Text>
              <Text style={styles.emptyText}>Receive a payment or make a promise to see it here.</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No Subscriber Selected</Text>
              <Text style={styles.emptyText}>
                Search and select a subscriber to receive payments and view history.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          historyItems.length > 0 ? (
            <View style={styles.pagination}>
              <Text style={styles.paginationInfo}>
                Showing {historyItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, historyItems.length)} of {historyItems.length} entries
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
                    disabled={!pageInput || parseInt(pageInput, 10) < 1 || parseInt(pageInput, 10) > totalPages}
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
        onRequestClose={() => {
          setShowReceiveDialog(false);
          setSelectedPromiseId(null);
        }}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Receive Payment</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowReceiveDialog(false);
                  setSelectedPromiseId(null);
                }}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              {selectedPromiseId ? (
                <View style={styles.promiseNotice}>
                  <CircleAlert size={14} color="#B45309" />
                  <Text style={styles.promiseNoticeText}>
                    Fulfilling a pending promise (amount pre-filled).
                  </Text>
                </View>
              ) : null}

              <View style={styles.fieldGrid2}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Subscriber ID</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedSubscriber?.id?.slice(0, 8) || ''}
                    editable={false}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Subscriber Name</Text>
                  <TextInput style={styles.fieldInput} value={selectedSubscriber?.name || ''} editable={false} />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Received By</Text>
                <TextInput style={styles.fieldInput} value={recoveryOfficerName} editable={false} />
              </View>

              <View style={styles.fieldGrid2}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Remaining Amount</Text>
                  <TextInput
                    style={[styles.fieldInput, subscriberRemaining > 0 ? styles.fieldInputDanger : styles.fieldInputPaid]}
                    value={formatMoney(remainingAfterPayment)}
                    editable={false}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Amount (PKR)</Text>
                  <TextInput
                    style={[styles.fieldInput, receiveAmount > subscriberRemaining ? styles.fieldInputDanger : null]}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    placeholderTextColor="#9CA3AF"
                    value={receiveAmount ? String(receiveAmount) : ''}
                    onChangeText={text => setReceiveAmount(parseFloat(text) || 0)}
                  />
                </View>
              </View>

              {receiveAmount > subscriberRemaining ? (
                <View style={styles.fieldError}>
                  <CircleAlert size={14} color="#DC2626" />
                  <Text style={styles.fieldErrorText}>
                    Payment amount cannot exceed the remaining amount of{' '}
                    {formatMoney(subscriberRemaining)}.
                  </Text>
                </View>
              ) : null}

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
                    setMethodSheet({
                      title: 'Select payment type',
                      options: PAYMENT_METHODS,
                      selected: receiveMethod,
                      onSelect: v => {
                        setReceiveMethod(v);
                        setSelectedTransactionTypeId('');
                      },
                    })
                  }>
                  <Text style={styles.selectFieldText}>
                    {PAYMENT_METHODS.find(m => m.id === receiveMethod)?.name || 'Select'}
                  </Text>
                  <ChevronDown size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {receiveMethod !== 'cash' ? (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Transaction Type</Text>
                  <TouchableOpacity
                    style={styles.selectField}
                    onPress={() =>
                      setTxnTypeSheet({
                        title: 'Select transaction type',
                        options: filteredTransactionTypes.map(t => ({id: t.id, name: t.paymentChannel || t.transaction})),
                        selected: selectedTransactionTypeId,
                        onSelect: v => setSelectedTransactionTypeId(v),
                      })
                    }>
                    <Text style={styles.selectFieldText}>
                      {filteredTransactionTypes.find(t => t.id === selectedTransactionTypeId)?.paymentChannel ||
                        'Select transaction type'}
                    </Text>
                    <ChevronDown size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ) : null}

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
                disabled={isSaving || !receiveAmount || receiveAmount > subscriberRemaining}>
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

      {/* Make Promise Dialog */}
      <Modal
        visible={showPromiseDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPromiseDialog(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Make a Promise</Text>
              <TouchableOpacity onPress={() => setShowPromiseDialog(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.fieldGrid2}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Subscriber ID</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedSubscriber?.id?.slice(0, 8) || ''}
                    editable={false}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Subscriber Name</Text>
                  <TextInput style={styles.fieldInput} value={selectedSubscriber?.name || ''} editable={false} />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Promise Date</Text>
                <TouchableOpacity style={styles.dateField} onPress={() => setPromiseDateOpen(true)}>
                  <CalendarDays size={16} color="#6B7280" />
                  <Text style={styles.dateFieldText}>{formatDate(promiseDate)}</Text>
                  <ChevronDown size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldTextarea]}
                  placeholder="e.g. I will pay the outstanding amount on this date."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={promiseDescription}
                  onChangeText={setPromiseDescription}
                />
              </View>

              <GradientButton
                colors={['#06B6D4', '#0D9488']}
                style={styles.submitBtn}
                onPress={handlePromiseSave}
                disabled={isSavingPromise}>
                {isSavingPromise ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Promise</Text>
                )}
              </GradientButton>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Payment Dialog */}
      <Modal
        visible={showEditDialog}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowEditDialog(false);
          setEditPayment(null);
        }}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Payment Entry</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditDialog(false);
                  setEditPayment(null);
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
                    value={editPayment?.id?.slice(0, 8).toUpperCase() || ''}
                    editable={false}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Subscriber</Text>
                  <TextInput style={styles.fieldInput} value={editPayment?.subscriberName || ''} editable={false} />
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

      {/* Payment method sheet */}
      <Modal
        visible={!!methodSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setMethodSheet(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{methodSheet?.title}</Text>
              <TouchableOpacity onPress={() => setMethodSheet(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll}>
              {methodSheet?.options.map(option => {
                const active = option.id === methodSheet!.selected;
                const Icon =
                  option.id === 'bank'
                    ? Landmark
                    : option.id === 'online'
                    ? Smartphone
                    : CreditCard;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.sheetOption}
                    onPress={() => {
                      methodSheet!.onSelect(option.id);
                      setMethodSheet(null);
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

      {/* Transaction type sheet */}
      <Modal
        visible={!!txnTypeSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setTxnTypeSheet(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{txnTypeSheet?.title}</Text>
              <TouchableOpacity onPress={() => setTxnTypeSheet(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll}>
              {txnTypeSheet?.options.map(option => {
                const active = option.id === txnTypeSheet!.selected;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.sheetOption}
                    onPress={() => {
                      txnTypeSheet!.onSelect(option.id);
                      setTxnTypeSheet(null);
                    }}>
                    <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}>
                      {option.name}
                    </Text>
                    {active ? <Check size={16} color="#059669" /> : null}
                  </TouchableOpacity>
                );
              })}
              {txnTypeSheet && txnTypeSheet.options.length === 0 ? (
                <View style={styles.sheetEmpty}>
                  <Text style={styles.sheetEmptyText}>No transaction types available</Text>
                </View>
              ) : null}
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

      {/* Promise date picker */}
      <DatePickerSheet
        visible={promiseDateOpen}
        value={promiseDate}
        onSelect={dateStr => {
          setPromiseDate(dateStr);
          setPromiseDateOpen(false);
        }}
        onClose={() => setPromiseDateOpen(false)}
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

      {/* Print receipt / promise slip dialog */}
      <PrintReceiptDialog
        visible={showPrintDialog}
        onClose={() => {
          setShowPrintDialog(false);
          setPrintPayment(null);
          setPrintPromise(null);
        }}
        payment={printPayment}
        promise={printPromise}
        company={activeCompany}
        subscriberName={selectedSubscriber?.name}
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
    width: '100%',
    paddingBottom: 8, paddingLeft: 8, paddingRight: 8,
    backgroundColor: '#166534',
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
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
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
  promiseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  promiseBtnText: {fontSize: 12, color: '#0D9488', fontWeight: '600'},
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
  promiseCard: {borderColor: '#FDE68A'},
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  billTagBox: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
  },
  promiseTagBox: {backgroundColor: '#FEF3C7'},
  promiseTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
    letterSpacing: 0.4,
  },
  paidTagBox: {backgroundColor: '#D1FAE5'},
  paidTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
    letterSpacing: 0.4,
  },
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
  smallBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  smallBtnText: {color: '#FFFFFF', fontSize: 11, fontWeight: '600', marginLeft: 2},
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnPrint: {backgroundColor: '#FEFCE8'},
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
  sheetEmpty: {paddingVertical: 30, alignItems: 'center'},
  sheetEmptyText: {fontSize: 13, color: '#9CA3AF'},
  promiseNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  promiseNoticeText: {flex: 1, fontSize: 12, color: '#92400E'},
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
  fieldInputDanger: {borderColor: '#FCA5A5', color: '#DC2626'},
  fieldInputPaid: {color: '#16A34A'},
  fieldTextarea: {minHeight: 70, textAlignVertical: 'top'},
  fieldError: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6},
  fieldErrorText: {flex: 1, fontSize: 12, color: '#DC2626', fontWeight: '500'},
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
