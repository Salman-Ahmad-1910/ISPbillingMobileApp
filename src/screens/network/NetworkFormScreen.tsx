import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import {ChevronDown, Check} from 'lucide-react-native';
import {areasApi, popsApi, oltsApi, splittersApi, boxesApi} from '../../api/network';
import {ModuleConfig, ConfigField} from './networkConfig';
import {GradientButton} from '../../components/GradientButton';

const crudMap: Record<string, any> = {
  areas: areasApi,
  pops: popsApi,
  olts: oltsApi,
  splitters: splittersApi,
  boxes: boxesApi,
};

const optionMap: Record<string, () => Promise<any[]>> = {
  pops: () => popsApi.list(),
  olts: () => oltsApi.list(),
};

export default function NetworkFormScreen({route, navigation}: any) {
  const config: ModuleConfig = route.params.config;
  const existing: any = route.params.item || null;
  const isEdit = !!existing;

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    config.fields.forEach(f => {
      if (existing) {
        const raw = existing[f.key];
        initial[f.key] = raw === undefined || raw === null ? '' : String(raw);
      } else {
        initial[f.key] = f.defaultValue || '';
      }
    });
    return initial;
  });
  const [optionLists, setOptionLists] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [pickerField, setPickerField] = useState<ConfigField | null>(null);

  const remoteFields = config.fields.filter(f => f.selectSource && f.selectSource !== 'static');

  useEffect(() => {
    if (remoteFields.length > 0) {
      (async () => {
        setLoadingOptions(true);
        try {
          const lists: Record<string, any[]> = {};
          for (const f of remoteFields) {
            const source = f.selectSource!;
            lists[source] = await optionMap[source]();
          }
          setOptionLists(lists);
        } catch {
          Alert.alert('Error', `Failed to load ${config.plural} options`);
        } finally {
          setLoadingOptions(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    config.fields.forEach(f => {
      const value = values[f.key] || '';
      if (f.required && !value.trim()) {
        errors[f.key] = `${f.label} is required`;
        return;
      }
      if (f.validate) {
        const err = f.validate(value, values);
        if (err) {
          errors[f.key] = err;
        }
      }
    });
    return errors;
  };

  const handleSave = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      Alert.alert('Validation Error', firstError);
      return;
    }

    const payload: Record<string, any> = {};
    if (isEdit) {
      payload.id = existing.id;
    }
    config.fields.forEach(f => {
      const value = values[f.key];
      if (f.type === 'number') {
        payload[f.key] = value.trim() === '' ? 0 : parseInt(value, 10) || 0;
      } else {
        payload[f.key] = value.trim();
      }
    });

    setLoading(true);
    try {
      if (isEdit) {
        await crudMap[config.key].update(existing.id, payload);
        Alert.alert('Success', `${config.singular} updated successfully.`);
      } else {
        await crudMap[config.key].create(payload);
        Alert.alert('Success', `${config.singular} added successfully.`);
      }
      navigation.goBack();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        `Failed to save ${config.singular}`;
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const setValue = (key: string, value: string) => {
    setValues(prev => ({...prev, [key]: value}));
  };

  const openPicker = (field: ConfigField) => {
    setPickerField(field);
  };

  const selectOption = (field: ConfigField, value: string) => {
    setValue(field.key, value);
    setPickerField(null);
  };

  const renderField = (field: ConfigField) => {
    if (field.selectOptions && field.selectOptions.length > 0) {
      return (
        <View key={field.key} style={fieldStyles.group}>
          <Text style={fieldStyles.label}>
            {field.label}
            {field.required ? ' *' : ''}
          </Text>
          <View style={fieldStyles.optionsRow}>
            {field.selectOptions.map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  fieldStyles.optionChip,
                  values[field.key] === option && fieldStyles.optionChipActive,
                ]}
                onPress={() => setValue(field.key, option)}>
                <Text
                  style={[
                    fieldStyles.optionChipText,
                    values[field.key] === option && fieldStyles.optionChipTextActive,
                  ]}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    if (field.selectSource) {
      const selected =
        values[field.key] && optionLists[field.selectSource]
          ? optionLists[field.selectSource].find(o => o.id === values[field.key])
          : null;
      return (
        <View key={field.key} style={fieldStyles.group}>
          <Text style={fieldStyles.label}>
            {field.label}
            {field.required ? ' *' : ''}
          </Text>
          <TouchableOpacity
            style={fieldStyles.selectTrigger}
            onPress={() => openPicker(field)}>
            <Text
              style={[fieldStyles.selectValue, !selected && fieldStyles.selectValuePlaceholder]}>
              {selected ? selected.name : field.placeholder}
            </Text>
            <ChevronDown size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View key={field.key} style={fieldStyles.group}>
        <Text style={fieldStyles.label}>
          {field.label}
          {field.required ? ' *' : ''}
        </Text>
        <TextInput
          style={fieldStyles.input}
          value={values[field.key]}
          onChangeText={text => setValue(field.key, text)}
          placeholder={field.placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={field.type === 'number' ? 'numeric' : 'default'}
        />
      </View>
    );
  };

  const pickerOptions = pickerField
    ? pickerField.selectSource
      ? optionLists[pickerField.selectSource] || []
      : pickerField.selectOptions || []
    : [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{config.formTitle(isEdit)}</Text>
        <View style={styles.spacer} />
      </View>

      {loadingOptions ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {config.fields.map(field => renderField(field))}

          <GradientButton
            colors={config.gradient}
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEdit ? 'Save ' : 'Add '}
                {config.singular}
              </Text>
            )}
          </GradientButton>
        </ScrollView>
      )}

      <Modal
        visible={!!pickerField}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerField(null)}>
        <View style={pickerStyles.overlay}>
          <View style={pickerStyles.sheet}>
            <View style={pickerStyles.sheetHeader}>
              <Text style={pickerStyles.sheetTitle}>{pickerField?.label}</Text>
              <TouchableOpacity onPress={() => setPickerField(null)}>
                <Text style={pickerStyles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={pickerOptions}
              keyExtractor={item => item.id}
              renderItem={({item}) => {
                const isSelected = values[pickerField!.key] === item.id;
                return (
                  <TouchableOpacity
                    style={pickerStyles.optionRow}
                    onPress={() => selectOption(pickerField!, item.id)}>
                    <Text
                      style={[
                        pickerStyles.optionText,
                        isSelected && pickerStyles.optionTextActive,
                      ]}>
                      {item.name}
                    </Text>
                    {isSelected ? (
                      <Check size={16} color="#4F46E5" />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={pickerStyles.empty}>
                  <Text style={pickerStyles.emptyText}>No options available</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const fieldStyles = StyleSheet.create({
  group: {marginBottom: 14},
  label: {fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6},
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  optionsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  optionChipActive: {backgroundColor: '#4F46E5', borderColor: '#4F46E5'},
  optionChipText: {fontSize: 13, color: '#6B7280', fontWeight: '500'},
  optionChipTextActive: {color: '#FFFFFF'},
  selectTrigger: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: {fontSize: 15, color: '#111827'},
  selectValuePlaceholder: {color: '#9CA3AF'},
});

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 30,
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionText: {fontSize: 15, color: '#374151'},
  optionTextActive: {color: '#4F46E5', fontWeight: '600'},
  empty: {alignItems: 'center', paddingVertical: 30},
  emptyText: {fontSize: 14, color: '#6B7280'},
});

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {paddingVertical: 4},
  backText: {fontSize: 16, color: '#4F46E5', fontWeight: '500'},
  headerTitle: {fontSize: 18, fontWeight: '600', color: '#111827'},
  spacer: {width: 60},
  form: {paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40},
  saveBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
});
