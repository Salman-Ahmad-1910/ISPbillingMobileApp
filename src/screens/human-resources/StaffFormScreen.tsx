import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {
  ChevronDown,
  Plus,
  Trash2,
  RefreshCw,
  GraduationCap,
  Briefcase,
  Clock,
} from 'lucide-react-native';
import AnimatedBackArrow from '../../components/AnimatedBackArrow';
import {
  getStaff,
  createStaff,
  updateStaff,
  getDepartments,
  createDepartment,
} from '../../api/hr';
import {getAreas} from '../../api/recovery';
import {Staff, StaffQualification, StaffExperience, StaffWorkTime, Area} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import OptionPickerSheet, {Option} from '../../components/OptionPickerSheet';

const GRADIENT: [string, string] = ['#166534', '#22c55e'];

const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const QUALIFICATIONS = ['Matriculation', 'Intermediate', 'Bachelor', 'Master', 'Other'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type RouteParams = {
  staffId?: string;
};

function generatePassword() {
  return `Staff@${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function StaffFormScreen() {
  const ACCENT = '#166534';
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const staffId = route.params?.staffId;
  const isEdit = !!staffId;

  const [loading, setLoading] = useState(!!staffId);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<{id: string; name: string}[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [nic, setNic] = useState('');
  const [address, setAddress] = useState('');

  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [technical, setTechnical] = useState('no');
  const [status, setStatus] = useState('working');
  const [appointedDate, setAppointedDate] = useState('');
  const [leaveDate, setLeaveDate] = useState('');
  const [areaId, setAreaId] = useState('');

  const [basicPay, setBasicPay] = useState('');
  const [leaveAllow, setLeaveAllow] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [bankName, setBankName] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNo, setAccountNo] = useState('');

  const [password, setPassword] = useState('');

  const [qualifications, setQualifications] = useState<StaffQualification[]>([]);
  const [experiences, setExperiences] = useState<StaffExperience[]>([]);
  const [workTimes, setWorkTimes] = useState<StaffWorkTime[]>([]);

  const [picker, setPicker] = useState<{
    field: string;
    title: string;
    options: Option[];
    value: string;
    emptyLabel?: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([getDepartments().catch(() => []), getAreas().catch(() => [])]).then(
      ([depts, areaList]) => {
        setDepartments(depts);
        setAreas(areaList);
      },
    );

    if (staffId) {
      getStaff()
        .then(list => {
          const found = list.find(s => s.id === staffId);
          if (found) {
            setName(found.name || '');
            setEmail(found.email || '');
            setPhone(found.phone || '');
            setSecondaryPhone(found.secondaryPhone || '');
            setGender(found.gender || '');
            setMaritalStatus(found.maritalStatus || '');
            setFatherName(found.fatherName || '');
            setNic(found.nic || '');
            setAddress(found.address || '');
            setDepartment(found.department || '');
            setDesignation(found.designation || '');
            setTechnical(found.technical || 'no');
            setStatus(found.status || 'working');
            setAppointedDate(found.appointedDate || '');
            setLeaveDate(found.leaveDate || '');
            setAreaId(found.areaId || '');
            setBasicPay(String(found.basicPay || found.salary || ''));
            setLeaveAllow(String(found.leaveAllow || ''));
            setPaymentMode(found.paymentMode || 'cash');
            setBankName(found.bankName || '');
            setAccountTitle(found.accountTitle || '');
            setAccountNo(found.accountNo || '');
            setQualifications(found.qualifications || []);
            setExperiences(found.experiences || []);
            setWorkTimes(found.workTimes || []);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setPassword(generatePassword());
    }
  }, [staffId]);

  const openPicker = (
    field: string,
    title: string,
    options: Option[],
    value: string,
    emptyLabel?: string,
  ) => {
    setPicker({field, title, options, value, emptyLabel});
  };

  const onPick = (value: string) => {
    if (!picker) {
      return;
    }
    switch (picker.field) {
      case 'gender':
        setGender(value);
        break;
      case 'maritalStatus':
        setMaritalStatus(value);
        break;
      case 'department':
        setDepartment(value);
        break;
      case 'technical':
        setTechnical(value);
        break;
      case 'status':
        setStatus(value);
        break;
      case 'paymentMode':
        setPaymentMode(value);
        break;
      case 'areaId':
        setAreaId(value);
        break;
      default:
        break;
    }
    setPicker(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Validation', 'Email is required');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Validation', 'Phone is required');
      return;
    }
    if (!designation.trim()) {
      Alert.alert('Validation', 'Designation is required');
      return;
    }
    if (!department.trim()) {
      Alert.alert('Validation', 'Department is required');
      return;
    }
    if (!isEdit && (!password || password.length < 6)) {
      Alert.alert('Validation', 'Password must be at least 6 characters');
      return;
    }
    if (isEdit && password && password.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters');
      return;
    }

    const salaryNum = Number(basicPay) || 0;
    const payload: Partial<Staff> = {
      name,
      email,
      phone,
      secondaryPhone,
      role: 'staff',
      gender,
      maritalStatus,
      fatherName,
      nic,
      address,
      designation,
      department,
      salary: salaryNum,
      basicPay: salaryNum,
      leaveAllow: Number(leaveAllow) || 0,
      paymentMode,
      bankName,
      accountTitle,
      accountNo,
      appointedDate,
      technical,
      status,
      leaveDate: status === 'left' ? leaveDate : '',
      plainPassword: password,
      qualifications,
      experiences,
      workTimes,
      areaId: areaId || null,
    };
    if (!isEdit) {
      payload.password = password;
    } else if (password) {
      payload.password = password;
    }

    try {
      setSaving(true);
      if (isEdit) {
        await updateStaff(staffId!, payload);
      } else {
        await createStaff(payload);
      }
      Alert.alert('Success', `Staff ${isEdit ? 'updated' : 'created'} successfully`, [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save staff');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  const departmentOptions: Option[] = [
    ...departments.map(d => ({label: d.name, value: d.name})),
    {label: '+ Add new department', value: '__add__'},
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <View style={[styles.headerAccent, {backgroundColor: ACCENT}]} />
        <AnimatedBackArrow onPress={() => navigation.goBack()} color={ACCENT} />
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Staff' : 'Add Staff'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Field label="Name *">
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g., John Doe" placeholderTextColor="#9CA3AF" />
          </Field>
          <View style={styles.row}>
            <Field label="Gender">
              <PickerButton value={gender} placeholder="Select gender" onPress={() => openPicker('gender', 'Gender', GENDERS.map(g => ({label: g, value: g})), gender)} />
            </Field>
            <Field label="Marital Status">
              <PickerButton value={maritalStatus} placeholder="Select status" onPress={() => openPicker('maritalStatus', 'Marital Status', MARITAL_STATUSES.map(m => ({label: m, value: m})), maritalStatus)} />
            </Field>
          </View>
          <Field label="Father Name">
            <TextInput style={styles.input} value={fatherName} onChangeText={setFatherName} placeholder="e.g., Muhammad Ahmed" placeholderTextColor="#9CA3AF" />
          </Field>
          <View style={styles.row}>
            <Field label="Email *">
              <TextInput style={styles.input} value={email} onChangeText={setEmail} editable={!isEdit} placeholder="e.g., john@example.com" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />
            </Field>
            <Field label="NIC">
              <TextInput style={styles.input} value={nic} onChangeText={setNic} placeholder="35202-1234567-1" placeholderTextColor="#9CA3AF" />
            </Field>
          </View>
          <View style={styles.row}>
            <Field label="Phone *">
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="0300-1234567" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
            </Field>
            <Field label="Secondary Phone">
              <TextInput style={styles.input} value={secondaryPhone} onChangeText={setSecondaryPhone} placeholder="Optional" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
            </Field>
          </View>
          <Field label="Address">
            <TextInput style={[styles.input, styles.textArea]} value={address} onChangeText={setAddress} placeholder="House #12, Street #5, Model Town" placeholderTextColor="#9CA3AF" multiline numberOfLines={3} />
          </Field>
        </View>

        {/* Employment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employment</Text>
          <Field label="Department *">
            <PickerButton
              value={department}
              placeholder="Select department"
              onPress={() => openPicker('department', 'Department', departmentOptions, department, 'None')}
            />
          </Field>
          <Field label="Designation *">
            <TextInput style={styles.input} value={designation} onChangeText={setDesignation} placeholder="e.g., Accountant" placeholderTextColor="#9CA3AF" />
          </Field>
          <View style={styles.row}>
            <Field label="Technical">
              <PickerButton value={technical} placeholder="Select" onPress={() => openPicker('technical', 'Technical', [{label: 'Yes', value: 'yes'}, {label: 'No', value: 'no'}], technical)} />
            </Field>
            <Field label="Status">
              <PickerButton value={status} placeholder="Select" onPress={() => openPicker('status', 'Status', [{label: 'Working', value: 'working'}, {label: 'Left', value: 'left'}], status)} />
            </Field>
          </View>
          <View style={styles.row}>
            <Field label="Appointed Date">
              <TextInput style={styles.input} value={appointedDate} onChangeText={setAppointedDate} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />
            </Field>
            {status === 'left' ? (
              <Field label="Leave Date">
                <TextInput style={styles.input} value={leaveDate} onChangeText={setLeaveDate} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />
              </Field>
            ) : (
              <Field label="Area">
                <PickerButton value={areas.find(a => a.id === areaId)?.city || ''} placeholder="Select area" onPress={() => openPicker('areaId', 'Area', areas.map(a => ({label: [a.city, a.locality].filter(Boolean).join(', ') || a.zone || 'Area', value: a.id})), areaId, 'None')} />
              </Field>
            )}
          </View>
        </View>

        {/* Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accounts & Salary</Text>
          <View style={styles.row}>
            <Field label="Basic Pay / Salary">
              <TextInput style={styles.input} value={basicPay} onChangeText={setBasicPay} placeholder="0" placeholderTextColor="#9CA3AF" keyboardType="numeric" />
            </Field>
            <Field label="Leave Allowance">
              <TextInput style={styles.input} value={leaveAllow} onChangeText={setLeaveAllow} placeholder="0" placeholderTextColor="#9CA3AF" keyboardType="numeric" />
            </Field>
          </View>
          <Field label="Payment Mode">
            <PickerButton value={paymentMode} placeholder="Select mode" onPress={() => openPicker('paymentMode', 'Payment Mode', [{label: 'Cash', value: 'cash'}, {label: 'Bank', value: 'bank'}], paymentMode)} />
          </Field>
          {paymentMode === 'bank' ? (
            <View style={styles.row}>
              <Field label="Bank Name">
                <TextInput style={styles.input} value={bankName} onChangeText={setBankName} placeholder="e.g., HBL" placeholderTextColor="#9CA3AF" />
              </Field>
              <Field label="Account Title">
                <TextInput style={styles.input} value={accountTitle} onChangeText={setAccountTitle} placeholder="Title" placeholderTextColor="#9CA3AF" />
              </Field>
            </View>
          ) : null}
          {paymentMode === 'bank' ? (
            <Field label="Account No">
              <TextInput style={styles.input} value={accountNo} onChangeText={setAccountNo} placeholder="Account number" placeholderTextColor="#9CA3AF" />
            </Field>
          ) : null}
        </View>

        {/* Account Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Access</Text>
          <Field label={isEdit ? 'Password (leave blank to keep)' : 'Password *'}>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, {flex: 1}]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />
              <TouchableOpacity style={styles.genBtn} onPress={() => setPassword(generatePassword())}>
                <RefreshCw size={16} color="#059669" />
                <Text style={styles.genText}>Generate</Text>
              </TouchableOpacity>
            </View>
          </Field>
        </View>

        {/* Qualifications */}
        <RepeatableSection
          title="Qualifications"
          icon={<GraduationCap size={16} color="#059669" />}
          onAdd={() =>
            setQualifications(prev => [
              ...prev,
              {qualification: '', institute: '', startDate: '', endDate: '', obtainedMarks: '', grade: '', majorSubject: ''},
            ])
          }
          items={qualifications}
          onRemove={idx => setQualifications(prev => prev.filter((_, i) => i !== idx))}
          renderItem={(q, idx) => (
            <View>
              <PickerField
                label="Qualification"
                value={q.qualification || ''}
                placeholder="Select"
                options={QUALIFICATIONS.map(x => ({label: x, value: x}))}
                onSelect={v => setQualifications(prev => prev.map((item, i) => (i === idx ? {...item, qualification: v} : item)))}
              />
              <TextInput style={styles.input} value={q.institute || ''} onChangeText={v => setQualifications(prev => prev.map((item, i) => (i === idx ? {...item, institute: v} : item)))} placeholder="Institute" placeholderTextColor="#9CA3AF" />
              <View style={styles.row}>
                <TextInput style={styles.input} value={q.startDate || ''} onChangeText={v => setQualifications(prev => prev.map((item, i) => (i === idx ? {...item, startDate: v} : item)))} placeholder="Start" placeholderTextColor="#9CA3AF" />
                <TextInput style={styles.input} value={q.endDate || ''} onChangeText={v => setQualifications(prev => prev.map((item, i) => (i === idx ? {...item, endDate: v} : item)))} placeholder="End" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.row}>
                <TextInput style={styles.input} value={q.obtainedMarks || ''} onChangeText={v => setQualifications(prev => prev.map((item, i) => (i === idx ? {...item, obtainedMarks: v} : item)))} placeholder="Marks" placeholderTextColor="#9CA3AF" />
                <TextInput style={styles.input} value={q.grade || ''} onChangeText={v => setQualifications(prev => prev.map((item, i) => (i === idx ? {...item, grade: v} : item)))} placeholder="Grade" placeholderTextColor="#9CA3AF" />
              </View>
              <TextInput style={styles.input} value={q.majorSubject || ''} onChangeText={v => setQualifications(prev => prev.map((item, i) => (i === idx ? {...item, majorSubject: v} : item)))} placeholder="Major Subject" placeholderTextColor="#9CA3AF" />
            </View>
          )}
        />

        {/* Experiences */}
        <RepeatableSection
          title="Experience"
          icon={<Briefcase size={16} color="#059669" />}
          onAdd={() =>
            setExperiences(prev => [
              ...prev,
              {organization: '', designation: '', startDate: '', endDate: '', description: ''},
            ])
          }
          items={experiences}
          onRemove={idx => setExperiences(prev => prev.filter((_, i) => i !== idx))}
          renderItem={(e, idx) => (
            <View>
              <TextInput style={styles.input} value={e.organization || ''} onChangeText={v => setExperiences(prev => prev.map((item, i) => (i === idx ? {...item, organization: v} : item)))} placeholder="Organization" placeholderTextColor="#9CA3AF" />
              <TextInput style={styles.input} value={e.designation || ''} onChangeText={v => setExperiences(prev => prev.map((item, i) => (i === idx ? {...item, designation: v} : item)))} placeholder="Designation" placeholderTextColor="#9CA3AF" />
              <View style={styles.row}>
                <TextInput style={styles.input} value={e.startDate || ''} onChangeText={v => setExperiences(prev => prev.map((item, i) => (i === idx ? {...item, startDate: v} : item)))} placeholder="Start" placeholderTextColor="#9CA3AF" />
                <TextInput style={styles.input} value={e.endDate || ''} onChangeText={v => setExperiences(prev => prev.map((item, i) => (i === idx ? {...item, endDate: v} : item)))} placeholder="End" placeholderTextColor="#9CA3AF" />
              </View>
              <TextInput style={[styles.input, styles.textArea]} value={e.description || ''} onChangeText={v => setExperiences(prev => prev.map((item, i) => (i === idx ? {...item, description: v} : item)))} placeholder="Description" placeholderTextColor="#9CA3AF" multiline numberOfLines={2} />
            </View>
          )}
        />

        {/* Work Times */}
        <RepeatableSection
          title="Working Hours"
          icon={<Clock size={16} color="#059669" />}
          onAdd={() => setWorkTimes(prev => [...prev, {day: 'Monday', startTime: '', endTime: ''}])}
          items={workTimes}
          onRemove={idx => setWorkTimes(prev => prev.filter((_, i) => i !== idx))}
          renderItem={(w, idx) => (
            <View style={styles.row}>
              <PickerField
                label="Day"
                value={w.day || ''}
                placeholder="Day"
                options={DAYS.map(d => ({label: d, value: d}))}
                onSelect={v => setWorkTimes(prev => prev.map((item, i) => (i === idx ? {...item, day: v} : item)))}
              />
              <TextInput style={styles.input} value={w.startTime || ''} onChangeText={v => setWorkTimes(prev => prev.map((item, i) => (i === idx ? {...item, startTime: v} : item)))} placeholder="Start" placeholderTextColor="#9CA3AF" />
              <TextInput style={styles.input} value={w.endTime || ''} onChangeText={v => setWorkTimes(prev => prev.map((item, i) => (i === idx ? {...item, endTime: v} : item)))} placeholder="End" placeholderTextColor="#9CA3AF" />
            </View>
          )}
        />

        <View style={styles.saveWrap}>
          <GradientButton colors={GRADIENT} style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveText}>{saving ? 'Saving...' : isEdit ? 'Update Staff' : 'Create Staff'}</Text>
          </GradientButton>
        </View>
      </ScrollView>

      <OptionPickerSheet
        visible={!!picker}
        title={picker?.title || ''}
        options={picker?.options || []}
        value={picker?.value || ''}
        emptyLabel={picker?.emptyLabel}
        onSelect={value => {
          if (picker?.field === 'department' && value === '__add__') {
            setPicker(null);
            Alert.prompt('New Department', 'Enter department name', async (text?: string) => {
              if (text && text.trim()) {
                try {
                  const created = await createDepartment(text.trim());
                  setDepartments(prev => [...prev, created]);
                  setDepartment(created.name);
                } catch {
                  /* ignore */
                }
              }
            });
            return;
          }
          onPick(value);
        }}
        onClose={() => setPicker(null)}
      />
    </KeyboardAvoidingView>
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

function PickerButton({value, placeholder, onPress}: {value: string; placeholder: string; onPress: () => void}) {
  return (
    <TouchableOpacity style={styles.input} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.inputText, !value && styles.placeholder]}>{value || placeholder}</Text>
      <ChevronDown size={16} color="#6B7280" />
    </TouchableOpacity>
  );
}

function PickerField({
  label,
  value,
  placeholder,
  options,
  onSelect,
}: {
  label?: string;
  value: string;
  placeholder: string;
  options: Option[];
  onSelect: (v: string) => void;
}) {
  const [vis, setVis] = useState(false);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.input} onPress={() => setVis(true)} activeOpacity={0.8}>
        <Text style={[styles.inputText, !value && styles.placeholder]}>{value || placeholder}</Text>
        <ChevronDown size={16} color="#6B7280" />
      </TouchableOpacity>
      <OptionPickerSheet
        visible={vis}
        title={label || placeholder}
        options={options}
        value={value}
        onSelect={onSelect}
        onClose={() => setVis(false)}
      />
    </View>
  );
}

function RepeatableSection({
  title,
  icon,
  items,
  onAdd,
  onRemove,
  renderItem,
}: {
  title: string;
  icon?: React.ReactNode;
  items: any[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  renderItem: (item: any, idx: number) => React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitleRow}>
          {icon}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <TouchableOpacity style={styles.addChip} onPress={onAdd}>
          <Plus size={14} color="#059669" />
          <Text style={styles.addChipText}>Add</Text>
        </TouchableOpacity>
      </View>
      {items.length === 0 ? (
        <Text style={styles.noItems}>No {title.toLowerCase()} added</Text>
      ) : (
        items.map((item, idx) => (
          <View key={idx} style={styles.repeatItem}>
            {renderItem(item, idx)}
            <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(idx)}>
              <Trash2 size={15} color="#DC2626" />
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 50,
    marginLeft: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  headerAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    paddingRight: 8,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  genText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  noItems: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  repeatItem: {
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
  },
  removeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  saveWrap: {
    marginTop: 4,
  },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
