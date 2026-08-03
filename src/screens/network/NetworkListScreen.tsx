import React, {useCallback, useEffect, useState} from 'react';
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
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {
  Pencil,
  Trash2,
  PlusCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react-native';
import {areasApi, popsApi, oltsApi, splittersApi, boxesApi} from '../../api/network';
import {ModuleConfig, StatusBadge, UtilizationBar} from './networkConfig';
import {GradientButton} from '../../components/GradientButton';

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
  const [items, setItems] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');

  const openDrawer = () => {
    nav.dispatch({type: 'OPEN_DRAWER'} as never);
  };

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await crudMap[config.key].list();
      setItems(data);
      setFiltered(data);
    } catch {
      Alert.alert('Error', `Failed to load ${config.plural}`);
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={[styles.headerIconBox, {backgroundColor: config.gradient[1]}]}>
          <config.icon size={20} color="#FFFFFF" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{config.title}</Text>
          <Text style={styles.headerSubtitle}>{config.subtitle}</Text>
        </View>
      </View>

      <FlatList
        data={paginated}
        keyExtractor={item => item.id}
        renderItem={renderRow}
        ListHeaderComponent={
          <View>
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
                colors={config.gradient}
                style={styles.addBtn}
                onPress={() => navigation.navigate('NetworkForm', {config})}>
                <PlusCircle size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>{config.addButtonLabel}</Text>
              </GradientButton>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{config.emptyIcon}</Text>
            <Text style={styles.emptyTitle}>{config.emptyTitle}</Text>
            <Text style={styles.emptyText}>{config.emptyText}</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.pagination}>
            <Text style={styles.paginationInfo}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}{' '}
              {config.plural}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
            </ScrollView>

            {/* Page size selector */}
            <View style={styles.pageSizeRow}>
              <Text style={styles.pageSizeLabel}>Rows per page</Text>
              {PAGE_SIZES.map(size => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.pageSizeChip,
                    pageSize === size && {backgroundColor: config.gradient[0]},
                  ]}
                  onPress={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}>
                  <Text
                    style={[
                      styles.pageSizeText,
                      pageSize === size && styles.pageSizeTextActive,
                    ]}>
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIcon: {fontSize: 20, color: '#374151'},
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {flex: 1},
  headerTitle: {fontSize: 18, fontWeight: '700', color: '#111827'},
  headerSubtitle: {fontSize: 12, color: '#6B7280', marginTop: 2},
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
  pageControls: {flexDirection: 'row', alignItems: 'center', gap: 4},
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
  pageSizeRow: {flexDirection: 'row', alignItems: 'center', marginTop: 12, flexWrap: 'wrap'},
  pageSizeLabel: {fontSize: 12, color: '#6B7280', marginRight: 8},
  pageSizeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    marginRight: 6,
    marginBottom: 4,
  },
  pageSizeText: {fontSize: 12, color: '#374151'},
  pageSizeTextActive: {color: '#FFFFFF', fontWeight: '600'},
});
