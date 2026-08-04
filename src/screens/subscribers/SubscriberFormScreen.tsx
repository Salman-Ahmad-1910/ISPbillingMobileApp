import React, {useState} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import {createConnection, updateConnection} from '../../api/connections';
import {Connection} from '../../types';
import AnimatedBackArrow from '../../components/AnimatedBackArrow';
import {GradientButton} from '../../components/GradientButton';

export default function SubscriberFormScreen({route, navigation}: any) {
  const existing: Connection | null = route.params?.connection || null;
  const isEdit = !!existing;

  const [internetId, setInternetId] = useState(existing?.internetId || '');
  const [name, setName] = useState(existing?.name || '');
  const [address, setAddress] = useState(existing?.address || '');
  const [cell, setCell] = useState(existing?.cell || '');
  const [mobile, setMobile] = useState(existing?.mobile || '');
  const [cnic, setCnic] = useState(existing?.cnic || '');
  const [connectionType, setConnectionType] = useState(existing?.connectionType || 'both');
  const [status, setStatus] = useState(existing?.status || 'active');
  const [boxNumber, setBoxNumber] = useState(existing?.boxNumber || '');
  const [packageCable, setPackageCable] = useState(existing?.packageCable || '');
  const [packageInternet, setPackageInternet] = useState(existing?.packageInternet || '');
  const [connectionProvider, setConnectionProvider] = useState(existing?.connectionProvider || '');
  const [installationDate, setInstallationDate] = useState(existing?.installationDate || '');
  const [amount, setAmount] = useState(existing?.amount?.toString() || '0');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!internetId.trim()) {Alert.alert('Error', 'Subscriber ID is required'); return;}
    if (!name.trim()) {Alert.alert('Error', 'Name is required'); return;}

    const payload: Partial<Connection> = {
      internetId: internetId.trim(),
      name: name.trim(),
      address: address.trim(),
      cell: cell.trim(),
      mobile: mobile.trim(),
      cnic: cnic.trim(),
      connectionType,
      status,
      boxNumber: boxNumber.trim(),
      packageCable: packageCable.trim(),
      packageInternet: packageInternet.trim(),
      connectionProvider: connectionProvider.trim(),
      installationDate: installationDate.trim(),
      amount: parseFloat(amount) || 0,
    };

    setLoading(true);
    try {
      if (isEdit) {
        await updateConnection(existing!.id, payload);
        Alert.alert('Success', 'Subscriber updated');
      } else {
        await createConnection(payload);
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

  const types = ['both', 'internet', 'tv_cable'];
  const typeLabels: Record<string, string> = {both: 'Both', internet: 'Internet', tv_cable: 'TV Cable'};
  const statuses = ['active', 'inactive', 'suspended', 'deactivated'];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <View style={[styles.headerAccent, {backgroundColor: '#4F46E5'}]} />
        <AnimatedBackArrow onPress={() => navigation.goBack()} color="#4F46E5" />
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Subscriber' : 'New Subscriber'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Field label="Internet ID *" value={internetId} onChangeText={setInternetId} placeholder="e.g. INT-0001" />
        <Field label="Name *" value={name} onChangeText={setName} placeholder="Full name" />
        <Field label="Address" value={address} onChangeText={setAddress} placeholder="Installation address" multiline />
        <Field label="Cell" value={cell} onChangeText={setCell} placeholder="Cell number" keyboardType="phone-pad" />
        <Field label="Mobile" value={mobile} onChangeText={setMobile} placeholder="Mobile number" keyboardType="phone-pad" />
        <Field label="CNIC" value={cnic} onChangeText={setCnic} placeholder="e.g. 1234567890123" />
        <Field label="Box Number" value={boxNumber} onChangeText={setBoxNumber} placeholder="e.g. BX-001" />
        <Field label="Cable Package" value={packageCable} onChangeText={setPackageCable} placeholder="e.g. Basic HD" />
        <Field label="Internet Package" value={packageInternet} onChangeText={setPackageInternet} placeholder="e.g. 10 Mbps" />
        <Field label="Connection Provider" value={connectionProvider} onChangeText={setConnectionProvider} placeholder="e.g. Fintrack" />
        <Field label="Install Date" value={installationDate} onChangeText={setInstallationDate} placeholder="YYYY-MM-DD" />
        <Field label="Amount" value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" />

        <Text style={styles.label}>Connection Type</Text>
        <View style={styles.chipRow}>
          {types.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, connectionType === t && styles.chipActive]}
              onPress={() => setConnectionType(t)}>
              <Text style={[styles.chipText, connectionType === t && styles.chipTextActive]}>
                {typeLabels[t]}
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

        <GradientButton
          colors={['#166534', '#22c55e']}
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{isEdit ? 'Update' : 'Create'}</Text>
          )}
        </GradientButton>
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
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    marginTop: 50, marginLeft: 16, paddingVertical: 8, paddingHorizontal: 8,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 5,
  },
  headerAccent: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
    borderTopLeftRadius: 16, borderBottomLeftRadius: 16,
  },
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#111827', paddingRight: 8},
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
    borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 10,
  },
  saveBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
});
