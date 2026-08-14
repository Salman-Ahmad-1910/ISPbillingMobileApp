import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import {useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {KeyRound, ShieldCheck, Users, UserRound, Handshake, ChevronDown, Save, Loader2} from 'lucide-react-native';
import {
  getRoles,
  getRecoveryOfficers,
  getDealers,
  getUserPermissions,
  updateUserPermissions,
} from '../../api/roles';
import {getStaff} from '../../api/hr';
import {Role, UserPermission} from '../../types';
import {GradientView} from '../../components/GradientView';
import OptionPickerSheet from '../../components/OptionPickerSheet';

const ACCENT = '#166534';
const ACCENT2 = '#22c55e';

// Permission definitions mirrored from the web app (client/src/lib/permission-pages.ts)
type PermissionDef = {id: string; name: string; module: string};
const PERMISSION_DEFS: PermissionDef[] = [
  {id: '13309', name: 'Country', module: 'Area'},
  {id: '13310', name: 'City', module: 'Area'},
  {id: '13311', name: 'Locality', module: 'Area'},
  {id: '13312', name: 'Sublocality', module: 'Area'},
  {id: '13313', name: 'Package', module: 'Subscribers Profile'},
  {id: '13314', name: 'Box/Media', module: 'Subscribers Profile'},
  {id: '13315', name: 'Subscribers Details', module: 'Subscribers Profile'},
  {id: '13316', name: 'New Queries', module: 'Subscribers Profile'},
  {id: '13351', name: 'Subscriber Location', module: 'Subscribers Profile'},
  {id: '13318', name: 'Dealers Details', module: 'Dealers Profile'},
  {id: '13317', name: 'Recovery Officer', module: 'Recovery Officer'},
  {id: '13319', name: 'Area Allocation', module: 'Recovery Officer'},
  {id: '13305', name: 'Allocated Collection', module: 'Transactions'},
  {id: '13324', name: 'Transaction Type', module: 'Transactions'},
  {id: '14079', name: 'New Collection', module: 'Transactions'},
  {id: '13308', name: 'Reprint Slip', module: 'Transactions'},
  {id: '13304', name: 'Subscribers Collections', module: 'Transactions'},
  {id: '13320', name: 'Bills Creator', module: 'Transactions'},
  {id: '13321', name: 'Dealers Collections', module: 'Transactions'},
  {id: '13357', name: 'Baddebt Collection', module: 'Transactions'},
  {id: '15323', name: 'Subject Type', module: 'Complain'},
  {id: '15325', name: 'Complain Type', module: 'Complain'},
  {id: '15326', name: 'Complain Report', module: 'Complain'},
  {id: '13342', name: 'Subscribers Complain', module: 'Complain'},
  {id: '13343', name: 'Allocated Complains', module: 'Complain'},
  {id: '13347', name: 'Draft Messages', module: 'Messages'},
  {id: '13348', name: 'Sent Messages', module: 'Messages'},
  {id: '13359', name: 'Whatsapp Draft Message', module: 'Messages'},
  {id: '13346', name: 'Other Messages', module: 'Messages'},
  {id: '13345', name: 'Expiry Messages', module: 'Messages'},
  {id: '13344', name: 'New Messages', module: 'Messages'},
  {id: '13322', name: 'Account Heads', module: 'Accounts'},
  {id: '13323', name: 'Account Entry', module: 'Accounts'},
  {id: '13341', name: 'One Day Accounts', module: 'Accounts'},
  {id: '15313', name: 'Purchase', module: 'Inventory'},
  {id: '15312', name: 'Products', module: 'Inventory'},
  {id: '15309', name: 'Brand', module: 'Inventory'},
  {id: '15311', name: 'Unit Type', module: 'Inventory'},
  {id: '15310', name: 'Vendor', module: 'Inventory'},
  {id: '15321', name: 'Product Type', module: 'Inventory'},
  {id: '15314', name: 'Inventory Status', module: 'Inventory'},
  {id: '15315', name: 'Sales', module: 'Point Of Sale'},
  {id: '15317', name: 'Advance & Loan', module: 'HRM'},
  {id: '15318', name: 'Employee Salary', module: 'HRM'},
  {id: '15324', name: 'Subscriber Wise Attendance', module: 'HRM'},
  {id: '15322', name: 'Day Wise Attendance', module: 'HRM'},
  {id: '15316', name: 'Employee Details', module: 'HRM'},
  {id: '13334', name: 'Deleted Collection', module: 'Logs'},
  {id: '15328', name: 'Update Connections Log', module: 'Logs'},
  {id: '13335', name: 'Deleted Subscribers', module: 'Logs'},
  {id: '13307', name: 'Allocated Defualters', module: 'Subscribers Reports'},
  {id: '13325', name: 'Subscribers Defaulter', module: 'Subscribers Reports'},
  {id: '13326', name: 'New Subscribers List', module: 'Subscribers Reports'},
  {id: '13328', name: 'Package Wise List', module: 'Subscribers Reports'},
  {id: '13329', name: 'Promise Date Report', module: 'Subscribers Reports'},
  {id: '13330', name: 'Allocated Collections', module: 'Subscribers Reports'},
  {id: '13355', name: 'Month Wise Collection', module: 'Subscribers Reports'},
  {id: '13349', name: 'Expiry Wise Defaulter', module: 'Subscribers Reports'},
  {id: '13356', name: 'Collection Not Generated', module: 'Subscribers Reports'},
  {id: '13354', name: 'Monthly Collection Month Wise', module: 'Subscribers Reports'},
  {id: '13358', name: 'Unpaid Collection', module: 'Subscribers Reports'},
  {id: '13306', name: 'Subscriber Collections', module: 'Subscribers Reports'},
  {id: '13353', name: 'Month Wise Defualter', module: 'Subscribers Reports'},
  {id: '13327', name: 'Deactivate Subscriber List', module: 'Subscribers Reports'},
  {id: '15327', name: 'Subscribers Creator Summary', module: 'Subscribers Reports'},
  {id: '15329', name: 'New Subscribers List', module: 'Subscribers Reports'},
  {id: '15330', name: 'Subscribers Defaulters', module: 'Subscribers Reports'},
  {id: '15331', name: 'Allocated Collections', module: 'Subscribers Reports'},
  {id: '15332', name: 'Month Wise Collection Monthly', module: 'Subscribers Reports'},
  {id: '13331', name: 'Dealers Collection', module: 'Dealers Reports'},
  {id: '13333', name: 'New Dealers List', module: 'Dealers Reports'},
  {id: '13350', name: 'Dealer Invoice List', module: 'Dealers Reports'},
  {id: '13332', name: 'Dealers Defaulter', module: 'Dealers Reports'},
  {id: '13340', name: 'One Day Balance Sheet', module: 'Accounts Reports'},
  {id: '13336', name: 'Accounts Report', module: 'Accounts Reports'},
  {id: '15319', name: 'Abstract Stock', module: 'Stock Reports'},
  {id: '15320', name: 'Abstract Sales', module: 'Sales Reports'},
  {id: '13339', name: 'Change Username/Password', module: 'Settings'},
  {id: '13338', name: 'Subscriber Rights', module: 'Settings'},
  {id: '13337', name: 'Configurations', module: 'Settings'},
];

const MODULES = [...new Set(PERMISSION_DEFS.map(p => p.module))];

const USER_CATEGORIES = [
  {key: 'staff', label: 'Staff', icon: Users, endpoint: 'hr/staff'},
  {key: 'recovery', label: 'Recovery Officer', icon: UserRound, endpoint: 'admin/recovery-officers'},
  {key: 'dealer', label: 'Dealer', icon: Handshake, endpoint: 'dealers'},
] as const;

function DoorMenuIcon({open}: {open: boolean}) {
  const slide = React.useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(slide, {toValue: open ? 1 : 0, duration: 200, useNativeDriver: true}).start();
  }, [open, slide]);
  const translateX = slide.interpolate({inputRange: [0, 1], outputRange: [-3, 3]});
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

function Toggle({value, onToggle}: {value: boolean; onToggle: () => void}) {
  return (
    <TouchableOpacity
      style={[styles.toggle, value && styles.toggleOn]}
      onPress={onToggle}
      activeOpacity={0.8}>
      <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
    </TouchableOpacity>
  );
}

export default function RolesPermissionsScreen() {
  const navigation = useNavigation<any>();
  const drawerStatus = useDrawerStatus();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const [userCategory, setUserCategory] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [userLists, setUserLists] = useState<Record<string, any[]>>({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [permissions, setPermissions] = useState<Record<string, {web: boolean; mobile: boolean}>>({});
  const [permsLoaded, setPermsLoaded] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRoles = useCallback(async () => {
    try {
      setLoadingRoles(true);
      const data = await getRoles();
      setRoles(data || []);
    } catch (err: any) {
      // KPIs are non-critical; ignore errors so the rest of the page works
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const ensureList = useCallback(async (cat: string) => {
    if (userLists[cat]) {
      return;
    }
    try {
      setLoadingUsers(true);
      let list: any[] = [];
      if (cat === 'staff') {
        list = await getStaff();
      } else if (cat === 'recovery') {
        list = await getRecoveryOfficers();
      } else if (cat === 'dealer') {
        list = await getDealers();
      }
      setUserLists(prev => ({...prev, [cat]: list || []}));
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [userLists]);

  const userList = userCategory ? userLists[userCategory] || [] : [];

  const categoryLabel =
    USER_CATEGORIES.find(c => c.key === userCategory)?.label || 'User';

  const userOptions = useMemo(
    () =>
      userList.map(u => ({
        label: `${u.name || u.email || 'Unknown'}  ·  ${(u.id || '').slice(0, 8)}`,
        value: u.id,
      })),
    [userList],
  );

  const handleCategory = (cat: string) => {
    setUserCategory(cat);
    setSelectedUserId(null);
    setSelectedUserName('');
    setPermsLoaded(false);
    setPermissions({});
    setPickerVisible(false);
    ensureList(cat);
  };

  const loadPermsFor = async (userId: string) => {
    try {
      setLoadingPerms(true);
      const data: UserPermission[] = await getUserPermissions(userId);
      const permMap: Record<string, {web: boolean; mobile: boolean}> = {};
      PERMISSION_DEFS.forEach(p => {
        permMap[p.id] = {web: false, mobile: false};
      });
      (data || []).forEach(p => {
        permMap[p.permissionId] = {
          web: p.webEnabled ?? true,
          mobile: p.mobileEnabled ?? true,
        };
      });
      setPermissions(permMap);
      setPermsLoaded(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load permissions');
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleSheetSelect = (userId: string) => {
    const user = userList.find(u => u.id === userId);
    if (!user) {
      return;
    }
    setSelectedUserId(userId);
    setSelectedUserName(user.name || user.email || '');
    setPickerVisible(false);
    setPermsLoaded(false);
    setPermissions({});
    loadPermsFor(userId);
  };

  const setPerm = (id: string, patch: Partial<{web: boolean; mobile: boolean}>) => {
    setPermissions(prev => ({
      ...prev,
      [id]: {...(prev[id] || {web: false, mobile: false}), ...patch},
    }));
  };

  const moduleIds = (module: string) => PERMISSION_DEFS.filter(p => p.module === module).map(p => p.id);

  const moduleWebAll = (module: string) => moduleIds(module).every(id => permissions[id]?.web);
  const moduleMobileAll = (module: string) => moduleIds(module).every(id => permissions[id]?.mobile);

  const handleSave = async () => {
    if (!selectedUserId) {
      return;
    }
    try {
      setSaving(true);
      const permList = Object.entries(permissions).map(([permissionId, val]) => ({
        permissionId,
        webEnabled: val.web,
        mobileEnabled: val.mobile,
      }));
      await updateUserPermissions(selectedUserId, permList);
      Alert.alert('Success', 'Permissions saved successfully');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const kpiData = useMemo(() => {
    const totalRoles = roles.length;
    const withSubscribers = roles.filter(r => (r as any)._count?.users).length;
    const permSet = new Set<string>();
    roles.forEach(r => {
      const raw = (r as any).permissions;
      const arr = Array.isArray(raw)
        ? raw
        : String(raw || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
      arr.forEach((x: string) => permSet.add(x));
    });
    return [
      {label: 'Total Roles', value: totalRoles, icon: ShieldCheck},
      {label: 'With Subscribers', value: withSubscribers, icon: Users},
      {label: 'Permissions', value: permSet.size, icon: KeyRound},
    ];
  }, [roles]);

  const selectedCount = Object.values(permissions).filter(p => p?.web || p?.mobile).length;

  const topBar = (
    <GradientView colors={['#166534', '#22c55e']} style={styles.topBar}>
      <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
        <DoorMenuIcon open={drawerStatus === 'open'} />
      </TouchableOpacity>
      <Text style={styles.topBarTitle}>Role Management</Text>
    </GradientView>
  );

  if (loadingRoles && roles.length === 0) {
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
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.heroHeader}>
          <GradientView colors={['#166534', '#22c55e']} style={styles.heroIconBox}>
            <KeyRound size={20} color="#FFFFFF" />
          </GradientView>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>Role Management</Text>
            <Text style={styles.heroSubtitle}>Manage roles, permissions, and access levels.</Text>
          </View>
        </View>

        <HeroDivider />

        <View style={styles.kpiRow}>
          {kpiData.map(metric => {
            const Icon = metric.icon;
            return (
              <View key={metric.label} style={styles.kpiCard}>
                <View style={styles.kpiTop}>
                  <Text style={styles.kpiLabel}>{metric.label}</Text>
                  <View style={styles.kpiIconBox}>
                    <Icon size={16} color="#FFFFFF" />
                  </View>
                </View>
                <Text style={styles.kpiValue}>{metric.value}</Text>
              </View>
            );
          })}
        </View>

        {/* User selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Subscriber</Text>
          <View style={styles.tabs}>
            {USER_CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const active = userCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => handleCategory(cat.key)}>
                  {active ? (
                    <GradientView colors={['#166534', '#22c55e']} style={styles.tabGradient}>
                      <Icon size={14} color="#FFFFFF" />
                      <Text style={[styles.tabText, styles.tabTextActive]}>{cat.label}</Text>
                    </GradientView>
                  ) : (
                    <View style={styles.tabInner}>
                      <Icon size={14} color={ACCENT} />
                      <Text style={styles.tabText}>{cat.label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {userCategory ? (
            <TouchableOpacity
              style={styles.selectUserBtn}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.85}>
              <GradientView colors={['#166534', '#22c55e']} style={styles.selectUserGradient}>
                <Users size={15} color="#FFFFFF" />
                <Text style={styles.selectUserText}>
                  {selectedUserName || `Select ${categoryLabel}`}
                </Text>
                <ChevronDown size={16} color="#FFFFFF" />
              </GradientView>
            </TouchableOpacity>
          ) : null}

          {selectedUserId ? (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedId}>{selectedUserId?.slice(0, 8)}</Text>
              <Text style={styles.selectedDot}>•</Text>
              <Text style={styles.selectedName}>{selectedUserName}</Text>
              {loadingPerms && <ActivityIndicator size="small" color={ACCENT} style={{marginLeft: 8}} />}
            </View>
          ) : null}
        </View>

        <OptionPickerSheet
          visible={pickerVisible}
          title={`Select ${categoryLabel}`}
          options={userOptions}
          value={selectedUserId || ''}
          onSelect={handleSheetSelect}
          onClose={() => setPickerVisible(false)}
        />

        {/* Permissions matrix */}
        {permsLoaded ? (
          <View style={styles.card}>
            <View style={styles.permHeader}>
              <View>
                <Text style={styles.cardTitle}>Permissions</Text>
                <Text style={styles.permCount}>{selectedCount} permissions enabled</Text>
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.btnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}>
                <GradientView colors={['#166534', '#22c55e']} style={styles.saveBtnGradient}>
                  {saving ? (
                    <Loader2 size={15} color="#FFFFFF" />
                  ) : (
                    <Save size={15} color="#FFFFFF" />
                  )}
                  <Text style={styles.saveBtnText}>Save</Text>
                </GradientView>
              </TouchableOpacity>
            </View>

            <View style={styles.tableHeader}>
              <Text style={styles.colName}>Permission</Text>
              <View style={styles.colToggles}>
                <Text style={styles.colToggleLabel}>Web</Text>
                <Text style={styles.colToggleLabel}>Mobile</Text>
              </View>
            </View>

            {MODULES.map(module => {
              const modulePerms = PERMISSION_DEFS.filter(p => p.module === module);
              const webAll = moduleWebAll(module);
              const mobileAll = moduleMobileAll(module);
              return (
                <View key={module}>
                  <View style={styles.moduleHeader}>
                    <Text style={styles.moduleName}>{module}</Text>
                    <View style={styles.moduleToggles}>
                      <Text style={styles.colToggleLabel}>Web</Text>
                      <Toggle value={webAll} onToggle={() => {
                        const ids = moduleIds(module);
                        setPermissions(prev => {
                          const next = {...prev};
                          ids.forEach(id => {
                            next[id] = {...(next[id] || {web: false, mobile: false}), web: !webAll};
                          });
                          return next;
                        });
                      }} />
                      <Text style={styles.colToggleLabel}>Mobile</Text>
                      <Toggle value={mobileAll} onToggle={() => {
                        const ids = moduleIds(module);
                        setPermissions(prev => {
                          const next = {...prev};
                          ids.forEach(id => {
                            next[id] = {...(next[id] || {web: false, mobile: false}), mobile: !mobileAll};
                          });
                          return next;
                        });
                      }} />
                    </View>
                  </View>
                  {modulePerms.map(p => (
                    <View key={p.id} style={styles.permRow}>
                      <View style={styles.permInfo}>
                        <Text style={styles.permName}>{p.name}</Text>
                        <Text style={styles.permId}>{p.id}</Text>
                      </View>
                      <View style={styles.permToggles}>
                        <Toggle
                          value={permissions[p.id]?.web ?? false}
                          onToggle={() => setPerm(p.id, {web: !permissions[p.id]?.web})}
                        />
                        <Toggle
                          value={permissions[p.id]?.mobile ?? false}
                          onToggle={() => setPerm(p.id, {mobile: !permissions[p.id]?.mobile})}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  body: {paddingBottom: 40},
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
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topBarTitle: {color: '#FFFFFF', fontSize: 16, fontWeight: '700', paddingRight: 8},
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
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {marginLeft: 12, flex: 1},
  heroTitle: {fontSize: 18, fontWeight: '700', color: '#111827'},
  heroSubtitle: {fontSize: 13, color: '#6B7280', marginTop: 2},
  heroDivider: {height: 2, marginTop: 12, marginHorizontal: 16},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
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
  cardTitle: {fontSize: 15, fontWeight: '700', color: '#111827'},
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiLabel: {fontSize: 11, color: '#6B7280', fontWeight: '500', flex: 1, flexWrap: 'wrap'},
  kpiIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 8},
  tabs: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12},
  tab: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  tabActive: {borderColor: ACCENT},
  tabText: {fontSize: 13, fontWeight: '600', color: ACCENT},
  tabTextActive: {color: '#FFFFFF'},
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  searchRow: {flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 14},
  selectUserBtn: {
    marginTop: 14,
    borderRadius: 10,
    overflow: 'hidden',
  },
  selectUserGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  selectUserText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  searchWrap: {flex: 1, position: 'relative'},
  searchLabel: {fontSize: 11, color: '#6B7280', marginBottom: 4},
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
  },
  searchIcon: {marginRight: 6},
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827'},
  dropdown: {
    position: 'absolute',
    top: 78,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 4},
  },
  dropdownScroll: {maxHeight: 220},
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownId: {fontSize: 11, fontWeight: '600', color: '#9CA3AF', fontFamily: 'monospace', width: 60},
  dropdownName: {fontSize: 14, color: '#111827', marginLeft: 8, flex: 1},
  dropdownMeta: {fontSize: 12, color: '#9CA3AF', marginLeft: 8},
  showBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  showBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700'},
  btnDisabled: {opacity: 0.5},
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  selectedId: {fontSize: 12, fontWeight: '600', color: ACCENT, fontFamily: 'monospace'},
  selectedDot: {fontSize: 12, color: '#16A34A', marginHorizontal: 6},
  selectedName: {fontSize: 13, fontWeight: '600', color: '#166534'},
  permHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  permCount: {fontSize: 12, color: '#6B7280', marginTop: 2},
  saveBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  saveBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '700'},
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  colName: {fontSize: 12, fontWeight: '600', color: '#374151'},
  colToggles: {flexDirection: 'row', gap: 18, alignItems: 'center', justifyContent: 'flex-end'},
  colToggleLabel: {fontSize: 12, fontWeight: '600', color: '#374151', width: 40, textAlign: 'center'},
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    borderRadius: 8,
  },
  moduleName: {fontSize: 13, fontWeight: '700', color: '#166534'},
  moduleToggles: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  permInfo: {flex: 1, marginRight: 8},
  permName: {fontSize: 13, color: '#111827', fontWeight: '500'},
  permId: {fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 1},
  permToggles: {flexDirection: 'row', gap: 18, alignItems: 'center'},
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D1D5DB',
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: {backgroundColor: ACCENT},
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  toggleKnobOn: {alignSelf: 'flex-end'},
});
