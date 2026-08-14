import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  RefreshControl,
  ScrollView,
} from 'react-native';
import {useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  Building2,
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  ChevronDown,
  Phone,
  MapPin,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} from '../../api/companies';
import {Company} from '../../types';
import {GradientView} from '../../components/GradientView';

const ACCENT = '#166534';
const ACCENT2 = '#22c55e';

function DoorMenuIcon({open}: {open: boolean}) {
  const slide = React.useRef(new Animated.Value(open ? 1 : 0)).current;

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
          <LinearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={ACCENT} stopOpacity="1" />
            <Stop offset="0.7" stopColor={ACCENT2} stopOpacity="0.6" />
            <Stop offset="1" stopColor={ACCENT2} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#heroGrad)" />
      </Svg>
    </View>
  );
}

export default function CompaniesScreen() {
  const navigation = useNavigation<any>();
  const drawerStatus = useDrawerStatus();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);

  const [fName, setFName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fContact1, setFContact1] = useState('');
  const [fContact2, setFContact2] = useState('');
  const [fAddress, setFAddress] = useState('');
  const [fDescription, setFDescription] = useState('');
  const [fPassword, setFPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await getCompanies();
      setCompanies(res);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = companies.filter(c => {
    const q = filter.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
  });

  const openAdd = () => {
    setEditing(null);
    setFName('');
    setFEmail('');
    setFContact1('');
    setFContact2('');
    setFAddress('');
    setFDescription('');
    setFPassword('');
    setShowPassword(false);
    setFormOpen(true);
  };

  const openEdit = (item: Company) => {
    setEditing(item);
    setFName(item.name || '');
    setFEmail(item.email || '');
    setFContact1(item.contact1 || '');
    setFContact2(item.contact2 || '');
    setFAddress(item.address || '');
    setFDescription(item.description || '');
    setFPassword('');
    setShowPassword(false);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!fName.trim()) {
      Alert.alert('Validation', 'Company name is required');
      return;
    }
    if (!fEmail.trim()) {
      Alert.alert('Validation', 'Contact email is required');
      return;
    }
    if (!editing && !fPassword.trim()) {
      Alert.alert('Validation', 'Password is required for the manager account');
      return;
    }
    const payload: any = {
      name: fName,
      email: fEmail,
      contact1: fContact1,
      contact2: fContact2,
      address: fAddress,
      description: fDescription,
      role: 'owner',
    };
    if (!editing) {
      payload.password = fPassword;
    }
    try {
      setSaving(true);
      if (editing) {
        await updateCompany(editing.id, payload);
      } else {
        await createCompany(payload);
      }
      setFormOpen(false);
      load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save company');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: Company) => {
    Alert.alert('Delete Company', `Are you sure you want to delete ${item.name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCompany(item.id);
            load();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to delete company');
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
      <Text style={styles.topBarTitle}>Company Management</Text>
    </GradientView>
  );

  const renderItem = ({item}: {item: Company}) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.name || '?').charAt(0)?.toUpperCase()}</Text>
        </View>
        <View style={styles.cardHead}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{item.email}</Text>
        </View>
      </View>
      <View style={{marginTop: 10, gap: 6}}>
        {item.contact1 ? (
          <View style={styles.infoRow}>
            <Phone size={13} color="#6B7280" />
            <Text style={styles.infoText}>{item.contact1}</Text>
          </View>
        ) : null}
        {item.address ? (
          <View style={styles.infoRow}>
            <MapPin size={13} color="#6B7280" />
            <Text style={styles.infoText} numberOfLines={1}>{item.address}</Text>
          </View>
        ) : null}
      </View>
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
                <Building2 size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Company Management</Text>
                <Text style={styles.heroSubtitle}>Manage all companies in the system.</Text>
              </View>
            </View>
            <HeroDivider />
            <View style={styles.filterCard}>
              <View style={styles.searchBox}>
                <Search size={16} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filter by name or email..."
                  placeholderTextColor="#9CA3AF"
                  value={filter}
                  onChangeText={setFilter}
                />
              </View>
              <TouchableOpacity style={styles.addWrap} onPress={openAdd} activeOpacity={0.85}>
                <GradientView colors={['#166534', '#22c55e']} style={styles.addBtn}>
                  <PlusCircle size={16} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Add Company</Text>
                </GradientView>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Building2 size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No companies found</Text>
            <Text style={styles.emptySub}>Add a company to get started.</Text>
          </View>
        }
      />

      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView style={styles.sheetOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editing ? 'Edit' : 'Add'} Company</Text>
              <TouchableOpacity onPress={() => setFormOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              <Field label="Company Name">
                <TextInput style={styles.input} value={fName} onChangeText={setFName} placeholder="e.g., Alpha Communications" placeholderTextColor="#9CA3AF" />
              </Field>
              <Field label="Contact Email">
                <TextInput
                  style={[styles.input, editing && styles.disabledInput]}
                  value={fEmail}
                  onChangeText={setFEmail}
                  editable={!editing}
                  placeholder="e.g., support@acme.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </Field>
              {!editing ? (
                <Field label="Password (for manager access)">
                  <View style={styles.inputIcon}>
                    <TextInput
                      style={styles.inputInner}
                      value={fPassword}
                      onChangeText={setFPassword}
                      placeholder="Enter password for manager role"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
                      {showPassword ? <EyeOff size={16} color="#6B7280" /> : <Eye size={16} color="#6B7280" />}
                    </TouchableOpacity>
                  </View>
                </Field>
              ) : null}
              <View style={styles.row}>
                <Field label="Primary Contact">
                  <TextInput style={styles.input} value={fContact1} onChangeText={setFContact1} placeholder="0300-1234567" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
                </Field>
                <Field label="Secondary Contact">
                  <TextInput style={styles.input} value={fContact2} onChangeText={setFContact2} placeholder="0321-7654321" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
                </Field>
              </View>
              <Field label="Address">
                <TextInput style={[styles.input, styles.textArea]} value={fAddress} onChangeText={setFAddress} placeholder="Full company address" placeholderTextColor="#9CA3AF" multiline numberOfLines={3} />
              </Field>
              <Field label="Description">
                <TextInput style={[styles.input, styles.textArea]} value={fDescription} onChangeText={setFDescription} placeholder="Briefly describe the company" placeholderTextColor="#9CA3AF" multiline numberOfLines={3} />
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
                      <Text style={styles.saveBtnText}>Save Company</Text>
                    )}
                  </GradientView>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
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
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: ACCENT,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
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
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
  },
  inputIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  inputInner: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
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
