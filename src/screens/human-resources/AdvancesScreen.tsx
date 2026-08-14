import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  RefreshControl,
} from 'react-native';
import {useNavigation, useFocusEffect, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  ChevronDown,
  HandCoins,
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
} from 'lucide-react-native';
import {
  getStaff,
  getAdvances,
  createAdvance,
  updateAdvance,
  deleteAdvance,
} from '../../api/hr';
import {Staff, AdvanceLoan} from '../../types';
import {GradientView} from '../../components/GradientView';
import OptionPickerSheet, {Option} from '../../components/OptionPickerSheet';

const ACCENT = '#166534';
const ACCENT2 = '#22c55e';

const TRANSACTION_TYPES = [
  {value: 'cash', label: 'Cash'},
  {value: 'easypaisa', label: 'Easypaisa'},
  {value: 'jazzcash', label: 'Jazzcash'},
  {value: 'bank_transfer', label: 'Bank Transfer'},
  {value: 'other_bank', label: 'Other Bank'},
];

const CATEGORIES = [
  {value: 'advance', label: 'Advance'},
  {value: 'loan', label: 'Loan'},
];

const DIRECTIONS = [
  {value: 'issue', label: 'Issue'},
  {value: 'return', label: 'Return'},
];

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

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function AdvancesScreen() {
  const navigation = useNavigation<any>();
  const drawerStatus = useDrawerStatus();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  const [advances, setAdvances] = useState<AdvanceLoan[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStaffId, setFilterStaffId] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdvanceLoan | null>(null);
  const [saving, setSaving] = useState(false);

  const [fStaffId, setFStaffId] = useState('');
  const [fCategory, setFCategory] = useState('advance');
  const [fDirection, setFDirection] = useState('issue');
  const [fAmount, setFAmount] = useState('');
  const [fDate, setFDate] = useState(today());
  const [fReturnValue, setFReturnValue] = useState('');
  const [fTransactionType, setFTransactionType] = useState('cash');
  const [fComments, setFComments] = useState('');
  const [fDescription, setFDescription] = useState('');
  const [returnTouched, setReturnTouched] = useState(false);

  const [picker, setPicker] = useState<{
    field: string;
    title: string;
    options: any[];
    value: string;
    emptyLabel?: string;
  } | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [advRes, staffRes] = await Promise.all([getAdvances(), getStaff()]);
      setAdvances(advRes);
      setStaff(staffRes);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load advances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = advances.filter(a => {
    if (filterStaffId !== 'all' && a.staffId !== filterStaffId) {
      return false;
    }
    if (filterCategory !== 'all' && a.category !== filterCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay = `${a.staffName || ''} ${a.comments || ''} ${a.description || ''}`.toLowerCase();
      if (!hay.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const totalIssue = filtered
    .filter(a => a.direction === 'issue')
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const totalReturn = filtered
    .filter(a => a.direction === 'return')
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const totalBalance = totalIssue - totalReturn;

  const summaryCards = [
    {label: 'Total Issue', value: `Rs ${totalIssue.toLocaleString()}`, icon: ArrowUpRight, color: '#2563EB', bg: '#DBEAFE'},
    {label: 'Total Return', value: `Rs ${totalReturn.toLocaleString()}`, icon: ArrowDownLeft, color: '#059669', bg: '#DCFCE7'},
    {label: 'Total Balance', value: `Rs ${totalBalance.toLocaleString()}`, icon: Wallet, color: '#7C3AED', bg: '#EDE9FE'},
  ];

  const openAdd = () => {
    setEditing(null);
    setFStaffId('');
    setFCategory('advance');
    setFDirection('issue');
    setFAmount('');
    setFDate(today());
    setFReturnValue('');
    setFTransactionType('cash');
    setFComments('');
    setFDescription('');
    setReturnTouched(false);
    setFormOpen(true);
  };

  const openEdit = (item: AdvanceLoan) => {
    setEditing(item);
    setFStaffId(item.staffId || '');
    setFCategory(item.category || 'advance');
    setFDirection(item.direction || 'issue');
    setFAmount(String(item.amount || ''));
    setFDate(item.date || today());
    setFReturnValue(String(item.returnValue || ''));
    setFTransactionType(item.transactionType || 'cash');
    setFComments(item.comments || '');
    setFDescription(item.description || '');
    setReturnTouched(true);
    setFormOpen(true);
  };

  const onPick = (value: string) => {
    if (!picker) {
      return;
    }
    switch (picker.field) {
      case 'staff':
        setFStaffId(value);
        break;
      case 'category':
        setFCategory(value);
        break;
      case 'direction':
        setFDirection(value);
        break;
      case 'transactionType':
        setFTransactionType(value);
        break;
      default:
        break;
    }
    setPicker(null);
  };

  const handleSave = async () => {
    if (!fStaffId) {
      Alert.alert('Validation', 'Please select an employee');
      return;
    }
    if (!fAmount || Number(fAmount) <= 0) {
      Alert.alert('Validation', 'Amount must be greater than 0');
      return;
    }
    const staffMember = staff.find(s => s.id === fStaffId);
    if (!staffMember) {
      Alert.alert('Validation', 'Selected employee not found');
      return;
    }
    const payload: Partial<AdvanceLoan> = {
      staffId: fStaffId,
      staffName: staffMember.name,
      category: fCategory,
      direction: fDirection,
      amount: Number(fAmount) || 0,
      date: fDate,
      returnValue: Number(fReturnValue) || 0,
      transactionType: fTransactionType,
      comments: fComments,
      description: fDescription,
      repaymentStatus: 'pending',
    };
    try {
      setSaving(true);
      if (editing) {
        await updateAdvance(editing.id, {...payload, id: editing.id});
      } else {
        await createAdvance(payload);
      }
      setFormOpen(false);
      load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save advance/loan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: AdvanceLoan) => {
    Alert.alert('Delete', `Delete advance/loan for ${item.staffName}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAdvance(item.id);
            load();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const topBar = (
    <GradientView colors={['#166534', '#22c55e']} style={styles.topBar}>
      <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
        <DoorMenuIcon open={drawerStatus === 'open'} />
      </TouchableOpacity>
      <Text style={styles.topBarTitle}>Advances &amp; Loans</Text>
    </GradientView>
  );

  const renderItem = ({item}: {item: AdvanceLoan}) => {
    const isIssue = item.direction === 'issue';
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.staffName || '?').charAt(0)?.toUpperCase()}</Text>
          </View>
          <View style={styles.cardHead}>
            <Text style={styles.cardName}>{item.staffName}</Text>
            <Text style={styles.cardSub}>{item.date}</Text>
          </View>
          <View style={[styles.catBadge, isIssue ? styles.catAdvance : styles.catLoan]}>
            <Text style={styles.catText}>{(item.category || '').toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.amountRow}>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>{isIssue ? 'Issue' : 'Return'}</Text>
            <Text style={[styles.amountValue, {color: isIssue ? '#059669' : '#2563EB'}]}>
              Rs {Number(item.amount || 0).toLocaleString()}
            </Text>
          </View>
          {Number(item.returnValue) > 0 ? (
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>Return Value</Text>
              <Text style={styles.amountValueSub}>Rs {Number(item.returnValue).toLocaleString()}</Text>
            </View>
          ) : null}
        </View>

        {item.comments ? <Text style={styles.commentText}>{item.comments}</Text> : null}

        <View style={styles.cardActions}>
          <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => openEdit(item)}>
            <Pencil size={15} color="#2563EB" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
            <Trash2 size={15} color="#DC2626" />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {topBar}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {topBar}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[ACCENT2]} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.heroHeader}>
              <GradientView colors={['#166534', '#22c55e']} style={styles.heroIconBox}>
                <HandCoins size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Advances &amp; Loans</Text>
                <Text style={styles.heroSubtitle}>Manage salary advances and loans for staff.</Text>
              </View>
            </View>

            <HeroDivider from={ACCENT} to={ACCENT2} />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}>
              {summaryCards.map(card => (
                <View key={card.label} style={styles.statCard}>
                  <View style={[styles.statIcon, {backgroundColor: card.bg}]}>
                    <card.icon size={18} color={card.color} />
                  </View>
                  <View>
                    <Text style={styles.statLabel}>{card.label}</Text>
                    <Text style={styles.statValue}>{card.value}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.filterCard}>
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={styles.filterSelect}
                  onPress={() =>
                    setPicker({
                      field: 'filterStaff',
                      title: 'Employee',
                      options: staff.map(s => ({label: s.name, value: s.id})),
                      value: filterStaffId === 'all' ? '' : filterStaffId,
                      emptyLabel: 'All Employees',
                    })
                  }
                  activeOpacity={0.8}>
                  <Text style={styles.filterSelectText} numberOfLines={1}>
                    {filterStaffId === 'all'
                      ? 'All Employees'
                      : staff.find(s => s.id === filterStaffId)?.name || 'Employee'}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.filterSelect}
                  onPress={() =>
                    setPicker({
                      field: 'category',
                      title: 'Type',
                      options: [{label: 'All Types', value: 'all'}, ...CATEGORIES],
                      value: filterCategory,
                      emptyLabel: undefined,
                    })
                  }
                  activeOpacity={0.8}>
                  <Text style={styles.filterSelectText}>
                    {filterCategory === 'all'
                      ? 'All Types'
                      : CATEGORIES.find(c => c.value === filterCategory)?.label}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchBox}>
                <Search size={16} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search records..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <TouchableOpacity
                style={styles.addWrap}
                onPress={openAdd}
                activeOpacity={0.85}>
                <GradientView colors={['#166534', '#22c55e']} style={styles.addBtn}>
                  <PlusCircle size={16} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Add Advance/Loan</Text>
                </GradientView>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <HandCoins size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No records found</Text>
            <Text style={styles.emptySub}>Add an advance or loan to get started.</Text>
          </View>
        }
      />

      {/* Form Modal */}
      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView style={styles.sheetOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editing ? 'Edit' : 'Add'} Advance/Loan</Text>
              <TouchableOpacity onPress={() => setFormOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              <Field label="Employee">
                <TouchableOpacity
                  style={styles.input}
                  onPress={() =>
                    setPicker({
                      field: 'staff',
                      title: 'Employee',
                      options: staff.map(s => ({label: s.name, value: s.id})),
                      value: fStaffId,
                    })
                  }
                  activeOpacity={0.8}>
                  <Text style={[styles.inputText, !fStaffId && styles.placeholder]}>
                    {staff.find(s => s.id === fStaffId)?.name || 'Select employee'}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </Field>

              <View style={styles.row}>
                <Field label="Category">
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() =>
                      setPicker({
                        field: 'category',
                        title: 'Category',
                        options: CATEGORIES,
                        value: fCategory,
                      })
                    }
                    activeOpacity={0.8}>
                    <Text style={styles.inputText}>
                      {CATEGORIES.find(c => c.value === fCategory)?.label}
                    </Text>
                    <ChevronDown size={16} color="#6B7280" />
                  </TouchableOpacity>
                </Field>
                <Field label="Issue / Return">
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() =>
                      setPicker({
                        field: 'direction',
                        title: 'Issue / Return',
                        options: DIRECTIONS,
                        value: fDirection,
                      })
                    }
                    activeOpacity={0.8}>
                    <Text style={styles.inputText}>
                      {DIRECTIONS.find(d => d.value === fDirection)?.label}
                    </Text>
                    <ChevronDown size={16} color="#6B7280" />
                  </TouchableOpacity>
                </Field>
              </View>

              <View style={styles.row}>
                <Field label="Amount (PKR)">
                  <TextInput
                    style={styles.input}
                    value={fAmount}
                    onChangeText={v => {
                      setFAmount(v);
                      if (!returnTouched) {
                        setFReturnValue(v);
                      }
                    }}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </Field>
                <Field label="Date">
                  <TextInput
                    style={styles.input}
                    value={fDate}
                    onChangeText={setFDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />
                </Field>
              </View>

              <Field label="Return Value (PKR)">
                <TextInput
                  style={styles.input}
                  value={fReturnValue}
                  onChangeText={v => {
                    setReturnTouched(true);
                    setFReturnValue(v);
                  }}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
                <Text style={styles.hint}>The money the staff will return is auto-filled with the amount.</Text>
              </Field>

              <Field label="Transaction Type">
                <TouchableOpacity
                  style={styles.input}
                  onPress={() =>
                    setPicker({
                      field: 'transactionType',
                      title: 'Transaction Type',
                      options: TRANSACTION_TYPES,
                      value: fTransactionType,
                    })
                  }
                  activeOpacity={0.8}>
                  <Text style={styles.inputText}>
                    {TRANSACTION_TYPES.find(t => t.value === fTransactionType)?.label}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </Field>

              <Field label="Comments">
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={fComments}
                  onChangeText={setFComments}
                  placeholder="Enter comments..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </Field>

              <Field label="Description">
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={fDescription}
                  onChangeText={setFDescription}
                  placeholder="Enter description..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </Field>

              <View style={styles.saveRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setFormOpen(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveWrap} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                  <GradientView colors={['#166534', '#22c55e']} style={styles.saveBtn}>
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save</Text>
                    )}
                  </GradientView>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <OptionPickerSheet
        visible={!!picker}
        title={picker?.title || ''}
        options={picker?.options || []}
        value={picker?.value || ''}
        emptyLabel={picker?.emptyLabel}
        onSelect={value => {
          if (picker?.field === 'filterStaff') {
            setFilterStaffId(value || 'all');
            setPicker(null);
            return;
          }
          if (picker?.field === 'staff') {
            setFStaffId(value);
            setPicker(null);
            return;
          }
          onPick(value);
        }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
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
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingRight: 8,
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
  },
  statLabel: {fontSize: 11, color: '#6B7280', fontWeight: '500'},
  statValue: {fontSize: 16, fontWeight: '700', color: '#111827'},
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
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
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  filterSelectText: {
    fontSize: 13,
    color: '#111827',
    flex: 1,
    marginRight: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginLeft: 8,
  },
  addWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 12,
  },
  addBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    shadowColor: '#166534',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
  },
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  cardHead: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  cardSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  catAdvance: {
    backgroundColor: '#DBEAFE',
  },
  catLoan: {
    backgroundColor: '#FEF3C7',
  },
  catText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
  },
  amountRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  amountBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
  },
  amountLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  amountValueSub: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
    color: '#111827',
  },
  commentText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
  },
  editBtn: {
    backgroundColor: '#EFF6FF',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
  },
  editText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    paddingBottom: 24,
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
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sheetClose: {
    fontSize: 18,
    color: '#6B7280',
  },
  sheetScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  field: {
    marginBottom: 12,
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
  },
  inputText: {
    fontSize: 14,
    color: '#111827',
  },
  placeholder: {
    color: '#9CA3AF',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  saveRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 13,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  saveWrap: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 13,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
