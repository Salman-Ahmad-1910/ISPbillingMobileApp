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
  Image,
} from 'react-native';
import {useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {Building2, Mail, Phone, MapPin, Loader2, Stamp, Camera} from 'lucide-react-native';
import {pick, types, keepLocalCopy, errorCodes, isErrorWithCode} from '@react-native-documents/picker';
import {useAuth} from '../../context/AuthContext';
import {getCompany, updateCompany, uploadCompanyImage, uploadCompanyStamp, deleteCompanyImage, deleteCompanyStamp} from '../../api/companies';
import {getApiBaseUrl} from '../../api/client';
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

export default function CompanyProfileScreen() {
  const navigation = useNavigation<any>();
  const drawerStatus = useDrawerStatus();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());
  const {companyId} = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact1, setContact1] = useState('');
  const [contact2, setContact2] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  const [baseUrl, setBaseUrl] = useState('');
  const [logoTs, setLogoTs] = useState(0);
  const [stampTs, setStampTs] = useState(0);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const [logoPresent, setLogoPresent] = useState(false);
  const [stampPresent, setStampPresent] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const c = await getCompany(companyId);
      setCompany(c);
      setName(c.name || '');
      setEmail(c.email || '');
      setContact1(c.contact1 || '');
      setContact2(c.contact2 || '');
      setAddress(c.address || '');
      setDescription(c.description || '');
      setLogoPresent(!!c.logo);
      setStampPresent(!!c.stamp);
      try {
        setBaseUrl(await getApiBaseUrl());
      } catch {
        setBaseUrl('');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load company profile');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!company?.id) {
      return;
    }
    if (!name.trim()) {
      Alert.alert('Validation', 'Company name is required');
      return;
    }
    try {
      setSaving(true);
      await updateCompany(company.id, {
        name,
        email,
        contact1,
        contact2,
        address,
        description,
      });
      Alert.alert('Success', 'Company profile updated successfully');
      load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  const pickAndUpload = async (
    setUploading: (v: boolean) => void,
    uploadFn: (filePath: string, fileType: string, fileName: string) => Promise<string>,
    onDone: (url: string) => void,
  ) => {
    try {
      const picked = await pick({type: [types.images]});
      const asset = picked[0];
      if (!asset || !asset.uri) {
        return;
      }
      const fileName = asset.name || `image_${Date.now()}.jpg`;
      setUploading(true);
      const local = await keepLocalCopy({
        files: [{uri: asset.uri, fileName}],
        destination: 'cachesDirectory',
      });
      const localItem = local[0];
      if (localItem.status !== 'success' || !localItem.localUri) {
        throw new Error('Failed to prepare the selected image for upload');
      }
      const url = await uploadFn(localItem.localUri, asset.type || 'image/jpeg', fileName);
      onDone(url);
      Alert.alert('Success', 'Image uploaded successfully');
    } catch (err: any) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      Alert.alert('Error', err?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handlePickLogo = () =>
    pickAndUpload(setUploadingLogo, uploadCompanyImage, () => {
      setLogoPresent(true);
      setLogoTs(Date.now());
    });

  const handlePickStamp = () =>
    pickAndUpload(setUploadingStamp, uploadCompanyStamp, () => {
      setStampPresent(true);
      setStampTs(Date.now());
    });

  const handleRemoveLogo = async () => {
    try {
      await deleteCompanyImage();
      setLogoPresent(false);
      setLogoTs(Date.now());
      Alert.alert('Success', 'Company logo removed');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to remove logo');
    }
  };

  const handleRemoveStamp = async () => {
    try {
      await deleteCompanyStamp();
      setStampPresent(false);
      setStampTs(Date.now());
      Alert.alert('Success', 'Company stamp removed');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to remove stamp');
    }
  };

  const topBar = (
    <GradientView colors={['#166534', '#22c55e']} style={styles.topBar}>
      <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
        <DoorMenuIcon open={drawerStatus === 'open'} />
      </TouchableOpacity>
      <Text style={styles.topBarTitle}>Company Profile</Text>
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

  if (!company) {
    return (
      <View style={styles.container}>
        {topBar}
        <View style={styles.body}>
          <View style={styles.heroHeader}>
            <GradientView colors={['#166534', '#22c55e']} style={styles.heroIconBox}>
              <Building2 size={20} color="#FFFFFF" />
            </GradientView>
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle}>Company Profile</Text>
              <Text style={styles.heroSubtitle}>Manage your company&apos;s public information and settings.</Text>
            </View>
          </View>
          <View style={styles.noCompany}>
            <Text style={styles.noCompanyText}>No company selected</Text>
            <Text style={styles.noCompanySub}>Please select a company to view its profile.</Text>
          </View>
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
            <Building2 size={20} color="#FFFFFF" />
          </GradientView>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>Company Profile</Text>
            <Text style={styles.heroSubtitle}>Manage your company&apos;s public information and settings.</Text>
          </View>
        </View>

        <HeroDivider />

        <View style={styles.card}>
          <View style={styles.profileTop}>
            <TouchableOpacity
              style={styles.logoBox}
              onPress={handlePickLogo}
              disabled={uploadingLogo}
              activeOpacity={0.8}>
              {baseUrl && logoPresent ? (
                <Image
                  source={{uri: `${baseUrl}/uploads/company_images/${company.id}?t=${logoTs}`}}
                  style={styles.logoImg}
                />
              ) : (
                <Building2 size={22} color={ACCENT} />
              )}
              <View style={styles.logoEditBadge}>
                <Camera size={12} color="#FFFFFF" />
              </View>
              {uploadingLogo && (
                <View style={styles.logoOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.nameBlock}>
              <Text style={styles.profileName}>{name}</Text>
              <Text style={styles.profileEmail}>{email}</Text>
            </View>
          </View>
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
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </GradientView>
            </TouchableOpacity>
          </View>

          {logoPresent && (
            <TouchableOpacity style={styles.removeLogoBtn} onPress={handleRemoveLogo} activeOpacity={0.8}>
              <Text style={styles.removeLogoText}>Remove logo</Text>
            </TouchableOpacity>
          )}

          <View style={styles.form}>
            <Field label="Company Name">
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Company name" placeholderTextColor="#9CA3AF" />
            </Field>
            <Field label="Contact Email">
              <View style={[styles.input, styles.disabledInput]}>
                <Mail size={15} color="#9CA3AF" />
                <Text style={[styles.inputText, !email && styles.placeholder]} numberOfLines={1}>
                  {email || 'Not set'}
                </Text>
              </View>
            </Field>
            <View style={styles.row}>
              <Field label="Primary Contact">
                <View style={styles.inputIcon}>
                  <Phone size={15} color="#9CA3AF" />
                  <TextInput style={styles.inputInner} value={contact1} onChangeText={setContact1} placeholder="0300-1234567" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
                </View>
              </Field>
              <Field label="Secondary Contact">
                <View style={styles.inputIcon}>
                  <Phone size={15} color="#9CA3AF" />
                  <TextInput style={styles.inputInner} value={contact2} onChangeText={setContact2} placeholder="0321-7654321" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
                </View>
              </Field>
            </View>
            <Field label="Address">
              <View style={styles.inputIcon}>
                <MapPin size={15} color="#9CA3AF" />
                <TextInput style={[styles.inputInner, styles.textArea]} value={address} onChangeText={setAddress} placeholder="Full company address" placeholderTextColor="#9CA3AF" multiline numberOfLines={3} />
              </View>
            </Field>
            <Field label="Description">
              <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Briefly describe the company" placeholderTextColor="#9CA3AF" multiline numberOfLines={3} />
            </Field>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Company Stamp</Text>
            <TouchableOpacity
              style={styles.stampBox}
              onPress={handlePickStamp}
              disabled={uploadingStamp}
              activeOpacity={0.85}>
              {baseUrl && stampPresent ? (
                <Image
                  source={{uri: `${baseUrl}/uploads/company_stamps/${company.id}?t=${stampTs}`}}
                  style={styles.stampImg}
                />
              ) : (
                <View style={styles.stampPlaceholder}>
                  <Stamp size={30} color="#9CA3AF" />
                  <Text style={styles.stampHint}>Tap to upload company stamp</Text>
                </View>
              )}
              {uploadingStamp && (
                <View style={styles.stampOverlay}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.stampActions}>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={handlePickStamp}
                disabled={uploadingStamp}
                activeOpacity={0.85}>
                <GradientView colors={['#166534', '#22c55e']} style={styles.uploadBtnInner}>
                  {uploadingStamp ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.uploadBtnText}>Upload Stamp</Text>
                  )}
                </GradientView>
              </TouchableOpacity>
              {stampPresent && (
                <TouchableOpacity style={styles.removeBtn} onPress={handleRemoveStamp} activeOpacity={0.85}>
                  <Text style={styles.removeBtnText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
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
  body: {
    paddingBottom: 40,
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
  card: {
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
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  profileEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  nameBlock: {
    flex: 1,
  },
  saveRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: 56,
    height: 56,
    resizeMode: 'cover',
  },
  logoEditBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    backgroundColor: ACCENT,
    borderRadius: 8,
    padding: 3,
  },
  logoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeLogoBtn: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  removeLogoText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  stampBox: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  stampImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  stampPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  stampOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stampActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  uploadBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    flex: 1,
  },
  uploadBtnInner: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  removeBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  form: {
    marginTop: 4,
  },
  field: {
    marginBottom: 12,
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
    alignItems: 'flex-start',
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
    paddingTop: 0,
  },
  disabledInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
  },
  inputText: {
    flex: 1,
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
  row: {
    flexDirection: 'column',
    gap: 0,
  },
  saveWrap: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
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
  },
  noCompany: {
    alignItems: 'center',
    paddingVertical: 60,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  noCompanyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  noCompanySub: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
