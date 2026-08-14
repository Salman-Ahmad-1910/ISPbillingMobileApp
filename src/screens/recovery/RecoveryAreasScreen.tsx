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
  MapPinned,
  Map,
  Users,
  Building2,
  ChevronRight,
  ChevronsRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronDown,
  Check,
  Pencil,
  Trash2,
  CircleDot,
  Search,
  TriangleAlert,
} from 'lucide-react-native';
import {getRecoveryOfficers, getAreas, updateArea, deleteArea} from '../../api/recovery';
import {Area, RecoveryOfficer} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';

const ACCENT = '#10B981';
const ACCENT_DARK = '#059669';
const ACCENT_LIGHT = '#D1FAE5';
const GRADIENT: [string, string] = ['#10B981', '#059669'];

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

function AreaDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="areaHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#3B82F6" stopOpacity="1" />
            <Stop offset="0.6" stopColor="#10B981" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#areaHeroGrad)" />
      </Svg>
    </View>
  );
}

type Option = {value: string; label: string};

type OptionPickerSheetProps = {
  visible: boolean;
  title: string;
  options: Option[];
  value: string;
  emptyLabel?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

function OptionPickerSheet({visible, title, options, value, emptyLabel, onSelect, onClose}: OptionPickerSheetProps) {
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
            {emptyLabel ? (
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => {
                  onSelect('');
                  onClose();
                }}>
                <View style={styles.sheetOptionRow}>
                  <Text
                    style={[
                      styles.sheetOptionText,
                      !value && styles.sheetOptionTextActive,
                    ]}>
                    {emptyLabel}
                  </Text>
                  {!value ? <Check size={16} color={ACCENT} /> : null}
                </View>
              </TouchableOpacity>
            ) : null}
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
                    <CircleDot size={16} color="#6B7280" />
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
            {filtered.length === 0 && !emptyLabel && (
              <Text style={styles.pickerEmpty}>No options found</Text>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function RecoveryAreasScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const [areas, setAreas] = useState<Area[]>([]);
  const [officers, setOfficers] = useState<RecoveryOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const [officerPickerOpen, setOfficerPickerOpen] = useState(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [leftSelected, setLeftSelected] = useState<string[]>([]);
  const [rightSelected, setRightSelected] = useState<string[]>([]);
  const [transferSaving, setTransferSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Area | null>(null);
  const [formCity, setFormCity] = useState('');
  const [formZone, setFormZone] = useState('');
  const [formLocality, setFormLocality] = useState('');
  const [formSubLocality, setFormSubLocality] = useState('');
  const [saving, setSaving] = useState(false);

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
      const [areaData, officerData] = await Promise.all([
        getAreas(),
        getRecoveryOfficers().catch(() => [] as RecoveryOfficer[]),
      ]);
      const byId: Record<string, Area> = {};
      for (const a of areaData) {
        if (!a.id) {
          continue;
        }
        const existing = byId[a.id];
        if (!existing || (!existing.recoveryOfficerId && a.recoveryOfficerId)) {
          byId[a.id] = a;
        }
      }
      setAreas(Object.values(byId));
      setOfficers(officerData);
      setSelectedOfficerId(prev =>
        prev && officerData.some(o => o.id === prev) ? prev : '',
      );
      setLeftSelected([]);
      setRightSelected([]);
    } catch (err: any) {
      const reason =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load areas. Check your connection and try again.';
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

  const selectedOfficer = officers.find(o => o.id === selectedOfficerId) || null;

  const leftAreas = areas.filter(a => !a.recoveryOfficerId);
  const rightAreas = areas.filter(a => a.recoveryOfficerId === selectedOfficerId);

  const filteredData = areas.filter(a => {
    if (!search.trim()) {
      return true;
    }
    const q = search.trim().toLowerCase();
    return [a.city, a.zone, a.locality, a.subLocality || ''].some(v =>
      v.toLowerCase().includes(q),
    );
  });

  const statCards = [
    {
      key: 'total',
      label: 'Total Areas',
      value: String(areas.length),
      icon: Map,
      gradient: ['#1E40AF', '#3B82F6'] as [string, string],
    },
    {
      key: 'cities',
      label: 'Cities',
      value: String(new Set(areas.map(a => a.city)).size),
      icon: Building2,
      gradient: ['#166534', '#22c55e'] as [string, string],
    },
    {
      key: 'assigned',
      label: 'Officers Assigned',
      value: String(areas.filter(a => a.recoveryOfficerId).length),
      icon: Users,
      gradient: ['#6D28D9', '#A78BFA'] as [string, string],
    },
  ];

  const officerName = (area: Area) => {
    const officer = officers.find(o => o.id === area.recoveryOfficerId);
    return officer ? officer.name : '';
  };

  const toggleLeft = (id: string) => {
    setLeftSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const toggleRight = (id: string) => {
    setRightSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const moveAreas = async (areaIds: string[], targetOfficerId: string | null) => {
    if (areaIds.length === 0) {
      return;
    }
    setTransferSaving(true);
    let count = 0;
    try {
      for (const areaId of areaIds) {
        const area = areas.find(a => a.id === areaId);
        if (!area) {
          continue;
        }
        await updateArea(areaId, {
          id: areaId,
          city: area.city,
          zone: area.zone,
          locality: area.locality,
          subLocality: area.subLocality || '',
          recoveryOfficerId: targetOfficerId || undefined,
        });
        count++;
      }
      setLeftSelected([]);
      setRightSelected([]);
      fetchData(false);
      Alert.alert('Success', `${count} area(s) updated.`);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to update areas';
      Alert.alert('Error', msg);
    } finally {
      setTransferSaving(false);
    }
  };

  const openEdit = (area: Area) => {
    setEditing(area);
    setFormCity(area.city || '');
    setFormZone(area.zone || '');
    setFormLocality(area.locality || '');
    setFormSubLocality(area.subLocality || '');
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!editing) {
      return;
    }
    if (!formCity.trim() || !formZone.trim() || !formLocality.trim()) {
      Alert.alert('Validation', 'City, Zone and Locality are required.');
      return;
    }
    setSaving(true);
    try {
      await updateArea(editing.id, {
        id: editing.id,
        city: formCity.trim(),
        zone: formZone.trim(),
        locality: formLocality.trim(),
        subLocality: formSubLocality.trim(),
        recoveryOfficerId: editing.recoveryOfficerId,
      });
      setFormOpen(false);
      setEditing(null);
      fetchData(false);
      Alert.alert('Success', 'Area updated successfully.');
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to save area';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (area: Area) => {
    Alert.alert(
      'Delete Area',
      `Are you sure you want to delete "${area.locality}, ${area.city}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteArea(area.id);
              fetchData(false);
              Alert.alert('Success', 'Area deleted successfully.');
            } catch (err: any) {
              const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                'Failed to delete area';
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
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  const officerOptions: Option[] = officers.map(o => ({
    value: o.id,
    label: `${o.name} - ${o.email || ''}`,
  }));

  const renderItem = ({item, index}: {item: Area; index: number}) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.rowIndex}>{index + 1}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.locality}, {item.city}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {item.zone}
            {item.subLocality ? `  •  ${item.subLocality}` : ''}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
            <Pencil size={15} color={ACCENT_DARK} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Trash2 size={15} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View
          style={[
            styles.officerBadge,
            !item.recoveryOfficerId && styles.officerBadgeUnassigned,
          ]}>
          <Users size={12} color={item.recoveryOfficerId ? '#065F46' : '#6B7280'} />
          <Text
            style={[
              styles.officerBadgeText,
              !item.recoveryOfficerId && styles.officerBadgeTextUnassigned,
            ]}>
            {item.recoveryOfficerId ? officerName(item) || 'Assigned' : 'Unassigned'}
          </Text>
        </View>
        <Text style={styles.footerHint}>{item.city}</Text>
      </View>
    </View>
  );

  const renderTransferBox = (
    title: string,
    list: Area[],
    selected: string[],
    onToggle: (id: string) => void,
    highlight: boolean,
  ) => (
    <View style={styles.transferBox}>
      <View style={[styles.transferBoxHeader, highlight && styles.transferBoxHeaderHighlight]}>
        <Text
          style={[
            styles.transferBoxTitle,
            highlight && styles.transferBoxTitleHighlight,
          ]}
          numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.transferList}>
        {list.length === 0 ? (
          <Text style={styles.transferEmpty}>No areas</Text>
        ) : (
          list.map(area => {
            const isSelected = selected.includes(area.id);
            return (
              <TouchableOpacity
                key={area.id}
                style={[styles.transferItem, isSelected && styles.transferItemSelected]}
                onPress={() => onToggle(area.id)}>
                <Text
                  style={[styles.transferItemText, isSelected && styles.transferItemTextSelected]}
                  numberOfLines={1}>
                  {area.locality}, {area.city}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <GradientView colors={['#166534', '#22c55e']} style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Areas</Text>
          <Text style={styles.headerCount}>{areas.length} areas</Text>
        </View>
      </GradientView>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={[ACCENT]}
          />
        }>
        <View>
          <View style={styles.heroHeader}>
            <GradientView colors={GRADIENT} style={styles.heroIconBox}>
              <MapPinned size={20} color="#FFFFFF" />
            </GradientView>
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle}>Area Management</Text>
              <Text style={styles.heroSubtitle}>
                View and manage areas assigned to recovery officers.
              </Text>
            </View>
          </View>

          <AreaDivider />

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
                  <Text style={styles.statLabel} numberOfLines={1}>
                    {card.label}
                  </Text>
                  <Text style={styles.statValue} numberOfLines={1}>
                    {card.value}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.transferCard}>
            <View style={styles.sectionHeader}>
              <GradientView colors={GRADIENT} style={styles.sectionIcon}>
                <MapPinned size={16} color="#FFFFFF" />
              </GradientView>
              <Text style={styles.sectionTitle}>Assign Areas to Recovery Officer</Text>
            </View>

            <Text style={styles.formLabel}>Select Recovery Officer</Text>
            <TouchableOpacity
              style={styles.formSelect}
              onPress={() => setOfficerPickerOpen(true)}>
              <Users size={16} color="#0D9488" />
              <Text
                style={[
                  styles.formSelectText,
                  !selectedOfficerId && styles.formSelectPlaceholder,
                ]}
                numberOfLines={1}>
                {selectedOfficer
                  ? `${selectedOfficer.name} - ${selectedOfficer.email || ''}`
                  : 'Choose a recovery officer'}
              </Text>
              <ChevronDown size={16} color="#6B7280" />
            </TouchableOpacity>

            {selectedOfficerId && selectedOfficer ? (
              <View style={styles.transferRow}>
                {renderTransferBox(
                  `Available Areas (${leftAreas.length})`,
                  leftAreas,
                  leftSelected,
                  toggleLeft,
                  false,
                )}

                <View style={styles.transferButtons}>
                  <TouchableOpacity
                    style={[
                      styles.transferBtn,
                      (leftSelected.length === 0 || transferSaving) &&
                        styles.transferBtnDisabled,
                    ]}
                    disabled={leftSelected.length === 0 || transferSaving}
                    onPress={() => moveAreas(leftSelected, selectedOfficerId)}>
                    <ChevronRight size={18} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.transferBtn,
                      (leftAreas.length === 0 || transferSaving) &&
                        styles.transferBtnDisabled,
                    ]}
                    disabled={leftAreas.length === 0 || transferSaving}
                    onPress={() => moveAreas(leftAreas.map(a => a.id), selectedOfficerId)}>
                    <ChevronsRight size={18} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.transferBtn,
                      (rightSelected.length === 0 || transferSaving) &&
                        styles.transferBtnDisabled,
                    ]}
                    disabled={rightSelected.length === 0 || transferSaving}
                    onPress={() => moveAreas(rightSelected, null)}>
                    <ChevronLeft size={18} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.transferBtn,
                      (rightAreas.length === 0 || transferSaving) &&
                        styles.transferBtnDisabled,
                    ]}
                    disabled={rightAreas.length === 0 || transferSaving}
                    onPress={() => moveAreas(rightAreas.map(a => a.id), null)}>
                    <ChevronsLeft size={18} color="#374151" />
                  </TouchableOpacity>
                </View>

                {renderTransferBox(
                  `Assigned to ${selectedOfficer.name} (${rightAreas.length})`,
                  rightAreas,
                  rightSelected,
                  toggleRight,
                  true,
                )}
              </View>
            ) : (
              <Text style={styles.transferHint}>
                Select a recovery officer above to manage their area assignments.
              </Text>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Areas</Text>
            <Text style={styles.sectionCount}>{filteredData.length}</Text>
          </View>

          <View style={styles.searchBox}>
            <Search size={16} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Filter by city, zone, or locality..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {filteredData.length === 0 ? (
          error ? (
            <View style={styles.empty}>
              <EmptyStateIcon icon={TriangleAlert} />
              <Text style={styles.emptyTitle}>Failed to load areas</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : search.trim() ? (
            <View style={styles.empty}>
              <EmptyStateIcon icon={Search} />
              <Text style={styles.emptyTitle}>No areas found</Text>
              <Text style={styles.emptyText}>
                No areas match your search. Try a different keyword.
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <EmptyStateIcon icon={MapPinned} />
              <Text style={styles.emptyTitle}>No areas found</Text>
              <Text style={styles.emptyText}>
                Areas will appear here once they are created.
              </Text>
            </View>
          )
        ) : (
          filteredData.map((item, index) => (
            <View key={item.id}>{renderItem({item, index})}</View>
          ))
        )}
      </ScrollView>

      <OptionPickerSheet
        visible={officerPickerOpen}
        title="Select Recovery Officer"
        options={officerOptions}
        value={selectedOfficerId}
        emptyLabel="Choose a recovery officer"
        onSelect={setSelectedOfficerId}
        onClose={() => setOfficerPickerOpen(false)}
      />

      <Modal
        visible={formOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView
          style={styles.formOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formSheet}>
            <View style={styles.formSheetHeader}>
              <View style={styles.formSheetTitleRow}>
                <GradientView colors={GRADIENT} style={styles.formSheetIcon}>
                  <MapPinned size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>Edit Area</Text>
              </View>
              <TouchableOpacity onPress={() => setFormOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>City</Text>
                <TextInput
                  style={styles.formInput}
                  value={formCity}
                  onChangeText={setFormCity}
                  placeholder="e.g., Karachi"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Zone</Text>
                <TextInput
                  style={styles.formInput}
                  value={formZone}
                  onChangeText={setFormZone}
                  placeholder="e.g., South"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Locality</Text>
                <TextInput
                  style={styles.formInput}
                  value={formLocality}
                  onChangeText={setFormLocality}
                  placeholder="e.g., DHA Phase 6"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Sub-Locality (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={formSubLocality}
                  onChangeText={setFormSubLocality}
                  placeholder="e.g., Street 1-10"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setFormOpen(false)}
                  disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <GradientButton
                  colors={['#10B981', '#16A34A']}
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Area</Text>
                  )}
                </GradientButton>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  bodyScroll: {flex: 1},
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
  transferCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 4,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionTitle: {fontSize: 15, fontWeight: '600', color: '#111827', flex: 1},
  sectionCount: {fontSize: 13, fontWeight: '600', color: '#6B7280'},
  transferRow: {flexDirection: 'row', alignItems: 'stretch', gap: 8, marginTop: 8},
  transferBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  transferBoxHeader: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  transferBoxHeaderHighlight: {
    backgroundColor: '#ECFDF5',
    borderBottomColor: '#D1FAE5',
  },
  transferBoxTitle: {fontSize: 12, fontWeight: '600', color: '#374151'},
  transferBoxTitleHighlight: {color: '#065F46'},
  transferList: {padding: 4},
  transferEmpty: {fontSize: 12, color: '#9CA3AF', textAlign: 'center', paddingVertical: 20},
  transferItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  transferItemSelected: {backgroundColor: '#D1FAE5'},
  transferItemText: {fontSize: 13, color: '#374151'},
  transferItemTextSelected: {color: '#065F46', fontWeight: '600'},
  transferButtons: {justifyContent: 'center', gap: 8},
  transferBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transferBtnDisabled: {opacity: 0.4},
  transferHint: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 20,
    marginTop: 4,
  },
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginTop: 10,
  },
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 6},
  rowIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT_DARK,
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1},
  cardTitle: {fontSize: 15, fontWeight: '600', color: '#111827'},
  cardSubtitle: {fontSize: 12, color: '#6B7280', marginTop: 2},
  cardActions: {flexDirection: 'row', gap: 8},
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ACCENT_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 6,
  },
  officerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#D1FAE5',
    gap: 5,
  },
  officerBadgeUnassigned: {backgroundColor: '#F3F4F6'},
  officerBadgeText: {fontSize: 11, fontWeight: '600', color: '#065F46'},
  officerBadgeTextUnassigned: {color: '#6B7280'},
  footerHint: {fontSize: 11, color: '#9CA3AF'},
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
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827',
  },
  formSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  formSelectText: {flex: 1, fontSize: 15, color: '#111827'},
  formSelectPlaceholder: {color: '#9CA3AF'},
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
});
