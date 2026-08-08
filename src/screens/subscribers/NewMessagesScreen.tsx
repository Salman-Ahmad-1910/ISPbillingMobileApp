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
  Inbox,
  FileText,
  PlusCircle,
  Eye,
  Pencil,
  Trash2,
  X,
  Send,
  Search,
  MessageCircle,
  Bell,
  ChevronDown,
  Check,
} from 'lucide-react-native';
import {useAuth} from '../../context/AuthContext';
import {
  getMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  createMessage,
  getConnections,
  getDealers,
  getStaff,
  getRecoveryOfficers,
} from '../../api/messages';
import {MessageTemplate, Connection, Dealer, Staff, RecoveryOfficer} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const DEFAULT_PARAMS = ['name', 'cableAmount', 'internetAmount', 'received', 'balance', 'date', 'bill'];

const SEND_CATEGORIES = [
  {value: 'subscribers', label: 'Subscribers', sendTo: 'Subscriber'},
  {value: 'dealers', label: 'Dealers', sendTo: 'Dealer'},
  {value: 'recovery', label: 'Recovery Officers', sendTo: 'Recovery Officer'},
  {value: 'staff', label: 'Staff', sendTo: 'Staff'},
];

type FilterOption = {label: string; value: string};

function formatVal(v: any): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isNaN(v) ? '' : v.toLocaleString();
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(v.trim())) {
      const d = new Date(v.trim());
      if (!Number.isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const yy = String(d.getFullYear());
        return `${dd} ${[
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
        ][d.getMonth()]} ${yy}`;
      }
    }
    return v;
  }
  return String(v);
}

function getEntityPhone(entity: any): string {
  return entity.mobileNo || entity.mobile || entity.cell || entity.phone || entity.contactPhone || entity.secondaryPhone || '';
}

function buildValues(entity: any, category: string): Record<string, string> {
  const map: Record<string, string> = {};
  Object.entries(entity).forEach(([k, v]) => {
    const val = formatVal(v);
    map[k] = val;
    map[k.toLowerCase()] = val;
  });
  const name = map['name'] || '';
  map['name'] = name;
  const phone = getEntityPhone(entity);
  map['phone'] = phone;
  map['mobile'] = phone;
  map['mobileNo'] = phone;
  map['cnic'] = map['cnic'] || map['nic'] || '';
  map['address'] = map['address'] || map['installationAddress'] || '';

  if (category === 'subscribers') {
    map['cableAmount'] = formatVal(entity.amount);
    map['internetAmount'] = formatVal(entity.packageInternet);
    map['received'] = formatVal(entity.amount);
    map['balance'] = formatVal(entity.remainingAmount ?? entity.amount);
    map['bill'] = formatVal(entity.amount);
    map['date'] = map['date'] || formatVal(entity.rechargeDate || entity.lastPaymentDate || entity.createdAt);
  } else if (category === 'dealers') {
    map['amount'] = formatVal(entity.walletBalance);
    map['received'] = formatVal(entity.walletBalance);
    map['balance'] = formatVal(entity.remainingAmount ?? entity.walletBalance);
    map['bill'] = formatVal(entity.walletBalance);
    map['date'] = map['date'] || formatVal(entity.lastPaymentDate || entity.createdAt);
  } else if (category === 'recovery') {
    map['amount'] = formatVal(entity.collected);
    map['received'] = formatVal(entity.collected);
    map['balance'] = formatVal(entity.target);
    map['bill'] = formatVal(entity.target);
    map['date'] = map['date'] || formatVal(entity.createdAt);
  } else if (category === 'staff') {
    map['date'] = map['date'] || formatVal(entity.appointedDate || entity.createdAt);
  }
  return map;
}

function fillTemplate(message: string, entity: any, category: string): string {
  const values = buildValues(entity, category);
  return message.replace(/\{([^}]+)\}/g, (_, p: string) => values[p] ?? values[p.toLowerCase()] ?? '');
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

function MessagesDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="messagesHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#10B981" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#16A34A" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#16A34A" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#messagesHeroGrad)" />
      </Svg>
    </View>
  );
}

export default function NewMessagesScreen() {
  const {companyId} = useAuth();
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const insets = useSafeAreaInsets();

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [recoveryOfficers, setRecoveryOfficers] = useState<RecoveryOfficer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateMessage, setTemplateMessage] = useState('');
  const [templateParams, setTemplateParams] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const [availableParams, setAvailableParams] = useState<string[]>(DEFAULT_PARAMS);
  const [paramsDialogOpen, setParamsDialogOpen] = useState(false);
  const [newParamInput, setNewParamInput] = useState('');

  const [sendTarget, setSendTarget] = useState<MessageTemplate | null>(null);
  const [sendCategory, setSendCategory] = useState('');
  const [sendSearch, setSendSearch] = useState('');
  const [sendSelectedIds, setSendSelectedIds] = useState<Set<string>>(new Set());
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(false);
  const [isSendingNow, setIsSendingNow] = useState(false);

  const [entityList, setEntityList] = useState<any[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);

  type SelectSheetState = {
    key: string;
    title: string;
    options: FilterOption[];
    selected: string;
    onSelect: (v: string) => void;
  } | null;

  const [selectSheet, setSelectSheet] = useState<SelectSheetState>(null);
  const [sendSheet, setSendSheet] = useState<SelectSheetState>(null);

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
      const [templateData, connectionData, dealerData, staffData, recoveryData] = await Promise.all([
        getMessageTemplates().catch(() => []),
        getConnections().catch(() => []),
        getDealers().catch(() => []),
        getStaff().catch(() => []),
        getRecoveryOfficers().catch(() => []),
      ]);
      setTemplates(templateData);
      setConnections(connectionData);
      setDealers(dealerData);
      setStaff(staffData);
      setRecoveryOfficers(recoveryData);
    } catch {
      Alert.alert('Error', 'Failed to load message templates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {fetchData();}, [fetchData]));

  useEffect(() => {
    let list: any[] = [];
    if (sendCategory === 'subscribers') list = connections;
    else if (sendCategory === 'dealers') list = dealers;
    else if (sendCategory === 'recovery') list = recoveryOfficers;
    else if (sendCategory === 'staff') list = staff;
    setEntityList(list);
  }, [sendCategory, connections, dealers, recoveryOfficers, staff]);

  const openAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateTitle('');
    setTemplateMessage('');
    setTemplateParams('');
    setAvailableParams(DEFAULT_PARAMS);
    setShowTemplateDialog(true);
  };

  const openEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setTemplateTitle(template.title);
    setTemplateMessage(template.message);
    setTemplateParams(template.parameters || '');
    const existing = (template.parameters || '').split(',').map(p => p.trim()).filter(Boolean);
    setAvailableParams(Array.from(new Set([...DEFAULT_PARAMS, ...existing])));
    setShowTemplateDialog(true);
  };

  const selectedParams = useMemo(
    () => templateParams.split(',').map(p => p.trim()).filter(Boolean),
    [templateParams]
  );

  const handleSelectParam = (value: string) => {
    if (value && !selectedParams.includes(value)) {
      setTemplateParams(prev => prev ? `${prev}, ${value}` : value);
    }
  };

  const removeSelectedParam = (param: string) => {
    setTemplateParams(
      prev => prev.split(',').map(p => p.trim()).filter(Boolean).filter(p => p !== param).join(', ')
    );
  };

  const addAvailableParam = () => {
    const p = newParamInput.trim();
    if (!p) return;
    if (availableParams.includes(p)) {
      Alert.alert('Error', `Parameter "${p}" already exists.`);
      return;
    }
    setAvailableParams(prev => [...prev, p]);
    setNewParamInput('');
  };

  const removeAvailableParam = (param: string) => {
    setAvailableParams(prev => prev.filter(p => p !== param));
    setTemplateParams(
      prev => prev.split(',').map(p => p.trim()).filter(Boolean).filter(p => p !== param).join(', ')
    );
  };

  const handleTemplateSave = async () => {
    if (!templateTitle.trim() || !templateMessage.trim()) {
      Alert.alert('Error', 'Title and message are required.');
      return;
    }
    setIsSavingTemplate(true);
    try {
      if (editingTemplate) {
        await updateMessageTemplate(editingTemplate.id, {
          id: editingTemplate.id,
          title: templateTitle.trim(),
          message: templateMessage.trim(),
          parameters: templateParams.trim(),
        });
        Alert.alert('Updated', 'Message template updated.');
      } else {
        await createMessageTemplate({
          title: templateTitle.trim(),
          message: templateMessage.trim(),
          parameters: templateParams.trim(),
        });
        Alert.alert('Added', 'Message template added.');
      }
      setShowTemplateDialog(false);
      setEditingTemplate(null);
      fetchData(false);
    } catch (error: any) {
      const serverMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to save template.';
      Alert.alert('Error', serverMsg);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = (template: MessageTemplate) => {
    Alert.alert('Delete Template', `Delete template "${template.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMessageTemplate(template.id);
            Alert.alert('Deleted', 'Message template deleted.');
            fetchData(false);
          } catch {
            Alert.alert('Error', 'Failed to delete template.');
          }
        },
      },
    ]);
  };

  const currentCategory = SEND_CATEGORIES.find((c) => c.value === sendCategory);

  const visibleEntities = useMemo(() => {
    if (!sendSearch.trim()) return entityList;
    const q = sendSearch.trim().toLowerCase();
    if (/^[0-9]/.test(q)) {
      return entityList.filter((e) =>
        String(e.id || '').toLowerCase().startsWith(q) ||
        String((e as any).internetId || '').toLowerCase().startsWith(q)
      );
    }
    return entityList.filter((e) => String(e.name || '').toLowerCase().startsWith(q));
  }, [entityList, sendSearch]);

  const allVisibleSelected = visibleEntities.length > 0 && visibleEntities.every((e) => sendSelectedIds.has(e.id));

  const toggleAllVisible = (checked: boolean) => {
    setSendSelectedIds((prev) => {
      const next = new Set(prev);
      visibleEntities.forEach((e) => (checked ? next.add(e.id) : next.delete(e.id)));
      return next;
    });
  };

  const toggleEntity = (id: string) => {
    setSendSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openSendDialog = (template: MessageTemplate) => {
    setSendTarget(template);
    setSendCategory('');
    setSendSearch('');
    setSendSelectedIds(new Set());
    setSendViaWhatsApp(false);
  };

  const closeSendDialog = () => {
    setSendTarget(null);
    setSendCategory('');
    setSendSearch('');
    setSendSelectedIds(new Set());
    setSendViaWhatsApp(false);
  };

  const handleSendTemplate = async (template: MessageTemplate) => {
    const cat = SEND_CATEGORIES.find((c) => c.value === sendCategory);
    if (!cat) return;
    const targets = entityList.filter((e) => sendSelectedIds.has(e.id));
    if (targets.length === 0) {
      Alert.alert('Error', 'Please select at least one recipient.');
      return;
    }
    setIsSendingNow(true);
    try {
      for (const ent of targets) {
        const filled = fillTemplate(template.message || '', ent, cat.value);
        await createMessage({
          entityId: ent.id,
          name: ent.name,
          mobileNo: getEntityPhone(ent),
          messageType: template.title,
          messageText: filled,
          sendTo: cat.sendTo,
          status: sendViaWhatsApp ? 'whatsapp_draft' : 'draft',
          companyId: companyId || undefined,
        });
      }
      Alert.alert('Success', `${targets.length} message(s) added to ${sendViaWhatsApp ? 'WhatsApp Draft' : 'Draft'} Messages.`);
      closeSendDialog();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to send messages.';
      Alert.alert('Error', msg);
    } finally {
      setIsSendingNow(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const renderTemplateItem = ({item}: {item: MessageTemplate}) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.rowIndex}>{item.id.slice(0, 6).toUpperCase()}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.title}</Text>
        </View>
        <View style={styles.templateActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setPreviewTemplate(item)}>
            <Eye size={16} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openEditTemplate(item)}>
            <Pencil size={16} color="#F59E0B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteTemplate(item)}>
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Message</Text>
        <Text style={styles.infoValue} numberOfLines={2}>{item.message || '-'}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Parameters</Text>
        <View style={styles.paramsContainer}>
          {item.parameters
            ? item.parameters.split(',').map((p) => p.trim()).filter(Boolean).map((p) => (
                <View key={p} style={styles.paramBadge}>
                  <Text style={styles.paramBadgeText}>{"{" + p + "}"}</Text>
                </View>
              ))
            : <Text style={styles.infoValueMuted}>-</Text>}
        </View>
      </View>
      <View style={styles.cardFooter}>
        <GradientButton
          colors={['#10B981', '#16A34A']}
          style={styles.sendBtn}
          onPress={() => openSendDialog(item)}>
          <Send size={14} color="#FFFFFF" />
          <Text style={styles.sendBtnText}>Send</Text>
        </GradientButton>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <GradientView colors={['#166534', '#22c55e']} style={[styles.header, {paddingTop: insets.top + 8}]}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>New Messages</Text>
          <Text style={styles.headerCount}>{templates.length} templates</Text>
        </View>
      </GradientView>

      <FlatList
        data={templates}
        keyExtractor={item => item.id}
        renderItem={renderTemplateItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#10B981']} />
        }
        ListHeaderComponent={
          <View>
            {/* Hero Header */}
            <View style={styles.heroHeader}>
              <GradientView colors={['#10B981', '#7C3AED']} style={styles.heroIconBox}>
                <Inbox size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>New Messages</Text>
                <Text style={styles.heroSubtitle}>Create and manage message templates</Text>
              </View>
            </View>

            <MessagesDivider />

            {/* Add Template Button */}
            <View style={styles.toolbar}>
              <GradientButton
                colors={['#10B981', '#16A34A']}
                style={styles.addBtn}
                onPress={openAddTemplate}>
                <PlusCircle size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Template</Text>
              </GradientButton>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No message templates found</Text>
            <Text style={styles.emptyText}>Click Add Template to create one.</Text>
          </View>
        }
      />

      {/* Add/Edit Template Dialog */}
      <Modal
        visible={showTemplateDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTemplateDialog(false)}>
        <KeyboardAvoidingView
          style={styles.formOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formSheet}>
            <View style={styles.formSheetHeader}>
              <View style={styles.formSheetTitleRow}>
                <GradientView colors={['#10B981', '#16A34A']} style={styles.formSheetIcon}>
                  <FileText size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>
                  {editingTemplate ? 'Edit Message Template' : 'Add Message Template'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowTemplateDialog(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title</Text>
                <TextInput
                  style={styles.formInput}
                  value={templateTitle}
                  onChangeText={setTemplateTitle}
                  placeholder="e.g. COLLECTION, UsersCredentail"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Message</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  value={templateMessage}
                  onChangeText={setTemplateMessage}
                  placeholder="e.g. Dear {name}, Thanks for payment, Cable:{cableAmount} Internet:{internetAmount}..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Parameters</Text>
                <View style={styles.paramSelectRow}>
                  <TouchableOpacity
                    style={styles.paramSelect}
                    onPress={() => {
                      const opts = availableParams.filter(p => !selectedParams.includes(p));
                      setSelectSheet({
                        key: 'param',
                        title: 'Select parameters',
                        options: opts.map(p => ({label: "{" + p + "}", value: p})),
                        selected: '',
                        onSelect: (v) => handleSelectParam(v),
                      });
                    }}>
                    <Text style={styles.paramSelectPlaceholder}>Select parameters...</Text>
                    <ChevronDown size={16} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addParamBtn}
                    onPress={() => setParamsDialogOpen(true)}>
                    <PlusCircle size={14} color="#6B7280" />
                    <Text style={styles.addParamBtnText}>Add Parameters</Text>
                  </TouchableOpacity>
                </View>

                {selectedParams.length > 0 && (
                  <View style={styles.selectedParamsContainer}>
                    {selectedParams.map((p) => (
                      <View key={p} style={styles.selectedParamBadge}>
                        <Text style={styles.selectedParamText}>{"{" + p + "}"}</Text>
                        <TouchableOpacity onPress={() => removeSelectedParam(p)}>
                          <X size={10} color="#3B82F6" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.formHint}>
                  Select parameters from the dropdown or manage the list via Add Parameters.
                </Text>
              </View>

              <GradientButton
                colors={['#10B981', '#16A34A']}
                style={styles.saveBtn}
                onPress={handleTemplateSave}
                disabled={isSavingTemplate}>
                {isSavingTemplate ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingTemplate ? 'Save Changes' : 'Add'}
                  </Text>
                )}
              </GradientButton>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Manage Parameters Dialog */}
      <Modal
        visible={paramsDialogOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setParamsDialogOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Manage Parameters</Text>
              <TouchableOpacity onPress={() => setParamsDialogOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sheetBody}>
              <View style={styles.paramInputRow}>
                <TextInput
                  style={styles.paramInput}
                  value={newParamInput}
                  onChangeText={setNewParamInput}
                  placeholder="e.g. name, balance, bill"
                  placeholderTextColor="#9CA3AF"
                  onSubmitEditing={addAvailableParam}
                />
                <TouchableOpacity style={styles.addParamBtnSmall} onPress={addAvailableParam}>
                  <Text style={styles.addParamBtnSmallText}>Add</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sheetHint}>Parameters shown in the dropdown</Text>
              {availableParams.length === 0 ? (
                <Text style={styles.sheetEmptyText}>No parameters yet. Add one above.</Text>
              ) : (
                <View style={styles.availableParamsContainer}>
                  {availableParams.map((p) => (
                    <View key={p} style={styles.availableParamBadge}>
                      <Text style={styles.availableParamText}>{"{" + p + "}"}</Text>
                      <TouchableOpacity onPress={() => removeAvailableParam(p)}>
                        <X size={10} color="#3B82F6" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setParamsDialogOpen(false)}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Send Message Dialog */}
      <Modal
        visible={!!sendTarget}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!isSendingNow) closeSendDialog(); }}>
        <KeyboardAvoidingView
          style={styles.formOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formSheet}>
            <View style={styles.formSheetHeader}>
              <View style={styles.formSheetTitleRow}>
                <GradientView colors={['#10B981', '#16A34A']} style={styles.formSheetIcon}>
                  <Send size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>Send Message</Text>
              </View>
              <TouchableOpacity onPress={() => { if (!isSendingNow) closeSendDialog(); }}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              {sendTarget && (
                <View>
                  <View style={styles.sendTemplateInfo}>
                    <Text style={styles.sendTemplateLabel}>Template:</Text>
                    <Text style={styles.sendTemplateValue}>{sendTarget.title}</Text>
                  </View>
                  <View style={styles.sendTemplateMessage}>
                    <Text style={styles.sendTemplateMessageText}>{sendTarget.message}</Text>
                  </View>

                  {/* Send via toggle */}
                  <View style={styles.sendViaRow}>
                    <View style={styles.sendViaInfo}>
                      {sendViaWhatsApp ? (
                        <MessageCircle size={20} color="#22C55E" />
                      ) : (
                        <Bell size={20} color="#3B82F6" />
                      )}
                      <View>
                        <Text style={styles.sendViaTitle}>
                          {sendViaWhatsApp ? 'Send via WhatsApp' : 'Send as Notification (SMS)'}
                        </Text>
                        <Text style={styles.sendViaDesc}>
                          {sendViaWhatsApp
                            ? 'Messages will be added to WhatsApp Draft Messages'
                            : 'Messages will be added to Draft Messages'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.switchTrack}>
                      <TouchableOpacity
                        style={[styles.switchThumb, sendViaWhatsApp && styles.switchThumbOn]}
                        onPress={() => setSendViaWhatsApp(!sendViaWhatsApp)}
                        activeOpacity={0.8}
                      />
                    </View>
                  </View>

                  {/* Send To */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Send To</Text>
                    <TouchableOpacity
                      style={styles.paramSelect}
                      onPress={() => {
                        setSendSheet({
                          key: 'category',
                          title: 'Select recipients',
                          options: SEND_CATEGORIES.map(c => ({label: c.label, value: c.value})),
                          selected: sendCategory,
                          onSelect: (v) => { setSendCategory(v); setSendSearch(''); setSendSelectedIds(new Set()); },
                        });
                      }}>
                      <Text style={sendCategory ? styles.paramSelectValue : styles.paramSelectPlaceholder} numberOfLines={1}>
                        {sendCategory
                          ? (SEND_CATEGORIES.find(c => c.value === sendCategory)?.label || '')
                          : 'Select recipients'}
                      </Text>
                      <ChevronDown size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  {/* Recipients */}
                  {sendCategory && (
                    <View style={styles.formGroup}>
                      <View style={styles.selectAllRow}>
                        <TouchableOpacity
                          style={styles.selectAllLeft}
                          onPress={() => toggleAllVisible(!allVisibleSelected)}>
                          <View style={[styles.checkbox, allVisibleSelected && styles.checkboxSelected]}>
                            {allVisibleSelected && <Check size={12} color="#FFFFFF" />}
                          </View>
                          <Text style={styles.selectAllText}>Select All ({visibleEntities.length})</Text>
                        </TouchableOpacity>
                        <Text style={styles.selectedCountText}>{sendSelectedIds.size} selected</Text>
                      </View>

                      <View style={styles.searchBox}>
                        <Search size={16} color="#6B7280" />
                        <TextInput
                          style={styles.searchInput}
                          placeholder={`Search ${currentCategory?.label.toLowerCase() || 'recipients'}...`}
                          placeholderTextColor="#9CA3AF"
                          value={sendSearch}
                          onChangeText={setSendSearch}
                        />
                      </View>

                      <ScrollView style={styles.recipientList}>
                        {visibleEntities.length === 0 ? (
                          <Text style={styles.emptyText}>No {currentCategory?.label.toLowerCase() || 'recipients'} found.</Text>
                        ) : (
                          visibleEntities.map((ent) => (
                            <TouchableOpacity
                              key={ent.id}
                              style={styles.recipientItem}
                              onPress={() => toggleEntity(ent.id)}>
                              <View style={[styles.checkbox, sendSelectedIds.has(ent.id) && styles.checkboxSelected]}>
                                {sendSelectedIds.has(ent.id) && <Check size={12} color="#FFFFFF" />}
                              </View>
                              <View style={styles.recipientInfo}>
                                <Text style={styles.recipientName} numberOfLines={1}>{ent.name}</Text>
                                <Text style={styles.recipientPhone} numberOfLines={1}>
                                  {getEntityPhone(ent) || '-'}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  )}

                  <View style={styles.formActions}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={closeSendDialog}
                      disabled={isSendingNow}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <GradientButton
                      colors={['#10B981', '#16A34A']}
                      style={styles.sendActionBtn}
                      onPress={() => handleSendTemplate(sendTarget)}
                      disabled={sendSelectedIds.size === 0 || isSendingNow}>
                      {isSendingNow ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Send size={14} color="#FFFFFF" />
                          <Text style={styles.sendActionBtnText}>Send ({sendSelectedIds.size})</Text>
                        </>
                      )}
                    </GradientButton>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Select Sheet */}
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
                    {active ? <Check size={16} color="#10B981" /> : null}
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

      {/* Send Sheet (recipient category selector) */}
      <Modal
        visible={!!sendSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setSendSheet(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{sendSheet?.title}</Text>
              <TouchableOpacity onPress={() => setSendSheet(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll}>
              {sendSheet?.options.map(option => {
                const active = option.value === sendSheet!.selected;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.sheetOption}
                    onPress={() => {
                      sendSheet!.onSelect(option.value);
                      setSendSheet(null);
                    }}>
                    <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]} numberOfLines={1}>
                      {option.label}
                    </Text>
                    {active ? <Check size={16} color="#10B981" /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Template Preview Dialog */}
      <Modal
        visible={!!previewTemplate}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewTemplate(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Template Preview</Text>
              <TouchableOpacity onPress={() => setPreviewTemplate(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll}>
              {previewTemplate && (
                <View style={styles.previewContent}>
                  <View style={styles.formGroup}>
                    <Text style={styles.infoLabel}>Title</Text>
                    <Text style={styles.previewValue}>{previewTemplate.title}</Text>
                  </View>
                  {previewTemplate.parameters ? (
                    <View style={styles.formGroup}>
                      <Text style={styles.infoLabel}>Parameters</Text>
                      <View style={styles.availableParamsContainer}>
                        {previewTemplate.parameters.split(',').map((p) => p.trim()).filter(Boolean).map((p) => (
                          <View key={p} style={styles.availableParamBadge}>
                            <Text style={styles.availableParamText}>{"{" + p + "}"}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                  <View style={styles.formGroup}>
                    <Text style={styles.infoLabel}>Message</Text>
                    <View style={styles.previewMessage}>
                      <Text style={styles.previewMessageText}>{previewTemplate.message || 'No message content'}</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
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
  toolbar: {paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8},
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginLeft: 6},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  rowIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1},
  cardName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  templateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {flexDirection: 'row', paddingVertical: 5},
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 80},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  infoValueMuted: {flex: 1, fontSize: 12, color: '#9CA3AF'},
  paramsContainer: {flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4},
  paramBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  paramBadgeText: {fontSize: 10, color: '#3B82F6', fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'})},
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 6,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sendBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginLeft: 5},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280', textAlign: 'center'},

  // Form
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
  formGroup: {marginBottom: 16},
  formLabel: {fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6},
  formInput: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827',
  },
  formTextarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  formHint: {fontSize: 11, color: '#9CA3AF', marginTop: 4},
  saveBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},

  // Parameter Select
  paramSelect: {
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
  paramSelectPlaceholder: {flex: 1, fontSize: 15, color: '#9CA3AF', marginRight: 8},
  paramSelectValue: {flex: 1, fontSize: 15, color: '#111827', marginRight: 8},
  paramSelectRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addParamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addParamBtnText: {color: '#6B7280', fontSize: 12, fontWeight: '500'},
  selectedParamsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  selectedParamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 4,
  },
  selectedParamText: {fontSize: 10, color: '#3B82F6', fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'})},

  // Sheet
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
  sheetBody: {paddingHorizontal: 20, paddingTop: 16},
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
  sheetOptionTextActive: {color: '#10B981', fontWeight: '600'},
  sheetEmpty: {paddingVertical: 30, alignItems: 'center'},
  sheetEmptyText: {fontSize: 13, color: '#9CA3AF'},
  sheetHint: {fontSize: 11, color: '#9CA3AF', marginBottom: 12},

  // Manage Parameters
  paramInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  paramInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  addParamBtnSmall: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addParamBtnSmallText: {fontSize: 13, color: '#374151', fontWeight: '500'},
  availableParamsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  availableParamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 4,
  },
  availableParamText: {fontSize: 10, color: '#3B82F6', fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'})},

  doneBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  doneBtnText: {fontSize: 14, fontWeight: '600', color: '#374151'},

  // Preview
  previewContent: {paddingBottom: 20},
  previewValue: {fontSize: 15, fontWeight: '600', color: '#111827'},
  previewMessage: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  previewMessageText: {fontSize: 13, color: '#374151', lineHeight: 18},

  // Send Dialog
  sendTemplateInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  sendTemplateLabel: {fontSize: 12, color: '#9CA3AF', width: 70},
  sendTemplateValue: {fontSize: 13, fontWeight: '500', color: '#374151'},
  sendTemplateMessage: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  sendTemplateMessageText: {fontSize: 12, color: '#6B7280', lineHeight: 16},
  sendViaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendViaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  sendViaTitle: {fontSize: 13, fontWeight: '500', color: '#374151'},
  sendViaDesc: {fontSize: 11, color: '#9CA3AF', marginTop: 2},
  switchTrack: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1D5DB',
    justifyContent: 'flex-end',
    padding: 2,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },
  switchThumbOn: {
    alignSelf: 'flex-start',
    backgroundColor: '#10B981',
  },
  recipientList: {
    maxHeight: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  recipientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recipientInfo: {flex: 1},
  recipientName: {fontSize: 14, fontWeight: '500', color: '#374151'},
  recipientPhone: {fontSize: 12, color: '#9CA3AF', marginTop: 2},
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectAllLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {fontSize: 13, color: '#374151'},
  selectedCountText: {fontSize: 12, color: '#9CA3AF'},
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
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
  sendActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendActionBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginLeft: 5},
});
