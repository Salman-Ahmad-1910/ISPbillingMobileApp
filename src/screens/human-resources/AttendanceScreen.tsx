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
  Animated,
  RefreshControl,
} from 'react-native';
import {useNavigation, useFocusEffect, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  ChevronDown,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Palmtree,
  Save,
  Users,
} from 'lucide-react-native';
import {getStaff, getAttendance, createAttendance, updateAttendance} from '../../api/hr';
import {Staff, Attendance} from '../../types';
import {GradientView} from '../../components/GradientView';
import OptionPickerSheet, {Option} from '../../components/OptionPickerSheet';

const ACCENT = '#166534';
const ACCENT2 = '#22c55e';

const STATUSES = [
  {value: 'present', label: 'Present', color: '#059669', bg: '#DCFCE7', icon: CheckCircle2},
  {value: 'absent', label: 'Absent', color: '#DC2626', bg: '#FEE2E2', icon: XCircle},
  {value: 'late', label: 'Late', color: '#D97706', bg: '#FEF3C7', icon: Clock},
  {value: 'leave', label: 'Leave', color: '#2563EB', bg: '#DBEAFE', icon: Palmtree},
];

function statusMeta(value?: string) {
  return STATUSES.find(s => s.value === value) || STATUSES[0];
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

type RowState = {
  status: string;
  checkIn: string;
  checkOut: string;
  id?: string;
};

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function AttendanceScreen() {
  const navigation = useNavigation<any>();
  const drawerStatus = useDrawerStatus();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());
  const [staff, setStaff] = useState<Staff[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [date, setDate] = useState<string>(today());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusPicker, setStatusPicker] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [staffRes, attRes] = await Promise.all([getStaff(), getAttendance(date)]);
      const active = staffRes.filter(s => s.status !== 'left');
      setStaff(active);
      const next: Record<string, RowState> = {};
      active.forEach(s => {
        const rec = attRes.find(a => a.staffId === s.id && a.date === date);
        next[s.id] =
          rec && rec.status
            ? {status: rec.status, checkIn: rec.checkIn || '', checkOut: rec.checkOut || '', id: rec.id}
            : {status: 'present', checkIn: '', checkOut: ''};
      });
      setRows(next);
      setInitialized(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    setInitialized(false);
    load();
  }, [date, load]);

  const counts = {present: 0, absent: 0, late: 0, leave: 0};
  staff.forEach(s => {
    const r = rows[s.id];
    if (r && (counts as any)[r.status] !== undefined) {
      (counts as any)[r.status] += 1;
    }
  });

  const kpiCards = [
    {label: 'Present', value: counts.present, icon: CheckCircle2, color: '#059669', bg: '#DCFCE7'},
    {label: 'Absent', value: counts.absent, icon: XCircle, color: '#DC2626', bg: '#FEE2E2'},
    {label: 'Late', value: counts.late, icon: Clock, color: '#D97706', bg: '#FEF3C7'},
    {label: 'Leave', value: counts.leave, icon: Palmtree, color: '#2563EB', bg: '#DBEAFE'},
  ];

  const updateRow = (staffId: string, field: keyof RowState, value: string) => {
    setRows(prev => ({...prev, [staffId]: {...prev[staffId], [field]: value}}));
  };

  const handleSave = async () => {
    if (staff.length === 0) {
      return;
    }
    setSaving(true);
    try {
      for (const s of staff) {
        const r = rows[s.id];
        if (!r) {
          continue;
        }
        const payload: Partial<Attendance> = {
          staffId: s.id,
          staffName: s.name,
          date,
          status: r.status,
          checkIn: r.checkIn || '',
          checkOut: r.checkOut || '',
        };
        if (r.id) {
          await updateAttendance(r.id, {...payload, id: r.id});
        } else {
          await createAttendance(payload);
        }
      }
      Alert.alert('Success', `Attendance for ${date} saved successfully`);
      load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const topBar = (
    <GradientView colors={['#166534', '#22c55e']} style={styles.topBar}>
      <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
        <DoorMenuIcon open={drawerStatus === 'open'} />
      </TouchableOpacity>
      <Text style={styles.topBarTitle}>Attendance</Text>
    </GradientView>
  );

  const renderItem = ({item, index}: {item: Staff; index: number}) => {
    const r = rows[item.id] || {status: 'present', checkIn: '', checkOut: ''};
    const meta = statusMeta(r.status);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.indexBox}>
            <Text style={styles.indexText}>{index + 1}</Text>
          </View>
          <View style={styles.cardHead}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardSub}>{item.designation || item.department || ''}</Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: meta.bg}]}>
            <meta.icon size={13} color={meta.color} />
            <Text style={[styles.statusText, {color: meta.color}]}>{meta.label}</Text>
          </View>
        </View>

        <Text style={styles.fatherText}>Father: {item.fatherName || '—'}</Text>

        <View style={styles.row}>
          <TouchableOpacity
            style={styles.statusSelect}
            onPress={() => setStatusPicker(item.id)}
            activeOpacity={0.8}>
            <Text style={styles.statusSelectText}>{meta.label}</Text>
            <ChevronDown size={16} color="#6B7280" />
          </TouchableOpacity>
          <TextInput
            style={styles.timeInput}
            value={r.checkIn}
            onChangeText={v => updateRow(item.id, 'checkIn', v)}
            placeholder="Check In"
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            style={styles.timeInput}
            value={r.checkOut}
            onChangeText={v => updateRow(item.id, 'checkOut', v)}
            placeholder="Check Out"
            placeholderTextColor="#9CA3AF"
          />
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
        data={staff}
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
                <CalendarDays size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Staff Attendance</Text>
                <Text style={styles.heroSubtitle}>
                  Take daily attendance for all staff members.
                </Text>
              </View>
            </View>

            <HeroDivider from={ACCENT} to={ACCENT2} />

            <View style={styles.controlCard}>
              <View style={styles.field}>
                <Text style={styles.label}>Attendance Date</Text>
                <TextInput
                  style={styles.dateInput}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <TouchableOpacity
                style={styles.saveWrap}
                onPress={handleSave}
                disabled={saving || staff.length === 0}
                activeOpacity={0.85}>
                <GradientView colors={['#166534', '#22c55e']} style={styles.saveBtn}>
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Save size={16} color="#FFFFFF" />
                      <Text style={styles.saveBtnText}>Save Attendance</Text>
                    </>
                  )}
                </GradientView>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}>
              {kpiCards.map(card => (
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

            <Text style={styles.sectionTitle}>Daily Attendance · {date}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Users size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No staff members found</Text>
            <Text style={styles.emptySub}>Add staff from the Staff page first.</Text>
          </View>
        }
      />

      <OptionPickerSheet
        visible={!!statusPicker}
        title="Attendance Status"
        options={STATUSES.map(s => ({label: s.label, value: s.value})) as Option[]}
        value={statusPicker ? rows[statusPicker]?.status || '' : ''}
        onSelect={value => {
          if (statusPicker) {
            updateRow(statusPicker, 'status', value);
          }
          setStatusPicker(null);
        }}
        onClose={() => setStatusPicker(null)}
      />
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
  controlCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  field: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  dateInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
  },
  saveWrap: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    shadowColor: '#166534',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
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
    minWidth: 130,
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
  statValue: {fontSize: 20, fontWeight: '700', color: '#111827'},
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
  indexBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  indexText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fatherText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  statusSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flex: 1,
  },
  statusSelectText: {
    fontSize: 13,
    color: '#111827',
  },
  timeInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    color: '#111827',
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
});
