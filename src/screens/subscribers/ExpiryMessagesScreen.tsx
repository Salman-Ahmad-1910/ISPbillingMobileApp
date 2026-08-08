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
  Linking,
} from 'react-native';
import {useFocusEffect, useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  Clock,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageCircle,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react-native';
import {useAuth} from '../../context/AuthContext';
import {getMessages, deleteMessage, getConnections} from '../../api/messages';
import {areasApi} from '../../api/network';
import {Message, Connection, Area} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const MESSAGE_TITLES = [
  'Select the Message',
  'User Cradentials',
  'Defaulter',
  'Internet Card',
  'Promotion',
  'New User',
  'Internet Recharge',
];

const EXPIRY_TITLE = 'Defaulter';

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

function waNumber(phone?: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '92' + digits.slice(1);
  return digits;
}

function messageBody(m: Message): string {
  return (
    m.messageText ||
    `Dear ${m.name}, your monthly subscription fee is due. Please pay your dues to continue uninterrupted services. Thank you.`
  );
}

function formatDate(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
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

function ExpiryMessagesDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="expiryMessagesHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#F43F5E" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#DC2626" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#DC2626" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#expiryMessagesHeroGrad)" />
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

export default function ExpiryMessagesScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const {companies, refreshCompanies} = useAuth();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [title, setTitle] = useState('Select the Message');
  const [sublocality, setSublocality] = useState('all');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [box, setBox] = useState('all');
  const [pkg, setPkg] = useState('all');
  const [company, setCompany] = useState('all');

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [preview, setPreview] = useState<Message | null>(null);

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
      Alert.alert('Error', 'Failed to load expiry messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      refreshCompanies();
    }, [fetchData, refreshCompanies]),
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

  const statuses = useMemo(() => {
    const set = new Set<string>();
    connections.forEach(c => {
      if (c.status) set.add(c.status);
    });
    return Array.from(set);
  }, [connections]);

  const types = useMemo(() => {
    const set = new Set<string>();
    connections.forEach(c => {
      if (c.connectionType) set.add(c.connectionType);
    });
    return Array.from(set);
  }, [connections]);

  const boxes = useMemo(() => {
    const set = new Set<string>();
    connections.forEach(c => {
      if (c.boxNumber) set.add(c.boxNumber);
    });
    return Array.from(set);
  }, [connections]);

  const packages = useMemo(() => {
    const set = new Set<string>();
    connections.forEach(c => {
      if (c.packageInternet) set.add(c.packageInternet);
      if (c.packageCable) set.add(c.packageCable);
    });
    return Array.from(set);
  }, [connections]);

  const expiryMessages = useMemo(() => {
    return messages.filter(m => {
      if (m.status !== 'sent') return false;
      return (
        m.messageType === EXPIRY_TITLE ||
        (m.messageText?.startsWith(`${EXPIRY_TITLE}:`) ?? false)
      );
    });
  }, [messages]);

  const filteredData = useMemo(() => {
    return expiryMessages.filter(m => {
      if (title !== 'Select the Message') {
        const matchType = m.messageType === title;
        const matchText = m.messageText?.startsWith(`${title}:`) ?? false;
        if (!matchType && !matchText) return false;
      }
      const conn = m.entityId ? connectionMap.get(m.entityId) : undefined;
      if (sublocality !== 'all' && areaName(conn) !== sublocality) return false;
      if (status !== 'all' && (conn?.status || '') !== status) return false;
      if (type !== 'all' && (conn?.connectionType || '') !== type) return false;
      if (box !== 'all' && (conn?.boxNumber || '') !== box) return false;
      if (pkg !== 'all' && conn?.packageInternet !== pkg && conn?.packageCable !== pkg) return false;
      if (company !== 'all' && (conn?.companyId || m.companyId) !== company) return false;
      return true;
    });
  }, [expiryMessages, connectionMap, title, sublocality, status, type, box, pkg, company, areaName]);

  useEffect(() => {
    setCurrentPage(1);
  }, [title, sublocality, status, type, box, pkg, company]);

  const resetFilters = () => {
    setTitle('Select the Message');
    setSublocality('all');
    setStatus('all');
    setType('all');
    setBox('all');
    setPkg('all');
    setCompany('all');
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

  const waPhone = (m: Message): string => {
    const conn = m.entityId ? connectionMap.get(m.entityId) : undefined;
    return m.mobileNo || m.phone || conn?.cell || conn?.mobile || '';
  };

  const handleWhatsApp = (m: Message) => {
    const num = waNumber(waPhone(m));
    if (!num) return;
    const text = encodeURIComponent(messageBody(m));
    Linking.openURL(`https://wa.me/${num}?text=${text}`).catch(() =>
      Alert.alert('Error', 'Unable to open WhatsApp.'),
    );
  };

  const handleDelete = (m: Message) => {
    Alert.alert(
      'Delete Message',
      `Delete the expiry message sent to "${m.name}"? This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMessage(m.id);
              await fetchData(false);
              Alert.alert('Success', 'Message deleted.');
            } catch (error: any) {
              const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to delete message.';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F43F5E" />
      </View>
    );
  }

  const openFilterSheet = (
    key: string,
    sheetTitle: string,
    options: FilterOption[],
    selectedValue: string,
    onSelect: (v: string) => void,
  ) => {
    setSelectSheet({key, title: sheetTitle, options, selected: selectedValue, onSelect});
  };

  const renderItem = ({item, index}: {item: Message; index: number}) => {
    const conn = item.entityId ? connectionMap.get(item.entityId) : undefined;
    const phone = waPhone(item);
    const address = item.address || conn?.address || '-';
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
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setPreview(item)}>
              <Eye size={15} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnDanger} onPress={() => handleDelete(item)}>
              <Trash2 size={15} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Subscriber ID</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{item.entityId ? item.entityId.slice(0, 8) : '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address</Text>
          <Text style={styles.infoValue} numberOfLines={2}>{address}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>WhatsApp No.</Text>
          <View style={styles.phoneRow}>
            <Text style={[styles.infoValue, styles.phoneText]} numberOfLines={1}>{phone || '-'}</Text>
            {phone ? (
              <TouchableOpacity
                style={styles.waBtn}
                onPress={() => handleWhatsApp(item)}>
                <MessageCircle size={16} color="#10B981" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sent At</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{formatDate(item.sendedAt || item.createdAt)}</Text>
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
          <Text style={styles.headerTitle}>Expiry Messages</Text>
          <Text style={styles.headerCount}>{filteredData.length} total</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginatedData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#F43F5E']} />
        }
        ListHeaderComponent={
          <View>
            {/* Hero Header */}
            <View style={styles.heroHeader}>
              <GradientView colors={['#F43F5E', '#DC2626']} style={styles.heroIconBox}>
                <Clock size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Expiry Messages</Text>
                <Text style={styles.heroSubtitle}>View fee reminder messages sent to subscribers</Text>
              </View>
            </View>

            <ExpiryMessagesDivider />

            {/* Filters */}
            <View style={styles.filterCard}>
              <TouchableOpacity
                style={styles.filterHeader}
                onPress={() => setFiltersOpen(o => !o)}
                activeOpacity={0.8}>
                <SlidersHorizontal size={16} color="#F43F5E" />
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
                  value={title}
                  onPress={() =>
                    openFilterSheet(
                      'title',
                      'Select message title',
                      MESSAGE_TITLES.map(t => ({label: t, value: t})),
                      title,
                      v => setTitle(v),
                    )
                  }
                />
                <FilterChip
                  label="Sublocality"
                  value={sublocality === 'all' ? 'All' : sublocality}
                  onPress={() =>
                    openFilterSheet(
                      'sublocality',
                      'Select sublocality',
                      [{label: 'All', value: 'all'}, ...sublocalities.map(s => ({label: s, value: s}))],
                      sublocality,
                      v => setSublocality(v),
                    )
                  }
                />
                <FilterChip
                  label="Status"
                  value={status === 'all' ? 'All' : status}
                  onPress={() =>
                    openFilterSheet(
                      'status',
                      'Select status',
                      [{label: 'All', value: 'all'}, ...statuses.map(s => ({label: s, value: s}))],
                      status,
                      v => setStatus(v),
                    )
                  }
                />
                <FilterChip
                  label="Type"
                  value={type === 'all' ? 'All' : type}
                  onPress={() =>
                    openFilterSheet(
                      'type',
                      'Select type',
                      [{label: 'All', value: 'all'}, ...types.map(t => ({label: t, value: t}))],
                      type,
                      v => setType(v),
                    )
                  }
                />
                <FilterChip
                  label="Box Number"
                  value={box === 'all' ? 'All' : box}
                  onPress={() =>
                    openFilterSheet(
                      'box',
                      'Select box',
                      [{label: 'All', value: 'all'}, ...boxes.map(b => ({label: b, value: b}))],
                      box,
                      v => setBox(v),
                    )
                  }
                />
                <FilterChip
                  label="Package"
                  value={pkg === 'all' ? 'All' : pkg}
                  onPress={() =>
                    openFilterSheet(
                      'package',
                      'Select package',
                      [{label: 'All', value: 'all'}, ...packages.map(p => ({label: p, value: p}))],
                      pkg,
                      v => setPkg(v),
                    )
                  }
                />
                <FilterChip
                  label="Company"
                  value={
                    company === 'all'
                      ? 'All'
                      : companies.find(c => c.id === company)?.name || 'All'
                  }
                  onPress={() =>
                    openFilterSheet(
                      'company',
                      'Select company',
                      [{label: 'All', value: 'all'}, ...companies.map(c => ({label: c.name, value: c.id}))],
                      company,
                      v => setCompany(v),
                    )
                  }
                />
                  </ScrollView>

                  <View style={styles.filterActions}>
                <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                  <RefreshCw size={14} color="#374151" />
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
                <GradientButton
                  colors={['#F43F5E', '#DC2626']}
                  style={styles.showBtn}
                  onPress={() => setCurrentPage(1)}>
                  <Text style={styles.showBtnText}>Show</Text>
                </GradientButton>
              </View>
                </>
              )}
            </View>

            <View style={styles.listTitleRow}>
              <Text style={styles.listTitle}>Expiry Reminders</Text>
              <Text style={styles.listCount}>{filteredData.length} message(s)</Text>
            </View>
            {title !== 'Select the Message' && (
              <Text style={styles.listMessageTag}>
                Message: <Text style={styles.listMessageValue}>{title}</Text>
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⏰</Text>
            <Text style={styles.emptyTitle}>No expiry messages found</Text>
            <Text style={styles.emptyText}>Adjust the filters and press Show.</Text>
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

      {/* Preview Dialog */}
      <Modal
        visible={!!preview}
        transparent
        animationType="slide"
        onRequestClose={() => setPreview(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Expiry Message Preview</Text>
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
                    <Text style={styles.previewLabel}>Internet ID:</Text>
                    <Text style={styles.previewValue}>{preview.internetId || '-'}</Text>
                    <Text style={styles.previewLabel}>WhatsApp:</Text>
                    <Text style={styles.previewValue}>{waPhone(preview) || '-'}</Text>
                    <Text style={styles.previewLabel}>Status:</Text>
                    <Text style={[styles.previewValue, styles.previewValueCapitalized]}>{preview.status || '-'}</Text>
                    <Text style={styles.previewLabel}>Message Type:</Text>
                    <Text style={styles.previewValue}>{preview.messageType || '-'}</Text>
                    <Text style={styles.previewLabel}>Sent At:</Text>
                    <Text style={styles.previewValue}>{preview.sendedAt || preview.createdAt || '-'}</Text>
                  </View>
                  <View style={styles.previewMessage}>
                    <Text style={styles.previewMessageLabel}>Message body</Text>
                    <Text style={styles.previewMessageText}>{messageBody(preview)}</Text>
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
                    {active ? <Check size={16} color="#F43F5E" /> : null}
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
                  {active ? <Check size={16} color="#F43F5E" /> : null}
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
  headerCount: {fontSize: 12, color: '#FECDD3'},
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
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  resetBtnText: {fontSize: 12, color: '#374151', fontWeight: '600', marginLeft: 4},
  showBtn: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  showBtnText: {color: '#FFFFFF', fontSize: 12, fontWeight: '600'},
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listTitle: {fontSize: 16, fontWeight: '600', color: '#111827'},
  listCount: {fontSize: 12, color: '#6B7280'},
  listMessageTag: {fontSize: 12, color: '#6B7280', paddingHorizontal: 16, paddingTop: 4},
  listMessageValue: {fontWeight: '600', color: '#111827'},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  rowIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F43F5E',
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1},
  cardName: {fontSize: 14, fontWeight: '600', color: '#111827'},
  cardSub: {fontSize: 12, color: '#9CA3AF', marginTop: 1},
  cardActions: {flexDirection: 'row', gap: 8},
  actionBtn: {
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
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 100},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  phoneRow: {flex: 1, flexDirection: 'row', alignItems: 'center'},
  phoneText: {flex: 1},
  waBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
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
  pageNumActive: {backgroundColor: '#F43F5E', borderColor: '#F43F5E'},
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
  sheetOptionTextActive: {color: '#F43F5E', fontWeight: '600'},
  sheetEmpty: {paddingVertical: 30, alignItems: 'center'},
  sheetEmptyText: {fontSize: 13, color: '#9CA3AF'},
  previewContent: {padding: 20},
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewLabel: {width: 110, fontSize: 12, color: '#9CA3AF', marginBottom: 8},
  previewValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500', marginBottom: 8},
  previewValueCapitalized: {textTransform: 'capitalize'},
  previewMessage: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  previewMessageLabel: {fontSize: 12, color: '#9CA3AF', marginBottom: 4},
  previewMessageText: {fontSize: 13, color: '#374151', lineHeight: 18},
});
