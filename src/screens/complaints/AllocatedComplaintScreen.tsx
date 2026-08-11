import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import {useFocusEffect, useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  ClipboardPen,
  ListTodo,
  CircleCheck,
  Clock,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  Pencil,
  Trash2,
  CircleDot,
  Tag,
  FileText,
  TriangleAlert,
} from 'lucide-react-native';
import {getComplaints, updateComplaint, deleteComplaint} from '../../api/complaints';
import {getStaff} from '../../api/accounts';
import {getSubscribers} from '../../api/subscribers';
import {getConnections} from '../../api/connections';
import {useAuth} from '../../context/AuthContext';
import {Complaint, Staff, Subscriber, Connection} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';

const PAGE_SIZES = [5, 10, 20, 50, 100];

const ACCENT = '#10B981';
const ACCENT_DARK = '#059669';
const ACCENT_LIGHT = '#D1FAE5';
const GRADIENT: [string, string] = ['#10B981', '#059669'];

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const CATEGORIES = [
  {label: 'Network', value: 'network'},
  {label: 'Billing', value: 'billing'},
  {label: 'Service', value: 'service'},
];

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  done: 'Done',
  'on-hold': 'On Hold',
  reject: 'Reject',
  closed: 'Closed',
};

const STATUS_COLORS: Record<string, {bg: string; fg: string; dot: string}> = {
  open: {bg: '#D1FAE5', fg: '#166534', dot: '#22C55E'},
  done: {bg: '#DBEAFE', fg: '#1E40AF', dot: '#3B82F6'},
  'on-hold': {bg: '#FEF3C7', fg: '#92400E', dot: '#F59E0B'},
  reject: {bg: '#FEE2E2', fg: '#991B1B', dot: '#EF4444'},
  closed: {bg: '#E5E7EB', fg: '#1F2937', dot: '#374151'},
};

const STATUS_OPTIONS = ['open', 'done', 'on-hold', 'reject', 'closed'];

function categoryBadge(category?: string): {bg: string; fg: string} {
  if (category === 'network') {
    return {bg: '#DBEAFE', fg: '#1E40AF'};
  }
  if (category === 'billing') {
    return {bg: '#FFEDD5', fg: '#9A3412'};
  }
  return {bg: '#F3E8FF', fg: '#6B21A8'};
}

function formatOpenedAt(value?: string): string {
  if (!value) {
    return '-';
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return '-';
  }
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
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

function EmptyStateIcon({icon: Icon}: {icon: React.ComponentType<{size?: number; color?: string; strokeWidth?: number}>}) {
  return (
    <View style={styles.emptyIconBox}>
      <Icon size={28} color={ACCENT_DARK} />
    </View>
  );
}

function ComplaintDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="allocatedHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#10B981" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#10B981" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#10B981" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#allocatedHeroGrad)" />
      </Svg>
    </View>
  );
}

type Option = {value: string; label: string; dot?: string};

type OptionPickerSheetProps = {
  visible: boolean;
  title: string;
  options: Option[];
  value: string;
  emptyLabel?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

function OptionPickerSheet({visible, title, options, value, emptyLabel, onSelect, onClose}: OptionPickerSheetProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setQuery('');
    }
  }, [visible]);

  const filtered = options.filter(o => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return o.label.toLowerCase().includes(q);
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheetOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, styles.pickerSheet]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.sheetClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerSearch}>
            <Search size={16} color="#6B7280" />
            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Search..."
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>
          <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
            {emptyLabel ? (
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => {
                  onSelect('');
                  onClose();
                }}>
                <View style={styles.sheetOptionRow}>
                  <Text
                    style={[
                      styles.sheetOptionText,
                      !value && styles.sheetOptionTextActive,
                    ]}>
                    {emptyLabel}
                  </Text>
                  {!value ? <Check size={16} color={ACCENT} /> : null}
                </View>
              </TouchableOpacity>
            ) : null}
            {filtered.map(option => {
              const active = value === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={styles.sheetOption}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}>
                  <View style={styles.sheetOptionRow}>
                    {option.dot ? (
                      <View style={[styles.optionDot, {backgroundColor: option.dot}]} />
                    ) : (
                      <CircleDot size={16} color="#6B7280" />
                    )}
                    <Text
                      style={[
                        styles.sheetOptionText,
                        active && styles.sheetOptionTextActive,
                      ]}
                      numberOfLines={1}>
                      {option.label}
                    </Text>
                    {active ? <Check size={16} color={ACCENT} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
            {filtered.length === 0 && !emptyLabel && (
              <Text style={styles.pickerEmpty}>No options found</Text>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function AllocatedComplaintScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const {user} = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterTarget, setFilterTarget] = useState<'category' | 'status' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  const [editComplaint, setEditComplaint] = useState<Complaint | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editStatusPickerOpen, setEditStatusPickerOpen] = useState(false);

  const [statusComplaint, setStatusComplaint] = useState<Complaint | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusValue, setStatusValue] = useState('');
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);

  const [saving, setSaving] = useState(false);

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
      setError(null);
      const [complaintData, staffData, subscriberData, connData] = await Promise.all([
        getComplaints(),
        getStaff().catch(() => [] as Staff[]),
        getSubscribers().catch(() => [] as Subscriber[]),
        getConnections().catch(() => [] as Connection[]),
      ]);
      setComplaints(complaintData);
      setStaff(staffData);
      setSubscribers(subscriberData);
      setConnections(connData);
    } catch (err: any) {
      const reason =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load complaints. Check your connection and try again.';
      setError(reason);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterCategory, filterStatus]);

  const operatorMap: Record<string, string> = {};
  staff.forEach(s => {
    operatorMap[s.id] = s.name;
  });

  const entityAreaMap: Record<string, string> = {};
  subscribers.forEach(s => {
    if (s.areaId) {
      entityAreaMap[s.id] = s.areaId;
    }
  });
  connections.forEach(c => {
    if (c.sublocalityId) {
      entityAreaMap[c.id] = c.sublocalityId;
    }
  });

  const currentStaff = user?.id ? staff.find(s => s.id === user.id) : undefined;
  const myAreaId = currentStaff?.areaId;

  const areaScopedComplaints = (() => {
    if (!currentStaff) {
      return complaints;
    }
    if (!myAreaId) {
      return [];
    }
    return complaints.filter(c => {
      const area = entityAreaMap[c.subscriberId];
      return !!area && area === myAreaId;
    });
  })();

  const filteredData = areaScopedComplaints.filter(c => {
    if (filterCategory !== 'All' && c.category !== filterCategory) {
      return false;
    }
    if (filterStatus !== 'All' && c.status !== filterStatus) {
      return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        (c.id || '').toLowerCase().includes(q) ||
        (c.subscriberName || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statCards = [
    {
      key: 'total',
      label: 'Total Complaints',
      value: String(areaScopedComplaints.length),
      icon: ListTodo,
      gradient: ['#3B82F6', '#06B6D4'] as [string, string],
    },
    {
      key: 'open',
      label: 'Open',
      value: String(areaScopedComplaints.filter(c => c.status === 'open').length),
      icon: CircleCheck,
      gradient: ['#10B981', '#16A34A'] as [string, string],
    },
    {
      key: 'done',
      label: 'Done',
      value: String(areaScopedComplaints.filter(c => c.status === 'done').length),
      icon: CircleCheck,
      gradient: ['#3B82F6', '#06B6D4'] as [string, string],
    },
    {
      key: 'on-hold',
      label: 'On Hold',
      value: String(areaScopedComplaints.filter(c => c.status === 'on-hold').length),
      icon: Clock,
      gradient: ['#F59E0B', '#EA580C'] as [string, string],
    },
    {
      key: 'rejected',
      label: 'Rejected',
      value: String(areaScopedComplaints.filter(c => c.status === 'reject').length),
      icon: AlertCircle,
      gradient: ['#EF4444', '#E11D48'] as [string, string],
    },
    {
      key: 'closed',
      label: 'Closed',
      value: String(areaScopedComplaints.filter(c => c.status === 'closed').length),
      icon: CircleCheck,
      gradient: ['#6B7280', '#475569'] as [string, string],
    },
  ];

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginated = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getVisiblePages = () => {
    const pages: number[] = [];
    const startPage = Math.max(1, currentPage - 3);
    const endPage = Math.min(totalPages, currentPage + 3);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const handlePageSubmit = () => {
    const page = parseInt(pageInput, 10);
    if (page && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput('');
    }
  };

  const handleEdit = async () => {
    if (!editComplaint) {
      return;
    }
    setSaving(true);
    try {
      await updateComplaint(editComplaint.id, {
        ...editComplaint,
        description: editDescription,
        status: editStatus,
        assignedToId: editComplaint.assignedToId || null,
      });
      setEditOpen(false);
      setEditComplaint(null);
      fetchData(false);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Update failed';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusComplaint || !statusValue) {
      return;
    }
    setSaving(true);
    try {
      await updateComplaint(statusComplaint.id, {
        ...statusComplaint,
        status: statusValue,
        assignedToId: statusComplaint.assignedToId || null,
      });
      setStatusOpen(false);
      setStatusComplaint(null);
      fetchData(false);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to update status';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (complaint: Complaint) => {
    Alert.alert('Delete Complaint', `Are you sure you want to delete this complaint from ${complaint.subscriberName}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComplaint(complaint.id);
            fetchData(false);
          } catch (err: any) {
            const msg =
              err.response?.data?.message ||
              err.response?.data?.error ||
              'Delete failed';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  const statusPickerOptions: Option[] = STATUS_OPTIONS.map(s => ({
    value: s,
    label: STATUS_LABELS[s] || s,
    dot: STATUS_COLORS[s]?.dot,
  }));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  const renderItem = ({item, index}: {item: Complaint; index: number}) => {
    const cat = categoryBadge(item.category);
    const status = STATUS_COLORS[item.status] || {bg: '#F3F4F6', fg: '#374151', dot: '#9CA3AF'};
    const operatorName = item.assignedToId ? (operatorMap[item.assignedToId] || 'Unknown') : '---';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rowIndex}>{index + 1 + (currentPage - 1) * pageSize}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.subscriberName}
            </Text>
            <Text style={styles.cardDate}>Opened: {formatOpenedAt(item.createdAt || item.created_at)}</Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.statusBtn}
              onPress={() => {
                setStatusComplaint(item);
                setStatusValue(item.status || '');
                setStatusOpen(true);
              }}>
              <CircleDot size={15} color={ACCENT_DARK} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => {
                setEditComplaint(item);
                setEditDescription(item.description || '');
                setEditStatus(item.status || '');
                setEditOpen(true);
              }}>
              <Pencil size={15} color={ACCENT_DARK} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Trash2 size={15} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.categoryBadge, {backgroundColor: cat.bg}]}>
            <Text style={[styles.categoryBadgeText, {color: cat.fg}]}>
              {item.category || 'service'}
            </Text>
          </View>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.statusDot, {backgroundColor: status.dot}]} />
            <Text style={[styles.statusBadgeText, {color: status.fg}]}>
              {STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Description</Text>
          <Text style={styles.infoValue} numberOfLines={2}>
            {item.description || '-'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Operator</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {operatorName}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerHint}>Ticket #{index + 1 + (currentPage - 1) * pageSize}</Text>
          {item.priority ? (
            <Text style={styles.priorityValue}>{String(item.priority).toUpperCase()}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <GradientView colors={['#166534', '#22c55e']} style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Allocated Complaint</Text>
          <Text style={styles.headerCount}>{areaScopedComplaints.length} complaints</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginated}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={[ACCENT]}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.heroHeader}>
              <GradientView colors={GRADIENT} style={styles.heroIconBox}>
                <ClipboardPen size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Allocated Complaint</Text>
                <Text style={styles.heroSubtitle}>
                  View complaints from subscribers of your allocated area.
                </Text>
              </View>
            </View>

            <ComplaintDivider />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}>
              {statCards.map(card => (
                <View key={card.key} style={styles.statCard}>
                  <GradientView colors={card.gradient} style={styles.statIcon}>
                    <card.icon size={18} color="#FFFFFF" />
                  </GradientView>
                  <View style={styles.statInfo}>
                    <Text style={styles.statLabel}>{card.label}</Text>
                    <Text style={styles.statValue} numberOfLines={1}>
                      {card.value}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}>
              <View style={styles.filterChip}>
                <Text style={styles.filterLabel}>Category</Text>
                <TouchableOpacity
                  style={styles.filterSelect}
                  onPress={() => setFilterTarget('category')}>
                  <Tag size={16} color="#0D9488" />
                  <Text style={styles.filterSelectText} numberOfLines={1}>
                    {filterCategory === 'All'
                      ? 'All Categories'
                      : String(filterCategory).toUpperCase()}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.filterChip}>
                <Text style={styles.filterLabel}>Status</Text>
                <TouchableOpacity
                  style={styles.filterSelect}
                  onPress={() => setFilterTarget('status')}>
                  <Filter size={16} color="#0D9488" />
                  <Text style={styles.filterSelectText} numberOfLines={1}>
                    {filterStatus === 'All'
                      ? 'All Status'
                      : (STATUS_LABELS[filterStatus] || filterStatus)}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.searchBox}>
              <Search size={16} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by ID, subscriber or description..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.empty}>
              <EmptyStateIcon icon={TriangleAlert} />
              <Text style={styles.emptyTitle}>Failed to load complaints</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : areaScopedComplaints.length === 0 ? (
            <View style={styles.empty}>
              <EmptyStateIcon icon={FileText} />
              <Text style={styles.emptyTitle}>No complaints found</Text>
              <Text style={styles.emptyText}>
                No complaints were raised from subscribers of your allocated area.
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <EmptyStateIcon icon={Search} />
              <Text style={styles.emptyTitle}>No complaints found</Text>
              <Text style={styles.emptyText}>
                No complaints match your search or filters.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          filteredData.length > 0 ? (
            <View style={styles.pagination}>
              <Text style={styles.paginationInfo}>
                Showing {filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
              </Text>

              <View style={styles.pageControls}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  disabled={currentPage === 1}
                  onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}>
                  <ChevronLeft size={14} color={currentPage === 1 ? '#D1D5DB' : '#374151'} />
                  <Text style={[styles.pageBtnText, currentPage === 1 && styles.pageBtnTextDisabled]}>
                    Previous
                  </Text>
                </TouchableOpacity>

                {getVisiblePages().map(page => (
                  <TouchableOpacity
                    key={page}
                    style={[styles.pageNum, currentPage === page && {backgroundColor: ACCENT}]}
                    onPress={() => setCurrentPage(page)}>
                    <Text
                      style={[
                        styles.pageNumText,
                        currentPage === page && styles.pageNumTextActive,
                      ]}>
                      {page}
                    </Text>
                  </TouchableOpacity>
                ))}

                {currentPage + 3 < totalPages ? (
                  <>
                    <Text style={styles.ellipsis}>...</Text>
                    <TouchableOpacity style={styles.pageNum} onPress={() => setCurrentPage(totalPages)}>
                      <Text style={styles.pageNumText}>{totalPages}</Text>
                    </TouchableOpacity>
                  </>
                ) : null}

                <View style={styles.goTo}>
                  <TextInput
                    style={styles.goToInput}
                    placeholder="Go to"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={pageInput}
                    onChangeText={text => {
                      if (text === '' || /^\d+$/.test(text)) {
                        setPageInput(text);
                      }
                    }}
                    onSubmitEditing={handlePageSubmit}
                  />
                  <TouchableOpacity
                    style={[
                      styles.goToBtn,
                      (!pageInput ||
                        parseInt(pageInput, 10) < 1 ||
                        parseInt(pageInput, 10) > totalPages) &&
                        styles.pageBtnDisabled,
                    ]}
                    disabled={
                      !pageInput ||
                      parseInt(pageInput, 10) < 1 ||
                      parseInt(pageInput, 10) > totalPages
                    }
                    onPress={handlePageSubmit}>
                    <ArrowRight size={14} color="#374151" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  disabled={currentPage === totalPages}
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>
                  <Text
                    style={[
                      styles.pageBtnText,
                      currentPage === totalPages && styles.pageBtnTextDisabled,
                    ]}>
                    Next
                  </Text>
                  <ChevronRight size={14} color={currentPage === totalPages ? '#D1D5DB' : '#374151'} />
                </TouchableOpacity>
              </View>

              <View style={styles.pageSizeRow}>
                <Text style={styles.pageSizeLabel}>Rows per page</Text>
                <TouchableOpacity style={styles.pageSizeSelect} onPress={() => setPageSizeOpen(true)}>
                  <Text style={styles.pageSizeSelectText}>{pageSize}</Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        }
      />

      <Modal
        visible={pageSizeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPageSizeOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Rows per page</Text>
              <TouchableOpacity onPress={() => setPageSizeOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {PAGE_SIZES.map(size => {
              const active = pageSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  style={styles.sheetOption}
                  onPress={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                    setPageSizeOpen(false);
                  }}>
                  <View style={styles.sheetOptionRow}>
                    <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}>
                      {size} per page
                    </Text>
                    {active ? <Check size={16} color={ACCENT} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      <OptionPickerSheet
        visible={filterTarget === 'category'}
        title="Filter by Category"
        options={[{label: 'All Categories', value: 'All'}, ...CATEGORIES]}
        value={filterCategory}
        onSelect={setFilterCategory}
        onClose={() => setFilterTarget(null)}
      />

      <OptionPickerSheet
        visible={filterTarget === 'status'}
        title="Filter by Status"
        options={[{label: 'All Status', value: 'All'}, ...statusPickerOptions]}
        value={filterStatus}
        onSelect={setFilterStatus}
        onClose={() => setFilterTarget(null)}
      />

      <OptionPickerSheet
        visible={editStatusPickerOpen}
        title="Update Status"
        options={statusPickerOptions}
        value={editStatus}
        onSelect={setEditStatus}
        onClose={() => setEditStatusPickerOpen(false)}
      />

      <OptionPickerSheet
        visible={statusPickerOpen}
        title="Update Status"
        options={statusPickerOptions}
        value={statusValue}
        onSelect={setStatusValue}
        onClose={() => setStatusPickerOpen(false)}
      />

      <Modal
        visible={editOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView
          style={styles.formOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formSheet}>
            <View style={styles.formSheetHeader}>
              <View style={styles.formSheetTitleRow}>
                <GradientView colors={GRADIENT} style={styles.formSheetIcon}>
                  <Pencil size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>Edit Complaint</Text>
              </View>
              <TouchableOpacity onPress={() => setEditOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Subscriber</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputReadOnly]}
                  value={editComplaint?.subscriberName || ''}
                  editable={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Status</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() => setEditStatusPickerOpen(true)}>
                  <CircleDot size={16} color="#0D9488" />
                  <Text style={styles.formSelectText} numberOfLines={1}>
                    {editStatus ? (STATUS_LABELS[editStatus] || editStatus) : 'Select status'}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Describe the complaint..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setEditOpen(false)}
                  disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <GradientButton
                  colors={['#10B981', '#16A34A']}
                  style={styles.saveBtn}
                  onPress={handleEdit}
                  disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </GradientButton>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={statusOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusOpen(false)}>
        <KeyboardAvoidingView
          style={styles.formOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formSheet}>
            <View style={styles.formSheetHeader}>
              <View style={styles.formSheetTitleRow}>
                <GradientView colors={GRADIENT} style={styles.formSheetIcon}>
                  <CircleDot size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>Update Complaint Status</Text>
              </View>
              <TouchableOpacity onPress={() => setStatusOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Subscriber</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputReadOnly]}
                  value={statusComplaint?.subscriberName || ''}
                  editable={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Status</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() => setStatusPickerOpen(true)}>
                  <CircleDot size={16} color="#0D9488" />
                  <Text style={styles.formSelectText} numberOfLines={1}>
                    {statusValue ? (STATUS_LABELS[statusValue] || statusValue) : 'Select status'}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setStatusOpen(false)}
                  disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <GradientButton
                  colors={['#10B981', '#16A34A']}
                  style={styles.saveBtn}
                  onPress={handleStatusUpdate}
                  disabled={saving || !statusValue}>
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Update Status</Text>
                  )}
                </GradientButton>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6'},
  header: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    marginTop: 50, marginLeft: 16, paddingVertical: 8, paddingHorizontal: 8,
    backgroundColor: '#166534', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#166534', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
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
  heroTitle: {fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: -0.5},
  heroSubtitle: {fontSize: 12, color: '#6B7280', marginTop: 2},
  heroDivider: {marginHorizontal: 20, marginBottom: 4},
  statsRow: {paddingHorizontal: 16, paddingTop: 14, gap: 10},
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 10,
    minWidth: 160,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  statInfo: {flex: 1},
  statLabel: {fontSize: 11, color: '#6B7280', fontWeight: '500'},
  statValue: {fontSize: 17, fontWeight: '700', color: '#111827'},
  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 190,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  filterSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  filterSelectText: {flex: 1, fontSize: 14, color: '#111827'},
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 6},
  rowIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT_DARK,
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1},
  cardName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  cardDate: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 2,
  },
  cardActions: {flexDirection: 'row', gap: 8},
  statusBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ACCENT_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ACCENT_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8},
  categoryBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryBadgeText: {fontSize: 11, fontWeight: '600', textTransform: 'capitalize'},
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#F3F4F6',
    gap: 5,
  },
  statusDot: {width: 8, height: 8, borderRadius: 4},
  statusBadgeText: {fontSize: 11, fontWeight: '600'},
  infoRow: {flexDirection: 'row', paddingVertical: 5},
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 90},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 6,
  },
  footerHint: {fontSize: 11, color: '#9CA3AF'},
  priorityValue: {fontSize: 11, fontWeight: '700', color: '#D97706'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: ACCENT_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280', textAlign: 'center'},
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: ACCENT,
  },
  retryBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
  pagination: {paddingTop: 6},
  paginationInfo: {fontSize: 13, color: '#6B7280', marginBottom: 10},
  pageControls: {flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'},
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
  pageNumText: {fontSize: 12, color: '#374151'},
  pageNumTextActive: {color: '#FFFFFF', fontWeight: '600'},
  ellipsis: {paddingHorizontal: 4, color: '#6B7280'},
  goTo: {flexDirection: 'row', alignItems: 'center', gap: 4},
  goToInput: {
    width: 52,
    height: 32,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 12,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    paddingVertical: 0,
  },
  goToBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageSizeRow: {flexDirection: 'row', alignItems: 'center', marginTop: 12},
  pageSizeLabel: {fontSize: 12, color: '#6B7280', marginRight: 8},
  pageSizeSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 84,
  },
  pageSizeSelectText: {fontSize: 13, color: '#111827', fontWeight: '600', marginRight: 8},
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
    maxHeight: '75%',
  },
  pickerSheet: {maxHeight: '80%'},
  sheetScroll: {maxHeight: 480},
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
  sheetOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetOptionRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  sheetOptionText: {flex: 1, fontSize: 15, color: '#374151', fontWeight: '500'},
  sheetOptionTextActive: {color: ACCENT_DARK, fontWeight: '600'},
  optionDot: {width: 12, height: 12, borderRadius: 6},
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginTop: 14,
  },
  pickerSearchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  pickerEmpty: {
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 14,
    color: '#6B7280',
  },
  formOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  formSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  formSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  formSheetTitleRow: {flexDirection: 'row', alignItems: 'center'},
  formSheetIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  formSheetTitle: {fontSize: 16, fontWeight: '600', color: '#111827'},
  formBody: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40},
  formGroup: {marginBottom: 14},
  formLabel: {fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6},
  formInput: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827',
  },
  formInputReadOnly: {backgroundColor: '#F9FAFB', color: '#6B7280'},
  formTextArea: {minHeight: 80, textAlignVertical: 'top'},
  formSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  formSelectText: {flex: 1, fontSize: 15, color: '#111827'},
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {fontSize: 14, color: '#DC2626', fontWeight: '600'},
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
});
