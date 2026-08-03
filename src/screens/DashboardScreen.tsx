import React, {useCallback, useState} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {DrawerActions} from '@react-navigation/drawer';
import {useAuth} from '../context/AuthContext';
import {getDashboardData} from '../api/dashboard';
import {DashboardData} from '../types';
import {BarChart} from '../components/Charts';

const {width} = Dimensions.get('window');

export default function DashboardScreen() {
  const {user} = useAuth();
  const navigation = useNavigation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetAmount, setTargetAmount] = useState(0);

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

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1F2937" />
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

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(0);
  };

  const totalCollection = data?.totalCollectionMonth || 0;
  const gaugePercentage = targetAmount > 0 ? Math.min((totalCollection / targetAmount) * 100, 100) : 0;

  const kpiCards = [
    {
      title: 'Active Subscribers',
      value: data?.subscribersStats?.active || 0,
      change: 'in company',
      gradient: ['#2563EB', '#06B6D4'],
      bgLight: '#EFF6FF',
    },
    {
      title: 'Total Collection (Month)',
      value: `PKR ${(data?.totalCollectionMonth || 0).toLocaleString()}`,
      change: 'this month total',
      gradient: ['#059669', '#10B981'],
      bgLight: '#ECFDF5',
    },
    {
      title: 'Overdue Subscribers',
      value: data?.overdueCount || 0,
      change: 'unpaid accounts',
      gradient: ['#E11D48', '#F43F5E'],
      bgLight: '#FFF1F2',
    },
    {
      title: 'Total Overdue',
      value: `PKR ${(data?.overdueAmount || 0).toLocaleString()}`,
      change: 'past due amount',
      gradient: ['#DC2626', '#E11D48'],
      bgLight: '#FEF2F2',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Real-time overview of your network and business operations
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1F2937']} />
        }
        showsVerticalScrollIndicator={false}>
        {/* KPI Cards */}
        {data && (
          <View style={styles.kpiGrid}>
            {kpiCards.map((kpi, index) => (
              <View key={index} style={[styles.kpiCard, {borderLeftColor: kpi.gradient[0]}]}>
                <View style={[styles.kpiIconBg, {backgroundColor: kpi.bgLight}]}>
                  <Text style={styles.kpiIcon}>
                    {index === 0 ? '👥' : index === 1 ? '💰' : index === 2 ? '⚠️' : '📊'}
                  </Text>
                </View>
                <Text style={styles.kpiTitle}>{kpi.title}</Text>
                <Text style={[styles.kpiValue, {color: kpi.gradient[0]}]}>{kpi.value}</Text>
                <Text style={styles.kpiChange}>{kpi.change}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Gauge Meter */}
        {data && (
          <View style={styles.gaugeSection}>
            <View style={styles.gaugeCard}>
              <View style={styles.gaugeHeader}>
                <Text style={styles.gaugeTitle}>Collection Target</Text>
                <TouchableOpacity
                  style={styles.setTargetButton}
                  onPress={() => {
                    // Placeholder for target setting
                  }}>
                  <Text style={styles.setTargetText}>Set Target</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.gaugeContent}>
                <View style={styles.gaugeBar}>
                  <View style={styles.gaugeBarBg}>
                    <View
                      style={[
                        styles.gaugeBarFill,
                        {
                          width: `${gaugePercentage}%`,
                          backgroundColor:
                            gaugePercentage >= 80
                              ? '#10B981'
                              : gaugePercentage >= 50
                              ? '#F59E0B'
                              : '#EF4444',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.gaugePercentage}>{gaugePercentage.toFixed(0)}%</Text>
                </View>
                <Text style={styles.gaugeLabel}>
                  {gaugePercentage >= 100
                    ? 'Target Achieved!'
                    : gaugePercentage >= 80
                    ? 'Almost There'
                    : gaugePercentage >= 50
                    ? 'On Track'
                    : gaugePercentage >= 20
                    ? 'Getting Started'
                    : 'Just Started'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Charts */}
        {data && data.dailyCollection.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Daily Collection</Text>
            <View style={styles.chartCard}>
              <BarChart
                data={data.dailyCollection.map(p => ({
                  ...p,
                  label: p.label.length > 10 ? p.label.slice(5, 10) : p.label,
                }))}
                height={180}
                color="#2563EB"
              />
            </View>
          </View>
        )}

        {data && data.subscriberGrowth.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Subscriber Growth</Text>
            <View style={styles.chartCard}>
              <BarChart
                data={data.subscriberGrowth.map(p => ({
                  ...p,
                  label: p.label.length > 7 ? p.label.slice(5, 7) : p.label,
                }))}
                height={180}
                color="#10B981"
              />
            </View>
          </View>
        )}

        {/* Recent Payments */}
        {data && data.payments.length > 0 && (
          <View style={styles.listSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Payments</Text>
              <Text style={styles.sectionCount}>{data.payments.length}</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, {flex: 2}]}>Subscriber</Text>
              <Text style={[styles.tableHeaderText, {flex: 1, textAlign: 'right'}]}>Amount</Text>
              <Text style={[styles.tableHeaderText, {flex: 1, textAlign: 'right'}]}>Method</Text>
            </View>
            {data.payments.slice(0, 5).map((payment, index) => (
              <View
                key={payment.id || index}
                style={[styles.tableRow, index === Math.min(data.payments.length, 5) - 1 && styles.tableRowLast]}>
                <View style={{flex: 2, flexDirection: 'row', alignItems: 'center'}}>
                  <View style={styles.paymentAvatar}>
                    <Text style={styles.paymentAvatarText}>
                      {payment.subscriberName?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text style={styles.tableCell} numberOfLines={1}>
                    {payment.subscriberName}
                  </Text>
                </View>
                <Text style={[styles.tableCellAmount, {flex: 1}]}>
                  PKR {payment.amount?.toLocaleString()}
                </Text>
                <View style={{flex: 1, alignItems: 'flex-end'}}>
                  <View style={[
                    styles.methodBadge,
                    {backgroundColor: payment.method === 'Cash' ? '#D1FAE5' : payment.method === 'Card' ? '#DBEAFE' : '#FEF3C7'}
                  ]}>
                    <Text style={[
                      styles.methodText,
                      {color: payment.method === 'Cash' ? '#065F46' : payment.method === 'Card' ? '#1E40AF' : '#92400E'}
                    ]}>
                      {payment.method}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Open Complaints */}
        {data && data.complaints.length > 0 && (
          <View style={styles.listSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Open Complaints</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{data.complaintsCount}</Text>
              </View>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, {flex: 2}]}>Subscriber</Text>
              <Text style={[styles.tableHeaderText, {flex: 1}]}>Category</Text>
              <Text style={[styles.tableHeaderText, {flex: 1, textAlign: 'right'}]}>Status</Text>
            </View>
            {data.complaints.slice(0, 5).map((complaint, index) => (
              <View
                key={complaint.id || index}
                style={[styles.tableRow, index === Math.min(data.complaints.length, 5) - 1 && styles.tableRowLast]}>
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
                    <Text style={styles.categoryText}>{complaint.category}</Text>
                  </View>
                </View>
                <View style={{flex: 1, alignItems: 'flex-end'}}>
                  <View style={[
                    styles.statusBadge,
                    {backgroundColor: complaint.status === 'open' ? '#FEE2E2' : '#D1FAE5'}
                  ]}>
                    <Text style={[
                      styles.statusText,
                      {color: complaint.status === 'open' ? '#DC2626' : '#065F46'}
                    ]}>
                      {complaint.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuIcon: {
    fontSize: 20,
    color: '#374151',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
    gap: 10,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiIcon: {
    fontSize: 20,
  },
  kpiTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  kpiChange: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Gauge
  gaugeSection: {
    marginTop: 16,
  },
  gaugeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  gaugeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  setTargetButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  setTargetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  gaugeContent: {
    alignItems: 'center',
  },
  gaugeBar: {
    width: '100%',
    alignItems: 'center',
  },
  gaugeBarBg: {
    width: '100%',
    height: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    overflow: 'hidden',
  },
  gaugeBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  gaugePercentage: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  gaugeLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },

  // Charts
  chartSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Lists
  listSection: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionCount: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  badge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
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
