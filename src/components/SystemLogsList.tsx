import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
} from 'react-native';
import {useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  Search,
  RefreshCw,
  Filter,
  CheckCircle,
  AlertTriangle,
  User,
  Activity,
  RotateCcw,
  ChevronDown,
  X,
} from 'lucide-react-native';
import type {ComponentType} from 'react';
import {getSystemLogs, restoreDeletedLog} from '../api/systemLogs';
import type {SystemLogEntry} from '../types';
import {GradientView} from './GradientView';
import OptionPickerSheet from './OptionPickerSheet';

const PAGE_SIZES = [10, 20, 50];
const GREEN_ACCENT: [string, string] = ['#166534', '#22c55e'];

type IconType = ComponentType<{size?: number; color?: string; strokeWidth?: number}>;

type Props = {
  title: string;
  subtitle: string;
  icon: IconType;
  accent: [string, string];
  includePages?: string[];
  showRestore?: boolean;
};

function DoorMenuIcon({open}: {open: boolean}) {
  const slide = React.useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(slide, {toValue: open ? 1 : 0, duration: 200, useNativeDriver: true}).start();
  }, [open, slide]);
  const translateX = slide.interpolate({inputRange: [0, 1], outputRange: [-3, 3]});
  return (
    <View style={styles.doorIconBox}>
      <Animated.View style={[styles.doorIconLine, {transform: [{translateX}]}]} />
    </View>
  );
}

function HeroDivider({accent}: {accent: [string, string]}) {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={accent[0]} stopOpacity="1" />
            <Stop offset="0.7" stopColor={accent[1]} stopOpacity="0.6" />
            <Stop offset="1" stopColor={accent[1]} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#heroGrad)" />
      </Svg>
    </View>
  );
}

function StatusBadge({status}: {status: string}) {
  const s = (status || '').toLowerCase();
  const cfg =
    s === 'success'
      ? {bg: '#DCFCE7', fg: '#15803D', label: 'Success'}
      : s === 'error'
      ? {bg: '#FEE2E2', fg: '#B91C1C', label: 'Error'}
      : s === 'warning'
      ? {bg: '#FEF3C7', fg: '#B45309', label: 'Warning'}
      : {bg: '#F3F4F6', fg: '#4B5563', label: status || 'Unknown'};
  return (
    <View style={[styles.statusBadge, {backgroundColor: cfg.bg}]}>
      <View style={[styles.statusDot, {backgroundColor: cfg.fg}]} />
      <Text style={[styles.statusText, {color: cfg.fg}]}>{cfg.label}</Text>
    </View>
  );
}

export default function SystemLogsList({
  title,
  subtitle,
  icon: Icon,
  accent,
  includePages,
  showRestore = false,
}: Props) {
  const navigation = useNavigation<any>();
  const drawerStatus = useDrawerStatus();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [users, setUsers] = useState<{id: string; name: string}[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('delete');
  const [selectedModule, setSelectedModule] = useState('');
  const [search, setSearch] = useState('');

  const [userPicker, setUserPicker] = useState(false);
  const [actionPicker, setActionPicker] = useState(false);
  const [modulePicker, setModulePicker] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchLogs = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        const res = await getSystemLogs({
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          userId: selectedUser || undefined,
          action: selectedAction || undefined,
          module: selectedModule || undefined,
          search: search || undefined,
          limit: 500,
          offset: 0,
        });
        setLogs(res.logs);
        setUsers(res.users);
        setActions(res.actions);
        setModules(res.modules);
      } catch (err: any) {
        Alert.alert('Error', err?.response?.data?.message || 'Failed to fetch logs');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fromDate, toDate, selectedUser, selectedAction, selectedModule, search],
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const visibleLogs = useMemo(() => {
    let list = logs;
    if (includePages && includePages.length > 0) {
      list = list.filter(log => includePages.includes(log.page || ''));
    }
    return list;
  }, [logs, includePages]);

  const kpis = useMemo(() => {
    let success = 0;
    let error = 0;
    let warning = 0;
    visibleLogs.forEach(log => {
      const s = (log.status || '').toLowerCase();
      if (s === 'success') success++;
      else if (s === 'error') error++;
      else if (s === 'warning') warning++;
    });
    return [
      {label: 'Total Records', value: visibleLogs.length, icon: Activity, bg: '#DBEAFE', fg: '#2563EB'},
      {label: 'Success', value: success, icon: CheckCircle, bg: '#DCFCE7', fg: '#059669'},
      {label: 'Errors', value: error, icon: AlertTriangle, bg: '#FEE2E2', fg: '#DC2626'},
      {label: 'Warnings', value: warning, icon: AlertTriangle, bg: '#FEF3C7', fg: '#D97706'},
    ];
  }, [visibleLogs]);

  const totalPages = Math.max(1, Math.ceil(visibleLogs.length / pageSize));
  const paginated = visibleLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setSelectedUser('');
    setSelectedAction('delete');
    setSelectedModule('');
    setSearch('');
    setCurrentPage(1);
  };

  const handleRestore = async (log: SystemLogEntry) => {
    setRestoringId(log.id);
    try {
      await restoreDeletedLog(log.id);
      Alert.alert('Success', 'Record restored successfully');
      fetchLogs();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to restore record');
    } finally {
      setRestoringId(null);
    }
  };

  const userOptions = users.map(u => ({label: u.name, value: u.id}));
  const actionOptions = actions.map(a => ({label: a, value: a}));
  const moduleOptions = modules.map(m => ({label: m, value: m}));

  const formatTimestamp = (ts: string) => {
    if (!ts) {
      return '—';
    }
    const d = new Date(ts);
    if (isNaN(d.getTime())) {
      return ts;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const topBar = (
    <GradientView colors={GREEN_ACCENT} style={styles.topBar}>
      <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
        <DoorMenuIcon open={drawerStatus === 'open'} />
      </TouchableOpacity>
      <Text style={styles.topBarTitle}>{title}</Text>
    </GradientView>
  );

  return (
    <View style={styles.container}>
      {topBar}
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchLogs(true)} colors={[accent[1]]} />
        }>
        <View style={styles.heroHeader}>
          <GradientView colors={accent} style={styles.heroIconBox}>
            <Icon size={20} color="#FFFFFF" />
          </GradientView>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>
        </View>

        <HeroDivider accent={accent} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiRow}>
          {kpis.map(metric => {
            const KIcon = metric.icon;
            return (
              <View key={metric.label} style={styles.kpiCard}>
                <View style={styles.kpiTop}>
                  <Text style={styles.kpiLabel}>{metric.label}</Text>
                  <View style={[styles.kpiIconBox, {backgroundColor: metric.bg}]}>
                    <KIcon size={16} color={metric.fg} />
                  </View>
                </View>
                <Text style={styles.kpiValue}>{metric.value}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.card}>
          <View style={styles.filterHeader}>
            <Filter size={15} color="#374151" />
            <Text style={styles.filterTitle}>Filters</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}>
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
              <Text style={styles.label}>User</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setUserPicker(true)} activeOpacity={0.85}>
                <Text style={[styles.selectText, !selectedUser && styles.placeholder]}>
                  {selectedUser ? userOptions.find(o => o.value === selectedUser)?.label || 'All Users' : 'All Users'}
                </Text>
                <ChevronDown size={15} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.filterField}>
              <Text style={styles.label}>Action</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setActionPicker(true)} activeOpacity={0.85}>
                <Text style={[styles.selectText, !selectedAction && styles.placeholder]}>
                  {selectedAction ? actionOptions.find(o => o.value === selectedAction)?.label || selectedAction : 'All Actions'}
                </Text>
                <ChevronDown size={15} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.filterField}>
              <Text style={styles.label}>Module</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setModulePicker(true)} activeOpacity={0.85}>
                <Text style={[styles.selectText, !selectedModule && styles.placeholder]}>
                  {selectedModule ? moduleOptions.find(o => o.value === selectedModule)?.label || selectedModule : 'All Modules'}
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
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.applyRow}>
            <TouchableOpacity
              style={styles.applyWrap}
              onPress={() => {
                setCurrentPage(1);
                fetchLogs();
              }}
              disabled={loading}
              activeOpacity={0.85}>
              <GradientView colors={GREEN_ACCENT} style={styles.applyBtn}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <RefreshCw size={15} color="#FFFFFF" />
                    <Text style={styles.applyText}>Apply Filters</Text>
                  </>
                )}
              </GradientView>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetBtn} onPress={resetFilters} activeOpacity={0.85}>
              <X size={15} color="#374151" />
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        <OptionPickerSheet
          visible={userPicker}
          title="Select User"
          options={userOptions}
          value={selectedUser}
          emptyLabel="All Users"
          onSelect={setSelectedUser}
          onClose={() => setUserPicker(false)}
        />
        <OptionPickerSheet
          visible={actionPicker}
          title="Select Action"
          options={actionOptions}
          value={selectedAction}
          emptyLabel="All Actions"
          onSelect={setSelectedAction}
          onClose={() => setActionPicker(false)}
        />
        <OptionPickerSheet
          visible={modulePicker}
          title="Select Module"
          options={moduleOptions}
          value={selectedModule}
          emptyLabel="All Modules"
          onSelect={setSelectedModule}
          onClose={() => setModulePicker(false)}
        />

        <View style={styles.card}>
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.listTitle}>{title} Records</Text>
              <Text style={styles.listCount}>
                Showing {visibleLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, visibleLogs.length)} of {visibleLogs.length} records
              </Text>
            </View>
          </View>

          {loading && visibleLogs.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={accent[0]} />
            </View>
          ) : paginated.length === 0 ? (
            <View style={styles.empty}>
              <Activity size={36} color="#D1D5DB" />
              <Text style={styles.emptyText}>No {title.toLowerCase()} found</Text>
              <Text style={styles.emptySub}>Try adjusting the filters.</Text>
            </View>
          ) : (
            paginated.map(log => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logTop}>
                  <View style={styles.logUser}>
                    <View style={[styles.logAvatar, {backgroundColor: accent[0]}]}>
                      <User size={13} color="#FFFFFF" />
                    </View>
                    <Text style={styles.logUserName} numberOfLines={1}>
                      {log.userName || 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.logBadges}>
                    <View style={styles.actionBadge}>
                      <Text style={styles.actionBadgeText}>{log.action}</Text>
                    </View>
                    <StatusBadge status={log.status} />
                  </View>
                </View>
                <View style={styles.logMetaRow}>
                  <Text style={styles.logTimestamp}>{formatTimestamp(log.timestamp)}</Text>
                  <View style={styles.modulePill}>
                    <Activity size={12} color="#6B7280" />
                    <Text style={styles.moduleText}>{log.module}</Text>
                  </View>
                </View>
                <View style={styles.logMetaRow}>
                  <Text style={styles.logPage}>Page: {log.page || '—'}</Text>
                </View>
                {log.description ? (
                  <Text style={styles.logDesc} numberOfLines={2}>
                    {log.description}
                  </Text>
                ) : null}
                {showRestore && log.details?.entityId ? (
                  <View style={styles.restoreRow}>
                    <TouchableOpacity
                      style={[styles.restoreBtn, restoringId === log.id && styles.btnDisabled]}
                      onPress={() => handleRestore(log)}
                      disabled={restoringId === log.id}
                      activeOpacity={0.85}>
                      {restoringId === log.id ? (
                        <ActivityIndicator size="small" color="#059669" />
                      ) : (
                        <>
                          <RotateCcw size={14} color="#059669" />
                          <Text style={styles.restoreText}>Restore</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ))
          )}

          {visibleLogs.length > 0 ? (
            <View style={styles.pagination}>
              <Text style={styles.pageInfo}>
                Page {currentPage} of {totalPages}
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
                  style={[styles.pageNavBtn, currentPage === 1 && styles.btnDisabled]}
                  onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}>
                  <Text style={styles.pageNavText}>Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pageNavBtn, currentPage === totalPages && styles.btnDisabled]}
                  onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}>
                  <Text style={styles.pageNavText}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  center: {paddingVertical: 40, justifyContent: 'center', alignItems: 'center'},
  body: {paddingBottom: 40},
  topBar: {
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
  topBarTitle: {color: '#FFFFFF', fontSize: 16, fontWeight: '700', paddingRight: 8},
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
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
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
  heroTitle: {fontSize: 20, fontWeight: '700', color: '#111827', letterSpacing: -0.5},
  heroSubtitle: {fontSize: 12, color: '#6B7280', marginTop: 2},
  heroDivider: {height: 2, marginHorizontal: 20, marginBottom: 4},
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  kpiCard: {
    width: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiLabel: {fontSize: 10, color: '#6B7280', fontWeight: '500', flex: 1, flexWrap: 'wrap'},
  kpiIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  kpiValue: {fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 8},
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
  applyWrap: {flex: 1, borderRadius: 10, overflow: 'hidden'},
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
  },
  applyText: {color: '#FFFFFF', fontSize: 13, fontWeight: '700'},
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
  logUser: {flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8},
  logAvatar: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logUserName: {fontSize: 13, fontWeight: '700', color: '#111827', flex: 1},
  logBadges: {flexDirection: 'row', alignItems: 'center', gap: 6},
  actionBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  actionBadgeText: {fontSize: 11, fontWeight: '600', color: '#374151', textTransform: 'capitalize'},
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusDot: {width: 6, height: 6, borderRadius: 3},
  statusText: {fontSize: 11, fontWeight: '700'},
  logMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  logTimestamp: {fontSize: 12, color: '#6B7280'},
  modulePill: {flexDirection: 'row', alignItems: 'center', gap: 4},
  moduleText: {fontSize: 12, color: '#6B7280'},
  logPage: {fontSize: 12, color: '#6B7280'},
  logDesc: {fontSize: 12, color: '#374151', marginTop: 6},
  restoreRow: {flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10},
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  restoreText: {fontSize: 12, fontWeight: '700', color: '#059669'},
  btnDisabled: {opacity: 0.5},
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
  pageSizeChipActive: {borderColor: '#166534', backgroundColor: '#F0FDF4'},
  pageSizeText: {fontSize: 12, color: '#6B7280'},
  pageSizeTextActive: {color: '#166534', fontWeight: '700'},
  pageNav: {flexDirection: 'row', gap: 6},
  pageNavBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pageNavText: {fontSize: 12, fontWeight: '600', color: '#374151'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyText: {fontSize: 15, fontWeight: '600', color: '#6B7280', marginTop: 10},
  emptySub: {fontSize: 12, color: '#9CA3AF', marginTop: 4},
});
