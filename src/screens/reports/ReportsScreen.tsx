import React, {useCallback, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {
  BarChart3,
  Wallet,
  TriangleAlert,
  UserPlus,
  FileText,
  ChevronRight,
  RefreshCw,
} from 'lucide-react-native';
import ReportLayout from '../../components/ReportLayout';
import {GradientView} from '../../components/GradientView';
import {getDealerCollections} from '../../api/collections';
import {getDealers} from '../../api/dealers';
import {getBillingInvoices} from '../../api/subscribers';
import {Dealer, DealerCollection, Invoice} from '../../types';

type IconType = React.ComponentType<{size?: number; color?: string; strokeWidth?: number}>;

type ReportCard = {
  key: string;
  title: string;
  subtitle: string;
  screen: string;
  icon: IconType;
  gradient: [string, string];
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  accent?: string;
};

export default function ReportsScreen() {
  const nav = useNavigation<any>();
  const [collections, setCollections] = useState<DealerCollection[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [collectionsData, dealersData, invoicesData] = await Promise.all([
        getDealerCollections().catch(() => []),
        getDealers().catch(() => []),
        getBillingInvoices().catch(() => []),
      ]);
      setCollections(collectionsData);
      setDealers(dealersData);
      setInvoices(invoicesData);
    } catch {
      // handled by per-call fallbacks
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

  const cards: ReportCard[] = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const collectionsCount = collections.length;
    const collectionsAmount = collections.reduce((sum, c) => sum + (c.amount || 0), 0);

    const defaultersList = collections.filter(c => {
      const dueDate = new Date(c.collectionDate);
      return c.settlementStatus === 'pending' && dueDate.getTime() < today.getTime();
    });
    const defaultersCount = defaultersList.length;
    const defaultersAmount = defaultersList.reduce((sum, c) => sum + (c.amount || 0), 0);

    const activeDealerIds = new Set(collections.map(c => c.dealerId));
    const activeDealers = dealers.filter(d => activeDealerIds.has(d.id)).length;

    const invoicesCount = invoices.length;
    const invoicesAmount = invoices.reduce((sum, i) => sum + (i.amount || 0), 0);

    return [
      {
        key: 'collections',
        title: 'Collections',
        subtitle: 'Collections made by dealers',
        screen: 'Collections',
        icon: Wallet,
        gradient: ['#10B981', '#16A34A'],
        primaryLabel: 'Total Records',
        primaryValue: String(collectionsCount),
        secondaryLabel: 'Total Amount',
        secondaryValue: `PKR ${collectionsAmount.toLocaleString()}`,
      },
      {
        key: 'defaulters',
        title: 'Defaulters',
        subtitle: 'Pending collections past due date',
        screen: 'Defaulters',
        icon: TriangleAlert,
        gradient: ['#F59E0B', '#B45309'],
        primaryLabel: 'Total Defaulters',
        primaryValue: String(defaultersCount),
        secondaryLabel: 'Total Receivable',
        secondaryValue: `PKR ${defaultersAmount.toLocaleString()}`,
      },
      {
        key: 'new-dealers',
        title: 'New Dealers',
        subtitle: 'Registered dealers and activity status',
        screen: 'NewDealers',
        icon: UserPlus,
        gradient: ['#3B82F6', '#4F46E5'],
        primaryLabel: 'Total Dealers',
        primaryValue: String(dealers.length),
        secondaryLabel: 'Active',
        secondaryValue: String(activeDealers),
      },
      {
        key: 'invoices',
        title: 'Dealer Invoices',
        subtitle: 'Billing invoices against dealers',
        screen: 'DealerInvoices',
        icon: FileText,
        gradient: ['#14B8A6', '#0D9488'],
        primaryLabel: 'Total Invoices',
        primaryValue: String(invoicesCount),
        secondaryLabel: 'Total Amount',
        secondaryValue: `PKR ${invoicesAmount.toLocaleString()}`,
      },
    ];
  }, [collections, dealers, invoices]);

  return (
    <ReportLayout
      title="Reports"
      subtitle="Live overview of all dealer reports"
      icon={BarChart3}
      accent={['#059669', '#10B981']}
      refreshing={refreshing}
      onRefresh={() => fetchData(true)}>
      {loading ? (
        <View style={styles.loadingBox}>
          <RefreshCw size={22} color="#6B7280" />
          <Text style={styles.loadingText}>Loading reports data...</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {cards.map(card => (
            <ReportCardView key={card.key} card={card} onPress={() => nav.navigate(card.screen)} />
          ))}
        </View>
      )}
    </ReportLayout>
  );
}

function ReportCardView({card, onPress}: {card: ReportCard; onPress: () => void}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardHeader}>
        <GradientView colors={card.gradient} style={styles.cardIconBox}>
          <card.icon size={20} color="#FFFFFF" />
        </GradientView>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {card.subtitle}
          </Text>
        </View>
        <ChevronRight size={20} color="#9CA3AF" />
      </View>
      <View style={styles.kpis}>
        <View style={styles.kpiBlock}>
          <Text style={styles.kpiLabel}>{card.primaryLabel}</Text>
          <Text style={styles.kpiValue}>{card.primaryValue}</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiBlock}>
          <Text style={styles.kpiLabel}>{card.secondaryLabel}</Text>
          <Text style={styles.kpiValue}>{card.secondaryValue}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 60,
  },
  loadingText: {fontSize: 13, color: '#6B7280'},
  grid: {paddingHorizontal: 16, paddingTop: 8, gap: 12},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center'},
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  cardTitleWrap: {flex: 1},
  cardTitle: {fontSize: 16, fontWeight: '700', color: '#111827', letterSpacing: -0.3},
  cardSubtitle: {fontSize: 11, color: '#6B7280', marginTop: 2},
  kpis: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  kpiBlock: {flex: 1},
  kpiDivider: {width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 12},
  kpiLabel: {fontSize: 10, color: '#6B7280', fontWeight: '500'},
  kpiValue: {fontSize: 17, fontWeight: '800', color: '#111827', marginTop: 4},
});
