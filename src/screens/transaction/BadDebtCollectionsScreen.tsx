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
  TriangleAlert,
  Users,
  UserCheck,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  PlusCircle,
  Wallet,
  Handshake,
} from 'lucide-react-native';
import {useAuth} from '../../context/AuthContext';
import {getConnections} from '../../api/messages';
import {getDealers} from '../../api/dealers';
import {getRecoveryOfficers} from '../../api/messages';
import {areasApi} from '../../api/network';
import {getPayments, createPayment} from '../../api/billing';
import {getDealerCollections, createDealerCollection} from '../../api/collections';
import {Connection, Dealer, Area, RecoveryOfficer, Payment, DealerCollection} from '../../types';
import {GradientView} from '../../components/GradientView';
import {GradientButton} from '../../components/GradientButton';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatMoney(n: number): string {
  return `PKR ${(Number.isFinite(n) ? n : 0).toLocaleString()}`;
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

function getDaysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

function BadDebtDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="badDebtGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#F43F5E" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#EF4444" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#EF4444" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#badDebtGrad)" />
      </Svg>
    </View>
  );
}

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

export default function BadDebtCollectionsScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const {user} = useAuth();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [recoveryOfficers, setRecoveryOfficers] = useState<RecoveryOfficer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dealerCollections, setDealerCollections] = useState<DealerCollection[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState<'subscribers' | 'dealers'>('subscribers');

  // Subscriber state
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [selectedSubscriberId, setSelectedSubscriberId] = useState<string | null>(null);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [receiveAmount, setReceiveAmount] = useState(0);
  const [receiveDate, setReceiveDate] = useState(toDateStr(new Date()));
  const [isSavingSubscriber, setIsSavingSubscriber] = useState(false);

  // Dealer state
  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);
  const [showDealerReceiveDialog, setShowDealerReceiveDialog] = useState(false);
  const [dealerReceiveAmount, setDealerReceiveAmount] = useState(0);
  const [isSavingDealer, setIsSavingDealer] = useState(false);

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
      const [connData, dealerData, areaData, officerData, payData, colData] = await Promise.all([
        getConnections().catch(() => []),
        getDealers().catch(() => []),
        areasApi.list().catch(() => []),
        getRecoveryOfficers().catch(() => []),
        getPayments().catch(() => []),
        getDealerCollections().catch(() => []),
      ]);
      setConnections(connData);
      setDealers(dealerData);
      setAreas(areaData);
      setRecoveryOfficers(officerData);
      setPayments(payData);
      setDealerCollections(colData);
    } catch {
      Alert.alert('Error', 'Failed to load bad debt data');
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

  // --- Overdue filtering ---
  const getLastActiveDate = (c: Connection): string => {
    return c.lastPaymentDate || c.rechargeDate || c.createdAt || '';
  };

  const overdueConnections = useMemo(() => {
    return connections.filter(c => {
      const remaining = Number(c.remainingAmount) || 0;
      if (remaining <= 0) return false;
      const activeDate = getLastActiveDate(c);
      if (!activeDate) return false;
      const daysSince = getDaysSince(activeDate);
      return daysSince > 30;
    });
  }, [connections]);

  const overdueDealers = useMemo(() => {
    return dealers.filter(d => Number(d.walletBalance) > 0);
  }, [dealers]);

  const filteredSubscribers = useMemo(() => {
    if (!subscriberSearch.trim()) return [];
    const q = subscriberSearch.toLowerCase();
    return overdueConnections.filter(c => {
      const id = (c.id || '').toLowerCase();
      const internetId = (c.internetId || '').toLowerCase();
      const cell = (c.cell || '').toLowerCase();
      const mobile = (c.mobile || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      return id.includes(q) || internetId.includes(q) || cell.includes(q) || mobile.includes(q) || name.includes(q);
    }).slice(0, 20);
  }, [overdueConnections, subscriberSearch]);

  const selectedSubscriber = useMemo(() => {
    if (!selectedSubscriberId) return null;
    return connections.find(c => c.id === selectedSubscriberId) || null;
  }, [connections, selectedSubscriberId]);

  const subscriberRecoveryOfficerName = useMemo(() => {
    if (!selectedSubscriber) return user?.name || '---';
    if (selectedSubscriber.sublocalityId) {
      const area = areas.find(a => a.id === selectedSubscriber.sublocalityId);
      if (area) {
        if (area.recoveryOfficerId) {
          const o = recoveryOfficers.find(o => o.id === area.recoveryOfficerId);
          if (o) return o.name;
        }
        const o = recoveryOfficers.find(o => o.areaId === area.id);
        if (o) return o.name;
      }
    }
    const o = recoveryOfficers.find(o => o.id === user?.id);
    return o?.name || user?.name || '---';
  }, [selectedSubscriber, areas, recoveryOfficers, user]);

  const subscriberPayments = useMemo(() => {
    if (!selectedSubscriberId) return [];
    return payments.filter(p => p.subscriberId === selectedSubscriberId);
  }, [payments, selectedSubscriberId]);

  const dealerRecoveryOfficerName = useMemo(() => {
    if (!selectedDealerId || !selectedDealerId) return user?.name || '---';
    return user?.name || '---';
  }, [selectedDealerId, user]);

  const selectedDealerObj = useMemo(() => {
    if (!selectedDealerId) return null;
    return dealers.find(d => d.id === selectedDealerId) || null;
  }, [dealers, selectedDealerId]);

  const dealerRecoveryOfficer = useMemo(() => {
    if (!selectedDealerObj) return user?.name || '---';
    if (selectedDealerObj.areaId) {
      const area = areas.find(a => a.id === selectedDealerObj.areaId);
      if (area && area.recoveryOfficerId) {
        const o = recoveryOfficers.find(o => o.id === area.recoveryOfficerId);
        if (o) return o.name;
      }
    }
    const o = recoveryOfficers.find(o => o.id === user?.id);
    return o?.name || user?.name || '---';
  }, [selectedDealerObj, areas, recoveryOfficers, user]);

  const dealerHistory = useMemo(() => {
    if (!selectedDealerId) return [];
    return dealerCollections.filter(c => c.dealerId === selectedDealerId);
  }, [dealerCollections, selectedDealerId]);

  const filteredDealers = useMemo(() => {
    if (!subscriberSearch.trim()) return [];
    const q = subscriberSearch.toLowerCase();
    return overdueDealers.filter(d => {
      const id = (d.id || '').toLowerCase();
      const name = (d.name || '').toLowerCase();
      const phone = (d.phone || '').toLowerCase();
      const cnic = (d.cnic || '').toLowerCase();
      return id.includes(q) || name.includes(q) || phone.includes(q) || cnic.includes(q);
    }).slice(0, 20);
  }, [overdueDealers, subscriberSearch]);

  // Pagination for subscriber payments
  const [subPage, setSubPage] = useState(1);
  const subPageSize = 10;
  const subTotalPages = Math.max(1, Math.ceil(subscriberPayments.length / subPageSize));
  const subPaginated = useMemo(() => {
    const start = (subPage - 1) * subPageSize;
    return subscriberPayments.slice(start, start + subPageSize);
  }, [subscriberPayments, subPage, subPageSize]);

  // Pagination for dealer history
  const [dealerPage, setDealerPage] = useState(1);
  const dealerPageSize = 10;
  const dealerTotalPages = Math.max(1, Math.ceil(dealerHistory.length / dealerPageSize));
  const dealerPaginated = useMemo(() => {
    const start = (dealerPage - 1) * dealerPageSize;
    return dealerHistory.slice(start, start + dealerPageSize);
  }, [dealerHistory, dealerPage, dealerPageSize]);

  const handleSubscriberReceive = async () => {
    if (!selectedSubscriber || !user) return;
    if (!receiveAmount || receiveAmount <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    setIsSavingSubscriber(true);
    try {
      await createPayment({
        subscriberId: selectedSubscriber.id,
        subscriberName: selectedSubscriber.name,
        amount: receiveAmount,
        paymentDate: toDateStr(new Date()),
        method: 'cash',
        collectorId: user.id,
      });
      Alert.alert('Success', 'Payment recorded.');
      setShowReceiveDialog(false);
      setReceiveAmount(0);
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to record payment';
      Alert.alert('Error', msg);
    } finally {
      setIsSavingSubscriber(false);
    }
  };

  const handleDealerReceive = async () => {
    if (!selectedDealerObj || !user) return;
    if (!dealerReceiveAmount || dealerReceiveAmount <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    setIsSavingDealer(true);
    try {
      await createDealerCollection({
        dealerId: selectedDealerObj.id,
        dealerName: selectedDealerObj.name,
        dealerAddress: selectedDealerObj.address || '',
        amount: dealerReceiveAmount,
        collectionDate: toDateStr(new Date()),
        settlementStatus: 'settled',
        transactionType: 'cash',
        comment: '',
        receivedById: user.id,
        receivedByName: user.name || dealerRecoveryOfficer,
      });
      Alert.alert('Success', 'Dealer payment recorded.');
      setShowDealerReceiveDialog(false);
      setDealerReceiveAmount(0);
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to record dealer payment';
      Alert.alert('Error', msg);
    } finally {
      setIsSavingDealer(false);
    }
  };

  const totalConnections = connections.length;
  const totalDealers = dealers.length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={styles.loadingText}>Loading bad debt data...</Text>
      </View>
    );
  }

  const renderSubscriberRow = (item: Payment, idx: number) => (
    <View style={styles.tableRow} key={item.id}>
      <View style={styles.rowCellId}>
        <Text style={styles.rowCellMono}>{idx + 1}</Text>
      </View>
      <View style={styles.rowCellName}>
        <Text style={styles.rowCellText} numberOfLines={1}>
          {item.subscriberName || '---'}
        </Text>
      </View>
      <View style={styles.rowCellDate}>
        <Text style={styles.rowCellText} numberOfLines={1}>
          {formatMonthYear(item.paymentDate)}
        </Text>
      </View>
      <View style={styles.rowCellChannel}>
        <Text style={styles.rowCellText} numberOfLines={1}>
          {capitalize(item.method)}
        </Text>
      </View>
      <View style={styles.rowCellAmount}>
        <Text style={styles.rowCellText} numberOfLines={1}>
          {formatMoney(Number(item.amount) || 0)}
        </Text>
      </View>
      <View style={styles.rowCellDate}>
        <Text style={styles.rowCellText} numberOfLines={1}>
          {formatDate(item.paymentDate)}
        </Text>
      </View>
      <View style={styles.rowCellStatus}>
        <View style={[styles.badge, styles.badgePaid]}>
          <Text style={styles.badgePaidText}>Paid</Text>
        </View>
      </View>
      <View style={styles.rowCellReceivedBy}>
        <Text style={styles.rowCellText} numberOfLines={1}>
          {item.collectedByName || '---'}
        </Text>
      </View>
    </View>
  );

  const renderDealerRow = (item: DealerCollection, idx: number) => {
    const isPaid = item.settlementStatus === 'settled';
    return (
      <View style={styles.tableRow} key={item.id}>
        <View style={styles.rowCellId}>
          <Text style={styles.rowCellMono}>{idx + 1}</Text>
        </View>
        <View style={styles.rowCellName}>
          <Text style={styles.rowCellText} numberOfLines={1}>
            {item.dealerName || '---'}
          </Text>
        </View>
        <View style={styles.rowCellDate}>
          <Text style={styles.rowCellText} numberOfLines={1}>
            {formatDate(item.collectionDate)}
          </Text>
        </View>
        <View style={styles.rowCellChannel}>
          <Text style={styles.rowCellText} numberOfLines={1}>
            {capitalize(item.transactionType)}
          </Text>
        </View>
        <View style={styles.rowCellAmount}>
          <Text style={styles.rowCellText} numberOfLines={1}>
            {formatMoney(Number(item.amount) || 0)}
          </Text>
        </View>
        <View style={styles.rowCellStatus}>
          <View style={[styles.badge, isPaid ? styles.badgePaid : styles.badgePending]}>
            <Text style={isPaid ? styles.badgePaidText : styles.badgePendingText}>
              {isPaid ? 'Paid' : 'Unpaid'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSubscriberDetails = () => {
    if (!selectedSubscriber) return null;
    const remaining = Number(selectedSubscriber.remainingAmount) || 0;
    return (
      <View style={styles.subscriberCard}>
        <View style={styles.subscriberGrid}>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Subscriber ID</Text>
            <Text style={styles.subscriberValueMono} numberOfLines={1}>
              {selectedSubscriber.id || '---'}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Name</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {selectedSubscriber.name}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Days Overdue</Text>
            <Text style={[styles.subscriberValue, styles.remainingDue]} numberOfLines={1}>
              {getDaysSince(getLastActiveDate(selectedSubscriber))} days
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Last Payment</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {selectedSubscriber.lastPaymentDate
                ? new Date(selectedSubscriber.lastPaymentDate).toLocaleDateString()
                : selectedSubscriber.rechargeDate
                ? new Date(selectedSubscriber.rechargeDate).toLocaleDateString()
                : '---'}
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
              style={[styles.subscriberValue, remaining > 0 ? styles.remainingDue : styles.remainingPaid]}
              numberOfLines={1}>
              {formatMoney(remaining)}
            </Text>
          </View>
        </View>

        <View style={styles.actionBar}>
          <View style={styles.receivingRow}>
            <UserCheck size={16} color="#6B7280" />
            <Text style={styles.receivingText} numberOfLines={1}>
              Receiving as: <Text style={styles.receivingName}>{subscriberRecoveryOfficerName}</Text>
            </Text>
          </View>
          <View style={styles.actionButtons}>
            <GradientButton
              colors={['#10B981', '#059669']}
              style={styles.receiveBtn}
              onPress={() => setShowReceiveDialog(true)}>
              <PlusCircle size={16} color="#FFFFFF" />
              <Text style={styles.receiveBtnText}>Receive Payment</Text>
            </GradientButton>
          </View>
        </View>
      </View>
    );
  };

  const renderDealerDetails = () => {
    if (!selectedDealerObj) return null;
    const remaining = Number(selectedDealerObj.remainingAmount) || 0;
    return (
      <View style={styles.subscriberCard}>
        <View style={styles.subscriberGrid}>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Dealer ID</Text>
            <Text style={styles.subscriberValueMono} numberOfLines={1}>
              {selectedDealerObj.id?.slice(0, 8) || '---'}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Name</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {selectedDealerObj.name}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Phone</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {selectedDealerObj.phone || '---'}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>CNIC</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {selectedDealerObj.cnic || '---'}
            </Text>
          </View>
          <View style={styles.subscriberCell}>
            <Text style={styles.subscriberLabel}>Balance</Text>
            <Text style={styles.subscriberValue} numberOfLines={1}>
              {formatMoney(Number(selectedDealerObj.walletBalance) || 0)}
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
              {selectedDealerObj.address || '---'}
            </Text>
          </View>
        </View>

        <View style={styles.actionBar}>
          <View style={styles.receivingRow}>
            <UserCheck size={16} color="#6B7280" />
            <Text style={styles.receivingText} numberOfLines={1}>
              Receiving as: <Text style={styles.receivingName}>{dealerRecoveryOfficer}</Text>
            </Text>
          </View>
          <View style={styles.actionButtons}>
            <GradientButton
              colors={['#10B981', '#059669']}
              style={styles.receiveBtn}
              onPress={() => setShowDealerReceiveDialog(true)}>
              <PlusCircle size={16} color="#FFFFFF" />
              <Text style={styles.receiveBtnText}>Receive Payment</Text>
            </GradientButton>
          </View>
        </View>
      </View>
    );
  };

  const getSubVisiblePages = () => {
    const pages: number[] = [];
    const start = Math.max(1, subPage - 1);
    const end = Math.min(subTotalPages, subPage + 1);
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  };

  const getDealerVisiblePages = () => {
    const pages: number[] = [];
    const start = Math.max(1, dealerPage - 1);
    const end = Math.min(dealerTotalPages, dealerPage + 1);
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  };

  return (
    <View style={styles.container}>
      <GradientView colors={['#166534', '#22c55e']} style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Bad Debt Collections</Text>
          <Text style={styles.headerCount}>{overdueConnections.length + overdueDealers.length} overdue</Text>
        </View>
      </GradientView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={['#EF4444']}
          />
        }
        contentContainerStyle={styles.list}>
        <View style={styles.heroHeader}>
          <GradientView colors={['#F43F5E', '#EF4444']} style={styles.heroIconBox}>
            <TriangleAlert size={20} color="#FFFFFF" />
          </GradientView>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>Bad Debt Collections</Text>
            <Text style={styles.heroSubtitle}>
              Collect overdue payments from subscribers and dealers.
            </Text>
          </View>
        </View>

        <BadDebtDivider />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScroll}>
          <StatCard
            label="Overdue Subscribers"
            value={String(overdueConnections.length)}
            colors={['#F43F5E', '#EF4444']}
            icon={<Users size={16} color="#FFFFFF" />}
          />
          <StatCard
            label="Overdue Dealers"
            value={String(overdueDealers.length)}
            colors={['#F59E0B', '#EA580C']}
            icon={<Wallet size={16} color="#FFFFFF" />}
          />
          <StatCard
            label="Total Connections"
            value={String(totalConnections)}
            colors={['#DC2626', '#B91C1C']}
            icon={<Users size={16} color="#FFFFFF" />}
          />
          <StatCard
            label="Total Dealers"
            value={String(totalDealers)}
            colors={['#8B5CF6', '#7C3AED']}
            icon={<Handshake size={16} color="#FFFFFF" />}
          />
        </ScrollView>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {activeTab === 'subscribers' ? (
            <GradientView
              colors={['#10B981', '#059669']}
              style={styles.tabBtnGradient}>
              <TouchableOpacity
                style={[styles.tabBtn, styles.tabBtnActiveGradient]}
                onPress={() => {
                  setActiveTab('subscribers');
                  setSubscriberSearch('');
                  setSelectedSubscriberId(null);
                }}>
                <Text style={[styles.tabBtnText, styles.tabBtnTextActive]}>
                  Subscribers
                </Text>
              </TouchableOpacity>
            </GradientView>
          ) : (
            <TouchableOpacity
              style={styles.tabBtn}
              onPress={() => {
                setActiveTab('subscribers');
                setSubscriberSearch('');
                setSelectedSubscriberId(null);
              }}>
              <Text style={styles.tabBtnText}>
                Subscribers
              </Text>
            </TouchableOpacity>
          )}
          {activeTab === 'dealers' ? (
            <GradientView
              colors={['#10B981', '#059669']}
              style={styles.tabBtnGradient}>
              <TouchableOpacity
                style={[styles.tabBtn, styles.tabBtnActiveGradient]}
                onPress={() => {
                  setActiveTab('dealers');
                  setSubscriberSearch('');
                  setSelectedDealerId(null);
                }}>
                <Text style={[styles.tabBtnText, styles.tabBtnTextActive]}>
                  Dealers
                </Text>
              </TouchableOpacity>
            </GradientView>
          ) : (
            <TouchableOpacity
              style={styles.tabBtn}
              onPress={() => {
                setActiveTab('dealers');
                setSubscriberSearch('');
                setSelectedDealerId(null);
              }}>
              <Text style={styles.tabBtnText}>
                Dealers
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Content */}
        {activeTab === 'subscribers' ? (
          <View>
            <View style={styles.searchCard}>
              <Text style={styles.searchLabel}>Search Subscriber</Text>
              <View style={styles.searchInputWrap}>
                <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Type subscriber ID, internet ID, name or mobile..."
                  placeholderTextColor="#9CA3AF"
                  value={subscriberSearch}
                  onChangeText={text => {
                    setSubscriberSearch(text);
                    if (selectedSubscriberId) setSelectedSubscriberId(null);
                  }}
                />
                {subscriberSearch.length > 0 ? (
                  <TouchableOpacity onPress={() => {
                    setSubscriberSearch('');
                    setSelectedSubscriberId(null);
                  }}>
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
                        setSubPage(1);
                      }}>
                      <Text style={styles.suggestionId}>{c.id.slice(0, 8)}</Text>
                      <Text style={styles.suggestionName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      {(c.cell || c.mobile) ? (
                        <Text style={styles.suggestionPhone}>• {c.cell || c.mobile}</Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {selectedSubscriber ? (
                <View style={styles.selectedChip}>
                  <Text style={styles.selectedChipId}>
                    {selectedSubscriber.id?.slice(0, 8) || '---'}
                  </Text>
                  <Text style={styles.selectedChipDot}>•</Text>
                  <Text style={styles.selectedChipName} numberOfLines={1}>
                    {selectedSubscriber.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedSubscriberId(null);
                      setSubPage(1);
                    }}>
                    <X size={14} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {selectedSubscriber ? (
              <View>
                {renderSubscriberDetails()}

                <View style={styles.listTitleRow}>
                  <Text style={styles.listTitle}>
                    {selectedSubscriber.name}'s Payment History
                  </Text>
                  <Text style={styles.listCount}>{subscriberPayments.length} entry(ies)</Text>
                </View>

                {subscriberPayments.length > 0 ? (
                  <View>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderText, {flex: 1}]}>#</Text>
                      <Text style={[styles.tableHeaderText, {flex: 2}]}>Name</Text>
                      <Text style={[styles.tableHeaderText, {flex: 1.5}]}>Month/Year</Text>
                      <Text style={[styles.tableHeaderText, {flex: 1.2}]}>Type</Text>
                      <Text style={[styles.tableHeaderText, {flex: 1.5}]}>Received</Text>
                      <Text style={[styles.tableHeaderText, {flex: 1.5}]}>Pay Date</Text>
                      <Text style={[styles.tableHeaderText, {flex: 1}]}>Status</Text>
                      <Text style={[styles.tableHeaderText, {flex: 1.5}]}>Received By</Text>
                    </View>
                    {subPaginated.map((item, idx) => renderSubscriberRow(item, (subPage - 1) * subPageSize + idx))}
                  </View>
                ) : (
                  <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>💳</Text>
                    <Text style={styles.emptyTitle}>No payment history found</Text>
                    <Text style={styles.emptyText}>Receive a payment to see it here.</Text>
                  </View>
                )}

                {/* Subscriber Pagination */}
                {subscriberPayments.length > 0 ? (
                  <View style={styles.pagination}>
                    <Text style={styles.paginationInfo}>
                      Showing {subscriberPayments.length === 0 ? 0 : (subPage - 1) * subPageSize + 1} to{' '}
                      {Math.min(subPage * subPageSize, subscriberPayments.length)} of{' '}
                      {subscriberPayments.length} entries
                    </Text>

                    <View style={styles.pageControls}>
                      <TouchableOpacity
                        style={[styles.pageBtn, subPage === 1 && styles.pageBtnDisabled]}
                        disabled={subPage === 1}
                        onPress={() => setSubPage(prev => Math.max(1, prev - 1))}>
                        <ChevronLeft size={14} color={subPage === 1 ? '#D1D5DB' : '#374151'} />
                        <Text style={[styles.pageBtnText, subPage === 1 && styles.pageBtnTextDisabled]}>
                          Previous
                        </Text>
                      </TouchableOpacity>

                      {getSubVisiblePages().map(p => (
                        <TouchableOpacity
                          key={p}
                          style={[styles.pageNum, subPage === p && styles.pageNumActive]}
                          onPress={() => setSubPage(p)}>
                          <Text style={[styles.pageNumText, subPage === p && styles.pageNumTextActive]}>
                            {p}
                          </Text>
                        </TouchableOpacity>
                      ))}

                      <TouchableOpacity
                        style={[styles.pageBtn, subPage === subTotalPages && styles.pageBtnDisabled]}
                        disabled={subPage === subTotalPages}
                        onPress={() => setSubPage(prev => Math.min(subTotalPages, prev + 1))}>
                        <Text style={[styles.pageBtnText, subPage === subTotalPages && styles.pageBtnTextDisabled]}>
                          Next
                        </Text>
                        <ChevronRight size={14} color={subPage === subTotalPages ? '#D1D5DB' : '#374151'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>No Subscriber Selected</Text>
                <Text style={styles.emptyText}>
                  Search and select an overdue subscriber to receive payment.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View>
            <View style={styles.searchCard}>
              <Text style={styles.searchLabel}>Search Dealer</Text>
              <View style={styles.searchInputWrap}>
                <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Type dealer ID, name, phone or CNIC..."
                  placeholderTextColor="#9CA3AF"
                  value={subscriberSearch}
                  onChangeText={text => {
                    setSubscriberSearch(text);
                    if (selectedDealerId) setSelectedDealerId(null);
                  }}
                />
                {subscriberSearch.length > 0 ? (
                  <TouchableOpacity onPress={() => setSubscriberSearch('')}>
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
                        setSubscriberSearch('');
                        setDealerPage(1);
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

              {selectedDealerObj ? (
                <View style={styles.selectedChip}>
                  <Text style={styles.selectedChipId}>
                    {selectedDealerObj.id?.slice(0, 8) || '---'}
                  </Text>
                  <Text style={styles.selectedChipDot}>•</Text>
                  <Text style={styles.selectedChipName} numberOfLines={1}>
                    {selectedDealerObj.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedDealerId(null);
                      setDealerPage(1);
                    }}>
                    <X size={14} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {selectedDealerObj ? (
              <View>
                {renderDealerDetails()}

                <View style={styles.listTitleRow}>
                  <Text style={styles.listTitle}>
                    {selectedDealerObj.name}'s Collection History
                  </Text>
                  <Text style={styles.listCount}>{dealerHistory.length} entry(ies)</Text>
                </View>

                {dealerHistory.length > 0 ? (
                  <View>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderText, {flex: 1}]}>#</Text>
                      <Text style={[styles.tableHeaderText, {flex: 2}]}>Dealer</Text>
                      <Text style={[styles.tableHeaderText, {flex: 1.5}]}>Date</Text>
                      <Text style={[styles.tableHeaderText, {flex: 1.2}]}>Type</Text>
                      <Text style={[styles.tableHeaderText, {flex: 1.5}]}>Amount</Text>
                      <Text style={[styles.tableHeaderText, {flex: 1}]}>Status</Text>
                    </View>
                    {dealerPaginated.map((item, idx) => renderDealerRow(item, (dealerPage - 1) * dealerPageSize + idx))}
                  </View>
                ) : (
                  <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>💳</Text>
                    <Text style={styles.emptyTitle}>No payment history found</Text>
                    <Text style={styles.emptyText}>Receive a payment to see it here.</Text>
                  </View>
                )}

                {/* Dealer Pagination */}
                {dealerHistory.length > 0 ? (
                  <View style={styles.pagination}>
                    <Text style={styles.paginationInfo}>
                      Showing {dealerHistory.length === 0 ? 0 : (dealerPage - 1) * dealerPageSize + 1} to{' '}
                      {Math.min(dealerPage * dealerPageSize, dealerHistory.length)} of{' '}
                      {dealerHistory.length} entries
                    </Text>

                    <View style={styles.pageControls}>
                      <TouchableOpacity
                        style={[styles.pageBtn, dealerPage === 1 && styles.pageBtnDisabled]}
                        disabled={dealerPage === 1}
                        onPress={() => setDealerPage(prev => Math.max(1, prev - 1))}>
                        <ChevronLeft size={14} color={dealerPage === 1 ? '#D1D5DB' : '#374151'} />
                        <Text style={[styles.pageBtnText, dealerPage === 1 && styles.pageBtnTextDisabled]}>
                          Previous
                        </Text>
                      </TouchableOpacity>

                      {getDealerVisiblePages().map(p => (
                        <TouchableOpacity
                          key={p}
                          style={[styles.pageNum, dealerPage === p && styles.pageNumActive]}
                          onPress={() => setDealerPage(p)}>
                          <Text style={[styles.pageNumText, dealerPage === p && styles.pageNumTextActive]}>
                            {p}
                          </Text>
                        </TouchableOpacity>
                      ))}

                      <TouchableOpacity
                        style={[styles.pageBtn, dealerPage === dealerTotalPages && styles.pageBtnDisabled]}
                        disabled={dealerPage === dealerTotalPages}
                        onPress={() => setDealerPage(prev => Math.min(dealerTotalPages, prev + 1))}>
                        <Text style={[styles.pageBtnText, dealerPage === dealerTotalPages && styles.pageBtnTextDisabled]}>
                          Next
                        </Text>
                        <ChevronRight size={14} color={dealerPage === dealerTotalPages ? '#D1D5DB' : '#374151'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>No Dealer Selected</Text>
                <Text style={styles.emptyText}>
                  Search and select an overdue dealer to receive payments and view history.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Subscriber Receive Payment Dialog */}
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
                  <Text style={styles.fieldLabel}>Subscriber ID</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedSubscriber?.id?.slice(0, 8) || ''}
                    editable={false}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Subscriber Name</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedSubscriber?.name || ''}
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Received By</Text>
                <TextInput style={styles.fieldInput} value={subscriberRecoveryOfficerName} editable={false} />
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
                <TouchableOpacity style={styles.dateField} onPress={() => {}}>
                  <CalendarDays size={16} color="#6B7280" />
                  <Text style={styles.dateFieldText}>{formatDate(receiveDate)}</Text>
                  <ChevronDown size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <GradientButton
                colors={['#10B981', '#059669']}
                style={styles.submitBtn}
                onPress={handleSubscriberReceive}
                disabled={isSavingSubscriber || !receiveAmount}>
                {isSavingSubscriber ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Receive</Text>
                )}
              </GradientButton>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Dealer Receive Payment Dialog */}
      <Modal
        visible={showDealerReceiveDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDealerReceiveDialog(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Receive Dealer Payment</Text>
              <TouchableOpacity onPress={() => setShowDealerReceiveDialog(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.fieldGrid2}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Dealer ID</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedDealerObj?.id?.slice(0, 8) || ''}
                    editable={false}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Dealer Name</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedDealerObj?.name || ''}
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Received By</Text>
                <TextInput style={styles.fieldInput} value={dealerRecoveryOfficer} editable={false} />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Amount (PKR)</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  placeholder="Enter amount"
                  placeholderTextColor="#9CA3AF"
                  value={dealerReceiveAmount ? String(dealerReceiveAmount) : ''}
                  onChangeText={text => setDealerReceiveAmount(parseFloat(text) || 0)}
                />
              </View>

              <GradientButton
                colors={['#10B981', '#059669']}
                style={styles.submitBtn}
                onPress={handleDealerReceive}
                disabled={isSavingDealer || !dealerReceiveAmount}>
                {isSavingDealer ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Receive</Text>
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
    width: 160,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  tabBtnGradient: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabBtnActiveGradient: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
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
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 4,
    marginHorizontal: 16,
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
    marginHorizontal: 16,
  },
  rowCellId: {
    flex: 1,
    maxWidth: 40,
  },
  rowCellName: {
    flex: 2,
    paddingHorizontal: 8,
  },
  rowCellDate: {
    flex: 1.5,
    paddingHorizontal: 8,
  },
  rowCellChannel: {
    flex: 1.2,
    paddingHorizontal: 8,
  },
  rowCellAmount: {
    flex: 1.5,
    paddingHorizontal: 8,
  },
  rowCellStatus: {
    flex: 1,
    paddingHorizontal: 8,
  },
  rowCellReceivedBy: {
    flex: 1.5,
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
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgePaid: {backgroundColor: '#D1FAE5'},
  badgePaidText: {fontSize: 10, color: '#065F46', fontWeight: '700'},
  badgePending: {backgroundColor: '#FEF3C7'},
  badgePendingText: {fontSize: 10, color: '#92400E', fontWeight: '700'},
  empty: {alignItems: 'center', paddingVertical: 40, marginHorizontal: 16},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280', textAlign: 'center'},
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
  pageNumActive: {backgroundColor: '#EF4444', borderColor: '#EF4444'},
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
  fieldGrid2: {flexDirection: 'row', gap: 10, marginTop: 12},
  field: {flex: 1, marginTop: 12},
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
