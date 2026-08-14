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
  Modal,
  Animated,
  RefreshControl,
} from 'react-native';
import {useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  ArrowLeftRight,
  Search,
  RefreshCw,
  History,
  Users,
  Eye,
  ChevronDown,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react-native';
import {getConnectionLogs, getUsers} from '../../api/systemLogs';
import {ConnectionLog, User} from '../../types';
import {GradientView} from '../../components/GradientView';
import OptionPickerSheet from '../../components/OptionPickerSheet';

const ACCENT: [string, string] = ['#F59E0B', '#EA580C'];
const GREEN_ACCENT: [string, string] = ['#166534', '#22c55e'];
const PAGE_SIZES = [10, 20, 50];

const TYPE_LABELS: Record<string, string> = {
  both: 'Both',
  internet: 'Internet',
  tv_cable: 'TV Cable',
};

const CONNECTION_TYPES = [
  {label: 'All Types', value: 'all'},
  {label: 'Both', value: 'both'},
  {label: 'Internet', value: 'internet'},
  {label: 'TV Cable', value: 'tv_cable'},
];

type SortKey = 'logDate' | 'internetId' | 'subscriberName' | 'actionType' | 'updatedByName';

function actionStyle(action: string): {bg: string; fg: string} {
  if (/new|install|activ|resum/i.test(action)) {
    return {bg: '#DCFCE7', fg: '#15803D'};
  }
  if (/suspend|disconnect|deactivat|delet/i.test(action)) {
    return {bg: '#FEE2E2', fg: '#B91C1C'};
  }
  if (/price|charge|discount|amount/i.test(action)) {
    return {bg: '#FEF3C7', fg: '#B45309'};
  }
  if (/area|splitter|box|port|subscriber id|name|address|contact/i.test(action)) {
    return {bg: '#E0F2FE', fg: '#0369A1'};
  }
  return {bg: '#EDE9FE', fg: '#6D28D9'};
}

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

function HeroDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={ACCENT[0]} stopOpacity="1" />
            <Stop offset="0.7" stopColor={ACCENT[1]} stopOpacity="0.6" />
            <Stop offset="1" stopColor={ACCENT[1]} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#heroGrad)" />
      </Svg>
    </View>
  );
}

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function Field({label, value, accent}: {label: string; value?: string; accent?: boolean}) {
  return (
    <View style={[styles.fieldBox, accent && styles.fieldBoxAccent]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

export default function UpdateConnectionLogsScreen() {
  const navigation = useNavigation<any>();
  const drawerStatus = useDrawerStatus();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  const [logs, setLogs] = useState<ConnectionLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [actionType, setActionType] = useState('all');
  const [updatedBy, setUpdatedBy] = useState('all');
  const [connectionType, setConnectionType] = useState('all');

  const [actionPicker, setActionPicker] = useState(false);
  const [userPicker, setUserPicker] = useState(false);
  const [typePicker, setTypePicker] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey | null>('logDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [selectedLog, setSelectedLog] = useState<ConnectionLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [logData, userData] = await Promise.all([getConnectionLogs({}), getUsers()]);
      setLogs(logData);
      setUsers(userData);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load connection logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.actionType) set.add(l.actionType);
    });
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter(l => {
      if (q && !`${l.subscriberName || ''} ${l.internetId || ''}`.toLowerCase().includes(q)) {
        return false;
      }
      if (fromDate && (l.logDate || '') < fromDate) return false;
      if (toDate && (l.logDate || '') > toDate) return false;
      if (actionType !== 'all' && l.actionType !== actionType) return false;
      if (updatedBy !== 'all' && l.updatedBy !== updatedBy) return false;
      if (connectionType !== 'all' && l.connectionType !== connectionType) return false;
      return true;
    });
  }, [logs, search, fromDate, toDate, actionType, updatedBy, connectionType]);

  const sortedLogs = useMemo(() => {
    const arr = [...filteredLogs];
    if (!sortKey) {
      return arr;
    }
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'logDate':
          cmp = `${a.logDate || ''} ${a.logTime || ''}`.localeCompare(`${b.logDate || ''} ${b.logTime || ''}`);
          break;
        case 'internetId':
          cmp = (a.internetId || '').localeCompare(b.internetId || '');
          break;
        case 'subscriberName':
          cmp = (a.subscriberName || '').localeCompare(b.subscriberName || '');
          break;
        case 'actionType':
          cmp = (a.actionType || '').localeCompare(b.actionType || '');
          break;
        case 'updatedByName':
          cmp = (a.updatedByName || '').localeCompare(b.updatedByName || '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filteredLogs, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / pageSize));
  const paginated = sortedLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const todayLogs = logs.filter(l => l.logDate === todayStr()).length;
  const uniqueSubscribers = new Set(logs.map(l => l.connectionId)).size;

  const kpis = [
    {label: 'Total Changes', value: filteredLogs.length, icon: History, bg: '#DBEAFE', fg: '#2563EB'},
    {label: 'Changes Today', value: todayLogs, icon: RefreshCw, bg: '#DCFCE7', fg: '#059669'},
    {label: 'Subscribers Updated', value: uniqueSubscribers, icon: Users, bg: '#FEF3C7', fg: '#D97706'},
  ];

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'logDate' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setActionType('all');
    setUpdatedBy('all');
    setConnectionType('all');
    setSortKey('logDate');
    setSortDir('desc');
    setCurrentPage(1);
  };

  const SortIndicator = ({column}: {column: SortKey}) => {
    if (sortKey !== column) {
      return <Text style={styles.sortNeutral}>↕</Text>;
    }
    return sortDir === 'asc' ? (
      <ArrowUp size={12} color="#EA580C" />
    ) : (
      <ArrowDown size={12} color="#EA580C" />
    );
  };

  const userOptions = users.map(u => ({label: u.name, value: u.id}));
  const actionOptions = actionTypes.map(a => ({label: a, value: a}));

  const openDetail = (log: ConnectionLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  const topBar = (
    <GradientView colors={GREEN_ACCENT} style={styles.topBar}>
      <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
        <DoorMenuIcon open={drawerStatus === 'open'} />
      </TouchableOpacity>
      <Text style={styles.topBarTitle}>Update Connection Log</Text>
    </GradientView>
  );

  return (
    <View style={styles.container}>
      {topBar}
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[ACCENT[1]]} />
        }>
        <View style={styles.heroHeader}>
          <GradientView colors={ACCENT} style={styles.heroIconBox}>
            <ArrowLeftRight size={20} color="#FFFFFF" />
          </GradientView>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>Update Connection Log</Text>
            <Text style={styles.heroSubtitle}>View all subscriber information and details.</Text>
          </View>
        </View>

        <HeroDivider />

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
          <Text style={styles.cardTitle}>Search & Filters</Text>
          <Text style={styles.cardDesc}>Search subscribers and filter connection changes.</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}>
            <View style={styles.filterField}>
              <Text style={styles.label}>Search Subscriber</Text>
              <View style={styles.searchBox}>
                <Search size={14} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={v => {
                    setSearch(v);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by subscriber name or ID..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            <View style={styles.filterField}>
              <Text style={styles.label}>Action Type</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setActionPicker(true)} activeOpacity={0.85}>
                <Text style={[styles.selectText, actionType === 'all' && styles.placeholder]}>
                  {actionType === 'all' ? 'All Actions' : actionOptions.find(o => o.value === actionType)?.label || actionType}
                </Text>
                <ChevronDown size={15} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.filterField}>
              <Text style={styles.label}>Staff / Updated By</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setUserPicker(true)} activeOpacity={0.85}>
                <Text style={[styles.selectText, updatedBy === 'all' && styles.placeholder]}>
                  {updatedBy === 'all' ? 'All Staff' : userOptions.find(o => o.value === updatedBy)?.label || 'All Staff'}
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
              <Text style={styles.label}>Connection Type</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setTypePicker(true)} activeOpacity={0.85}>
                <Text style={[styles.selectText, connectionType === 'all' && styles.placeholder]}>
                  {CONNECTION_TYPES.find(c => c.value === connectionType)?.label || 'All Types'}
                </Text>
                <ChevronDown size={15} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.applyRow}>
            <TouchableOpacity style={styles.resetBtn} onPress={resetFilters} activeOpacity={0.85}>
              <X size={15} color="#374151" />
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyWrap} onPress={() => load()} disabled={loading} activeOpacity={0.85}>
              <GradientView colors={GREEN_ACCENT} style={styles.applyBtn}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <RefreshCw size={15} color="#FFFFFF" />
                    <Text style={styles.applyText}>Refresh</Text>
                  </>
                )}
              </GradientView>
            </TouchableOpacity>
          </View>
        </View>

        <OptionPickerSheet
          visible={actionPicker}
          title="Select Action Type"
          options={actionOptions}
          value={actionType}
          emptyLabel="All Actions"
          onSelect={v => {
            setActionType(v);
            setCurrentPage(1);
          }}
          onClose={() => setActionPicker(false)}
        />
        <OptionPickerSheet
          visible={userPicker}
          title="Select Staff"
          options={userOptions}
          value={updatedBy}
          emptyLabel="All Staff"
          onSelect={v => {
            setUpdatedBy(v);
            setCurrentPage(1);
          }}
          onClose={() => setUserPicker(false)}
        />
        <OptionPickerSheet
          visible={typePicker}
          title="Select Connection Type"
          options={CONNECTION_TYPES}
          value={connectionType}
          onSelect={v => {
            setConnectionType(v);
            setCurrentPage(1);
          }}
          onClose={() => setTypePicker(false)}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connection Changes</Text>
          <Text style={styles.cardDesc}>
            Showing {sortedLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedLogs.length)} of {sortedLogs.length} changes
          </Text>

          <View style={styles.sortBar}>
            <Text style={styles.sortBarLabel}>Sort by:</Text>
            <TouchableOpacity style={styles.sortChip} onPress={() => toggleSort('logDate')}>
              <Text style={styles.sortChipText}>Date</Text>
              <SortIndicator column="logDate" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortChip} onPress={() => toggleSort('internetId')}>
              <Text style={styles.sortChipText}>Subscriber</Text>
              <SortIndicator column="internetId" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortChip} onPress={() => toggleSort('actionType')}>
              <Text style={styles.sortChipText}>Action</Text>
              <SortIndicator column="actionType" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortChip} onPress={() => toggleSort('updatedByName')}>
              <Text style={styles.sortChipText}>Updated By</Text>
              <SortIndicator column="updatedByName" />
            </TouchableOpacity>
          </View>

          {loading && sortedLogs.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={ACCENT[0]} />
            </View>
          ) : paginated.length === 0 ? (
            <View style={styles.empty}>
              <History size={36} color="#D1D5DB" />
              <Text style={styles.emptyText}>No connection changes found</Text>
              <Text style={styles.emptySub}>Try adjusting the filters.</Text>
            </View>
          ) : (
            paginated.map(log => {
              const st = actionStyle(log.actionType || '');
              return (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logTop}>
                    <View style={styles.logIdBox}>
                      <Text style={styles.logId}>#{log.id.slice(0, 8)}</Text>
                    </View>
                    <View style={[styles.typeBadge, {backgroundColor: st.bg}]}>
                      <Text style={[styles.typeBadgeText, {color: st.fg}]}>{log.actionType || '—'}</Text>
                    </View>
                    <TouchableOpacity style={styles.viewBtn} onPress={() => openDetail(log)} activeOpacity={0.85}>
                      <Eye size={14} color="#EA580C" />
                      <Text style={styles.viewText}>View</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.subRow}>
                    <Text style={styles.subName} numberOfLines={1}>
                      {log.subscriberName || '—'}
                    </Text>
                    <Text style={styles.subId} numberOfLines={1}>
                      {log.internetId || ''}
                    </Text>
                  </View>
                  <View style={styles.metaGrid}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Date</Text>
                      <Text style={styles.metaValue}>{log.logDate || '—'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Time</Text>
                      <Text style={styles.metaValue}>{log.logTime || '—'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Type</Text>
                      <Text style={styles.metaValue}>
                        {TYPE_LABELS[log.connectionType || ''] || log.connectionType || '—'}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Updated By</Text>
                      <Text style={styles.metaValue} numberOfLines={1}>
                        {log.updatedByName || log.userRole || '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.changeRow}>
                    <View style={styles.changeCol}>
                      <Text style={styles.metaLabel}>Previous</Text>
                      <Text style={styles.oldValue} numberOfLines={2}>
                        {log.oldValue || '—'}
                      </Text>
                    </View>
                    <Text style={styles.changeArrow}>→</Text>
                    <View style={styles.changeCol}>
                      <Text style={styles.metaLabel}>New</Text>
                      <Text style={styles.newValue} numberOfLines={2}>
                        {log.newValue || '—'}
                      </Text>
                    </View>
                  </View>
                  {log.remarks ? (
                    <Text style={styles.remarks} numberOfLines={2}>
                      {log.remarks}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}

          {sortedLogs.length > 0 ? (
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

      <Modal visible={detailOpen} transparent animationType="slide" onRequestClose={() => setDetailOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Connection Change Details</Text>
              <TouchableOpacity onPress={() => setDetailOpen(false)}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {selectedLog ? (
              <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
                <View style={styles.sheetMetaRow}>
                  <View>
                    <Text style={styles.fieldLabel}>Log ID</Text>
                    <Text style={styles.monoText}>{selectedLog.id}</Text>
                  </View>
                  <View style={styles.sheetDateBox}>
                    <Text style={styles.fieldLabel}>Date & Time</Text>
                    <Text style={styles.sheetDate}>
                      {selectedLog.logDate || '—'} {selectedLog.logTime || ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.fieldGrid}>
                  <Field label="Subscriber Name" value={selectedLog.subscriberName} />
                  <Field label="Subscriber ID" value={selectedLog.internetId} />
                  <Field
                    label="Connection Type"
                    value={TYPE_LABELS[selectedLog.connectionType || ''] || selectedLog.connectionType}
                  />
                  <Field label="Action" value={selectedLog.actionType} />
                  <Field label="Field / Section" value={selectedLog.fieldName} />
                  <Field label="Branch" value={selectedLog.branch} />
                </View>
                <Text style={styles.sheetSection}>Change Details</Text>
                <View style={styles.fieldGrid}>
                  <Field label="Previous Value" value={selectedLog.oldValue} />
                  <Field label="New Value" value={selectedLog.newValue} />
                </View>
                <Field label="Reason for Change" value={selectedLog.reason} accent />
                <Text style={styles.sheetSection}>Updated By</Text>
                <View style={styles.fieldGrid}>
                  <Field label="Updated By" value={selectedLog.updatedByName} />
                  <Field label="User Role" value={selectedLog.userRole} />
                  <Field label="IP Address" value={selectedLog.ipAddress} />
                  <Field label="Device Name" value={selectedLog.deviceName} />
                </View>
                <Field label="Remarks / Notes" value={selectedLog.remarks} />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
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
  kpiTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
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
  cardTitle: {fontSize: 15, fontWeight: '700', color: '#111827'},
  cardDesc: {fontSize: 12, color: '#6B7280', marginTop: 2, marginBottom: 12},
  label: {fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 5},
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
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 13, color: '#111827'},
  filterScroll: {flexDirection: 'row', gap: 10, paddingBottom: 2},
  filterField: {width: 160},
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
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
  },
  sortBarLabel: {fontSize: 11, fontWeight: '600', color: '#6B7280', marginRight: 2},
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sortChipText: {fontSize: 11, fontWeight: '600', color: '#374151'},
  sortNeutral: {fontSize: 11, color: '#9CA3AF'},
  logCard: {
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  logTop: {flexDirection: 'row', alignItems: 'center'},
  logIdBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  logId: {fontSize: 11, fontWeight: '700', color: '#EA580C', fontFamily: 'monospace'},
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flex: 1,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {fontSize: 11, fontWeight: '700'},
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 8,
  },
  viewText: {fontSize: 12, fontWeight: '700', color: '#EA580C'},
  subRow: {marginTop: 8},
  subName: {fontSize: 14, fontWeight: '700', color: '#111827'},
  subId: {fontSize: 12, color: '#6B7280', fontFamily: 'monospace', marginTop: 1},
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 10,
  },
  metaItem: {flexBasis: '45%', flexGrow: 1},
  metaLabel: {fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase'},
  metaValue: {fontSize: 13, color: '#111827', fontWeight: '500', marginTop: 1},
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  changeCol: {flex: 1},
  changeArrow: {fontSize: 16, color: '#9CA3AF', marginHorizontal: 8},
  oldValue: {fontSize: 12, color: '#6B7280', marginTop: 2},
  newValue: {fontSize: 12, color: '#111827', fontWeight: '600', marginTop: 2},
  remarks: {fontSize: 12, color: '#374151', marginTop: 8, fontStyle: 'italic'},
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
  pageSizeChipActive: {borderColor: '#EA580C', backgroundColor: '#FFF7ED'},
  pageSizeText: {fontSize: 12, color: '#6B7280'},
  pageSizeTextActive: {color: '#EA580C', fontWeight: '700'},
  pageNav: {flexDirection: 'row', gap: 6},
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
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitle: {fontSize: 16, fontWeight: '700', color: '#111827'},
  sheetBody: {padding: 16, paddingBottom: 30},
  sheetMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  monoText: {fontSize: 13, color: '#111827', fontFamily: 'monospace', marginTop: 2},
  sheetDateBox: {alignItems: 'flex-end'},
  sheetDate: {fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 2},
  fieldGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4},
  fieldBox: {
    flexBasis: '45%',
    flexGrow: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
  },
  fieldBoxAccent: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    flexBasis: '100%',
  },
  fieldLabel: {fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase'},
  fieldValue: {fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 2, flexWrap: 'wrap'},
  sheetSection: {fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 12, marginBottom: 8},
});
