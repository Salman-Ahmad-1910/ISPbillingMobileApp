import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {UserPlus, Filter, Search, CheckCircle, ChevronDown, Printer} from 'lucide-react-native';
import {getConnections} from '../../api/connections';
import {areasApi} from '../../api/network';
import {getUsers} from '../../api/systemLogs';
import ReportLayout, {KpiRow, KpiCard, GreenButton} from '../../components/ReportLayout';
import OptionPickerSheet from '../../components/OptionPickerSheet';
import SubscriberReportPrintModal, {PrintColumn} from '../../components/SubscriberReportPrintModal';

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const ACCENT: [string, string] = ['#10B981', '#0D9488'];
const PAGE_SIZES = [10, 50, 100];

const CONNECTION_OPTIONS = [
  {label: 'Both', value: 'both'},
  {label: 'Internet', value: 'internet'},
  {label: 'TV Cable', value: 'tv_cable'},
];

const STATUS_OPTIONS = [
  {label: 'All', value: 'all'},
  {label: 'Active', value: 'active'},
  {label: 'Deactivated', value: 'deactivated'},
];

interface NewSubscriberRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  phone: string;
  address: string;
  sublocality: string;
  connectionType: string;
  status: string;
  createdDate: string;
  createdBy: string;
}

function resolveAreaName(areas: any[], sublocalityId?: string): string {
  if (!sublocalityId) {
    return '';
  }
  const area = areas.find((a: any) => a.id === sublocalityId);
  if (!area) {
    return '';
  }
  return [area.city, area.zone, area.locality].filter(Boolean).join(', ');
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

function statusStyle(status: string): {bg: string; fg: string} {
  const s = (status || '').toLowerCase();
  if (s === 'active') {
    return {bg: '#DCFCE7', fg: '#15803D'};
  }
  if (s === 'deactivated') {
    return {bg: '#FEE2E2', fg: '#B91C1C'};
  }
  return {bg: '#F3F4F6', fg: '#4B5563'};
}

export default function NewSubscribersScreen() {
  const [connections, setConnections] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [sublocality, setSublocality] = useState('all');
  const [connectionType, setConnectionType] = useState('both');
  const [statusFilter, setStatusFilter] = useState('all');

  const [sublocalityPicker, setSublocalityPicker] = useState(false);
  const [connectionPicker, setConnectionPicker] = useState(false);
  const [statusPicker, setStatusPicker] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [connData, areaData, userData] = await Promise.all([getConnections(), areasApi.list(), getUsers()]);
      setConnections(connData as any[]);
      setAreas(areaData as any[]);
      setUsers(userData as any[]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load subscribers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u: any) => {
      if (u.id) {
        map[u.id] = u.name;
      }
    });
    return map;
  }, [users]);

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    connections.forEach((c: any) => {
      const areaName = resolveAreaName(areas, c.sublocalityId);
      if (areaName) {
        set.add(areaName);
      }
    });
    return Array.from(set).sort();
  }, [connections, areas]);

  const allRecords: NewSubscriberRecord[] = useMemo(
    () =>
      connections.map((c: any) => ({
        id: c.id,
        subscriberName: c.name || '',
        subscriberId: c.internetId || '',
        phone: c.cell || c.mobile || '',
        address: c.address || '',
        sublocality: resolveAreaName(areas, c.sublocalityId),
        connectionType: c.connectionType || 'both',
        status: c.status || 'active',
        createdDate: c.createdAt || c.installationDate || '',
        createdBy: userMap[c.createdBy] || '',
      })),
    [connections, areas, userMap],
  );

  const filteredData = useMemo(() => {
    if (!showReport) {
      return [];
    }
    return allRecords.filter(item => {
      const itemDate = new Date(item.createdDate);
      if (isNaN(itemDate.getTime())) {
        return false;
      }
      const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
      const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
      if (from && !isNaN(from.getTime()) && itemDate < from) {
        return false;
      }
      if (to && !isNaN(to.getTime()) && itemDate > to) {
        return false;
      }
      const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
      const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;
      const statusMatch = statusFilter === 'all' || item.status === statusFilter;
      return sublocalityMatch && connectionMatch && statusMatch;
    });
  }, [allRecords, fromDate, toDate, sublocality, connectionType, statusFilter, showReport]);

  const activeRecords = filteredData.filter(r => r.status === 'active').length;
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filteredData.slice((safePage - 1) * pageSize, safePage * pageSize);

  const printColumns: PrintColumn<NewSubscriberRecord>[] = [
    {header: '#', render: (_: NewSubscriberRecord, i: number) => i + 1},
    {header: 'Subscriber Name', render: item => item.subscriberName || '—'},
    {header: 'Subscriber ID', render: item => item.subscriberId || '—'},
    {header: 'Phone', render: item => item.phone || '—'},
    {header: 'Address', render: item => item.address || '—'},
    {header: 'Sublocality', render: item => item.sublocality || '—'},
    {header: 'Connection Type', render: item => capitalize(item.connectionType)},
    {header: 'Status', render: item => capitalize(item.status)},
    {header: 'Created Date', render: item => formatDate(item.createdDate)},
    {header: 'Created By', render: item => item.createdBy || '—'},
  ];

  const sublocalityOptions = allSublocalities.map(loc => ({label: loc, value: loc}));

  const resetFilters = () => {
    setFromDate(firstOfMonth());
    setToDate(today());
    setSublocality('all');
    setConnectionType('both');
    setStatusFilter('all');
    setShowReport(false);
    setCurrentPage(1);
  };

  return (
    <ReportLayout
      title="New Subscribers List"
      subtitle="Subscribers added during the selected period"
      icon={UserPlus}
      accent={ACCENT}
      refreshing={refreshing}
      onRefresh={() => load(true)}>
      <KpiRow>
        <KpiCard label="Total Records" value={filteredData.length} icon={UserPlus} bg="#D1FAE5" fg="#047857" />
        <KpiCard
          label="Active Subscribers"
          value={activeRecords}
          icon={CheckCircle}
          bg="#CCFBF1"
          fg="#0D9488"
        />
      </KpiRow>

      <View style={styles.card}>
        <View style={styles.filterHeader}>
          <Filter size={15} color="#374151" />
          <Text style={styles.filterTitle}>Filters</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
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
          <View style={styles.filterField}>
            <Text style={styles.label}>Status</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setStatusPicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, statusFilter === 'all' && styles.placeholder]}>
                {STATUS_OPTIONS.find(o => o.value === statusFilter)?.label || statusFilter}
              </Text>
              <ChevronDown size={15} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </ScrollView>
        <View style={styles.applyRow}>
          <GreenButton
            label="Show Report"
            icon={UserPlus}
            onPress={() => {
              setShowReport(true);
              setCurrentPage(1);
            }}
          />
          <TouchableOpacity style={styles.resetBtn} onPress={resetFilters} activeOpacity={0.85}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

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
      <OptionPickerSheet
        visible={statusPicker}
        title="Select Status"
        options={STATUS_OPTIONS}
        value={statusFilter}
        emptyLabel="All"
        onSelect={setStatusFilter}
        onClose={() => setStatusPicker(false)}
      />

      <View style={styles.card}>
        <View style={styles.listHeader}>
          <View style={styles.listHeaderRow}>
            <View style={styles.listHeaderInfo}>
              <Text style={styles.listTitle}>New Subscribers List</Text>
              <Text style={styles.listCount}>
                {showReport
                  ? `From: ${fromDate || '—'} — To: ${toDate || '—'}`
                  : 'Select the filters above and press Show Report to generate the report.'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.printBtn, !showReport && styles.printBtnDisabled]}
              onPress={() => setPrintOpen(true)}
              disabled={!showReport}
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
        ) : !showReport ? (
          <View style={styles.empty}>
            <UserPlus size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>Select filters and press Show Report</Text>
            <Text style={styles.emptySub}>Generate the new subscribers report.</Text>
          </View>
        ) : paginated.length === 0 ? (
          <View style={styles.empty}>
            <Search size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>No new subscribers found</Text>
            <Text style={styles.emptySub}>Try adjusting the filters.</Text>
          </View>
        ) : (
          paginated.map(item => {
            const st = statusStyle(item.status);
            return (
              <View key={item.id} style={styles.logCard}>
                <View style={styles.logTop}>
                  <View style={styles.subInfo}>
                    <Text style={styles.subName} numberOfLines={1}>
                      {item.subscriberName || '—'}
                    </Text>
                    <Text style={styles.subId} numberOfLines={1}>
                      {item.subscriberId || '—'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, {backgroundColor: st.bg}]}>
                    <Text style={[styles.statusText, {color: st.fg}]} numberOfLines={1}>
                      {item.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.metaGrid}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Phone</Text>
                    <Text style={styles.metaValue}>{item.phone || '—'}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Connection Type</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      {item.connectionType || '—'}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Created Date</Text>
                    <Text style={styles.metaValue}>{formatDate(item.createdDate)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Created By</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      {item.createdBy || '—'}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Sublocality</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      {item.sublocality || '—'}
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
              </View>
            );
          })
        )}

        {showReport && filteredData.length > 0 ? (
          <View style={styles.pagination}>
            <Text style={styles.pageInfo}>
              Showing {(safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, filteredData.length)} of{' '}
              {filteredData.length} records
            </Text>
            <View style={styles.pageSizeRow}>
              {PAGE_SIZES.map(size => (
                <TouchableOpacity
                  key={size}
                  style={[styles.pageSizeChip, pageSize === size && styles.pageSizeChipActive]}
                  onPress={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}>
                  <Text style={[styles.pageSizeText, pageSize === size && styles.pageSizeTextActive]}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.pageNav}>
              <TouchableOpacity
                style={[styles.pageNavBtn, safePage === 1 && styles.btnDisabled]}
                onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}>
                <Text style={styles.pageNavText}>Prev</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>
                Page {safePage} of {totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.pageNavBtn, safePage === totalPages && styles.btnDisabled]}
                onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}>
                <Text style={styles.pageNavText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      <SubscriberReportPrintModal
        visible={printOpen}
        onClose={() => setPrintOpen(false)}
        title="NEW SUBSCRIBERS LIST"
        subtitle={`From: ${fromDate || '—'} — To: ${toDate || '—'}`}
        accent="#059669"
        emptyMessage="No new subscribers found for the selected criteria."
        jobName="New-Subscribers-List"
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
  filterField: {width: 160},
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
  printBtnDisabled: {opacity: 0.5},
  printBtnText: {fontSize: 12, fontWeight: '700', color: '#10B981'},
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
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {fontSize: 11, fontWeight: '700', textTransform: 'capitalize'},
  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 10},
  metaItem: {flexBasis: '45%', flexGrow: 1},
  metaItemWide: {flexBasis: '100%'},
  metaLabel: {fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase'},
  metaValue: {fontSize: 13, color: '#111827', fontWeight: '500', marginTop: 1},
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  pageInfo: {fontSize: 12, color: '#6B7280'},
  pageSizeRow: {flexDirection: 'row', gap: 6},
  pageSizeChip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pageSizeChipActive: {borderColor: '#10B981', backgroundColor: '#ECFDF5'},
  pageSizeText: {fontSize: 12, color: '#6B7280'},
  pageSizeTextActive: {color: '#047857', fontWeight: '700'},
  pageNav: {flexDirection: 'row', alignItems: 'center', gap: 6},
  pageNavBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pageNavText: {fontSize: 12, fontWeight: '600', color: '#374151'},
  btnDisabled: {opacity: 0.5},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyText: {fontSize: 15, fontWeight: '600', color: '#6B7280', marginTop: 10},
  emptySub: {fontSize: 12, color: '#9CA3AF', marginTop: 4},
});
