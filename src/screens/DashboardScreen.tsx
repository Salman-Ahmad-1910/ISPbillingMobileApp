import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Users, Wallet, AlertCircle, LayoutDashboard} from 'lucide-react-native';
import {useAuth} from '../context/AuthContext';
import {getDashboardData} from '../api/dashboard';
import {getApiBaseUrl} from '../api/client';
import {DashboardData} from '../types';
import GaugeMeter from '../components/GaugeMeter';
import AreaChart from '../components/AreaChart';

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

type KpiCard = {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<{size?: number; color?: string}>;
  gradient: [string, string];
  bgLight: string;
};

export default function DashboardScreen() {
  const {user, companyId, companies, refreshCompanies} = useAuth();
  const navigation = useNavigation();
  const drawerStatus = useDrawerStatus();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetAmount, setTargetAmount] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const companyName =
    user?.company?.name || companies.find(c => c.id === companyId)?.name || '';

  useEffect(() => {
    const targetKey = `collection_target_${companyId ?? ''}`;
    AsyncStorage.getItem(targetKey)
      .then(stored => {
        const val = stored ? parseFloat(stored) : 0;
        if (!isNaN(val) && val > 0) {
          setTargetAmount(val);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => {
    if (!companies.length) {
      refreshCompanies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => {
    (async () => {
      if (!companyId) {
        return;
      }
      try {
        const base = await getApiBaseUrl();
        setLogoUrl(`${base}/uploads/company_images/${companyId}`);
      } catch {
        setLogoUrl(null);
      }
    })();
  }, [companyId]);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const result = await getDashboardData();
      setData(result);
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.response?.data?.error || 'Failed to load dashboard';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  const onRefresh = () => {
    fetchData(true);
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleTargetSave = useCallback(
    (target: number) => {
      setTargetAmount(target);
      AsyncStorage.setItem(`collection_target_${companyId ?? ''}`, String(target)).catch(() => {});
    },
    [companyId],
  );

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const kpiCards: KpiCard[] = [
    {
      title: 'Active Subscribers',
      value: String(data?.subscribersStats?.active ?? 0),
      change: `in ${companyName || 'company'}`,
      icon: Users,
      gradient: ['#2563EB', '#06B6D4'],
      bgLight: '#EFF6FF',
    },
    {
      title: 'Total Collection (Month)',
      value: `PKR ${(data?.totalCollectionMonth ?? 0).toLocaleString()}`,
      change: 'this month total',
      icon: Wallet,
      gradient: ['#059669', '#10B981'],
      bgLight: '#ECFDF5',
    },
    {
      title: 'Overdue Subscribers',
      value: String(data?.overdueCount ?? 0),
      change: 'unpaid accounts',
      icon: AlertCircle,
      gradient: ['#E11D48', '#F43F5E'],
      bgLight: '#FFF1F2',
    },
    {
      title: 'Total Overdue',
      value: `PKR ${(data?.overdueAmount ?? 0).toLocaleString()}`,
      change: 'past due amount',
      icon: AlertCircle,
      gradient: ['#DC2626', '#E11D48'],
      bgLight: '#FEF2F2',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View style={[styles.topBarAccent, {backgroundColor: '#2563EB'}]} />
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, {color: '#2563EB'}]}>Dashboard</Text>
      </View>

      {/* Company Banner */}
      <View style={styles.companyBanner}>
        {logoUrl ? (
          <Image
            source={{uri: logoUrl}}
            style={styles.logo}
            resizeMode="contain"
            onError={() => setLogoUrl(null)}
          />
        ) : (
          <View style={styles.logoFallback}>
            <LayoutDashboard size={22} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.companyInfo}>
          <Text style={styles.companyName} numberOfLines={1}>
            {companyName || 'Dashboard'}
          </Text>
          <Text style={styles.companySubtitle}>
            Here&apos;s a real-time overview of your network and business operations.
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
        showsVerticalScrollIndicator={false}>
        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          {kpiCards.map((kpi, index) => (
            <View key={index} style={[styles.kpiCard, {backgroundColor: kpi.bgLight}]}>
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIconBg, {backgroundColor: kpi.gradient[0]}]}>
                  <kpi.icon size={18} color="#FFFFFF" />
                </View>
                <View style={styles.kpiOverlay} />
              </View>
              <View style={styles.kpiBody}>
                <Text style={styles.kpiTitle}>{kpi.title}</Text>
                <Text style={[styles.kpiValue, {color: kpi.gradient[0]}]}>{kpi.value}</Text>
                <Text style={styles.kpiChange}>{kpi.change}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Gauge Meter */}
        <View style={styles.gaugeCard}>
          <GaugeMeter
            currentAmount={data?.totalCollectionMonth ?? 0}
            targetAmount={targetAmount}
            onTargetSave={handleTargetSave}
            size={200}
          />
        </View>

        {/* Charts */}
        <View style={styles.chartSection}>
          <AreaChart type="collection" />
        </View>
        <View style={styles.chartSection}>
          <AreaChart type="growth" liveActiveCount={data?.subscribersStats?.active} />
        </View>

        {/* Recent Payments */}
        <View style={styles.listCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconBg, {backgroundColor: '#ECFDF5'}]}>
                <Wallet size={16} color="#059669" />
              </View>
              <Text style={styles.sectionTitle}>Recent Payments</Text>
            </View>
          </View>
          <Text style={styles.sectionDesc}>Latest payments received from subscribers.</Text>
          {(data?.payments ?? []).length > 0 ? (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, {flex: 2}]}>Subscriber</Text>
                <Text style={[styles.tableHeaderText, {flex: 1, textAlign: 'right'}]}>
                  Amount (PKR)
                </Text>
                <Text style={[styles.tableHeaderText, {flex: 1, textAlign: 'right'}]}>Method</Text>
              </View>
              {(data?.payments ?? []).slice(0, 5).map((payment, index) => (
                <View
                  key={payment.id || index}
                  style={[styles.tableRow, index === 4 && styles.tableRowLast]}>
                  <View style={{flex: 2, flexDirection: 'row', alignItems: 'center'}}>
                    <View style={styles.paymentAvatar}>
                      <Text style={styles.paymentAvatarText}>
                        {payment.subscriberName?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.tableCell} numberOfLines={1}>
                        {payment.subscriberName}
                      </Text>
                      {payment.paymentDate ? (
                        <Text style={styles.tableCellDate} numberOfLines={1}>
                          {payment.paymentDate}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Text style={[styles.tableCellAmount, {flex: 1}]}>
                    {payment.amount?.toLocaleString()}
                  </Text>
                  <View style={{flex: 1, alignItems: 'flex-end'}}>
                    <View
                      style={[
                        styles.methodBadge,
                        {
                          backgroundColor:
                            payment.method === 'Cash'
                              ? '#D1FAE5'
                              : payment.method === 'Card'
                              ? '#DBEAFE'
                              : '#FEF3C7',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.methodText,
                          {
                            color:
                              payment.method === 'Cash'
                                ? '#065F46'
                                : payment.method === 'Card'
                                ? '#1E40AF'
                                : '#92400E',
                          },
                        ]}>
                        {payment.method}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.emptyList}>
              <Text style={styles.emptyListText}>No payments yet</Text>
            </View>
          )}
        </View>

        {/* Open Complaints */}
        <View style={styles.listCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconBg, {backgroundColor: '#FFF1F2'}]}>
                <AlertCircle size={16} color="#E11D48" />
              </View>
              <Text style={styles.sectionTitle}>Open Complaints</Text>
            </View>
          </View>
          <Text style={styles.sectionDesc}>Tickets that need attention from the support team.</Text>
          {(data?.complaints ?? []).filter(c => c.status !== 'resolved' && c.status !== 'closed')
            .length > 0 ? (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, {flex: 2}]}>Subscriber</Text>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>Category</Text>
                <Text style={[styles.tableHeaderText, {flex: 1, textAlign: 'right'}]}>Status</Text>
              </View>
              {(data?.complaints ?? [])
                .filter(c => c.status !== 'resolved' && c.status !== 'closed')
                .slice(0, 5)
                .map((complaint, index) => (
                  <View
                    key={complaint.id || index}
                    style={[styles.tableRow, index === 4 && styles.tableRowLast]}>
                    <View style={{flex: 2, flexDirection: 'row', alignItems: 'center'}}>
                      <View style={styles.complaintAvatar}>
                        <Text style={styles.complaintAvatarText}>
                          {complaint.subscriberName?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                      </View>
                      <Text style={styles.tableCell} numberOfLines={1}>
                        {complaint.subscriberName}
                      </Text>
                    </View>
                    <View style={{flex: 1}}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText} numberOfLines={1}>
                          {complaint.category}
                        </Text>
                      </View>
                    </View>
                    <View style={{flex: 1, alignItems: 'flex-end'}}>
                      <View
                        style={[
                          styles.statusBadge,
                          {backgroundColor: complaint.status === 'open' ? '#FEE2E2' : '#D1FAE5'},
                        ]}>
                        <Text
                          style={[
                            styles.statusText,
                            {color: complaint.status === 'open' ? '#DC2626' : '#065F46'},
                          ]}>
                          {complaint.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
            </>
          ) : (
            <View style={styles.emptyList}>
              <Text style={styles.emptyListText}>No open complaints</Text>
            </View>
          )}
        </View>

        {/* Empty State */}
        {data &&
          data.subscribersStats.active === 0 &&
          data.subscribersStats.suspended === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>No data yet</Text>
              <Text style={styles.emptyText}>
                Your dashboard will show data once you have subscribers and payments.
              </Text>
            </View>
          )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 50,
    marginLeft: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  topBarAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingRight: 8,
  },
  companyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  companySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  doorIconBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doorIconLine: {
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#374151',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 10,
    marginRight: 12,
  },
  logoFallback: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // KPI Cards
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  kpiIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiOverlay: {
    flex: 1,
  },
  kpiBody: {},
  kpiTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  kpiChange: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Gauge
  gaugeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
  },

  // Charts
  chartSection: {
    marginTop: 16,
  },

  // Lists
  listCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  sectionDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 10,
  },

  // Table
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
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 13,
    color: '#374151',
    marginLeft: 8,
  },
  tableCellDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 8,
    marginTop: 1,
  },
  tableCellAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    textAlign: 'right',
  },

  // Payment specific
  paymentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  methodText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Complaint specific
  complaintAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  complaintAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  // Empty list
  emptyList: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyListText: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
