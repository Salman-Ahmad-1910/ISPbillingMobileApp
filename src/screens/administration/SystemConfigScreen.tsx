import React, {useCallback, useEffect, useState} from 'react';
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
import {
  Settings,
  Cog,
  Bell,
  Shield,
  Eye,
  EyeOff,
  ChevronDown,
  Save,
  Loader2,
} from 'lucide-react-native';
import {getSystemConfig, saveSystemConfig} from '../../api/systemConfig';
import {SystemConfig} from '../../types';
import {GradientView} from '../../components/GradientView';
import OptionPickerSheet from '../../components/OptionPickerSheet';

const ACCENT = '#166534';
const ACCENT2 = '#22c55e';

const CURRENCIES = [
  {label: 'PKR - Pakistani Rupee', value: 'PKR'},
  {label: 'USD - US Dollar', value: 'USD'},
  {label: 'AED - UAE Dirham', value: 'AED'},
];

const TAB_ICONS: Record<string, typeof Settings> = {
  general: Settings,
  billing: Cog,
  notifications: Bell,
  security: Shield,
};

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

function Field({label, children, hint}: {label: string; children: React.ReactNode; hint?: string}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export default function SystemConfigScreen() {
  const navigation = useNavigation<any>();
  const drawerStatus = useDrawerStatus();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  const [config, setConfig] = useState<Partial<SystemConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showSmsKey, setShowSmsKey] = useState(false);
  const [showWhatsAppToken, setShowWhatsAppToken] = useState(false);
  const [currencyPicker, setCurrencyPicker] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSystemConfig();
      if (data) {
        setConfig(data);
      } else {
        setConfig({
          appName: 'FinTrack ISP',
          defaultCurrency: 'PKR',
          autoSuspend: true,
          gracePeriod: 3,
          invoiceTemplate: '',
          smsGateway: '',
          whatsAppGateway: '',
          invoiceSms: '',
          enable2fa: false,
          sessionTimeout: 60,
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field: keyof SystemConfig, value: any) => {
    setConfig(prev => ({...prev, [field]: value}));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveSystemConfig(config);
      Alert.alert('Success', 'Your system configuration has been updated.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const topBar = (
    <GradientView colors={['#166534', '#22c55e']} style={styles.topBar}>
      <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
        <DoorMenuIcon open={drawerStatus === 'open'} />
      </TouchableOpacity>
      <Text style={styles.topBarTitle}>System Config</Text>
    </GradientView>
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

  const currencyLabel =
    CURRENCIES.find(c => c.value === config.defaultCurrency)?.label || config.defaultCurrency;

  const tabs = ['general', 'billing', 'notifications', 'security'];

  return (
    <View style={styles.container}>
      {topBar}
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.heroHeader}>
          <GradientView colors={['#166534', '#22c55e']} style={styles.heroIconBox}>
            <Settings size={20} color="#FFFFFF" />
          </GradientView>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>System Configuration</Text>
            <Text style={styles.heroSubtitle}>Manage global settings for the application.</Text>
          </View>
        </View>

        <HeroDivider />

        {/* Tabs */}
        <View style={styles.tabBar}>
          {tabs.map(tab => {
            const Icon = TAB_ICONS[tab];
            const active = activeTab === tab;
            const labels: Record<string, string> = {
              general: 'General',
              billing: 'Billing',
              notifications: 'Notify',
              security: 'Security',
            };
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(tab)}>
                {active ? (
                  <GradientView colors={['#166534', '#22c55e']} style={styles.tabGradient}>
                    <Icon size={13} color="#FFFFFF" />
                    <Text style={[styles.tabText, styles.tabTextActive]}>{labels[tab]}</Text>
                  </GradientView>
                ) : (
                  <View style={styles.tabInner}>
                    <Icon size={13} color={ACCENT} />
                    <Text style={styles.tabText}>{labels[tab]}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* General */}
        {activeTab === 'general' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>General Settings</Text>
            <Text style={styles.cardDesc}>Global settings for all companies.</Text>
            <Field label="Application Name">
              <TextInput
                style={styles.input}
                value={config.appName || ''}
                onChangeText={v => set('appName', v)}
                placeholder="Application name"
                placeholderTextColor="#9CA3AF"
              />
            </Field>
            <Field label="Default Currency">
              <TouchableOpacity
                style={styles.selectBox}
                onPress={() => setCurrencyPicker(true)}
                activeOpacity={0.85}>
                <Text style={[styles.selectText, !config.defaultCurrency && styles.placeholder]}>
                  {currencyLabel || 'Select currency'}
                </Text>
                <ChevronDown size={16} color="#6B7280" />
              </TouchableOpacity>
            </Field>
          </View>
        ) : null}

        {/* Billing & Invoice */}
        {activeTab === 'billing' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Billing & Invoice Settings</Text>
            <Text style={styles.cardDesc}>
              Configure how billing and invoicing works across the system.
            </Text>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Auto-Suspend Overdue Subscribers</Text>
                <Text style={styles.switchDesc}>
                  Automatically suspend subscribers after their due date.
                </Text>
              </View>
              <Toggle value={!!config.autoSuspend} onToggle={() => set('autoSuspend', !config.autoSuspend)} />
            </View>
            <Field label="Grace Period (Days)" hint="Number of days after due date before suspension.">
              <TextInput
                style={[styles.input, styles.numberInput]}
                value={String(config.gracePeriod ?? 0)}
                onChangeText={v => set('gracePeriod', parseInt(v) || 0)}
                keyboardType="number-pad"
                placeholder="3"
                placeholderTextColor="#9CA3AF"
              />
            </Field>
            <Field label="Invoice Template (Default)">
              <TextInput
                style={[styles.input, styles.textArea]}
                value={config.invoiceTemplate || ''}
                onChangeText={v => set('invoiceTemplate', v)}
                placeholder="Invoice footer text, terms and conditions..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </Field>
          </View>
        ) : null}

        {/* Notifications */}
        {activeTab === 'notifications' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notification Settings</Text>
            <Text style={styles.cardDesc}>Configure SMS, WhatsApp, and email templates.</Text>
            <Field label="SMS Gateway API Key">
              <View style={styles.inputIcon}>
                <TextInput
                  style={styles.inputInner}
                  value={config.smsGateway || ''}
                  onChangeText={v => set('smsGateway', v)}
                  secureTextEntry={!showSmsKey}
                  placeholder="**************"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity onPress={() => setShowSmsKey(!showSmsKey)} activeOpacity={0.7}>
                  {showSmsKey ? (
                    <EyeOff size={16} color="#6B7280" />
                  ) : (
                    <Eye size={16} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </Field>
            <Field label="WhatsApp Gateway Token">
              <View style={styles.inputIcon}>
                <TextInput
                  style={styles.inputInner}
                  value={config.whatsAppGateway || ''}
                  onChangeText={v => set('whatsAppGateway', v)}
                  secureTextEntry={!showWhatsAppToken}
                  placeholder="**************"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  onPress={() => setShowWhatsAppToken(!showWhatsAppToken)}
                  activeOpacity={0.7}>
                  {showWhatsAppToken ? (
                    <EyeOff size={16} color="#6B7280" />
                  ) : (
                    <Eye size={16} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </Field>
            <Field label="Invoice Generation SMS Template">
              <TextInput
                style={[styles.input, styles.textArea]}
                value={config.invoiceSms || ''}
                onChangeText={v => set('invoiceSms', v)}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </Field>
          </View>
        ) : null}

        {/* Security */}
        {activeTab === 'security' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Security Settings</Text>
            <Text style={styles.cardDesc}>Manage application-wide security policies.</Text>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Enable Two-Factor Authentication (2FA)</Text>
                <Text style={styles.switchDesc}>
                  Require all users to set up 2FA for enhanced security.
                </Text>
              </View>
              <Toggle value={!!config.enable2fa} onToggle={() => set('enable2fa', !config.enable2fa)} />
            </View>
            <Field label="Session Timeout (Minutes)" hint="Automatically log out users after a period of inactivity.">
              <TextInput
                style={[styles.input, styles.numberInput]}
                value={String(config.sessionTimeout ?? 0)}
                onChangeText={v => set('sessionTimeout', parseInt(v) || 0)}
                keyboardType="number-pad"
                placeholder="60"
                placeholderTextColor="#9CA3AF"
              />
            </Field>
          </View>
        ) : null}

        {/* Save */}
        <View style={styles.saveRow}>
          <TouchableOpacity
            style={styles.saveWrap}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}>
            <GradientView colors={['#166534', '#22c55e']} style={styles.saveBtn}>
              {saving ? (
                <Loader2 size={16} color="#FFFFFF" />
              ) : (
                <Save size={16} color="#FFFFFF" />
              )}
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save All Changes'}</Text>
            </GradientView>
          </TouchableOpacity>
        </View>

        <OptionPickerSheet
          visible={currencyPicker}
          title="Select Currency"
          options={CURRENCIES}
          value={config.defaultCurrency || ''}
          onSelect={value => set('defaultCurrency', value)}
          onClose={() => setCurrencyPicker(false)}
        />
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
  heroTitle: {fontSize: 20, fontWeight: '700', color: '#111827', letterSpacing: -0.5},
  heroSubtitle: {fontSize: 12, color: '#6B7280', marginTop: 2},
  heroDivider: {height: 2, marginHorizontal: 20, marginBottom: 4},
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  tab: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  tabActive: {borderColor: ACCENT},
  tabText: {fontSize: 11, fontWeight: '600', color: ACCENT},
  tabTextActive: {color: '#FFFFFF'},
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 9,
    justifyContent: 'center',
  },
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
  cardDesc: {fontSize: 12, color: '#6B7280', marginTop: 2, marginBottom: 12},
  field: {marginBottom: 12},
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  hint: {fontSize: 11, color: '#9CA3AF', marginTop: 4},
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
  inputInner: {flex: 1, fontSize: 14, color: '#111827', paddingTop: 0},
  numberInput: {width: 140},
  textArea: {height: 80, textAlignVertical: 'top'},
  selectBox: {
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
  selectText: {fontSize: 14, color: '#111827'},
  placeholder: {color: '#9CA3AF'},
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  switchInfo: {flex: 1, marginRight: 12},
  switchTitle: {fontSize: 13, fontWeight: '600', color: '#111827'},
  switchDesc: {fontSize: 11, color: '#6B7280', marginTop: 2},
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
  saveRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginHorizontal: 16,
    marginTop: 16,
  },
  saveWrap: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 18,
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
    fontWeight: '700',
  },
});
