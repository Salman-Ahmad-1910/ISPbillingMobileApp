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
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import {useFocusEffect, useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  FileEdit,
  Search,
  Send,
  Trash2,
  Eye,
  ChevronDown,
  Check,
  PlusCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react-native';
import {useAuth} from '../../context/AuthContext';
import {
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  getConnections,
} from '../../api/messages';
import {areasApi} from '../../api/network';
import {Message, Connection, Area} from '../../types';
import {GradientButton} from '../../components/GradientButton';
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

const SEND_TO_OPTIONS = ['Subscriber', 'Dealer', 'Inquiry', 'Staff', 'Admin', 'Other'];

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

function displayDate(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = d.getFullYear();
  let h = d.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd} ${MONTHS[d.getMonth()]} ${yy}, ${h}:${min} ${ampm}`;
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

function DraftMessagesDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="draftMessagesHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#F59E0B" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#F97316" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#F97316" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#draftMessagesHeroGrad)" />
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

export default function DraftMessagesScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const {companyId, user} = useAuth();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [draftTitle, setDraftTitle] = useState('All');
  const [draftSublocality, setDraftSublocality] = useState('all');
  const [draftSendTo, setDraftSendTo] = useState('All');
  const [draftDate, setDraftDate] = useState('all');

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Message | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newDraftName, setNewDraftName] = useState('');
  const [newDraftMobile, setNewDraftMobile] = useState('');
  const [newDraftTitle, setNewDraftTitle] = useState('All');
  const [newDraftSendTo, setNewDraftSendTo] = useState('Subscriber');
  const [newDraftMessage, setNewDraftMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

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
      Alert.alert('Error', 'Failed to load draft messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {fetchData();}, [fetchData]));

  const draftMessages = useMemo(
    () => messages.filter(m => m.status === 'draft'),
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

  const dateOptions = useMemo(() => {
    const set = new Set<string>();
    draftMessages.forEach(m => {
      const k = toDateKey(m.createdAt);
      if (k) set.add(k);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [draftMessages]);

  const filteredData = useMemo(() => {
    return draftMessages.filter(m => {
      if (draftTitle !== 'All' && m.messageType !== draftTitle) return false;
      if (draftSendTo !== 'All' && (m.sendTo || '') !== draftSendTo) return false;
      if (draftDate !== 'all' && toDateKey(m.createdAt) !== draftDate) return false;
      if (draftSublocality !== 'all') {
        const conn = m.entityId ? connectionMap.get(m.entityId) : undefined;
        if (areaName(conn) !== draftSublocality) return false;
      }
      if (search) {
        const q = search.trim().toLowerCase();
        if (/^[0-9]/.test(q)) {
          if (
            !String(m.entityId || '').toLowerCase().startsWith(q) &&
            !String(m.internetId || '').toLowerCase().startsWith(q) &&
            !String(m.mobileNo || '').toLowerCase().startsWith(q)
          ) {
            return false;
          }
        } else if (!String(m.name || '').toLowerCase().startsWith(q)) {
          return false;
        }
      }
      return true;
    });
  }, [draftMessages, draftTitle, draftSendTo, draftDate, draftSublocality, search, connectionMap, areaName]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, draftTitle, draftSendTo, draftDate, draftSublocality]);

  const resetFilters = () => {
    setDraftTitle('All');
    setDraftSublocality('all');
    setDraftSendTo('All');
    setDraftDate('all');
    setSearch('');
    setCurrentPage(1);
  };

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

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sendMessages = async (ids: string[]) => {
    if (ids.length === 0) return;
    Alert.alert(
      'Send Messages',
      `Send ${ids.length} message(s)? Sent expiry reminders go to Expiry Messages, others to Other Messages.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Send',
          onPress: async () => {
            setIsSending(true);
            try {
              for (const id of ids) {
                const msg = messages.find(m => m.id === id);
                if (!msg) continue;
                await updateMessage(id, {
                  ...msg,
                  status: 'sent',
                  sentBy: user?.name || 'Admin',
                  sendedAt: new Date().toISOString(),
                  companyId: companyId || undefined,
                });
              }
              setSelected(new Set());
              await fetchData(false);
              Alert.alert('Success', `${ids.length} message(s) sent.`);
            } catch (error: any) {
              const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to send messages.';
              Alert.alert('Error', msg);
            } finally {
              setIsSending(false);
            }
          },
        },
      ],
    );
  };

  const handleCreateDraft = async () => {
    if (!newDraftName.trim() || !newDraftMessage.trim()) {
      Alert.alert('Error', 'Recipient name and message are required.');
      return;
    }
    setIsSending(true);
    try {
      await createMessage({
        name: newDraftName.trim(),
        mobileNo: newDraftMobile.trim(),
        messageType: newDraftTitle === 'All' ? undefined : newDraftTitle,
        messageText: newDraftMessage.trim(),
        sendTo: newDraftSendTo,
        status: 'draft',
        companyId: companyId || undefined,
      });
      setIsFormOpen(false);
      setNewDraftName('');
      setNewDraftMobile('');
      setNewDraftTitle('All');
      setNewDraftSendTo('Subscriber');
      setNewDraftMessage('');
      await fetchData(false);
      Alert.alert('Success', 'Draft created successfully.');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to create draft.';
      Alert.alert('Error', msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteDraft = (id: string) => {
    Alert.alert('Delete Draft', 'Delete this draft message?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMessage(id);
            setSelected(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            await fetchData(false);
            Alert.alert('Success', 'Draft deleted.');
          } catch (error: any) {
            const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to delete draft.';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  const handleClearDrafts = () => {
    Alert.alert('Clear Draft Messages', 'Are you sure you want to clear all draft messages?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            for (const d of draftMessages) {
              await deleteMessage(d.id);
            }
            setSelected(new Set());
            await fetchData(false);
            Alert.alert('Success', 'All draft messages cleared.');
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to clear drafts.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  const openFilterSheet = (
    key: string,
    title: string,
    options: FilterOption[],
    selectedValue: string,
    onSelect: (v: string) => void,
  ) => {
    setSelectSheet({key, title, options, selected: selectedValue, onSelect});
  };

  const renderItem = ({item, index}: {item: Message; index: number}) => {
    const rowNo = (currentPage - 1) * pageSize + index + 1;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={[styles.checkbox, selected.has(item.id) && styles.checkboxSelected]}
            onPress={() => toggleOne(item.id)}>
            {selected.has(item.id) && <Check size={12} color="#FFFFFF" />}
          </TouchableOpacity>
          <Text style={styles.rowIndex}>#{rowNo}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name || '-'}</Text>
            {item.messageType ? (
              <Text style={styles.cardSub} numberOfLines={1}>{item.messageType}</Text>
            ) : null}
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtnSmall} onPress={() => setPreview(item)}>
              <Eye size={15} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnDanger} onPress={() => handleDeleteDraft(item.id)}>
              <Trash2 size={15} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Message</Text>
          <Text style={styles.infoValue} numberOfLines={2}>{item.messageText || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{item.mobileNo || item.phone || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Send By</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{item.sentBy || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date & Time</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{formatDateTime(item.createdAt)}</Text>
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
          <Text style={styles.headerTitle}>Draft Messages</Text>
          <Text style={styles.headerCount}>{filteredData.length} total</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginatedData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#F59E0B']} />
        }
        ListHeaderComponent={
          <View>
            {/* Hero Header */}
            <View style={styles.heroHeader}>
              <GradientView colors={['#F59E0B', '#F97316']} style={styles.heroIconBox}>
                <FileEdit size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Draft Messages</Text>
                <Text style={styles.heroSubtitle}>Review and send the messages written in New Messages</Text>
              </View>
            </View>

            <DraftMessagesDivider />

            {/* Filters */}
            <View style={styles.filterCard}>
              <TouchableOpacity
                style={styles.filterHeader}
                onPress={() => setFiltersOpen(o => !o)}
                activeOpacity={0.8}>
                <SlidersHorizontal size={16} color="#F59E0B" />
                <Text style={styles.filterTitle}>Filters</Text>
                <View style={[styles.filterChevron, filtersOpen && styles.filterChevronOpen]}>
                  <ChevronDown size={16} color="#6B7280" />
                </View>
              </TouchableOpacity>
              {filtersOpen && (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScroll}>
                <FilterChip
                  label="Message Title"
                  value={draftTitle}
                  onPress={() =>
                    openFilterSheet(
                      'title',
                      'Select message title',
                      MESSAGE_TITLES.map(t => ({label: t, value: t})),
                      draftTitle,
                      v => setDraftTitle(v),
                    )
                  }
                />
                <FilterChip
                  label="Sublocality"
                  value={draftSublocality === 'all' ? 'All' : draftSublocality}
                  onPress={() =>
                    openFilterSheet(
                      'sublocality',
                      'Select sublocality',
                      [{label: 'All', value: 'all'}, ...sublocalities.map(s => ({label: s, value: s}))],
                      draftSublocality,
                      v => setDraftSublocality(v),
                    )
                  }
                />
                <FilterChip
                  label="Send To"
                  value={draftSendTo}
                  onPress={() =>
                    openFilterSheet(
                      'sendTo',
                      'Select recipient type',
                      [{label: 'All', value: 'All'}, ...SEND_TO_OPTIONS.map(s => ({label: s, value: s}))],
                      draftSendTo,
                      v => setDraftSendTo(v),
                    )
                  }
                />
                <FilterChip
                  label="Date"
                  value={draftDate === 'all' ? 'All dates' : displayDate(draftDate)}
                  onPress={() =>
                    openFilterSheet(
                      'date',
                      'Select date',
                      [{label: 'All dates', value: 'all'}, ...dateOptions.map(d => ({label: displayDate(d), value: d}))],
                      draftDate,
                      v => setDraftDate(v),
                    )
                  }
                />
                  </ScrollView>
                  <TouchableOpacity style={styles.resetRow} onPress={resetFilters}>
                    <AlertTriangle size={12} color="#DC2626" />
                    <Text style={styles.resetText}>Reset Filters</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Search + Actions */}
            <View style={styles.toolbar}>
              <View style={styles.searchBox}>
                <Search size={16} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, ID or mobile..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
            </View>

            <View style={styles.actionRow}>
              <GradientButton
                colors={['#F59E0B', '#F97316']}
                style={[styles.actionBtn, selected.size === 0 && styles.actionBtnDisabled]}
                onPress={() => sendMessages(Array.from(selected))}
                disabled={selected.size === 0 || isSending}>
                {isSending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Send size={14} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Send Selected ({selected.size})</Text>
                  </>
                )}
              </GradientButton>
              <GradientButton
                colors={['#3B82F6', '#0891B2']}
                style={styles.actionBtn}
                onPress={() => setIsFormOpen(true)}>
                <PlusCircle size={14} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>New Draft</Text>
              </GradientButton>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearDrafts}>
                <AlertTriangle size={14} color="#DC2626" />
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.listTitleRow}>
              <Text style={styles.listTitle}>Draft Messages</Text>
              <Text style={styles.listCount}>
                {filteredData.length} message(s)
                {selected.size > 0 ? ` | ${selected.size} selected` : ''}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No draft messages found</Text>
            <Text style={styles.emptyText}>Write a message in New Messages or adjust the filters.</Text>
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

      {/* New Draft form */}
      <Modal
        visible={isFormOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFormOpen(false)}>
        <KeyboardAvoidingView
          style={styles.formOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formSheet}>
            <View style={styles.formSheetHeader}>
              <View style={styles.formSheetTitleRow}>
                <GradientView colors={['#F59E0B', '#F97316']} style={styles.formSheetIcon}>
                  <FileEdit size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>New Draft Message</Text>
              </View>
              <TouchableOpacity onPress={() => setIsFormOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Recipient Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={newDraftName}
                  onChangeText={setNewDraftName}
                  placeholder="e.g., Ahmed Khan"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Mobile Number</Text>
                <TextInput
                  style={styles.formInput}
                  value={newDraftMobile}
                  onChangeText={setNewDraftMobile}
                  placeholder="e.g., 0300-1234567"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Message Title</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() =>
                    openFilterSheet(
                      'newTitle',
                      'Select title',
                      MESSAGE_TITLES.map(t => ({label: t, value: t})),
                      newDraftTitle,
                      v => setNewDraftTitle(v),
                    )
                  }>
                  <Text style={styles.formSelectValue} numberOfLines={1}>
                    {newDraftTitle}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Send To</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() =>
                    openFilterSheet(
                      'newSendTo',
                      'Select recipient type',
                      SEND_TO_OPTIONS.map(s => ({label: s, value: s})),
                      newDraftSendTo,
                      v => setNewDraftSendTo(v),
                    )
                  }>
                  <Text style={styles.formSelectValue} numberOfLines={1}>
                    {newDraftSendTo}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Message</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  value={newDraftMessage}
                  onChangeText={setNewDraftMessage}
                  placeholder="Type your message..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsFormOpen(false)}
                  disabled={isSending}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <GradientButton
                  colors={['#F59E0B', '#F97316']}
                  style={styles.saveBtn}
                  onPress={handleCreateDraft}
                  disabled={isSending}>
                  {isSending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Draft</Text>
                  )}
                </GradientButton>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Preview Dialog */}
      <Modal
        visible={!!preview}
        transparent
        animationType="slide"
        onRequestClose={() => setPreview(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Draft Message Preview</Text>
              <TouchableOpacity onPress={() => setPreview(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll}>
              {preview && (
                <View style={styles.previewContent}>
                  <View style={styles.previewGrid}>
                    <Text style={styles.previewLabel}>Name:</Text>
                    <Text style={styles.previewValue}>{preview.name || '-'}</Text>
                    <Text style={styles.previewLabel}>Phone:</Text>
                    <Text style={styles.previewValue}>{preview.mobileNo || preview.phone || '-'}</Text>
                    <Text style={styles.previewLabel}>Message Type:</Text>
                    <Text style={styles.previewValue}>{preview.messageType || '-'}</Text>
                    <Text style={styles.previewLabel}>Send To:</Text>
                    <Text style={styles.previewValue}>{preview.sendTo || '-'}</Text>
                    <Text style={styles.previewLabel}>Send By:</Text>
                    <Text style={styles.previewValue}>{preview.sentBy || '-'}</Text>
                    <Text style={styles.previewLabel}>Created:</Text>
                    <Text style={styles.previewValue}>{formatDateTime(preview.createdAt)}</Text>
                  </View>
                  <View style={styles.previewMessage}>
                    <Text style={styles.previewMessageLabel}>Message</Text>
                    <Text style={styles.previewMessageText}>{preview.messageText || 'No message content'}</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                    {active ? <Check size={16} color="#F59E0B" /> : null}
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
                  {active ? <Check size={16} color="#F59E0B" /> : null}
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
  headerCount: {fontSize: 12, color: '#FDE68A'},
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
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  resetText: {fontSize: 12, color: '#DC2626', marginLeft: 4, fontWeight: '500'},
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexWrap: 'wrap',
  },
  actionBtn: {
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
  actionBtnDisabled: {opacity: 0.5},
  actionBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginLeft: 6},
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearBtnText: {color: '#DC2626', fontSize: 13, fontWeight: '600', marginLeft: 5},
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listTitle: {fontSize: 16, fontWeight: '600', color: '#111827'},
  listCount: {fontSize: 12, color: '#6B7280'},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxSelected: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  rowIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1},
  cardName: {fontSize: 14, fontWeight: '600', color: '#111827'},
  cardSub: {fontSize: 12, color: '#9CA3AF', marginTop: 1},
  cardActions: {flexDirection: 'row', gap: 8},
  actionBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDanger: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  pageNumActive: {backgroundColor: '#F59E0B', borderColor: '#F59E0B'},
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
  sheetOptionTextActive: {color: '#F59E0B', fontWeight: '600'},
  sheetEmpty: {paddingVertical: 30, alignItems: 'center'},
  sheetEmptyText: {fontSize: 13, color: '#9CA3AF'},
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
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827',
  },
  formTextarea: {minHeight: 90, textAlignVertical: 'top'},
  formSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formSelectValue: {flex: 1, fontSize: 15, color: '#111827', marginRight: 8},
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
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
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  saveBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
  previewContent: {padding: 20},
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewLabel: {width: 110, fontSize: 12, color: '#9CA3AF', marginBottom: 8},
  previewValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500', marginBottom: 8},
  previewMessage: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  previewMessageLabel: {fontSize: 12, color: '#9CA3AF', marginBottom: 4},
  previewMessageText: {fontSize: 13, color: '#374151', lineHeight: 18},
});
