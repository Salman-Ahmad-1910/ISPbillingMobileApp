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
  ClipboardPen,
  Check,
  X,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  CalendarDays,
  PlusCircle,
} from 'lucide-react-native';
import {useAuth} from '../../context/AuthContext';
import {getBillingSubscribers} from '../../api/subscribers';
import {getPayments, createPayment} from '../../api/billing';
import {Subscriber, Payment} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';

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

const COLLECTION_TYPE_OPTIONS = [
  {id: 'cable', name: 'Cable'},
  {id: 'internet', name: 'Internet'},
  {id: 'both', name: 'Both'},
];

const PAYMENT_TYPE_OPTIONS = [
  {id: 'monthly', name: 'Monthly'},
  {id: 'yearly', name: 'Yearly'},
];

function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 5; y <= currentYear + 1; y++) {
    years.push(y);
  }
  return years;
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

function AllocatedCollectionsDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="allocatedCollectionsGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8B5CF6" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#7C3AED" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#allocatedCollectionsGrad)" />
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

export default function AllocatedCollectionsScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const {user} = useAuth();

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [selectedSubscriberId, setSelectedSubscriberId] = useState<string | null>(null);

  const [showNewAmountDialog, setShowNewAmountDialog] = useState(false);
  const [collectionType, setCollectionType] = useState('cable');
  const [paymentType, setPaymentType] = useState('monthly');
  const [packageFee, setPackageFee] = useState(0);
  const [netAmount, setNetAmount] = useState(0);
  const [amountMonth, setAmountMonth] = useState(String(new Date().getMonth()));
  const [amountYear, setAmountYear] = useState(String(new Date().getFullYear()));
  const [isSavingAmount, setIsSavingAmount] = useState(false);
  const [collectionTypeSheet, setCollectionTypeSheet] = useState<SelectSheetState>(null);
  const [paymentTypeSheet, setPaymentTypeSheet] = useState<SelectSheetState>(null);
  const [monthSheet, setMonthSheet] = useState<SelectSheetState>(null);
  const [yearSheet, setYearSheet] = useState<SelectSheetState>(null);

  const [showPromiseDateDialog, setShowPromiseDateDialog] = useState(false);
  const [promiseDate, setPromiseDate] = useState(toDateStr(new Date()));
  const [promiseRemarks, setPromiseRemarks] = useState('');
  const [isSavingPromise, setIsSavingPromise] = useState(false);
  const [promiseDateOpen, setPromiseDateOpen] = useState(false);

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
      const subscriberData = await getBillingSubscribers().catch(() => []);
      setSubscribers(subscriberData);
    } catch {
      Alert.alert('Error', 'Failed to load allocated collections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!selectedSubscriberId) return;
    setLoadingHistory(true);
    try {
      const data = await getPayments().catch(() => []);
      setPayments(data);
    } catch {
      Alert.alert('Error', 'Failed to load collection history');
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
    }
  }, [selectedSubscriberId, fetchHistory]);

  useEffect(() => {
    if (packageFee > 0) {
      setNetAmount(packageFee);
    }
  }, [packageFee]);

  const filteredSubscribers = useMemo(() => {
    const q = subscriberSearch.trim().toLowerCase();
    if (!q) return [];
    return subscribers
      .filter(s => {
        const id = (s.id || '').toLowerCase();
        const identity = (s.subscriber_identity || '').toLowerCase();
        const name = (s.name || '').toLowerCase();
        const phone = (s.phone || '').toLowerCase();
        return id.includes(q) || identity.includes(q) || name.includes(q) || phone.includes(q);
      })
      .slice(0, 20);
  }, [subscribers, subscriberSearch]);

  const selectedSubscriber = useMemo(() => {
    if (!selectedSubscriberId) return null;
    return subscribers.find(s => s.id === selectedSubscriberId) || null;
  }, [subscribers, selectedSubscriberId]);

  const allocatedPayments = useMemo(() => {
    if (!selectedSubscriberId) return [];
    return payments.filter(p => p.subscriberId === selectedSubscriberId);
  }, [payments, selectedSubscriberId]);

  const totalSubscribers = subscribers.length;
  const totalPayments = payments.length;
  const totalAmount = useMemo(
    () => payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payments],
  );

  const resetAmountFields = () => {
    setCollectionType('cable');
    setPaymentType('monthly');
    setPackageFee(0);
    setNetAmount(0);
    setAmountMonth(String(new Date().getMonth()));
    setAmountYear(String(new Date().getFullYear()));
  };

  const handleCreatePayment = async () => {
    if (!selectedSubscriber || !user) return;
    if (!netAmount || netAmount <= 0) {
      Alert.alert('Error', 'Enter a valid net amount');
      return;
    }
    setIsSavingAmount(true);
    try {
      await createPayment({
        subscriberId: selectedSubscriber.id,
        subscriberName: selectedSubscriber.name,
        amount: netAmount,
        paymentDate: toDateStr(new Date()),
        method: 'cash',
        collectorId: user.id,
      });
      Alert.alert('Success', 'Payment recorded successfully.');
      setShowNewAmountDialog(false);
      resetAmountFields();
      fetchHistory();
      fetchData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.response?.data?.error || 'Failed to record payment';
      Alert.alert('Error', msg);
    } finally {
      setIsSavingAmount(false);
    }
  };

  const handleSavePromiseDate = async () => {
    if (!selectedSubscriber || !user) return;
    setIsSavingPromise(true);
    try {
      await createPayment({
        subscriberId: selectedSubscriber.id,
        subscriberName: selectedSubscriber.name,
        amount: 0,
        paymentDate: promiseDate,
        method: 'cash',
        collectorId: user.id,
      });
      Alert.alert('Success', 'Promise date recorded successfully.');
      setShowPromiseDateDialog(false);
      setPromiseDate(toDateStr(new Date()));
      setPromiseRemarks('');
      fetchHistory();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.response?.data?.error || 'Failed to save promise date';
      Alert.alert('Error', msg);
    } finally {
      setIsSavingPromise(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(allocatedPayments.length / pageSize));
  const paginatedData = allocatedPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  const renderHistoryItem = ({item, index}: {item: Payment; index: number}) => {
    const pay = item;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.billTagBox, styles.paidTagBox]}>
            <Text style={styles.paidTagText}>Bill #{pay.billNo || index + 1}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {pay.subscriberName || selectedSubscriber?.name || '---'}
            </Text>
            <Text style={styles.cardSub}>
              {selectedSubscriber?.id?.slice(0, 8) || '---'} • {formatMonthYear(pay.paymentDate)}
            </Text>
          </View>
          <View style={styles.badgePaid}>
            <Text style={styles.badgePaidText}>Paid</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Payment Type</Text>
          <Text style={styles.infoValue}>Monthly</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Collection Type</Text>
          <Text style={styles.infoValue}>{capitalize(selectedSubscriber?.packageName) || 'Cable'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Receive Amount</Text>
          <Text style={styles.infoValue}>{formatMoney(Number(pay.amount) || 0)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Receiving Date</Text>
          <Text style={styles.infoValue}>{formatDate(pay.paymentDate)}</Text>
        </View>
      </View>
    );
  };

  const renderSubscriberInfo = () => {
    if (!selectedSubscriber) return null;
    const isActive = selectedSubscriber.status === 'active';
    return (
      <View style={styles.subscriberCard}>
        <View style={styles.subscriberGrid}>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Customer ID</Text>
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
              {selectedSubscriber.subscriber_identity || '---'}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Monthly / Yearly</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {capitalize(selectedSubscriber.billingCycle) || 'Monthly'}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Payment Type</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              Cash
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Collection Type</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {capitalize(selectedSubscriber.packageName) || 'Cable'}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Net Amount</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              Rs. {(Number(selectedSubscriber.balance) || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Status</Text>
            <View style={isActive ? styles.statusBadgeActive : styles.statusBadge}>
              <Text style={isActive ? styles.statusBadgeActiveText : styles.statusBadgeText}>
                {capitalize(selectedSubscriber.status)}
              </Text>
            </View>
          </View>
          <View style={styles.subscriberCellWide}>
            <Text style={styles.subscriberLabel}>Address</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {selectedSubscriber.installationAddress || '---'}
            </Text>
          </View>
        </View>

        <View style={styles.actionBar}>
          <View style={styles.balanceField}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <TextInput
              style={styles.balanceInput}
              value={String(Number(selectedSubscriber.balance) || 0)}
              editable={false}
            />
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.promiseBtn}
              onPress={() => setShowPromiseDateDialog(true)}>
              <CalendarIcon size={16} color="#0D9488" />
              <Text style={styles.promiseBtnText}>Promise Date</Text>
            </TouchableOpacity>
            <GradientButton
              colors={['#10B981', '#059669']}
              style={styles.receiveBtn}
              onPress={() => setShowNewAmountDialog(true)}>
              <PlusCircle size={16} color="#FFFFFF" />
              <Text style={styles.receiveBtnText}>New Amount</Text>
            </GradientButton>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading allocated collections...</Text>
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
          <Text style={styles.headerTitle}>Allocated Collections</Text>
          <Text style={styles.headerCount}>{totalSubscribers} subscriber(s)</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginatedData}
        keyExtractor={item => item.id}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#7C3AED']} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.heroHeader}>
              <GradientView colors={['#8B5CF6', '#7C3AED']} style={styles.heroIconBox}>
                <ClipboardPen size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Allocated Collections</Text>
                <Text style={styles.heroSubtitle}>View and manage allocated collections.</Text>
              </View>
            </View>

            <AllocatedCollectionsDivider />

            <View style={styles.statsRow}>
              <StatCard
                label="Subscribers"
                value={String(totalSubscribers)}
                colors={['#8B5CF6', '#7C3AED']}
                icon={<Users size={16} color="#FFFFFF" />}
              />
              <StatCard
                label="Payments"
                value={String(totalPayments)}
                colors={['#3B82F6', '#06B6D4']}
                icon={<Wallet size={16} color="#FFFFFF" />}
              />
              <StatCard
                label="Total Collected"
                value={formatMoney(totalAmount)}
                colors={['#10B981', '#059669']}
                icon={<DollarSign size={16} color="#FFFFFF" />}
              />
            </View>

            <View style={styles.searchCard}>
              <Text style={styles.searchLabel}>Search Subscriber</Text>
              <View style={styles.searchInputWrap}>
                <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Type name, internet ID, or phone..."
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
                  {filteredSubscribers.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.suggestionRow}
                      onPress={() => {
                        setSelectedSubscriberId(s.id);
                        setSubscriberSearch('');
                      }}>
                      <Text style={styles.suggestionId}>{s.id.slice(0, 8)}</Text>
                      <Text style={styles.suggestionName} numberOfLines={1}>
                        {s.name}
                      </Text>
                      {s.phone ? <Text style={styles.suggestionPhone}>• {s.phone}</Text> : null}
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
                <Text style={styles.listTitle}>Allocated Collection History</Text>
                <Text style={styles.listCount}>{allocatedPayments.length} entry(ies)</Text>
              </View>
            ) : null}

            {selectedSubscriber && loadingHistory ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator size="small" color="#7C3AED" />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          selectedSubscriber ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyTitle}>No collection history found</Text>
              <Text style={styles.emptyText}>Record a new amount or promise date to see it here.</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No Subscriber Selected</Text>
              <Text style={styles.emptyText}>
                Search and select a subscriber to view their allocated collections.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          allocatedPayments.length > 0 ? (
            <View style={styles.pagination}>
              <Text style={styles.paginationInfo}>
                Showing {allocatedPayments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, allocatedPayments.length)} of{' '}
                {allocatedPayments.length} entries
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

      {/* New Amount Dialog */}
      <Modal
        visible={showNewAmountDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewAmountDialog(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Payment</Text>
              <TouchableOpacity onPress={() => setShowNewAmountDialog(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.fieldGrid2}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Customer ID</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedSubscriber?.id?.slice(0, 8) || ''}
                    editable={false}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput style={styles.fieldInput} value={selectedSubscriber?.name || ''} editable={false} />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Internet ID</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={selectedSubscriber?.subscriber_identity || ''}
                  editable={false}
                />
              </View>

              <View style={styles.fieldGrid2}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Collection Type</Text>
                  <TouchableOpacity
                    style={styles.selectField}
                    onPress={() =>
                      setCollectionTypeSheet({
                        title: 'Select collection type',
                        options: COLLECTION_TYPE_OPTIONS,
                        selected: collectionType,
                        onSelect: v => setCollectionType(v),
                      })
                    }>
                    <Text style={styles.selectFieldText}>
                      {COLLECTION_TYPE_OPTIONS.find(o => o.id === collectionType)?.name || 'Select'}
                    </Text>
                    <ChevronDown size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Payment Type</Text>
                  <TouchableOpacity
                    style={styles.selectField}
                    onPress={() =>
                      setPaymentTypeSheet({
                        title: 'Select payment type',
                        options: PAYMENT_TYPE_OPTIONS,
                        selected: paymentType,
                        onSelect: v => setPaymentType(v),
                      })
                    }>
                    <Text style={styles.selectFieldText}>
                      {PAYMENT_TYPE_OPTIONS.find(o => o.id === paymentType)?.name || 'Select'}
                    </Text>
                    <ChevronDown size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGrid2}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Package Fee</Text>
                  <TextInput
                    style={styles.fieldInput}
                    keyboardType="numeric"
                    placeholder="Enter fee"
                    placeholderTextColor="#9CA3AF"
                    value={packageFee ? String(packageFee) : ''}
                    onChangeText={text => setPackageFee(parseFloat(text) || 0)}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Net Amount</Text>
                  <TextInput
                    style={styles.fieldInput}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    placeholderTextColor="#9CA3AF"
                    value={netAmount ? String(netAmount) : ''}
                    onChangeText={text => setNetAmount(parseFloat(text) || 0)}
                  />
                </View>
              </View>

              <View style={styles.fieldGrid2}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Month</Text>
                  <TouchableOpacity
                    style={styles.selectField}
                    onPress={() =>
                      setMonthSheet({
                        title: 'Select month',
                        options: MONTH_NAMES.map((name, i) => ({id: String(i), name})),
                        selected: amountMonth,
                        onSelect: v => setAmountMonth(v),
                      })
                    }>
                    <Text style={styles.selectFieldText}>
                      {MONTH_NAMES[parseInt(amountMonth, 10)] || 'Select'}
                    </Text>
                    <ChevronDown size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Year</Text>
                  <TouchableOpacity
                    style={styles.selectField}
                    onPress={() =>
                      setYearSheet({
                        title: 'Select year',
                        options: getYearOptions().map(y => ({id: String(y), name: String(y)})),
                        selected: amountYear,
                        onSelect: v => setAmountYear(v),
                      })
                    }>
                    <Text style={styles.selectFieldText}>{amountYear || 'Select'}</Text>
                    <ChevronDown size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>

              <GradientButton
                colors={['#10B981', '#059669']}
                style={styles.submitBtn}
                onPress={handleCreatePayment}
                disabled={isSavingAmount || !netAmount}>
                {isSavingAmount ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit</Text>
                )}
              </GradientButton>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Promise Date Dialog */}
      <Modal
        visible={showPromiseDateDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPromiseDateDialog(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Set Promise Date</Text>
              <TouchableOpacity onPress={() => setShowPromiseDateDialog(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.fieldGrid2}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Customer ID</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedSubscriber?.id?.slice(0, 8) || ''}
                    editable={false}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Name</Text>
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
                <Text style={styles.fieldLabel}>Remarks</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Optional notes..."
                  placeholderTextColor="#9CA3AF"
                  value={promiseRemarks}
                  onChangeText={setPromiseRemarks}
                />
              </View>

              <GradientButton
                colors={['#3B82F6', '#06B6D4']}
                style={styles.submitBtn}
                onPress={handleSavePromiseDate}
                disabled={isSavingPromise}>
                {isSavingPromise ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Save</Text>
                )}
              </GradientButton>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Generic select sheet */}
      <Modal
        visible={!!collectionTypeSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setCollectionTypeSheet(null)}>
        <SelectSheet sheet={collectionTypeSheet} onClose={() => setCollectionTypeSheet(null)} />
      </Modal>

      <Modal
        visible={!!paymentTypeSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentTypeSheet(null)}>
        <SelectSheet sheet={paymentTypeSheet} onClose={() => setPaymentTypeSheet(null)} />
      </Modal>

      <Modal
        visible={!!monthSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setMonthSheet(null)}>
        <SelectSheet sheet={monthSheet} onClose={() => setMonthSheet(null)} />
      </Modal>

      <Modal
        visible={!!yearSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setYearSheet(null)}>
        <SelectSheet sheet={yearSheet} onClose={() => setYearSheet(null)} />
      </Modal>

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
                  {active ? <Check size={16} color="#7C3AED" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SelectSheet({
  sheet,
  onClose,
}: {
  sheet: SelectSheetState;
  onClose: () => void;
}) {
  if (!sheet) return null;
  return (
    <View style={styles.sheetOverlay}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{sheet.title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.sheetClose}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.sheetScroll}>
          {sheet.options.map(option => {
            const active = option.id === sheet.selected;
            return (
              <TouchableOpacity
                key={option.id}
                style={styles.sheetOption}
                onPress={() => {
                  sheet.onSelect(option.id);
                  onClose();
                }}>
                <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}>
                  {option.name}
                </Text>
                {active ? <Check size={16} color="#7C3AED" /> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
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
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {fontSize: 10, color: '#6B7280', fontWeight: '700'},
  statusBadgeActive: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeActiveText: {fontSize: 10, color: '#047857', fontWeight: '700'},
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
  balanceField: {flex: 1, minWidth: 120},
  balanceLabel: {fontSize: 11, color: '#9CA3AF', marginBottom: 4},
  balanceInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
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
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  billTagBox: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
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
  badgePaid: {
    borderRadius: 999,
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePaidText: {fontSize: 10, color: '#FFFFFF', fontWeight: '700'},
  infoRow: {flexDirection: 'row', paddingVertical: 3},
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 110},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
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
  pageNumActive: {backgroundColor: '#7C3AED', borderColor: '#7C3AED'},
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
  sheetOptionText: {fontSize: 15, color: '#374151', fontWeight: '500', flex: 1, marginRight: 8},
  sheetOptionTextActive: {color: '#7C3AED', fontWeight: '600'},
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
    backgroundColor: '#7C3AED',
    borderRadius: 10,
  },
  dayText: {fontSize: 14, color: '#374151'},
  dayTextSelected: {color: '#FFFFFF', fontWeight: '700'},
  dayTextToday: {color: '#7C3AED', fontWeight: '700'},
  dateTodayBtn: {
    alignSelf: 'center',
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  dateTodayBtnText: {fontSize: 13, color: '#7C3AED', fontWeight: '600'},
});
