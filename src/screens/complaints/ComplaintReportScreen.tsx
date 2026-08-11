import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Share,
  Modal,
  TextInput,
} from 'react-native';
import {useFocusEffect, useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  FileText,
  Eye,
  Download,
  Printer,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Search,
  ChevronDown,
  Check,
  CircleDot,
  Tag,
  TriangleAlert,
} from 'lucide-react-native';
import {getComplaints} from '../../api/complaints';
import {getCompanies} from '../../api/dealers';
import {useAuth} from '../../context/AuthContext';
import {Complaint, Company} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';

const ACCENT = '#10B981';
const ACCENT_DARK = '#059669';
const ACCENT_LIGHT = '#D1FAE5';
const GRADIENT: [string, string] = ['#10B981', '#059669'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const CATEGORIES = [
  {label: 'Network', value: 'network'},
  {label: 'Billing', value: 'billing'},
  {label: 'Service', value: 'service'},
];

const REPORT_STATUSES = [
  {label: 'Open', value: 'open'},
  {label: 'In Progress', value: 'in-progress'},
  {label: 'Resolved', value: 'resolved'},
  {label: 'Done', value: 'done'},
  {label: 'Closed', value: 'closed'},
];

const REPORT_STATUS_COLORS: Record<string, {bg: string; fg: string}> = {
  open: {bg: '#FEF3C7', fg: '#92400E'},
  'in-progress': {bg: '#DBEAFE', fg: '#1E40AF'},
  resolved: {bg: '#D1FAE5', fg: '#166534'},
  done: {bg: '#D1FAE5', fg: '#166534'},
  closed: {bg: '#E5E7EB', fg: '#1F2937'},
};

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

function formatFullDate(d: Date): string {
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
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

function ReportDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="reportHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#10B981" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#10B981" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#10B981" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#reportHeroGrad)" />
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
  onSelect: (value: string) => void;
  onClose: () => void;
};

function OptionPickerSheet({visible, title, options, value, onSelect, onClose}: OptionPickerSheetProps) {
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
            {filtered.length === 0 && (
              <Text style={styles.pickerEmpty}>No options found</Text>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ComplaintReportScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const {companyId} = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterTarget, setFilterTarget] = useState<'category' | 'status' | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

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
      const [complaintData, companyData] = await Promise.all([
        getComplaints(),
        getCompanies().catch(() => [] as Company[]),
      ]);
      setComplaints(complaintData);
      setCompanies(companyData);
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

  const company = companies.find(c => c.id === companyId);

  const statCards = [
    {
      key: 'total',
      label: 'Total Complaints',
      value: String(complaints.length),
      icon: BarChart3,
      gradient: ['#3B82F6', '#06B6D4'] as [string, string],
    },
    {
      key: 'open',
      label: 'Open',
      value: String(complaints.filter(r => r.status === 'open').length),
      icon: AlertCircle,
      gradient: ['#F59E0B', '#EA580C'] as [string, string],
    },
    {
      key: 'in-progress',
      label: 'In Progress',
      value: String(complaints.filter(r => r.status === 'in-progress').length),
      icon: Clock,
      gradient: ['#8B5CF6', '#9333EA'] as [string, string],
    },
    {
      key: 'resolved',
      label: 'Resolved',
      value: String(
        complaints.filter(r => r.status === 'resolved' || r.status === 'done' || r.status === 'closed')
          .length,
      ),
      icon: CheckCircle2,
      gradient: ['#10B981', '#16A34A'] as [string, string],
    },
  ];

  const filteredData = showReport
    ? complaints.filter(r => {
        if (filterCategory !== 'All' && r.category !== filterCategory) {
          return false;
        }
        if (filterStatus !== 'All' && r.status !== filterStatus) {
          return false;
        }
        return true;
      })
    : [];

  const handleExportCSV = async () => {
    const headers = ['#', 'Subscriber', 'Description', 'Category', 'Status', 'Opened At'];
    const rows = filteredData.map((item, i) => [
      i + 1,
      item.subscriberName,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      item.category,
      item.status,
      formatOpenedAt(item.createdAt || item.created_at),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    try {
      await Share.share({message: csv, title: 'Complaint Report'});
    } catch {
      // ignore share cancellation
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (showInvoice) {
    return (
      <View style={styles.container}>
        <GradientView colors={['#166534', '#22c55e']} style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
            <DoorMenuIcon open={drawerStatus === 'open'} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Complaint Report</Text>
            <Text style={styles.headerCount}>Printable view</Text>
          </View>
        </GradientView>

        <ScrollView contentContainerStyle={styles.invoiceScroll}>
          <View style={styles.invoiceCard}>
            <View style={styles.invoiceActions}>
              <TouchableOpacity
                style={styles.invoiceBtn}
                onPress={() => setShowInvoice(false)}>
                <ArrowLeft size={14} color="#374151" />
                <Text style={styles.invoiceBtnText}>Back to Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.invoiceBtn} onPress={handleExportCSV}>
                <Download size={14} color="#374151" />
                <Text style={styles.invoiceBtnText}>Export</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.invoiceHeader}>
              <View style={styles.invoiceCompany}>
                <Text style={styles.invoiceCompanyName}>{company?.name || 'Company Name'}</Text>
                {company?.address ? (
                  <Text style={styles.invoiceCompanyMeta}>{company.address}</Text>
                ) : null}
                {company?.email ? (
                  <Text style={styles.invoiceCompanyMeta}>Email: {company.email}</Text>
                ) : null}
                {company?.contact1 ? (
                  <Text style={styles.invoiceCompanyMeta}>Phone: {company.contact1}</Text>
                ) : null}
              </View>
              <View style={styles.invoiceTitleBlock}>
                <Text style={styles.invoiceTitle}>COMPLAINT REPORT</Text>
                <Text style={styles.invoiceGenerated}>
                  Generated: {formatFullDate(new Date())}
                </Text>
              </View>
            </View>

            <View style={styles.invoiceTable}>
              <View style={styles.invoiceTableHeader}>
                <Text style={[styles.invoiceTh, styles.colIndex]}>#</Text>
                <Text style={[styles.invoiceTh, styles.colSubscriber]}>Subscriber</Text>
                <Text style={[styles.invoiceTh, styles.colDesc]}>Description</Text>
                <Text style={[styles.invoiceTh, styles.colCategory]}>Category</Text>
                <Text style={[styles.invoiceTh, styles.colStatus]}>Status</Text>
                <Text style={[styles.invoiceTh, styles.colOpened]}>Opened At</Text>
              </View>
              {filteredData.length === 0 ? (
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceEmptyCell}>No complaints found.</Text>
                </View>
              ) : (
                filteredData.map((item, i) => {
                  const cat = categoryBadge(item.category);
                  const status = REPORT_STATUS_COLORS[item.status] || {bg: '#F3F4F6', fg: '#374151'};
                  return (
                    <View key={item.id} style={styles.invoiceRow}>
                      <Text style={[styles.invoiceTd, styles.colIndex, styles.monoText]}>{i + 1}</Text>
                      <Text style={[styles.invoiceTd, styles.colSubscriber, styles.invoiceName]}>
                        {item.subscriberName}
                      </Text>
                      <Text style={[styles.invoiceTd, styles.colDesc]} numberOfLines={2}>
                        {item.description || '-'}
                      </Text>
                      <View style={[styles.invoiceTd, styles.colCategory]}>
                        <View style={[styles.invoiceBadge, {backgroundColor: cat.bg}]}>
                          <Text style={[styles.invoiceBadgeText, {color: cat.fg}]}>
                            {item.category || 'service'}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.invoiceTd, styles.colStatus]}>
                        <View style={[styles.invoiceBadge, {backgroundColor: status.bg}]}>
                          <Text style={[styles.invoiceBadgeText, {color: status.fg}]}>
                            {item.status || '-'}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.invoiceTd, styles.colOpened]}>
                        {formatOpenedAt(item.createdAt || item.created_at)}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>

            <View style={styles.invoiceFooterSign}>
              <View style={styles.signBlock}>
                <View style={styles.signLine} />
                <Text style={styles.signLabel}>Company Stamp</Text>
              </View>
              <View style={styles.signBlock}>
                <View style={styles.signLine} />
                <Text style={styles.signLabel}>Authorized Signature</Text>
              </View>
            </View>

            <View style={styles.invoiceFooterNote}>
              <Text style={styles.invoiceFooterName}>{company?.name || 'Company Name'}</Text>
              <Text style={styles.invoiceFooterMeta}>
                Phone: {company?.contact1 || '-'} | Email: {company?.email || '-'}
              </Text>
              <Text style={styles.invoiceFooterMeta}>
                This is a computer-generated report and does not require a signature
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  const renderItem = ({item, index}: {item: Complaint; index: number}) => {
    const cat = categoryBadge(item.category);
    const status = REPORT_STATUS_COLORS[item.status] || {bg: '#F3F4F6', fg: '#374151'};
    return (
      <View style={styles.reportCard}>
        <View style={styles.reportCardHeader}>
          <Text style={styles.rowIndex}>{index + 1}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.subscriberName}
            </Text>
            <Text style={styles.cardDate}>Opened: {formatOpenedAt(item.createdAt || item.created_at)}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Description</Text>
          <Text style={styles.infoValue} numberOfLines={2}>
            {item.description || '-'}
          </Text>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.categoryBadge, {backgroundColor: cat.bg}]}>
            <Text style={[styles.categoryBadgeText, {color: cat.fg}]}>
              {item.category || 'service'}
            </Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: status.bg}]}>
            <Text style={[styles.statusBadgeText, {color: status.fg}]}>
              {item.status || '-'}
            </Text>
          </View>
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
          <Text style={styles.headerTitle}>Complaint Report</Text>
          <Text style={styles.headerCount}>{complaints.length} complaints</Text>
        </View>
      </GradientView>

      <FlatList
        data={showReport ? filteredData : []}
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
                <FileText size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Complaint Report</Text>
                <Text style={styles.heroSubtitle}>
                  Generate and view complaint reports.
                </Text>
              </View>
            </View>

            <ReportDivider />

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
                  <CircleDot size={16} color="#0D9488" />
                  <Text style={styles.filterSelectText} numberOfLines={1}>
                    {filterStatus === 'All'
                      ? 'All Status'
                      : (REPORT_STATUSES.find(s => s.value === filterStatus)?.label || filterStatus)}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.showRow}>
              <GradientButton
                colors={['#10B981', '#16A34A']}
                style={styles.showBtn}
                onPress={() => setShowReport(true)}>
                <Eye size={16} color="#FFFFFF" />
                <Text style={styles.showBtnText}>Show</Text>
              </GradientButton>
              {showReport ? (
                <TouchableOpacity
                  style={styles.hideBtn}
                  onPress={() => setShowReport(false)}>
                  <Text style={styles.hideBtnText}>Hide Report</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {showReport ? (
              <View style={styles.reportHeader}>
                <Text style={styles.reportTitle}>Complaint History</Text>
                <View style={styles.reportActions}>
                  <TouchableOpacity style={styles.reportActionBtn} onPress={handleExportCSV}>
                    <Download size={14} color="#374151" />
                    <Text style={styles.reportActionText}>Export</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.reportActionBtn}
                    onPress={() => setShowInvoice(true)}>
                    <Printer size={14} color="#374151" />
                    <Text style={styles.reportActionText}>Print</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !showReport ? (
            <View style={styles.empty}>
              <EmptyStateIcon icon={FileText} />
              <Text style={styles.emptyTitle}>Report not generated</Text>
              <Text style={styles.emptyText}>
                Press Show to generate the complaint report with the selected filters.
              </Text>
            </View>
          ) : error ? (
            <View style={styles.empty}>
              <EmptyStateIcon icon={TriangleAlert} />
              <Text style={styles.emptyTitle}>Failed to load complaints</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <EmptyStateIcon icon={BarChart3} />
              <Text style={styles.emptyTitle}>No complaint history found</Text>
              <Text style={styles.emptyText}>
                No complaints match the selected filters.
              </Text>
            </View>
          )
        }
      />

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
        options={[{label: 'All Status', value: 'All'}, ...REPORT_STATUSES]}
        value={filterStatus}
        onSelect={setFilterStatus}
        onClose={() => setFilterTarget(null)}
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
  showRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  showBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexShrink: 0,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  showBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginLeft: 6},
  hideBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  hideBtnText: {fontSize: 13, color: '#374151', fontWeight: '600'},
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 8,
  },
  reportTitle: {fontSize: 18, fontWeight: '700', color: '#111827'},
  reportActions: {flexDirection: 'row', gap: 8},
  reportActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 5,
  },
  reportActionText: {fontSize: 12, color: '#374151', fontWeight: '600'},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  reportCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  reportCardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 6},
  rowIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT_DARK,
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1},
  cardName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  cardDate: {fontSize: 11, fontWeight: '500', color: '#9CA3AF', marginTop: 2},
  infoRow: {flexDirection: 'row', paddingVertical: 5},
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 90},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  badgeRow: {flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8},
  categoryBadge: {borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3},
  categoryBadgeText: {fontSize: 11, fontWeight: '600', textTransform: 'capitalize'},
  statusBadge: {borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3},
  statusBadgeText: {fontSize: 11, fontWeight: '600', textTransform: 'capitalize'},
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
  invoiceScroll: {padding: 16, paddingBottom: 40},
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  invoiceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  invoiceBtnText: {fontSize: 13, color: '#374151', fontWeight: '600'},
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#059669',
    paddingBottom: 16,
    marginBottom: 16,
  },
  invoiceCompany: {flex: 1, paddingRight: 12},
  invoiceCompanyName: {fontSize: 18, fontWeight: '700', color: '#111827'},
  invoiceCompanyMeta: {fontSize: 12, color: '#6B7280', marginTop: 3},
  invoiceTitleBlock: {alignItems: 'flex-end'},
  invoiceTitle: {fontSize: 16, fontWeight: '800', color: '#059669', letterSpacing: 1},
  invoiceGenerated: {fontSize: 12, color: '#6B7280', marginTop: 4},
  invoiceTable: {borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, overflow: 'hidden'},
  invoiceTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#059669',
    paddingVertical: 8,
  },
  colIndex: {width: 32},
  colSubscriber: {flex: 1.4},
  colDesc: {flex: 2},
  colCategory: {width: 76},
  colStatus: {width: 72},
  colOpened: {width: 78},
  invoiceTh: {fontSize: 11, fontWeight: '700', color: '#FFFFFF', paddingHorizontal: 6},
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 8,
  },
  invoiceTd: {fontSize: 12, color: '#374151', paddingHorizontal: 6},
  invoiceName: {fontWeight: '600', color: '#111827'},
  monoText: {fontSize: 11, color: '#6B7280', fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'})},
  invoiceBadge: {borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start'},
  invoiceBadgeText: {fontSize: 10, fontWeight: '600', textTransform: 'capitalize'},
  invoiceEmptyCell: {fontSize: 13, color: '#6B7280', textAlign: 'center', padding: 20, flex: 1},
  invoiceFooterSign: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#D1D5DB',
  },
  signBlock: {alignItems: 'center', width: '45%'},
  signLine: {borderBottomWidth: 1, borderBottomColor: '#111827', width: '100%', marginBottom: 6},
  signLabel: {fontSize: 11, color: '#6B7280'},
  invoiceFooterNote: {alignItems: 'center', marginTop: 20},
  invoiceFooterName: {fontSize: 13, fontWeight: '700', color: '#111827'},
  invoiceFooterMeta: {fontSize: 11, color: '#9CA3AF', marginTop: 2, textAlign: 'center'},
});
