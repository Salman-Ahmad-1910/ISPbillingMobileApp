import React, {useEffect, useState} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import {Search, Check, X} from 'lucide-react-native';

export type Option = {
  label: string;
  value: string;
};

type OptionPickerSheetProps = {
  visible: boolean;
  title: string;
  options: Option[];
  value: string;
  emptyLabel?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

const ACCENT = '#059669';

export default function OptionPickerSheet({
  visible,
  title,
  options,
  value,
  emptyLabel,
  onSelect,
  onClose,
}: OptionPickerSheetProps) {
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
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.search}>
            <Search size={16} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {emptyLabel ? (
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  onSelect('');
                  onClose();
                }}>
                <View style={styles.optionRow}>
                  <Text style={[styles.optionText, !value && styles.optionTextActive]}>
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
                  style={styles.option}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}>
                  <View style={styles.optionRow}>
                    <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>
                      {option.label}
                    </Text>
                    {active ? <Check size={16} color={ACCENT} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No options found</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  scroll: {
    paddingHorizontal: 12,
    marginTop: 8,
  },
  option: {
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  optionTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
