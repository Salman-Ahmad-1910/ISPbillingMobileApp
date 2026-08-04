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
  ScrollView,
  Animated,
  Modal,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import {
  Pencil,
  Trash2,
  PlusCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Check,
} from 'lucide-react-native';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {areasApi, popsApi, oltsApi, splittersApi, boxesApi} from '../../api/network';
import {ModuleConfig, StatusBadge, UtilizationBar} from './networkConfig';
import {GradientButton} from '../../components/GradientButton';

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

function HeroDivider({from, to}: {from: string; to: string}) {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={from} stopOpacity="1" />
            <Stop offset="0.7" stopColor={to} stopOpacity="0.6" />
            <Stop offset="1" stopColor={to} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#heroGrad)" />
      </Svg>
    </View>
  );
}

type Crud = {
  list: () => Promise<any[]>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  remove: (id: string) => Promise<void>;
};

const crudMap: Record<string, Crud> = {
  areas: areasApi,
  pops: popsApi,
  olts: oltsApi,
  splitters: splittersApi,
  boxes: boxesApi,
};

const PAGE_SIZES = [5, 10, 20, 50, 100];

export default function NetworkListScreen({route, navigation}: any) {
  const config: ModuleConfig = route.params.config;
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const [items, setItems] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  const openDrawer = () => {
    nav.dispatch(DrawerActions.openDrawer());
  };

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await crudMap[config.key].list();
      setItems(data);
      setFiltered(data);
    } catch {
      setError(`Failed to load ${config.plural}. Check your connection and try again.`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      setFiltered(items.filter(item => config.match(item, q)));
    } else {
      setFiltered(items);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, items]);

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

  const handleDelete = (item: any) => {
    const name = item.name || item.city || item.locality || item.id;
    Alert.alert(`Delete ${config.singular}`, `Are you sure you want to delete ${name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await crudMap[config.key].remove(item.id);
            const updated = items.filter(i => i.id !== item.id);
            setItems(updated);
            setFiltered(
              search.trim() ? updated.filter(i => config.match(i, search.toLowerCase())) : updated,
            );
          } catch {
            Alert.alert('Error', `Failed to delete ${config.singular}`);
          }
        },
      },
    ]);
  };

  const renderRow = ({item, index}: {item: any; index: number}) => {
    const primary = config.primaryField;
    const PrimaryIcon = primary.icon;
    const badge = config.statusBadge ? config.statusBadge(item) : null;
    const util = config.utilizationBar ? config.utilizationBar(item) : null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rowIndex}>{index + 1 + (currentPage - 1) * pageSize}</Text>
          <View style={styles.primaryGroup}>
            {PrimaryIcon ? (
              <PrimaryIcon size={16} color={primary.iconColor || '#6B7280'} />
            ) : null}
            <Text style={styles.primaryText} numberOfLines={1}>
              {item[primary.key]}
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('NetworkForm', {config, item})}>
              <Pencil size={15} color="#166534" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item)}>
              <Trash2 size={15} color="#E11D48" />
            </TouchableOpacity>
          </View>
        </View>

        {config.infoFields.map(field => {
          const Icon = field.icon;
          return (
            <View key={field.key} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{field.label}</Text>
              {Icon ? <Icon size={13} color={field.iconColor || '#9CA3AF'} /> : null}
              <Text style={styles.infoValue} numberOfLines={1}>
                {field.render ? field.render(item) : item[field.key] ?? 'N/A'}
              </Text>
            </View>
          );
        })}

        {badge ? (
          <View style={styles.badgeRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <StatusBadge label={badge.label} online={badge.online} />
          </View>
        ) : null}

        {util ? (
          <View style={styles.badgeRow}>
            <Text style={styles.infoLabel}>Utilization</Text>
            <UtilizationBar used={util.used} total={util.total} />
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const statCards = config.stats;

  const topBar = (
    <View style={styles.topBar}>
      <View style={[styles.topBarAccent, {backgroundColor: config.gradient[0]}]} />
      <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
        <DoorMenuIcon open={drawerStatus === 'open'} />
      </TouchableOpacity>
      <Text style={[styles.topBarTitle, {color: config.gradient[0]}]}>Network</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {topBar}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {topBar}

      <FlatList
        data={paginated}
        keyExtractor={item => item.id}
        renderItem={renderRow}
        ListHeaderComponent={
          <View>
            {/* Hero Header */}
            <View style={styles.heroHeader}>
              <View style={[styles.heroIconBox, {backgroundColor: config.gradient[0]}]}>
                <config.icon size={20} color="#FFFFFF" />
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>{config.title}</Text>
                <Text style={styles.heroSubtitle}>{config.subtitle}</Text>
              </View>
            </View>
            <HeroDivider from={config.gradient[0]} to={config.gradient[1]} />

            {/* Stat cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}>
              {statCards.map((stat, i) => {
                const value = typeof stat.value === 'function' ? stat.value(items) : stat.value;
                return (
                  <View key={i} style={styles.statCard}>
                    <View
                      style={[
                        styles.statIcon,
                        {backgroundColor: stat.colors[0], shadowColor: stat.colors[0]},
                      ]}>
                      <stat.icon size={18} color="#FFFFFF" />
                    </View>
                    <View>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                      <Text style={styles.statValue}>{value}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Search + Add */}
            <View style={styles.toolbar}>
              <View style={styles.searchBox}>
                <Search size={16} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={config.searchPlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <GradientButton
                colors={['#166534', '#22c55e']}
                style={styles.addBtn}
                onPress={() => navigation.navigate('NetworkForm', {config})}>
                <PlusCircle size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText} numberOfLines={1}>
                  {config.addButtonLabel}
                </Text>
              </GradientButton>
            </View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={styles.emptyTitle}>Failed to load {config.plural}</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity
                style={[styles.retryBtn, {backgroundColor: config.gradient[0]}]}
                onPress={() => fetchData()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{config.emptyIcon}</Text>
              <Text style={styles.emptyTitle}>{config.emptyTitle}</Text>
              <Text style={styles.emptyText}>{config.emptyText}</Text>
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.pagination}>
            <Text style={styles.paginationInfo}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}{' '}
              {config.plural}
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
                      currentPage === page && {backgroundColor: config.gradient[0]},
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
                  <ChevronRight
                    size={14}
                    color={currentPage === totalPages ? '#D1D5DB' : '#374151'}
                  />
                </TouchableOpacity>
            </View>

            {/* Page size selector */}
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
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={['#4F46E5']}
          />
        }
      />

      <Modal
        visible={pageSizeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPageSizeOpen(false)}>
        <View style={styles.pageSizeOverlay}>
          <View style={styles.pageSizeSheet}>
            <View style={styles.pageSizeSheetHeader}>
              <Text style={styles.pageSizeSheetTitle}>Rows per page</Text>
              <TouchableOpacity onPress={() => setPageSizeOpen(false)}>
                <Text style={styles.pageSizeSheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {PAGE_SIZES.map(size => {
              const active = pageSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  style={styles.pageSizeOption}
                  onPress={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                    setPageSizeOpen(false);
                  }}>
                  <Text
                    style={[
                      styles.pageSizeOptionText,
                      active && {color: config.gradient[0]},
                    ]}>
                    {size} per page
                  </Text>
                  {active ? (
                    <Check size={16} color={config.gradient[0]} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6'},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 50,
    marginLeft: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  topBarAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingRight: 8,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doorIconBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doorIconLine: {
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#374151',
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
  toolbar: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14},
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginRight: 10,
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
  addBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginLeft: 6},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 6},
  rowIndex: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#9CA3AF',
    marginRight: 10,
    minWidth: 20,
  },
  primaryGroup: {flex: 1, flexDirection: 'row', alignItems: 'center'},
  primaryText: {fontSize: 15, fontWeight: '600', color: '#111827', marginLeft: 8, flexShrink: 1},
  actions: {flexDirection: 'row', gap: 8},
  editBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {flexDirection: 'row', alignItems: 'center', marginTop: 4},
  infoLabel: {fontSize: 11, color: '#9CA3AF', width: 90},
  infoValue: {fontSize: 13, color: '#374151', fontWeight: '500', marginLeft: 8, flexShrink: 1},
  badgeRow: {flexDirection: 'row', alignItems: 'center', marginTop: 8},
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
  pageSizeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pageSizeSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  pageSizeSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pageSizeSheetTitle: {fontSize: 16, fontWeight: '600', color: '#111827'},
  pageSizeSheetClose: {fontSize: 16, color: '#6B7280', padding: 4},
  pageSizeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pageSizeOptionText: {fontSize: 15, color: '#374151', fontWeight: '500'},
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  retryBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
});
