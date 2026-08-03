import React, {useState} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import {createSubscriber, updateSubscriber} from '../../api/subscribers';
import {Subscriber} from '../../types';

export default function SubscriberFormScreen({route, navigation}: any) {
  const existing: Subscriber | null = route.params?.subscriber || null;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || '');
  const [identity, setIdentity] = useState(existing?.subscriber_identity || '');
  const [cnic, setCnic] = useState(existing?.cnic || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [address, setAddress] = useState(existing?.installationAddress || '');
  const [billingCycle, setBillingCycle] = useState(existing?.billingCycle || 'monthly');
  const [status, setStatus] = useState(existing?.status || 'active');
  const [balance, setBalance] = useState(existing?.balance?.toString() || '0');
  const [connectionDate, setConnectionDate] = useState(existing?.connectionDate || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {Alert.alert('Error', 'Name is required'); return;}
    if (!identity.trim()) {Alert.alert('Error', 'Subscriber ID is required'); return;}
    if (!cnic.trim()) {Alert.alert('Error', 'CNIC is required'); return;}
    if (!phone.trim()) {Alert.alert('Error', 'Phone is required'); return;}
    if (!address.trim()) {Alert.alert('Error', 'Address is required'); return;}

    setLoading(true);
    try {
      const payload: Partial<Subscriber> = {
        name: name.trim(),
        subscriber_identity: identity.trim(),
        cnic: cnic.trim(),
        phone: phone.trim(),
        installationAddress: address.trim(),
        billingCycle,
        status,
        balance: parseFloat(balance) || 0,
        connectionDate: connectionDate.trim() || undefined,
        packageId: existing?.packageId || '',
        areaId: existing?.areaId || '',
        splitterId: existing?.splitterId || '',
        splitterPort: existing?.splitterPort || 0,
      };

      if (isEdit) {
        await updateSubscriber(existing!.id, payload);
        Alert.alert('Success', 'Subscriber updated');
      } else {
        await createSubscriber(payload);
        Alert.alert('Success', 'Subscriber created');
      }
      navigation.goBack();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to save';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const cycles = ['monthly', 'quarterly', 'yearly'];
  const statuses = ['active', 'suspended', 'inactive', 'deactivated'];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Subscriber' : 'New Subscriber'}</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Field label="Name *" value={name} onChangeText={setName} placeholder="Full name" />
        <Field label="Subscriber ID *" value={identity} onChangeText={setIdentity} placeholder="e.g. SUB001" />
        <Field label="CNIC *" value={cnic} onChangeText={setCnic} placeholder="e.g. 1234567890123" />
        <Field label="Phone *" value={phone} onChangeText={setPhone} placeholder="+92..." keyboardType="phone-pad" />
        <Field label="Address *" value={address} onChangeText={setAddress} placeholder="Installation address" multiline />
        <Field label="Connection Date" value={connectionDate} onChangeText={setConnectionDate} placeholder="YYYY-MM-DD" />
        <Field label="Balance" value={balance} onChangeText={setBalance} placeholder="0" keyboardType="numeric" />

        <Text style={styles.label}>Billing Cycle</Text>
        <View style={styles.chipRow}>
          {cycles.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, billingCycle === c && styles.chipActive]}
              onPress={() => setBillingCycle(c)}>
              <Text style={[styles.chipText, billingCycle === c && styles.chipTextActive]}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Status</Text>
        <View style={styles.chipRow}>
          {statuses.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, status === s && styles.chipActive]}
              onPress={() => setStatus(s)}>
              <Text style={[styles.chipText, status === s && styles.chipTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{isEdit ? 'Update' : 'Create'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({label, value, onChangeText, placeholder, keyboardType, multiline}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder: string; keyboardType?: 'default' | 'phone-pad' | 'numeric'; multiline?: boolean;
}) {
  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline && fieldStyles.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  group: {marginBottom: 14},
  label: {fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6},
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827',
  },
  multiline: {minHeight: 60, textAlignVertical: 'top'},
});

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: {paddingVertical: 4},
  backText: {fontSize: 16, color: '#4F46E5', fontWeight: '500'},
  headerTitle: {fontSize: 18, fontWeight: '600', color: '#111827'},
  spacer: {width: 60},
  form: {paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40},
  label: {fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 8, marginTop: 4},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14},
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB',
  },
  chipActive: {backgroundColor: '#4F46E5', borderColor: '#4F46E5'},
  chipText: {fontSize: 13, color: '#6B7280', fontWeight: '500'},
  chipTextActive: {color: '#FFFFFF'},
  saveBtn: {
    backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 10,
  },
  saveBtnDisabled: {opacity: 0.6},
  saveBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
});
