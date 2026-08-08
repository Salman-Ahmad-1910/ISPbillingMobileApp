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
  Platform,
  Animated,
} from 'react-native';
import {useFocusEffect, useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  Send,
  Search,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  Users,
  SlidersHorizontal,
} from 'lucide-react-native';
import {getMessages, getConnections} from '../../api/messages';
import {areasApi} from '../../api/network';
import {Message, Connection, Area} from '../../types';
import {GradientView} from '../../components/GradientView';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const MESSAGE_TITLES = [
  'All',
  'User Cradentials',
  'Defaulter',
  'Internet Card',
  'Promotion',
  'New User',
  'Internet Recharge',
];

const SEND_TO_OPTIONS = ['Subscriber', 'Dealer', 'Staff', 'Admin'];

const PAGE_SIZES = [5, 10, 25, 50, 100];

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

type FilterOption = {label: string; value: string};

type SelectSheetState = {
  key: string;
  title: string;
  options: FilterOption[];
  selected: string;
  onSelect: (v: string) => void;
} | null;

function toDateKey(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  let h = d.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min} ${ampm}`;
}

function isSameDay(d: Date, iso?: string): boolean {
  if (!iso) return false;
  return toDateKey(iso) === toDateKey(d.toISOString());
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
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

function SentMessagesDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="sentMessagesHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#3B82F6" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#0891B2" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#0891B2" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#sentMessagesHeroGrad)" />
      </Svg>
    </View>
  );
}

function FilterChip({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.filterChip} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.filterChipLabel}>{label}</Text>
      <View style={styles.filterChipValueRow}>
        <Text style={styles.filterChipValue} numberOfLines={1}>
          {value}
        </Text>
        <ChevronDown size={14} color="#6B7280" />
      </View>
    </TouchableOpacity>
  );
}

export default function SentMessagesScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfToday());
  const [sublocality, setSublocality] = useState('all');
  const [messageTitle, setMessageTitle] = useState('All');
  const [sendTo, setSendTo] = useState('All');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [selectSheet, setSelectSheet] = useState<SelectSheetState>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
      const [messageData, connectionData, areaData] = await Promise.all([
        getMessages().catch(() => []),
        getConnections().catch(() => []),
        areasApi.list().catch(() => []),
      ]);
      setMessages(messageData);
      setConnections(connectionData);
      setAreas(areaData);
    } catch {
      Alert.alert('Error', 'Failed to load sent messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {fetchData();}, [fetchData]));

  const sentMessages = useMemo(
    () => messages.filter(m => m.status === 'sent'),
    [messages],
  );

  const connectionMap = useMemo(() => {
    const map = new Map<string, Connection>();
    connections.forEach(c => map.set(c.id, c));
    return map;
  }, [connections]);

  const areaName = useCallback(
    (c?: Connection): string => {
      if (!c) return '';
      const area = areas.find(a => a.id === c.sublocalityId);
      return area ? (area.subLocality || area.locality || '') : '';
    },
    [areas],
  );

  const sublocalities = useMemo(() => {
    const set = new Set<string>();
    areas.forEach(a => {
      if (a.subLocality) set.add(a.subLocality);
    });
    return Array.from(set);
  }, [areas]);

  const dayMessages = useMemo(() => {
    return sentMessages.filter(m => isSameDay(selectedDate, m.sendedAt || m.createdAt));
  }, [sentMessages, selectedDate]);

  const filteredData = useMemo(() => {
    return dayMessages.filter(item => {
      if (messageTitle !== 'All' && item.messageType !== messageTitle) return false;
      if (sendTo !== 'All' && (item.sendTo || '') !== sendTo) return false;
      if (sublocality !== 'all') {
        const conn = item.entityId ? connectionMap.get(item.entityId) : undefined;
        if (areaName(conn) !== sublocality) return false;
      }
      if (search) {
        const q = search.trim().toLowerCase();
        if (/^[0-9]/.test(q)) {
          if (
            !String(item.entityId || '').toLowerCase().startsWith(q) &&
            !String(item.internetId || '').toLowerCase().startsWith(q) &&
            !String(item.mobileNo || '').toLowerCase().startsWith(q)
          ) {
            return false;
          }
        } else if (
          !String(item.name || '').toLowerCase().startsWith(q) &&
          !String(item.messageType || '').toLowerCase().startsWith(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [dayMessages, messageTitle, sendTo, sublocality, search, connectionMap, areaName]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, messageTitle, sendTo, sublocality, selectedDate]);

  const uniqueRecipients = useMemo(
    () => new Set(dayMessages.map(m => m.name)).size,
    [dayMessages],
  );

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

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

  const todayKey = toDateKey(new Date().toISOString());
  const selectedKey = toDateKey(selectedDate.toISOString());

  const formattedDate = `${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedDate.getDay()]}, ${String(selectedDate.getDate()).padStart(2, '0')} ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  const shortDate = `${String(selectedDate.getDate()).padStart(2, '0')} ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const renderItem = ({item, index}: {item: Message; index: number}) => {
    const rowNo = (currentPage - 1) * pageSize + index + 1;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rowIndex}>#{rowNo}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name || '-'}</Text>
            {item.internetId ? (
              <Text style={styles.cardSub} numberOfLines={1}>Internet ID: {item.internetId}</Text>
            ) : null}
          </View>
          <Text style={styles.cardTime}>{formatTime(item.sendedAt || item.createdAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Message</Text>
          <Text style={styles.infoValue} numberOfLines={2}>{item.messageText || item.messageType || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sent To</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{item.mobileNo || item.phone || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Send By</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{item.sentBy || '-'}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <GradientView colors={['#166534', '#22c55e']} style={[styles.header, {paddingTop: insets.top + 8}]}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Sent Messages</Text>
          <Text style={styles.headerCount}>{filteredData.length} total</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginatedData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#3B82F6']} />
        }
        ListHeaderComponent={
          <View>
            {/* Hero Header */}
            <View style={styles.heroHeader}>
              <GradientView colors={['#3B82F6', '#0891B2']} style={styles.heroIconBox}>
                <Send size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Sent Messages</Text>
                <Text style={styles.heroSubtitle}>View sent messages day by day</Text>
              </View>
            </View>

            <SentMessagesDivider />

            {/* Date navigator */}
            <View style={styles.dateCard}>
              <TouchableOpacity
                style={styles.dateArrowBtn}
                onPress={() => setSelectedDate(d => addDays(d, -1))}>
                <ChevronLeft size={24} color="#374151" />
              </TouchableOpacity>

              <View style={styles.dateCenter}>
                <View style={styles.dateRow}>
                  <CalendarDays size={18} color="#2563EB" />
                  <Text style={styles.dateText}>{formattedDate}</Text>
                </View>
                <View style={styles.dateStats}>
                  <View style={styles.dateStatItem}>
                    <Send size={13} color="#2563EB" />
                    <Text style={styles.dateStatText}>
                      <Text style={styles.dateStatValue}>{dayMessages.length}</Text> sent
                    </Text>
                  </View>
                  <View style={styles.dateStatItem}>
                    <CheckCircle2 size={13} color="#059669" />
                    <Text style={styles.dateStatText}>
                      <Text style={styles.dateStatValue}>{dayMessages.length}</Text> delivered
                    </Text>
                  </View>
                  <View style={styles.dateStatItem}>
                    <Users size={13} color="#7C3AED" />
                    <Text style={styles.dateStatText}>
                      <Text style={styles.dateStatValue}>{uniqueRecipients}</Text> recipients
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.dateArrowBtn, selectedKey === todayKey && styles.dateArrowBtnDisabled]}
                disabled={selectedKey === todayKey}
                onPress={() => setSelectedDate(d => addDays(d, 1))}>
                <ChevronRight size={24} color={selectedKey === todayKey ? '#D1D5DB' : '#374151'} />
              </TouchableOpacity>
            </View>

            <View style={styles.todayRow}>
              <TouchableOpacity
                style={styles.todayBtn}
                onPress={() => setSelectedDate(startOfToday())}>
                <Text style={styles.todayBtnText}>Today</Text>
              </TouchableOpacity>
            </View>

            {/* Filters */}
            <View style={styles.filterCard}>
              <TouchableOpacity
                style={styles.filterHeader}
                onPress={() => setFiltersOpen(o => !o)}
                activeOpacity={0.8}>
                <SlidersHorizontal size={16} color="#3B82F6" />
                <Text style={styles.filterTitle}>Filters</Text>
                <View style={[styles.filterChevron, filtersOpen && styles.filterChevronOpen]}>
                  <ChevronDown size={16} color="#6B7280" />
                </View>
              </TouchableOpacity>
              {filtersOpen && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterScroll}>
                <FilterChip
                  label="Sublocality"
                  value={sublocality === 'all' ? 'All' : sublocality}
                  onPress={() =>
                    setSelectSheet({
                      key: 'sublocality',
                      title: 'Select sublocality',
                      options: [{label: 'All', value: 'all'}, ...sublocalities.map(s => ({label: s, value: s}))],
                      selected: sublocality,
                      onSelect: v => setSublocality(v),
                    })
                  }
                />
                <FilterChip
                  label="Message Title"
                  value={messageTitle}
                  onPress={() =>
                    setSelectSheet({
                      key: 'title',
                      title: 'Select message title',
                      options: MESSAGE_TITLES.map(t => ({label: t, value: t})),
                      selected: messageTitle,
                      onSelect: v => setMessageTitle(v),
                    })
                  }
                />
                <FilterChip
                  label="Send To"
                  value={sendTo}
                  onPress={() =>
                    setSelectSheet({
                      key: 'sendTo',
                      title: 'Select recipient type',
                      options: [{label: 'All', value: 'All'}, ...SEND_TO_OPTIONS.map(s => ({label: s, value: s}))],
                      selected: sendTo,
                      onSelect: v => setSendTo(v),
                    })
                  }
                />
                </ScrollView>
              )}
            </View>

            {/* Search */}
            <View style={styles.toolbar}>
              <View style={styles.searchBox}>
                <Search size={16} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, ID or message..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
            </View>

            <View style={styles.listTitleRow}>
              <Text style={styles.listTitle}>Messages Sent on {shortDate}</Text>
              <Text style={styles.listCount}>{filteredData.length} message(s)</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📤</Text>
            <Text style={styles.emptyTitle}>No sent messages on this date</Text>
            <Text style={styles.emptyText}>Use the arrows to browse other dates.</Text>
          </View>
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
                    style={[styles.pageNum, currentPage === page && styles.pageNumActive]}
                    onPress={() => setCurrentPage(page)}>
                    <Text style={[styles.pageNumText, currentPage === page && styles.pageNumTextActive]}>
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
                    placeholder="Go"
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
                      (!pageInput || parseInt(pageInput, 10) < 1 || parseInt(pageInput, 10) > totalPages) &&
                        styles.pageBtnDisabled,
                    ]}
                    disabled={!pageInput || parseInt(pageInput, 10) < 1 || parseInt(pageInput, 10) > totalPages}
                    onPress={handlePageSubmit}>
                    <Text style={styles.goToBtnText}>Go</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  disabled={currentPage === totalPages}
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>
                  <Text style={[styles.pageBtnText, currentPage === totalPages && styles.pageBtnTextDisabled]}>
                    Next
                  </Text>
                  <ChevronRight size={14} color={currentPage === totalPages ? '#D1D5DB' : '#374151'} />
                </TouchableOpacity>
              </View>

              <View style={styles.pageSizeRow}>
                <Text style={styles.pageSizeLabel}>Show</Text>
                <TouchableOpacity style={styles.pageSizeSelect} onPress={() => setPageSizeOpen(true)}>
                  <Text style={styles.pageSizeSelectText}>{pageSize}</Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.pageSizeLabel}>entries</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Select sheet */}
      <Modal
        visible={!!selectSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectSheet(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{selectSheet?.title}</Text>
              <TouchableOpacity onPress={() => setSelectSheet(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll}>
              {selectSheet?.options.map(option => {
                const active = option.value === selectSheet!.selected;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.sheetOption}
                    onPress={() => {
                      selectSheet!.onSelect(option.value);
                      setSelectSheet(null);
                    }}>
                    <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]} numberOfLines={1}>
                      {option.label}
                    </Text>
                    {active ? <Check size={16} color="#3B82F6" /> : null}
                  </TouchableOpacity>
                );
              })}
              {selectSheet && selectSheet.options.length === 0 ? (
                <View style={styles.sheetEmpty}>
                  <Text style={styles.sheetEmptyText}>No options available</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Page size sheet */}
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
                  {active ? <Check size={16} color="#3B82F6" /> : null}
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
  header: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%',
    paddingBottom: 8, paddingLeft: 8, paddingRight: 8,
    backgroundColor: '#166534',
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
  headerCount: {fontSize: 12, color: '#BFDBFE'},
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
  dateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  dateArrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateArrowBtnDisabled: {opacity: 0.4},
  dateCenter: {flex: 1, alignItems: 'center', paddingHorizontal: 8},
  dateRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  dateText: {fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center'},
  dateStats: {flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center'},
  dateStatItem: {flexDirection: 'row', alignItems: 'center', gap: 3},
  dateStatText: {fontSize: 11, color: '#6B7280'},
  dateStatValue: {fontWeight: '700', color: '#111827'},
  todayRow: {alignItems: 'center', marginTop: 10},
  todayBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  todayBtnText: {fontSize: 12, color: '#374151', fontWeight: '600'},
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTitle: {fontSize: 13, fontWeight: '600', color: '#374151', marginLeft: 6},
  filterChevron: {marginLeft: 'auto'},
  filterChevronOpen: {transform: [{rotate: '180deg'}]},
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
  },
  filterChip: {
    minWidth: 170,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterChipLabel: {fontSize: 10, color: '#9CA3AF', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3},
  filterChipValueRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  filterChipValue: {flex: 1, fontSize: 13, fontWeight: '600', color: '#111827', marginRight: 6},
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listTitle: {fontSize: 16, fontWeight: '600', color: '#111827', flex: 1},
  listCount: {fontSize: 12, color: '#6B7280'},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  rowIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1},
  cardName: {fontSize: 14, fontWeight: '600', color: '#111827'},
  cardSub: {fontSize: 12, color: '#9CA3AF', marginTop: 1},
  cardTime: {fontSize: 11, color: '#6B7280', fontWeight: '600'},
  infoRow: {flexDirection: 'row', paddingVertical: 4},
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 80},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280', textAlign: 'center'},
  pagination: {paddingTop: 16},
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
  pageNumActive: {backgroundColor: '#3B82F6', borderColor: '#3B82F6'},
  pageNumText: {fontSize: 12, color: '#374151'},
  pageNumTextActive: {color: '#FFFFFF', fontWeight: '600'},
  ellipsis: {paddingHorizontal: 4, color: '#6B7280'},
  goTo: {flexDirection: 'row', alignItems: 'center', gap: 4},
  goToInput: {
    width: 44,
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
  goToBtnText: {fontSize: 12, color: '#374151', fontWeight: '600'},
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
    minWidth: 68,
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
  sheetScroll: {paddingBottom: 20},
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetOptionText: {fontSize: 15, color: '#374151', fontWeight: '500', flex: 1, marginRight: 8},
  sheetOptionTextActive: {color: '#3B82F6', fontWeight: '600'},
  sheetEmpty: {paddingVertical: 30, alignItems: 'center'},
  sheetEmptyText: {fontSize: 13, color: '#9CA3AF'},
});
