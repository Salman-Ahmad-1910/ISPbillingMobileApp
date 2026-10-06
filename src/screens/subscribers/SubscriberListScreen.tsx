import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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
  Animated,
} from 'react-native';
import {useFocusEffect, useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  Users,
  Wifi,
  WifiOff,
  UserX,
  Pause,
  Search,
  PlusCircle,
  FileSpreadsheet,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  Pencil,
} from 'lucide-react-native';
import {
  getConnections,
  deleteConnection,
  updateConnection,
  bulkAssignSublocality,
} from '../../api/connections';
import {areasApi, boxesApi} from '../../api/network';
import {getPackages} from '../../api/subscribers';
import {getCompanies} from '../../api/companies';
import {Area, Company, Connection, DistributionBox, Package} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';
import OptionPickerSheet from '../../components/OptionPickerSheet';
import {smartMatch} from '../../utils/search';
import ImportExportModal from './ImportExportModal';
import StatusDialogModal from './StatusDialogModal';

const PAGE_SIZES = [10, 50, 100];

const TYPE_LABELS: Record<string, string> = {
  both: 'Both',
  internet: 'Internet',
  tv_cable: 'TV Cable',
};

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

function HeroDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="subHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#2563EB" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#3B82F6" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#subHeroGrad)" />
      </Svg>
    </View>
  );
}

type FilterOption = {label: string; value: string};

export default function SubscriberListScreen({navigation}: any) {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [filtered, setFiltered] = useState<Connection[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [boxes, setBoxes] = useState<DistributionBox[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [areaNames, setAreaNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterArea, setFilterArea] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterBox, setFilterBox] = useState('all');
  const [filterPackage, setFilterPackage] = useState('all');
  const [filterDiscount, setFilterDiscount] = useState('all');
  const [filterSort, setFilterSort] = useState('all');
  const [filterProvider, setFilterProvider] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [filterSheet, setFilterSheet] = useState<{
    key: string;
    title: string;
    options: FilterOption[];
    selected: string;
  } | null>(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSublocality, setBulkSublocality] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkPickerOpen, setBulkPickerOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Connection | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

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
      const [data, areasData, boxesData, packagesData, companiesData] =
        await Promise.all([
          getConnections(),
          areasApi.list(),
          boxesApi.list(),
          getPackages(),
          getCompanies(),
        ]);
      setConnections(data);
      setAreas(areasData);
      setBoxes(boxesData);
      setPackages(packagesData);
      setCompanies(companiesData);
      const map: Record<string, string> = {};
      areasData.forEach(a => {
        const label = a.subLocality || a.locality || a.id.slice(0, 8);
        map[a.id] = label;
      });
      setAreaNames(map);
    } catch {
      Alert.alert('Error', 'Failed to load subscribers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  useEffect(() => {
    let result = connections;

    if (search) {
      result = result.filter(c =>
        smartMatch(search, [c.internetId, c.cell, c.mobile], [c.name, c.address]),
      );
    }

    if (filterArea === 'unassigned') {
      result = result.filter(c => !c.sublocalityId);
    } else if (filterArea !== 'all') {
      result = result.filter(c => c.sublocalityId === filterArea);
    }
    if (filterStatus !== 'all') {
      result = result.filter(c => c.status === filterStatus);
    }
    if (filterType !== 'all') {
      const typeMap: Record<string, string> = {
        both: 'both',
        tv_cable: 'tv_cable',
        internet: 'internet',
        cable_all: 'tv_cable',
        internet_all: 'internet',
      };
      result = result.filter(
        c => c.connectionType === (typeMap[filterType] || filterType),
      );
    }
    if (filterBox !== 'all') {
      result = result.filter(c => c.boxNumber === filterBox);
    }
    if (filterPackage !== 'all') {
      result = result.filter(
        c => c.packageInternet === filterPackage || c.packageCable === filterPackage,
      );
    }
    if (filterDiscount !== 'all') {
      result = result.filter(
        c =>
          c.discount === filterDiscount ||
          (filterDiscount === 'no_discount' && !c.discount),
      );
    }
    if (filterProvider !== 'all') {
      result = result.filter(c => c.connectionProvider === filterProvider);
    }

    if (filterSort === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (filterSort === 'internetId') {
      result = [...result].sort((a, b) => a.internetId.localeCompare(b.internetId));
    } else if (filterSort === 'installationDate') {
      result = [...result].sort((a, b) =>
        (a.installationDate || '').localeCompare(b.installationDate || ''),
      );
    }

    setFiltered(result);
    setCurrentPage(1);
  }, [
    connections,
    search,
    filterStatus,
    filterArea,
    filterType,
    filterBox,
    filterPackage,
    filterDiscount,
    filterSort,
    filterProvider,
  ]);

  const stats = useMemo(
    () => ({
      total: connections.length,
      active: connections.filter(c => c.status === 'active').length,
      inactive: connections.filter(c => c.status === 'inactive').length,
      deactivated: connections.filter(c => c.status === 'deactivated').length,
      suspended: connections.filter(c => c.status === 'suspended').length,
    }),
    [connections],
  );

  const statCards: {key: string; label: string; value: number; icon: any; color: string; gradient: [string, string]}[] = [
    {key: 'total', label: 'Total', value: stats.total, icon: Users, color: '#2563EB', gradient: ['#60A5FA', '#2563EB']},
    {key: 'active', label: 'Active', value: stats.active, icon: Wifi, color: '#059669', gradient: ['#34D399', '#059669']},
    {key: 'inactive', label: 'Inactive', value: stats.inactive, icon: WifiOff, color: '#6B7280', gradient: ['#9CA3AF', '#6B7280']},
    {key: 'deactivated', label: 'Deactivated', value: stats.deactivated, icon: UserX, color: '#DC2626', gradient: ['#F87171', '#DC2626']},
    {key: 'suspended', label: 'Suspended', value: stats.suspended, icon: Pause, color: '#D97706', gradient: ['#FBBF24', '#D97706']},
  ];

  const areaOptions = useMemo<FilterOption[]>(
    () => [
      {label: 'All Sublocality', value: 'all'},
      {label: 'Unassigned', value: 'unassigned'},
      ...areas.map(a => ({
        label: a.subLocality || a.locality || a.id.slice(0, 8),
        value: a.id,
      })),
    ],
    [areas],
  );

  const boxOptions = useMemo<FilterOption[]>(
    () => [
      {label: 'All Boxes', value: 'all'},
      ...boxes.map(b => ({label: b.name, value: b.name})),
    ],
    [boxes],
  );

  const packageOptions = useMemo<FilterOption[]>(
    () => [
      {label: 'All Packages', value: 'all'},
      ...packages.map(p => ({label: p.name, value: p.name})),
    ],
    [packages],
  );

  const providerOptions = useMemo<FilterOption[]>(
    () => [
      {label: 'All Providers', value: 'all'},
      ...companies.map(c => ({label: c.name, value: c.name})),
    ],
    [companies],
  );

  const bulkAreaOptions = useMemo<FilterOption[]>(
    () =>
      areas.map(a => ({
        label: a.subLocality || a.locality || a.id.slice(0, 8),
        value: a.id,
      })),
    [areas],
  );

  const statusOptions: FilterOption[] = [
    {label: 'All', value: 'all'},
    {label: 'Active', value: 'active'},
    {label: 'Inactive', value: 'inactive'},
  ];

  const typeOptions: FilterOption[] = [
    {label: 'All', value: 'all'},
    {label: 'Both', value: 'both'},
    {label: 'TV Cable', value: 'tv_cable'},
    {label: 'Cable All', value: 'cable_all'},
    {label: 'Internet', value: 'internet'},
    {label: 'Internet All', value: 'internet_all'},
  ];

  const discountOptions: FilterOption[] = [
    {label: 'All Discounts', value: 'all'},
    {label: 'No Discount', value: 'no_discount'},
    {label: 'Quarter', value: 'quarter'},
    {label: 'Half', value: 'half'},
    {label: 'Full Free', value: 'full_free'},
    {label: 'Custom', value: 'custom'},
  ];

  const sortOptions: FilterOption[] = [
    {label: 'Default', value: 'all'},
    {label: 'Name', value: 'name'},
    {label: 'Internet ID', value: 'internetId'},
    {label: 'Install Date', value: 'installationDate'},
  ];

  const openFilterSheet = (key: string, title: string, options: FilterOption[], selected: string) => {
    setFilterSheet({key, title, options, selected});
  };

  const onFilterSelect = (value: string) => {
    const key = filterSheet?.key;
    if (key === 'status') {
      setFilterStatus(value);
    } else if (key === 'area') {
      setFilterArea(value);
    } else if (key === 'type') {
      setFilterType(value);
    } else if (key === 'box') {
      setFilterBox(value);
    } else if (key === 'package') {
      setFilterPackage(value);
    } else if (key === 'discount') {
      setFilterDiscount(value);
    } else if (key === 'provider') {
      setFilterProvider(value);
    } else if (key === 'sort') {
      setFilterSort(value);
    }
    setFilterSheet(null);
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every(c => selectedIds.has(c.id));

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filtered.forEach(c => (checked ? next.add(c.id) : next.delete(c.id)));
      return next;
    });
  };

  const exitBulkEditMode = () => {
    setBulkEditMode(false);
    setSelectedIds(new Set());
    setBulkSublocality('');
  };

  const handleAddSublocality = async () => {
    if (!bulkSublocality || selectedIds.size === 0) {
      return;
    }
    setBulkSaving(true);
    try {
      const updated = await bulkAssignSublocality(
        Array.from(selectedIds),
        bulkSublocality,
        `Bulk sublocality assignment (${selectedIds.size} subscriber(s))`,
      );
      exitBulkEditMode();
      await fetchData(false);
      Alert.alert(
        'Success',
        `Sublocality assigned to ${updated} subscriber(s).`,
      );
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed to update sublocality',
      );
    } finally {
      setBulkSaving(false);
    }
  };

  const handleChangeStatus = async (
    connection: Connection,
    status: string,
    reason: string,
    comments: string,
  ) => {
    setStatusSaving(true);
    try {
      // The backend applies only the fields present in the payload, so the
      // deactivation bookkeeping is sent when moving to "deactivated" and
      // omitted for the other statuses.
      const payload: Partial<Connection> & Record<string, string | number> = {
        status,
      };
      if (status === 'deactivated') {
        payload.deactivationReason = reason;
        payload.comments = comments;
        payload.leavingDate = new Date().toISOString();
      }
      await updateConnection(connection.id, payload as Partial<Connection>);
      setStatusTarget(null);
      await fetchData(false);
      Alert.alert('Success', `Subscriber status updated to ${status}.`);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed to update subscriber status',
      );
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Subscriber', `Are you sure you want to delete ${name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteConnection(id);
            setConnections(prev => prev.filter(c => c.id !== id));
          } catch {
            Alert.alert('Error', 'Failed to delete subscriber');
          }
        },
      },
    ]);
  };

  const statusColors: Record<string, string> = {
    active: '#10B981',
    suspended: '#F59E0B',
    inactive: '#6B7280',
    deactivated: '#EF4444',
  };

  const statusGradients: Record<string, [string, string]> = {
    active: ['#34D399', '#10B981'],
    suspended: ['#FBBF24', '#F59E0B'],
    inactive: ['#9CA3AF', '#6B7280'],
    deactivated: ['#F87171', '#EF4444'],
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  const renderItem = ({item, index}: {item: Connection; index: number}) => {
    const displayId = item.internetId
      ? item.internetId
      : String((currentPage - 1) * pageSize + index + 1);
    return (
    <TouchableOpacity
      style={styles.card}
      disabled={bulkEditMode}
      onPress={() => navigation.navigate('SubscriberDetail', {connection: item})}>
      <View style={styles.cardHeader}>
        {bulkEditMode ? (
          <TouchableOpacity
            style={[
              styles.checkbox,
              selectedIds.has(item.id) && styles.checkboxChecked,
            ]}
            onPress={() => toggleOne(item.id, !selectedIds.has(item.id))}>
            {selectedIds.has(item.id) ? <Check size={14} color="#FFFFFF" /> : null}
          </TouchableOpacity>
        ) : null}
        <Text style={styles.rowIndex}>{displayId}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        </View>
        <GradientView
          colors={statusGradients[item.status] || ['#9CA3AF', '#6B7280']}
          style={styles.statusDot}
        />
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Internet ID</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{item.internetId || 'N/A'}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Address</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{item.address || 'N/A'}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Contact</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {[item.cell, item.mobile].filter(Boolean).join(' / ') || 'N/A'}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Type</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {TYPE_LABELS[item.connectionType] || item.connectionType || '-'}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Install Date</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{item.installationDate || 'N/A'}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Cable / Internet</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {[item.packageCable && `C: ${item.packageCable}`, item.packageInternet && `I: ${item.packageInternet}`]
            .filter(Boolean)
            .join('  ') || '-'}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Status</Text>
        <Text style={[styles.infoValue, {color: statusColors[item.status] || '#6B7280', textTransform: 'capitalize'}]}>
          {item.status}
        </Text>
      </View>
      <View style={styles.cardFooter}>
        {bulkEditMode ? null : (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('SubscriberForm', {connection: item})}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statusBtn}
            onPress={() => setStatusTarget(item)}>
            <Text style={styles.statusBtnText}>Status</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id, item.name)}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
        )}
      </View>
    </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const filterTrigger = (label: string, current: string, onPress: () => void) => (
    <TouchableOpacity style={styles.filterTrigger} onPress={onPress}>
      <Text style={styles.filterTriggerLabel} numberOfLines={1}>
        {label}: {current}
      </Text>
      <ChevronDown size={14} color="#6B7280" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <GradientView colors={['#166534', '#22c55e']} style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Subscribers</Text>
          <Text style={styles.headerCount}>{filtered.length} total</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginated}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#2563EB']} />
        }
        ListHeaderComponent={
          <View>
            {/* Hero Header */}
            <View style={styles.heroHeader}>
              <GradientView colors={['#60A5FA', '#2563EB']} style={styles.heroIconBox}>
                <Users size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Subscriber Detail</Text>
                <Text style={styles.heroSubtitle}>Manage subscriber connections and details.</Text>
              </View>
            </View>

            <HeroDivider />

            {/* Stat cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}>
              {statCards.map(card => (
                <View key={card.key} style={styles.statCard}>
                  <GradientView colors={card.gradient} style={[styles.statIcon, {shadowColor: card.color}]}>
                    <card.icon size={18} color="#FFFFFF" />
                  </GradientView>
                  <View>
                    <Text style={styles.statLabel}>{card.label}</Text>
                    <Text style={styles.statValue}>{card.value}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}>
              {filterTrigger('Sublocality', filterArea === 'all' ? 'All' : filterArea === 'unassigned' ? 'Unassigned' : areaNames[filterArea] || filterArea.slice(0, 8), () =>
                openFilterSheet('area', 'Sublocality', areaOptions, filterArea),
              )}
              {filterTrigger('Status', filterStatus === 'all' ? 'All' : filterStatus, () =>
                openFilterSheet('status', 'Status', statusOptions, filterStatus),
              )}
              {filterTrigger('Type', filterType === 'all' ? 'All' : typeOptions.find(o => o.value === filterType)?.label || filterType, () =>
                openFilterSheet('type', 'Type', typeOptions, filterType),
              )}
              {filterTrigger('Box Number', filterBox === 'all' ? 'All' : filterBox, () =>
                openFilterSheet('box', 'Box Number', boxOptions, filterBox),
              )}
              {filterTrigger('Package', filterPackage === 'all' ? 'All' : filterPackage, () =>
                openFilterSheet('package', 'Package', packageOptions, filterPackage),
              )}
              {filterTrigger('Discount', filterDiscount === 'all' ? 'All' : discountOptions.find(o => o.value === filterDiscount)?.label || filterDiscount, () =>
                openFilterSheet('discount', 'Discount', discountOptions, filterDiscount),
              )}
              {filterTrigger('Sort By', filterSort === 'all' ? 'Default' : sortOptions.find(o => o.value === filterSort)?.label || filterSort, () =>
                openFilterSheet('sort', 'Sort By', sortOptions, filterSort),
              )}
              {filterTrigger('Connection Provider', filterProvider === 'all' ? 'All' : filterProvider, () =>
                openFilterSheet('provider', 'Connection Provider', providerOptions, filterProvider),
              )}
            </ScrollView>

            {/* Search + Bulk Edit + Import/Export + Add */}
            <View style={styles.toolbar}>
              <View style={styles.searchBox}>
                <Search size={16} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, ID, address, or contact..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <TouchableOpacity
                style={[styles.bulkBtn, bulkEditMode && styles.bulkBtnActive]}
                onPress={() =>
                  bulkEditMode ? exitBulkEditMode() : setBulkEditMode(true)
                }
                accessibilityLabel="Bulk edit subscribers">
                <Pencil size={16} color={bulkEditMode ? '#FFFFFF' : '#1D4ED8'} />
                <Text style={[styles.bulkBtnText, bulkEditMode && styles.bulkBtnTextActive]}>
                  {bulkEditMode ? 'Done' : 'Bulk Edit'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.importBtn}
                onPress={() => setImportExportOpen(true)}
                accessibilityLabel="Import or export subscribers">
                <FileSpreadsheet size={16} color="#059669" />
              </TouchableOpacity>
              <GradientButton
                colors={['#166534', '#22c55e']}
                style={styles.addBtn}
                onPress={() => navigation.navigate('SubscriberForm', {})}>
                <PlusCircle size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText} numberOfLines={1}>
                  Add Subscriber
                </Text>
              </GradientButton>
            </View>

            {bulkEditMode ? (
              <View style={styles.bulkBar}>
                <Text style={styles.bulkCount}>
                  {selectedIds.size} subscriber(s) selected
                </Text>
                <TouchableOpacity
                  style={styles.bulkSelect}
                  onPress={() => setBulkPickerOpen(true)}>
                  <Text
                    style={[
                      styles.bulkSelectText,
                      !bulkSublocality && styles.bulkPlaceholder,
                    ]}
                    numberOfLines={1}>
                    {bulkSublocality
                      ? areaNames[bulkSublocality] || bulkSublocality.slice(0, 8)
                      : 'Select sublocality'}
                  </Text>
                  <ChevronDown size={14} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.bulkApplyBtn,
                    (!bulkSublocality || selectedIds.size === 0 || bulkSaving) &&
                      styles.bulkBtnDisabled,
                  ]}
                  disabled={!bulkSublocality || selectedIds.size === 0 || bulkSaving}
                  onPress={handleAddSublocality}>
                  {bulkSaving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.bulkApplyText}>Add Sublocality</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bulkCancelBtn}
                  onPress={exitBulkEditMode}>
                  <Text style={styles.bulkCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {bulkEditMode ? (
              <TouchableOpacity
                style={styles.selectAllRow}
                onPress={() => toggleSelectAll(!allFilteredSelected)}>
                <View
                  style={[
                    styles.checkbox,
                    allFilteredSelected && styles.checkboxChecked,
                  ]}>
                  {allFilteredSelected ? (
                    <Check size={14} color="#FFFFFF" />
                  ) : null}
                </View>
                <Text style={styles.selectAllText}>Select all subscribers</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No results.</Text>
            <Text style={styles.emptyText}>
              {search ||
              filterStatus !== 'all' ||
              filterArea !== 'all' ||
              filterType !== 'all' ||
              filterBox !== 'all' ||
              filterPackage !== 'all' ||
              filterDiscount !== 'all' ||
              filterProvider !== 'all'
                ? 'Try adjusting your filters'
                : 'Add your first subscriber'}
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.pagination}>
            <Text style={styles.paginationInfo}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries
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
                  style={[
                    styles.pageNum,
                    currentPage === page && {backgroundColor: '#2563EB'},
                  ]}
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
                  <TouchableOpacity
                    style={styles.pageNum}
                    onPress={() => setCurrentPage(totalPages)}>
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
              <TouchableOpacity
                style={styles.pageSizeSelect}
                onPress={() => setPageSizeOpen(true)}>
                <Text style={styles.pageSizeSelectText}>{pageSize}</Text>
                <ChevronDown size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
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
                  <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}>
                    {size} per page
                  </Text>
                  {active ? <Check size={16} color="#2563EB" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!filterSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterSheet(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{filterSheet?.title}</Text>
              <TouchableOpacity onPress={() => setFilterSheet(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {filterSheet?.options.map(option => {
              const active = option.value === filterSheet.selected;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={styles.sheetOption}
                  onPress={() => onFilterSelect(option.value)}>
                  <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}>
                    {option.label}
                  </Text>
                  {active ? <Check size={16} color="#2563EB" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      <ImportExportModal
        visible={importExportOpen}
        onClose={() => setImportExportOpen(false)}
        connections={connections}
        areaNames={areaNames}
        onImported={() => {
          fetchData(false);
          setCurrentPage(1);
          setSearch('');
          setFilterStatus('all');
          setFilterArea('all');
          setFilterType('all');
          setFilterBox('all');
          setFilterPackage('all');
          setFilterDiscount('all');
          setFilterSort('all');
          setFilterProvider('all');
        }}
      />

      <OptionPickerSheet
        visible={bulkPickerOpen}
        title="Select sublocality"
        options={bulkAreaOptions}
        value={bulkSublocality}
        onSelect={setBulkSublocality}
        onClose={() => setBulkPickerOpen(false)}
      />

      <StatusDialogModal
        visible={!!statusTarget}
        connection={statusTarget}
        saving={statusSaving}
        onClose={() => setStatusTarget(null)}
        onSubmit={handleChangeStatus}
      />
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
  headerInfo: {
    paddingRight: 8,
  },
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
  heroDivider: {
    marginHorizontal: 20,
    marginBottom: 4,
  },
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
    minWidth: 150,
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
  statLabel: {fontSize: 11, color: '#6B7280', fontWeight: '500'},
  statValue: {fontSize: 20, fontWeight: '700', color: '#111827'},
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
  },
  filterTriggerLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    marginRight: 6,
    flexShrink: 1,
    textTransform: 'capitalize',
  },
  toolbar: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 14, rowGap: 8, columnGap: 8},
  searchBox: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 200,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexShrink: 0,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  importBtn: {
    width: 38,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginLeft: 6},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1,
    borderColor: '#9CA3AF', alignItems: 'center', justifyContent: 'center',
    marginRight: 8, backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {backgroundColor: '#2563EB', borderColor: '#2563EB'},
  rowIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    marginRight: 10,
  },
  cardInfo: {flex: 1},
  cardName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  statusDot: {width: 10, height: 10, borderRadius: 5},
  infoRow: {flexDirection: 'row', paddingVertical: 5},
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 110},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  cardFooter: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, marginTop: 6,
  },
  cardActions: {flexDirection: 'row', gap: 8},
  editBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6,
    backgroundColor: '#EEF2FF',
  },
  editBtnText: {fontSize: 12, fontWeight: '500', color: '#2563EB'},
  deleteBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: {fontSize: 12, fontWeight: '500', color: '#EF4444'},
  statusBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6,
    backgroundColor: '#FFFBEB',
  },
  statusBtnText: {fontSize: 12, fontWeight: '500', color: '#D97706'},
  bulkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE',
    backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10,
    flexShrink: 0,
  },
  bulkBtnActive: {backgroundColor: '#2563EB', borderColor: '#2563EB'},
  bulkBtnText: {fontSize: 13, fontWeight: '600', color: '#1D4ED8'},
  bulkBtnTextActive: {color: '#FFFFFF'},
  bulkBar: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    marginHorizontal: 16, marginTop: 12, padding: 12,
    borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  bulkCount: {fontSize: 13, fontWeight: '600', color: '#1E40AF'},
  bulkSelect: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexGrow: 1, flexBasis: 160, minWidth: 0,
    borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 8,
    backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 9,
  },
  bulkSelectText: {fontSize: 13, color: '#111827', fontWeight: '500', marginRight: 6, flexShrink: 1},
  bulkPlaceholder: {color: '#9CA3AF'},
  bulkApplyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, backgroundColor: '#166534', paddingHorizontal: 14,
    paddingVertical: 10, minWidth: 120,
  },
  bulkApplyText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600'},
  bulkBtnDisabled: {opacity: 0.6},
  bulkCancelBtn: {
    borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 10,
  },
  bulkCancelText: {fontSize: 13, fontWeight: '600', color: '#374151'},
  selectAllRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingTop: 12,
  },
  selectAllText: {fontSize: 13, color: '#374151', fontWeight: '500'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280'},
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
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetOptionText: {fontSize: 15, color: '#374151', fontWeight: '500'},
  sheetOptionTextActive: {color: '#2563EB', fontWeight: '600'},
});
