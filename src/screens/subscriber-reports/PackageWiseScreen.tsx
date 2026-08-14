import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {Box, Filter, Search, Users, ChevronDown, Printer} from 'lucide-react-native';
import {getPackages} from '../../api/subscribers';
import {getConnections} from '../../api/connections';
import ReportLayout, {KpiRow, KpiCard} from '../../components/ReportLayout';
import OptionPickerSheet from '../../components/OptionPickerSheet';
import SubscriberReportPrintModal, {PrintColumn} from '../../components/SubscriberReportPrintModal';

const ACCENT: [string, string] = ['#0EA5E9', '#2563EB'];

const CONNECTION_OPTIONS = [
  {label: 'Both', value: 'both'},
  {label: 'Internet', value: 'internet'},
  {label: 'TV Cable', value: 'tv_cable'},
];

interface PackageData {
  packageName: string;
  amount: number;
  subscriberCount: number;
}

export default function PackageWiseScreen() {
  const [packages, setPackages] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedPackage, setSelectedPackage] = useState('all');
  const [connectionType, setConnectionType] = useState('both');
  const [searchTerm, setSearchTerm] = useState('');

  const [packagePicker, setPackagePicker] = useState(false);
  const [connectionPicker, setConnectionPicker] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [pkgData, connData] = await Promise.all([getPackages(), getConnections()]);
      setPackages(pkgData as any[]);
      setConnections(connData as any[]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load package data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const packageData: PackageData[] = useMemo(() => {
    return packages
      .map((pkg: any) => {
        const pkgName = pkg.name || '';
        const count = connections.filter((c: any) => {
          const matchesInternet = c.packageInternet && c.packageInternet === pkgName;
          const matchesCable = c.packageCable && c.packageCable === pkgName;
          const typeMatch =
            connectionType === 'both' ||
            (connectionType === 'internet' && matchesInternet) ||
            (connectionType === 'tv_cable' && matchesCable);
          return typeMatch && (matchesInternet || matchesCable);
        }).length;
        return {
          packageName: pkgName,
          amount: Number(pkg.salePrice) || Number(pkg.price) || 0,
          subscriberCount: count,
        };
      })
      .filter((p: PackageData) => p.packageName);
  }, [packages, connections, connectionType]);

  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return packageData.filter(item => {
      const pkgMatch = selectedPackage === 'all' || item.packageName === selectedPackage;
      const searchMatch = !q || item.packageName.toLowerCase().includes(q);
      return pkgMatch && searchMatch;
    });
  }, [packageData, selectedPackage, searchTerm]);

  const totalSubscribers = filteredData.reduce((sum, item) => sum + item.subscriberCount, 0);

  const printColumns: PrintColumn<PackageData>[] = [
    {header: '#', render: (_: PackageData, i: number) => i + 1},
    {header: 'Package Name', render: item => item.packageName},
    {header: 'Amount (PKR)', align: 'right', render: item => item.amount.toLocaleString()},
    {header: 'Subscriber Count', align: 'right', render: item => item.subscriberCount},
  ];

  const packageOptions = packages.map((p: any) => ({label: p.name || '', value: p.name || ''})).filter(o => o.value);

  const resetFilters = () => {
    setSelectedPackage('all');
    setConnectionType('both');
    setSearchTerm('');
  };

  return (
    <ReportLayout
      title="Package Wise List"
      subtitle="View package-wise subscriber distribution and details"
      icon={Box}
      accent={ACCENT}
      refreshing={refreshing}
      onRefresh={() => load(true)}>
      <KpiRow>
        <KpiCard label="Total Packages" value={filteredData.length} icon={Box} bg="#E0F2FE" fg="#0284C7" />
        <KpiCard
          label="Total Subscribers"
          value={totalSubscribers}
          icon={Users}
          bg="#FEF3C7"
          fg="#D97706"
        />
      </KpiRow>

      <View style={styles.card}>
        <View style={styles.filterHeader}>
          <Filter size={15} color="#374151" />
          <Text style={styles.filterTitle}>Filters</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <View style={styles.filterField}>
            <Text style={styles.label}>Package</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setPackagePicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, selectedPackage === 'all' && styles.placeholder]} numberOfLines={1}>
                {selectedPackage === 'all'
                  ? 'All Packages'
                  : packageOptions.find(o => o.value === selectedPackage)?.label || selectedPackage}
              </Text>
              <ChevronDown size={15} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>Connection Type</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setConnectionPicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, connectionType === 'both' && styles.placeholder]}>
                {CONNECTION_OPTIONS.find(o => o.value === connectionType)?.label || connectionType}
              </Text>
              <ChevronDown size={15} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>Search</Text>
            <View style={styles.searchBox}>
              <Search size={14} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Package name..."
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </ScrollView>
        <View style={styles.applyRow}>
          <TouchableOpacity style={styles.resetBtn} onPress={resetFilters} activeOpacity={0.85}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      <OptionPickerSheet
        visible={packagePicker}
        title="Select Package"
        options={packageOptions}
        value={selectedPackage}
        emptyLabel="All Packages"
        onSelect={setSelectedPackage}
        onClose={() => setPackagePicker(false)}
      />
      <OptionPickerSheet
        visible={connectionPicker}
        title="Select Connection Type"
        options={CONNECTION_OPTIONS}
        value={connectionType}
        emptyLabel="Both"
        onSelect={setConnectionType}
        onClose={() => setConnectionPicker(false)}
      />

      <View style={styles.card}>
        <View style={styles.listHeader}>
          <View style={styles.listHeaderRow}>
            <View style={styles.listHeaderInfo}>
              <Text style={styles.listTitle}>Package Wise Reports</Text>
              <Text style={styles.listCount}>Package-wise subscriber distribution</Text>
            </View>
            <TouchableOpacity
              style={styles.printBtn}
              onPress={() => setPrintOpen(true)}
              activeOpacity={0.85}>
              <Printer size={15} color={ACCENT[0]} />
              <Text style={styles.printBtnText}>Print</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={ACCENT[0]} />
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.empty}>
            <Box size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>No package data found</Text>
            <Text style={styles.emptySub}>Try adjusting the filters.</Text>
          </View>
        ) : (
          filteredData.map((item, i) => (
            <View key={item.packageName} style={styles.logCard}>
              <View style={styles.pkgIndex}>
                <Text style={styles.pkgIndexText}>{i + 1}</Text>
              </View>
              <View style={styles.pkgInfo}>
                <Text style={styles.pkgName} numberOfLines={2}>
                  {item.packageName}
                </Text>
                <Text style={styles.pkgAmount}>PKR {item.amount.toLocaleString()}</Text>
              </View>
              <View style={styles.countBox}>
                <Text style={styles.countValue}>{item.subscriberCount}</Text>
                <Text style={styles.countLabel}>Subscribers</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <SubscriberReportPrintModal
        visible={printOpen}
        onClose={() => setPrintOpen(false)}
        title="PACKAGE WISE REPORT"
        subtitle="Package-wise subscriber distribution"
        accent={ACCENT[0]}
        jobName="Package-Wise-Report"
        columns={printColumns}
        data={filteredData}
      />
    </ReportLayout>
  );
}

const styles = StyleSheet.create({
  center: {paddingVertical: 40, justifyContent: 'center', alignItems: 'center'},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  filterHeader: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12},
  filterTitle: {fontSize: 14, fontWeight: '700', color: '#111827'},
  filterScroll: {flexDirection: 'row', gap: 10, paddingBottom: 2},
  filterField: {width: 170},
  label: {fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 5},
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  selectText: {fontSize: 13, color: '#111827', flex: 1, marginRight: 6},
  placeholder: {color: '#9CA3AF'},
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchInput: {flex: 1, paddingVertical: 9, fontSize: 13, color: '#111827'},
  applyRow: {flexDirection: 'row', gap: 10, marginTop: 6},
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
  },
  resetText: {fontSize: 13, fontWeight: '600', color: '#374151'},
  listHeader: {marginBottom: 10},
  listHeaderRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
  listHeaderInfo: {flex: 1},
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  printBtnText: {fontSize: 12, fontWeight: '700', color: '#0EA5E9'},
  listTitle: {fontSize: 15, fontWeight: '700', color: '#111827'},
  listCount: {fontSize: 12, color: '#6B7280', marginTop: 2},
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  pkgIndex: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pkgIndexText: {fontSize: 13, fontWeight: '700', color: '#0284C7'},
  pkgInfo: {flex: 1, marginRight: 8},
  pkgName: {fontSize: 14, fontWeight: '700', color: '#111827'},
  pkgAmount: {fontSize: 12, color: '#6B7280', marginTop: 2},
  countBox: {
    alignItems: 'flex-end',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countValue: {fontSize: 15, fontWeight: '800', color: '#D97706'},
  countLabel: {fontSize: 10, color: '#B45309', fontWeight: '600'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyText: {fontSize: 15, fontWeight: '600', color: '#6B7280', marginTop: 10},
  emptySub: {fontSize: 12, color: '#9CA3AF', marginTop: 4},
});
