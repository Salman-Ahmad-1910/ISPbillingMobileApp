import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {Handshake, Filter, Search, CheckCircle, ChevronDown, Printer} from 'lucide-react-native';
import {getPayments} from '../../api/billing';
import {getConnections} from '../../api/connections';
import {areasApi} from '../../api/network';
import {getUsers} from '../../api/systemLogs';
import ReportLayout, {KpiRow, KpiCard} from '../../components/ReportLayout';
import OptionPickerSheet from '../../components/OptionPickerSheet';
import SubscriberReportPrintModal, {PrintColumn} from '../../components/SubscriberReportPrintModal';

const ACCENT: [string, string] = ['#7C3AED', '#6D28D9'];

const CONNECTION_OPTIONS = [
  {label: 'Both', value: 'both'},
  {label: 'Internet', value: 'internet'},
  {label: 'TV Cable', value: 'tv_cable'},
];

interface AllocatedCollectionRecord {
  key: string;
  id: string;
  subscriberName: string;
  subscriberId: string;
  connectionId: string;
  billId: string;
  amount: number;
  collectionDate: string;
  address: string;
  sublocality: string;
  connectionType: string;
  collectedBy: string;
  method: string;
  officerId: string;
  officerName: string;
}

function resolveAreaName(area: any): string {
  return [area.city, area.zone, area.locality].filter(Boolean).join(', ');
}

function formatDate(ts: string): string {
  if (!ts) {
    return '—';
  }
  const d = new Date(ts);
  if (isNaN(d.getTime())) {
    return ts;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function firstOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AllocatedCollectionsScreen() {
  const [payments, setPayments] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedOfficer, setSelectedOfficer] = useState('all');
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [sublocality, setSublocality] = useState('all');
  const [connectionType, setConnectionType] = useState('both');

  const [officerPicker, setOfficerPicker] = useState(false);
  const [sublocalityPicker, setSublocalityPicker] = useState(false);
  const [connectionPicker, setConnectionPicker] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [payData, connData, areaData, userData] = await Promise.all([
        getPayments(),
        getConnections(),
        areasApi.list(),
        getUsers(),
      ]);
      setPayments(payData as any[]);
      setConnections(connData as any[]);
      setAreas(areaData as any[]);
      setUsers(userData as any[]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load collections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const officers = useMemo(() => {
    const list = (users as any[])
      .filter((u: any) => u.role === 'staff' || u.role === 'recovery_officer')
      .map((u: any) => ({id: u.id, name: u.name}));
    list.sort((a: any, b: any) => a.name.localeCompare(b.name));
    return list;
  }, [users]);

  const officerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (users as any[]).forEach((u: any) => {
      if (u.id) map[u.id] = u.name;
    });
    return map;
  }, [users]);

  const areaMap = useMemo(() => {
    const map: Record<string, {name: string; recoveryOfficerId: string}> = {};
    areas.forEach((a: any) => {
      map[a.id] = {name: resolveAreaName(a), recoveryOfficerId: a.recoveryOfficerId || ''};
    });
    return map;
  }, [areas]);

  const connMap = useMemo(() => {
    const map: Record<string, {internetId: string; connectionType: string; address: string; sublocalityId: string}> = {};
    connections.forEach((c: any) => {
      map[c.id] = {
        internetId: c.internetId || '',
        connectionType: c.connectionType || '',
        address: c.address || '',
        sublocalityId: c.sublocalityId || '',
      };
    });
    return map;
  }, [connections]);

  const allRecords: AllocatedCollectionRecord[] = useMemo(() => {
    const records: AllocatedCollectionRecord[] = [];
    (payments as any[]).forEach((p: any) => {
      const conn = connMap[p.subscriberId || ''] || {};
      const area = areaMap[conn.sublocalityId] || null;
      if (!area || !area.recoveryOfficerId) return;

      records.push({
        key: p.id,
        id: p.id,
        subscriberName: p.subscriberName || '',
        subscriberId: conn.internetId || '',
        connectionId: p.subscriberId || p.connectionId || '',
        billId: String(p.billNo || '') || p.id?.slice(0, 8) || '',
        amount: Number(p.amount) || 0,
        collectionDate: p.paymentDate || p.createdAt || p.created_at || '',
        address: p.address || conn.address || '',
        sublocality: p.areaName || area.name || '',
        connectionType: conn.connectionType || 'internet',
        collectedBy: p.collectedByName || '',
        method: p.method || 'cash',
        officerId: area.recoveryOfficerId,
        officerName: officerNameMap[area.recoveryOfficerId] || '',
      });
    });
    return records;
  }, [payments, connMap, areaMap, officerNameMap]);

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => {
      if (r.sublocality) set.add(r.sublocality);
    });
    return Array.from(set);
  }, [allRecords]);

  const filteredData = useMemo(() => {
    return allRecords.filter(item => {
      if (selectedOfficer !== 'all' && item.officerId !== selectedOfficer) return false;
      if (sublocality !== 'all' && item.sublocality !== sublocality) return false;
      if (connectionType !== 'both' && item.connectionType !== connectionType) return false;

      const itemDate = new Date(item.collectionDate);
      const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
      const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
      if (from && !isNaN(from.getTime()) && itemDate < from) return false;
      if (to && !isNaN(to.getTime()) && itemDate > to) return false;
      return true;
    });
  }, [allRecords, selectedOfficer, sublocality, connectionType, fromDate, toDate]);

  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const printColumns: PrintColumn<AllocatedCollectionRecord>[] = [
    {header: '#', render: (_: AllocatedCollectionRecord, i: number) => i + 1},
    {header: 'Subscriber Name', render: item => item.subscriberName || '—'},
    {header: 'Subscriber ID', render: item => item.subscriberId.slice(0, 8) || '—'},
    {header: 'Bill ID', render: item => item.billId || '—'},
    {header: 'Amount (PKR)', align: 'right', render: item => item.amount.toLocaleString()},
    {header: 'Collection Date', render: item => formatDate(item.collectionDate)},
    {header: 'Address', render: item => item.address || '—'},
    {header: 'Sublocality', render: item => item.sublocality || '—'},
    {header: 'Connection Type', render: item => capitalize(item.connectionType)},
    {header: 'Allocated Officer', render: item => item.officerName || '—'},
    {header: 'Transaction Type', render: item => capitalize(item.method)},
  ];

  const sublocalityOptions = allSublocalities.map(loc => ({label: loc, value: loc}));

  const resetFilters = () => {
    setSelectedOfficer('all');
    setFromDate(firstOfMonth());
    setToDate(today());
    setSublocality('all');
    setConnectionType('both');
  };

  return (
    <ReportLayout
      title="Allocated Collections"
      subtitle="Collections made in areas assigned to a staff member or recovery officer"
      icon={Handshake}
      accent={ACCENT}
      refreshing={refreshing}
      onRefresh={() => load(true)}>
      <KpiRow>
        <KpiCard label="Total Collections" value={filteredData.length} icon={Handshake} bg="#EDE9FE" fg="#7C3AED" />
        <KpiCard
          label="Total Amount"
          value={`PKR ${totalAmount.toLocaleString()}`}
          icon={CheckCircle}
          bg="#D1FAE5"
          fg="#059669"
        />
      </KpiRow>

      <View style={styles.card}>
        <View style={styles.filterHeader}>
          <Filter size={15} color="#374151" />
          <Text style={styles.filterTitle}>Filters</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <View style={styles.filterField}>
            <Text style={styles.label}>Staff / Recovery Officer</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setOfficerPicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, selectedOfficer === 'all' && styles.placeholder]} numberOfLines={1}>
                {selectedOfficer === 'all'
                  ? 'All Allocated Areas'
                  : officers.find(o => o.id === selectedOfficer)?.name || 'All Allocated Areas'}
              </Text>
              <ChevronDown size={15} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>From Date</Text>
            <TextInput
              style={styles.input}
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>To Date</Text>
            <TextInput
              style={styles.input}
              value={toDate}
              onChangeText={setToDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>Sublocality</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setSublocalityPicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, sublocality === 'all' && styles.placeholder]} numberOfLines={1}>
                {sublocality === 'all'
                  ? 'All'
                  : sublocalityOptions.find(o => o.value === sublocality)?.label || sublocality}
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
        </ScrollView>
        <View style={styles.applyRow}>
          <TouchableOpacity style={styles.resetBtn} onPress={resetFilters} activeOpacity={0.85}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      <OptionPickerSheet
        visible={officerPicker}
        title="Select Staff / Recovery Officer"
        options={officers.map(o => ({label: o.name, value: o.id}))}
        value={selectedOfficer}
        emptyLabel="All Allocated Areas"
        onSelect={setSelectedOfficer}
        onClose={() => setOfficerPicker(false)}
      />
      <OptionPickerSheet
        visible={sublocalityPicker}
        title="Select Sublocality"
        options={sublocalityOptions}
        value={sublocality}
        emptyLabel="All"
        onSelect={setSublocality}
        onClose={() => setSublocalityPicker(false)}
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
              <Text style={styles.listTitle}>Allocated Collections List</Text>
              <Text style={styles.listCount}>
                {selectedOfficer !== 'all'
                  ? `Officer: ${officers.find(o => o.id === selectedOfficer)?.name || '-'}`
                  : 'Officer: All Allocated Areas'}
                {' — '}
                From: {fromDate || '—'} To: {toDate || '—'}
              </Text>
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
            <Handshake size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>No allocated collections found</Text>
            <Text style={styles.emptySub}>Try adjusting the filters.</Text>
          </View>
        ) : (
          filteredData.map(item => (
            <View key={item.key} style={styles.logCard}>
              <View style={styles.logTop}>
                <View style={styles.subInfo}>
                  <Text style={styles.subName} numberOfLines={1}>
                    {item.subscriberName || '—'}
                  </Text>
                  <Text style={styles.subId} numberOfLines={1}>
                    {item.subscriberId.slice(0, 8) || '—'} · Bill #{item.billId || '—'}
                  </Text>
                </View>
                <View style={styles.amountBadge}>
                  <Text style={styles.amountBadgeText}>PKR {item.amount.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Collection Date</Text>
                  <Text style={styles.metaValue}>{formatDate(item.collectionDate)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Connection Type</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {item.connectionType || '—'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Sublocality</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {item.sublocality || '—'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Transaction Type</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {item.method || '—'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Collected By</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {item.collectedBy || '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.metaGrid}>
                <View style={styles.metaItemWide}>
                  <Text style={styles.metaLabel}>Address</Text>
                  <Text style={styles.metaValue} numberOfLines={2}>
                    {item.address || '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.officerRow}>
                <View style={styles.officerBadge}>
                  <Handshake size={12} color="#6D28D9" />
                  <Text style={styles.officerText}>{item.officerName || '—'}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <SubscriberReportPrintModal
        visible={printOpen}
        onClose={() => setPrintOpen(false)}
        title="ALLOCATED COLLECTIONS REPORT"
        subtitle={`From: ${fromDate || '—'} — To: ${toDate || '—'}`}
        accent={ACCENT[0]}
        emptyMessage="No allocated collections found for the selected criteria."
        jobName="Allocated-Collections-Report"
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
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    color: '#111827',
  },
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
  printBtnText: {fontSize: 12, fontWeight: '700', color: '#7C3AED'},
  listTitle: {fontSize: 15, fontWeight: '700', color: '#111827'},
  listCount: {fontSize: 12, color: '#6B7280', marginTop: 2},
  logCard: {
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  logTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  subInfo: {flex: 1, marginRight: 8},
  subName: {fontSize: 14, fontWeight: '700', color: '#111827'},
  subId: {fontSize: 12, color: '#6B7280', fontFamily: 'monospace', marginTop: 1},
  amountBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  amountBadgeText: {fontSize: 12, fontWeight: '700', color: '#047857'},
  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 10},
  metaItem: {flexBasis: '45%', flexGrow: 1},
  metaItemWide: {flexBasis: '100%'},
  metaLabel: {fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase'},
  metaValue: {fontSize: 13, color: '#111827', fontWeight: '500', marginTop: 1},
  officerRow: {marginTop: 10},
  officerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  officerText: {fontSize: 11, fontWeight: '700', color: '#6D28D9'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyText: {fontSize: 15, fontWeight: '600', color: '#6B7280', marginTop: 10},
  emptySub: {fontSize: 12, color: '#9CA3AF', marginTop: 4},
});
