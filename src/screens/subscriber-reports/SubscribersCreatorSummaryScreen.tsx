import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {UserPlus, Filter, Search, ChevronDown, Printer} from 'lucide-react-native';
import {getConnections} from '../../api/connections';
import {getUsers} from '../../api/systemLogs';
import ReportLayout, {KpiRow, KpiCard} from '../../components/ReportLayout';
import OptionPickerSheet from '../../components/OptionPickerSheet';
import SubscriberReportPrintModal, {PrintColumn} from '../../components/SubscriberReportPrintModal';

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const ACCENT: [string, string] = ['#A855F7', '#DB2777'];

interface CreatorSummary {
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  creatorRole: string;
  creatorStatus: string;
  totalCreated: number;
}

function statusStyle(status: string): {bg: string; fg: string} {
  const s = (status || '').toLowerCase();
  if (s === 'active') {
    return {bg: '#DCFCE7', fg: '#15803D'};
  }
  return {bg: '#F3F4F6', fg: '#4B5563'};
}

export default function SubscribersCreatorSummaryScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [rolePicker, setRolePicker] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const results = await Promise.allSettled([getUsers(), getConnections()]);
      if (results[0].status === 'fulfilled') {
        setUsers(results[0].value as any[]);
      }
      if (results[1].status === 'fulfilled') {
        setConnections(results[1].value as any[]);
      }
      if (results.every(r => r.status === 'rejected')) {
        Alert.alert('Error', 'Failed to load creator summary');
      }
    } catch {
      Alert.alert('Error', 'Failed to load creator summary');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const creatorSummaries: CreatorSummary[] = useMemo(() => {
    const creatorsMap = new Map<string, any[]>();
    connections.forEach((conn: any) => {
      if (conn.createdBy) {
        const existing = creatorsMap.get(conn.createdBy) || [];
        existing.push(conn);
        creatorsMap.set(conn.createdBy, existing);
      }
    });

    return Array.from(creatorsMap.keys())
      .map(creatorId => {
        const creator = users.find((u: any) => u.id === creatorId);
        const createdConnections = creatorsMap.get(creatorId) || [];
        return {
          creatorId,
          creatorName: creator?.name || 'Unknown',
          creatorEmail: creator?.email || '',
          creatorRole: creator?.role || '',
          creatorStatus: creator?.status || 'inactive',
          totalCreated: createdConnections.length,
        };
      })
      .filter(summary => {
        const q = searchTerm.trim().toLowerCase();
        const matchSearch =
          !q ||
          summary.creatorName.toLowerCase().includes(q) ||
          summary.creatorEmail.toLowerCase().includes(q);
        const matchRole = roleFilter === 'all' || summary.creatorRole === roleFilter;
        return matchSearch && matchRole;
      })
      .sort((a, b) => b.totalCreated - a.totalCreated);
  }, [connections, users, searchTerm, roleFilter]);

  const uniqueRoles = useMemo(() => {
    const set = new Set<string>();
    creatorSummaries.forEach(s => {
      if (s.creatorRole) {
        set.add(s.creatorRole);
      }
    });
    return Array.from(set);
  }, [creatorSummaries]);

  const totalCreators = creatorSummaries.length;
  const totalCreatedUsers = creatorSummaries.reduce((sum, s) => sum + s.totalCreated, 0);
  const avgUsersPerCreator = totalCreators > 0 ? (totalCreatedUsers / totalCreators).toFixed(1) : '0';

  const roleOptions = uniqueRoles.map(role => ({label: role, value: role}));

  const printColumns: PrintColumn<CreatorSummary>[] = [
    {header: '#', render: (_: CreatorSummary, i: number) => i + 1},
    {header: 'Creator Name', render: item => item.creatorName || '—'},
    {header: 'Email', render: item => item.creatorEmail || '—'},
    {header: 'Role', render: item => item.creatorRole || '—'},
    {header: 'Status', render: item => capitalize(item.creatorStatus)},
    {header: 'Subscribers Created', align: 'right', render: item => item.totalCreated},
  ];

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
  };

  return (
    <ReportLayout
      title="Subscribers Creator Summary"
      subtitle="Subscribers created by each staff member"
      icon={UserPlus}
      accent={ACCENT}
      refreshing={refreshing}
      onRefresh={() => load(true)}>
      <KpiRow>
        <KpiCard label="Total Creators" value={totalCreators} icon={UserPlus} bg="#F3E8FF" fg="#9333EA" />
        <KpiCard
          label="Total Subscribers Created"
          value={totalCreatedUsers}
          icon={Search}
          bg="#FCE7F3"
          fg="#DB2777"
        />
        <KpiCard label="Avg Subscribers / Creator" value={avgUsersPerCreator} icon={UserPlus} bg="#F3E8FF" fg="#9333EA" />
      </KpiRow>

      <View style={styles.card}>
        <View style={styles.filterHeader}>
          <Filter size={15} color="#374151" />
          <Text style={styles.filterTitle}>Filters</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <View style={styles.filterFieldWide}>
            <Text style={styles.label}>Search</Text>
            <TextInput
              style={styles.input}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search by name or email..."
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>Role</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setRolePicker(true)} activeOpacity={0.85}>
              <Text style={[styles.selectText, roleFilter === 'all' && styles.placeholder]} numberOfLines={1}>
                {roleFilter === 'all' ? 'All Roles' : roleOptions.find(o => o.value === roleFilter)?.label || roleFilter}
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
        visible={rolePicker}
        title="Select Role"
        options={roleOptions}
        value={roleFilter}
        emptyLabel="All Roles"
        onSelect={setRoleFilter}
        onClose={() => setRolePicker(false)}
      />

      <View style={styles.card}>
        <View style={styles.listHeader}>
          <View style={styles.listHeaderRow}>
            <View style={styles.listHeaderInfo}>
              <Text style={styles.listTitle}>Subscribers Creator Summary</Text>
              <Text style={styles.listCount}>Subscribers created by each staff member</Text>
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
        ) : creatorSummaries.length === 0 ? (
          <View style={styles.empty}>
            <Search size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>No creator summaries found</Text>
            <Text style={styles.emptySub}>Try adjusting the filters.</Text>
          </View>
        ) : (
          creatorSummaries.map((item, index) => {
            const st = statusStyle(item.creatorStatus);
            return (
              <View key={item.creatorId} style={styles.logCard}>
                <View style={styles.logTop}>
                  <View style={styles.subInfo}>
                    <Text style={styles.subName} numberOfLines={1}>
                      {item.creatorName || '—'}
                    </Text>
                    <Text style={styles.subId} numberOfLines={1}>
                      {item.creatorEmail || '—'}
                    </Text>
                  </View>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{item.totalCreated}</Text>
                  </View>
                </View>
                <View style={styles.metaGrid}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Role</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      {item.creatorRole || '—'}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Status</Text>
                    <View style={styles.metaValueRow}>
                      <View style={[styles.statusBadge, {backgroundColor: st.bg}]}>
                        <Text style={[styles.statusText, {color: st.fg}]} numberOfLines={1}>
                          {item.creatorStatus}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Subscribers Created</Text>
                    <Text style={styles.metaValue}>{item.totalCreated}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      <SubscriberReportPrintModal
        visible={printOpen}
        onClose={() => setPrintOpen(false)}
        title="SUBSCRIBERS CREATOR SUMMARY"
        subtitle="Subscribers grouped by the staff member who created them"
        accent="#9333EA"
        emptyMessage="No creator summaries found."
        jobName="Subscribers-Creator-Summary"
        columns={printColumns}
        data={creatorSummaries}
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
  filterFieldWide: {width: 220},
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
  printBtnText: {fontSize: 12, fontWeight: '700', color: '#A855F7'},
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
  countBadge: {
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  countBadgeText: {fontSize: 15, fontWeight: '800', color: '#9333EA'},
  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 10},
  metaItem: {flexBasis: '45%', flexGrow: 1},
  metaLabel: {fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase'},
  metaValue: {fontSize: 13, color: '#111827', fontWeight: '500', marginTop: 1},
  metaValueRow: {flexDirection: 'row', marginTop: 1},
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {fontSize: 11, fontWeight: '700', textTransform: 'capitalize'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyText: {fontSize: 15, fontWeight: '600', color: '#6B7280', marginTop: 10},
  emptySub: {fontSize: 12, color: '#9CA3AF', marginTop: 4},
});
