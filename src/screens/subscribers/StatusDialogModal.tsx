import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {X} from 'lucide-react-native';
import {Connection} from '../../types';
import OptionPickerSheet, {Option} from '../../components/OptionPickerSheet';

export const STATUS_OPTIONS = [
  {value: 'active', label: 'Active'},
  {value: 'inactive', label: 'Inactive'},
  {value: 'deactivated', label: 'Deactivated'},
  {value: 'suspended', label: 'Suspended'},
] as const;

export const DEACTIVATION_REASONS = [
  {value: 'voluntary', label: 'Voluntary'},
  {value: 'non-payment', label: 'Non-Payment'},
  {value: 'relocation', label: 'Relocation'},
  {value: 'switched_provider', label: 'Switched Provider'},
  {value: 'service_issues', label: 'Service Issues'},
  {value: 'financial', label: 'Financial Reasons'},
  {value: 'other', label: 'Other'},
];

type StatusDialogModalProps = {
  visible: boolean;
  connection: Connection | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (
    connection: Connection,
    status: string,
    reason: string,
    comments: string,
  ) => void;
};

export default function StatusDialogModal({
  visible,
  connection,
  saving,
  onClose,
  onSubmit,
}: StatusDialogModalProps) {
  const [status, setStatus] = useState<string>('active');
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [picker, setPicker] = useState<'status' | 'reason' | null>(null);

  // Seed from the subscriber's current status every time the dialog opens.
  useEffect(() => {
    if (visible && connection) {
      const current = STATUS_OPTIONS.some(o => o.value === connection.status)
        ? connection.status
        : 'active';
      setStatus(current);
      setReason('');
      setComments('');
    }
  }, [visible, connection]);

  const isDeactivating = status === 'deactivated';
  const needsReason = isDeactivating && !reason;

  const handleClose = () => {
    setStatus('active');
    setReason('');
    setComments('');
    onClose();
  };

  const handleSubmit = () => {
    if (!connection || needsReason) {
      return;
    }
    onSubmit(connection, status, reason, comments);
  };

  const statusOptions: Option[] = STATUS_OPTIONS.map(o => ({
    value: o.value,
    label: o.label,
  }));
  const reasonOptions: Option[] = DEACTIVATION_REASONS.map(o => ({
    value: o.value,
    label: o.label,
  }));

  const reasonLabel = reason
    ? DEACTIVATION_REASONS.find(o => o.value === reason)?.label || reason
    : 'Select reason';
  const statusLabel =
    STATUS_OPTIONS.find(o => o.value === status)?.label || status;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Change Subscriber Status</Text>
              <Text style={styles.subtitle}>
                Select the new status for this subscriber.
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={saving}>
              <X size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            {connection ? (
              <View style={styles.summary}>
                <Text style={styles.summaryLine}>
                  <Text style={styles.summaryKey}>Name: </Text>
                  {connection.name}
                </Text>
                <Text style={styles.summaryLine}>
                  <Text style={styles.summaryKey}>Internet ID: </Text>
                  {connection.internetId}
                </Text>
                <Text style={styles.summaryLine}>
                  <Text style={styles.summaryKey}>Current Status: </Text>
                  {STATUS_OPTIONS.find(o => o.value === connection.status)?.label ||
                    connection.status}
                </Text>
              </View>
            ) : null}

            <View style={styles.group}>
              <Text style={styles.label}>
                Status <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.select}
                onPress={() => setPicker('status')}
                disabled={saving}>
                <Text style={[styles.selectText, !status && styles.placeholder]}>
                  {status ? statusLabel : 'Select status'}
                </Text>
              </TouchableOpacity>
            </View>

            {isDeactivating ? (
              <>
                <View style={styles.group}>
                  <Text style={styles.label}>
                    Reason for Leaving <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.select}
                    onPress={() => setPicker('reason')}
                    disabled={saving}>
                    <Text
                      style={[
                        styles.selectText,
                        !reason && styles.placeholder,
                      ]}>
                      {reason ? reasonLabel : 'Select reason'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.group}>
                  <Text style={styles.label}>Comments</Text>
                  <TextInput
                    style={styles.textarea}
                    placeholder="Enter any additional comments..."
                    placeholderTextColor="#9CA3AF"
                    value={comments}
                    onChangeText={setComments}
                    multiline
                    editable={!saving}
                  />
                </View>
              </>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={handleClose}
              disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.saveBtn,
                isDeactivating && styles.saveBtnDanger,
                (needsReason || saving) && styles.btnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={needsReason || saving}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Update Status</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <OptionPickerSheet
        visible={picker === 'status'}
        title="Status"
        options={statusOptions}
        value={status}
        onSelect={setStatus}
        onClose={() => setPicker(null)}
      />
      <OptionPickerSheet
        visible={picker === 'reason'}
        title="Reason for Leaving"
        options={reasonOptions}
        value={reason}
        onSelect={setReason}
        onClose={() => setPicker(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerText: {flex: 1, marginRight: 12},
  title: {fontSize: 16, fontWeight: '700', color: '#111827'},
  subtitle: {fontSize: 12, color: '#6B7280', marginTop: 2},
  scroll: {flexGrow: 0},
  content: {paddingHorizontal: 20, paddingVertical: 16},
  summary: {backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12},
  summaryLine: {fontSize: 13, color: '#111827', marginBottom: 3},
  summaryKey: {fontWeight: '600'},
  group: {marginTop: 16},
  label: {fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6},
  required: {color: '#DC2626'},
  select: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  selectText: {fontSize: 15, color: '#111827'},
  placeholder: {color: '#9CA3AF'},
  textarea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    minHeight: 88,
    textAlignVertical: 'top',
  },
  footer: {flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12},
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
  },
  cancelBtn: {borderWidth: 1, borderColor: '#D1D5DB'},
  cancelBtnText: {fontSize: 14, fontWeight: '600', color: '#374151'},
  saveBtn: {backgroundColor: '#166534'},
  saveBtnDanger: {backgroundColor: '#DC2626'},
  btnDisabled: {opacity: 0.6},
  saveBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
});