import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {createConnection, updateConnection} from '../../api/connections';
import {areasApi, boxesApi, splittersApi} from '../../api/network';
import {getPackages} from '../../api/subscribers';
import {getCompanies} from '../../api/companies';
import {Area, Company, Connection, DistributionBox, Package, Splitter} from '../../types';
import AnimatedBackArrow from '../../components/AnimatedBackArrow';
import {GradientButton} from '../../components/GradientButton';
import OptionPickerSheet, {Option} from '../../components/OptionPickerSheet';
import {
  calcDiscountedAmount,
  formatPkr,
  monthlyPackageFee,
  packagePrice,
  resolvePackage,
} from '../../utils/connectionPricing';

const DISCOUNT_OPTIONS: Option[] = [
  {value: 'no_discount', label: 'No discount'},
  {value: 'quarter', label: 'Quarter'},
  {value: 'half', label: 'Half'},
  {value: 'full_free', label: 'Full Free'},
  {value: 'custom', label: 'Custom'},
];

const CONNECTION_TYPE_OPTIONS: Option[] = [
  {value: 'both', label: 'Both'},
  {value: 'internet', label: 'Internet'},
  {value: 'tv_cable', label: 'TV Cable'},
];

const STATUS_OPTIONS: Option[] = [
  {value: 'active', label: 'Active'},
  {value: 'inactive', label: 'Inactive'},
  {value: 'deactivated', label: 'Deactivated'},
  {value: 'suspended', label: 'Suspended'},
];

type PickerKey =
  | 'sublocality'
  | 'connectionProvider'
  | 'connectionType'
  | 'status'
  | 'boxNumber'
  | 'splitter'
  | 'packageCable'
  | 'discount'
  | 'packageInternet'
  | 'sameDiscount';

export default function SubscriberFormScreen({route, navigation}: any) {
  const existing: Connection | null = route.params?.connection || null;
  const isEdit = !!existing;

  const [areas, setAreas] = useState<Area[]>([]);
  const [boxes, setBoxes] = useState<DistributionBox[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [splitters, setSplitters] = useState<Splitter[]>([]);

  const [internetId, setInternetId] = useState(existing?.internetId || '');
  const [sublocalityId, setSublocalityId] = useState(existing?.sublocalityId || '');
  const [name, setName] = useState(existing?.name || '');
  const [address, setAddress] = useState(existing?.address || '');
  const [cell, setCell] = useState(existing?.cell || '');
  const [mobile, setMobile] = useState(existing?.mobile || '');
  const [installationAmount, setInstallationAmount] = useState(
    existing?.installationAmount?.toString() || '0',
  );
  const [otherAmount, setOtherAmount] = useState(existing?.otherAmount?.toString() || '0');
  const [installationDate, setInstallationDate] = useState(existing?.installationDate || '');
  const [rechargeDate, setRechargeDate] = useState(existing?.rechargeDate || '');
  const [connectionProvider, setConnectionProvider] = useState(existing?.connectionProvider || '');
  const [connectionType, setConnectionType] = useState(existing?.connectionType || 'both');
  const [status, setStatus] = useState(existing?.status || 'active');
  const [boxNumber, setBoxNumber] = useState(existing?.boxNumber || '');
  const [splitterId, setSplitterId] = useState(existing?.splitterId || '');
  const [splitterPort, setSplitterPort] = useState(
    existing?.splitterPort?.toString() || '0',
  );
  const [packageCable, setPackageCable] = useState(existing?.packageCable || '');
  const [discount, setDiscount] = useState(existing?.discount || '');
  const [amount, setAmount] = useState(existing?.amount?.toString() || '0');
  const [packageInternet, setPackageInternet] = useState(existing?.packageInternet || '');
  const [sameDiscount, setSameDiscount] = useState(existing?.sameDiscount || '');
  const [sameAmount, setSameAmount] = useState(existing?.sameAmount?.toString() || '0');
  const [createBalance, setCreateBalance] = useState(!!existing?.createBalance);
  const [balanceDays, setBalanceDays] = useState(existing?.balanceDays?.toString() || '0');

  const [cablePkgId, setCablePkgId] = useState<string | undefined>();
  const [internetPkgId, setInternetPkgId] = useState<string | undefined>();
  const [picker, setPicker] = useState<PickerKey | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [areasData, boxesData, packagesData, companiesData, splittersData] =
          await Promise.all([
            areasApi.list(),
            boxesApi.list(),
            getPackages(),
            getCompanies(),
            splittersApi.list(),
          ]);
        if (cancelled) {
          return;
        }
        setAreas(areasData);
        setBoxes(boxesData);
        setPackages(packagesData);
        setCompanies(companiesData);
        setSplitters(splittersData);
      } catch {
        if (!cancelled) {
          Alert.alert('Error', 'Failed to load form options');
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const showCable = connectionType === 'both' || connectionType === 'tv_cable';
  const showInternet = connectionType === 'both' || connectionType === 'internet';
  const isCableDisabled = !showCable;
  const isInternetDisabled = !showInternet;

  const cablePackages = useMemo(
    () => packages.filter(p => p.packageType === 'TV Cable'),
    [packages],
  );
  const internetPackages = useMemo(
    () => packages.filter(p => p.packageType === 'Internet'),
    [packages],
  );

  const selectedCablePkg = resolvePackage(packages, packageCable, cablePkgId);
  const selectedInternetPkg = resolvePackage(packages, packageInternet, internetPkgId);

  const cablePackagePrice = packagePrice(selectedCablePkg);
  const internetPackagePrice = packagePrice(selectedInternetPkg);

  // Keep the derived amount in sync when a non-custom discount is chosen,
  // mirroring the web form's auto-calculation effects.
  useEffect(() => {
    if (discount === 'custom') {
      return;
    }
    if (showCable && cablePackagePrice > 0) {
      setAmount(String(calcDiscountedAmount(cablePackagePrice, discount)));
    }
  }, [cablePackagePrice, discount, showCable]);

  useEffect(() => {
    if (sameDiscount === 'custom') {
      return;
    }
    if (showInternet && internetPackagePrice > 0) {
      setSameAmount(String(calcDiscountedAmount(internetPackagePrice, sameDiscount)));
    }
  }, [internetPackagePrice, sameDiscount, showInternet]);

  const amountNum = parseFloat(amount) || 0;
  const sameAmountNum = parseFloat(sameAmount) || 0;
  const installationAmountNum = parseFloat(installationAmount) || 0;
  const otherAmountNum = parseFloat(otherAmount) || 0;
  const balanceDaysNum = parseInt(balanceDays, 10) || 0;

  const packageFeeTotal = monthlyPackageFee(connectionType, amountNum, sameAmountNum);
  // Opening balance = package fee prorated for the remaining days of the month.
  const openingBalance =
    !createBalance || !(balanceDaysNum > 0)
      ? 0
      : Math.round((packageFeeTotal / 30) * balanceDaysNum * 100) / 100;

  const totalAmount =
    amountNum + sameAmountNum + installationAmountNum + otherAmountNum;

  const areaOptions: Option[] = areas.map(a => ({
    value: a.id,
    label: a.subLocality || a.locality || a.id.slice(0, 8),
  }));
  const boxOptions: Option[] = boxes.map(b => ({value: b.name, label: b.name}));
  const providerOptions: Option[] = companies.map(c => ({value: c.name, label: c.name}));
  const splitterOptions: Option[] = splitters
    .filter(s => s.availablePorts > 0 || s.id === existing?.splitterId)
    .map(s => ({
      value: s.id,
      label: `${s.name} (${s.availablePorts}/${s.totalPorts} ports free)`,
    }));
  const cablePackageOptions: Option[] = cablePackages.map(p => ({
    value: p.id,
    label: packagePrice(p) > 0 ? `${p.name} — PKR ${packagePrice(p)}` : p.name,
  }));
  const internetPackageOptions: Option[] = internetPackages.map(p => ({
    value: p.id,
    label: packagePrice(p) > 0 ? `${p.name} — PKR ${packagePrice(p)}` : p.name,
  }));

  const selectedSplitter = splitters.find(s => s.id === splitterId);
  const maxPorts = selectedSplitter?.totalPorts || 0;

  const pickerTitle = ((): string => {
    switch (picker) {
      case 'sublocality':
        return 'Sublocality';
      case 'connectionProvider':
        return 'Connection Provider';
      case 'connectionType':
        return 'Connection Type';
      case 'status':
        return 'Status';
      case 'boxNumber':
        return 'Box Number';
      case 'splitter':
        return 'Splitter';
      case 'packageCable':
        return 'Cable Package';
      case 'discount':
        return 'Discount';
      case 'packageInternet':
        return 'Internet Package';
      case 'sameDiscount':
        return 'Internet Discount';
      default:
        return '';
    }
  })();

  const pickerValue = ((): string => {
    switch (picker) {
      case 'sublocality':
        return sublocalityId;
      case 'connectionProvider':
        return connectionProvider;
      case 'connectionType':
        return connectionType;
      case 'status':
        return status;
      case 'boxNumber':
        return boxNumber;
      case 'splitter':
        return splitterId;
      case 'packageCable':
        return cablePkgId ?? (packageCable ? selectedCablePkg?.id ?? '' : '');
      case 'discount':
        return discount;
      case 'packageInternet':
        return internetPkgId ?? (packageInternet ? selectedInternetPkg?.id ?? '' : '');
      case 'sameDiscount':
        return sameDiscount;
      default:
        return '';
    }
  })();

  const onPickerSelect = (value: string) => {
    switch (picker) {
      case 'sublocality':
        setSublocalityId(value);
        break;
      case 'connectionProvider':
        setConnectionProvider(value);
        break;
      case 'connectionType':
        setConnectionType(value);
        break;
      case 'status':
        setStatus(value);
        break;
      case 'boxNumber':
        setBoxNumber(value);
        break;
      case 'splitter':
        setSplitterId(value);
        setSplitterPort('0');
        break;
      case 'packageCable': {
        const pkg = packages.find(p => p.id === value);
        setCablePkgId(value);
        setPackageCable(pkg ? pkg.name : '');
        break;
      }
      case 'discount':
        setDiscount(value);
        break;
      case 'packageInternet': {
        const pkg = packages.find(p => p.id === value);
        setInternetPkgId(value);
        setPackageInternet(pkg ? pkg.name : '');
        break;
      }
      case 'sameDiscount':
        setSameDiscount(value);
        break;
      default:
        break;
    }
  };

  const handleSave = async () => {
    if (!internetId.trim()) {
      Alert.alert('Error', 'Internet ID is required');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    const port = parseInt(splitterPort, 10) || 0;
    if (port > 0 && (port < 1 || port > maxPorts)) {
      Alert.alert('Error', `Splitter Port must be between 1-${maxPorts}`);
      return;
    }

    const payload: Partial<Connection> = {
      internetId: internetId.trim(),
      sublocalityId: sublocalityId.trim(),
      name: name.trim(),
      address: address.trim(),
      cell: cell.trim(),
      mobile: mobile.trim(),
      installationAmount: installationAmountNum,
      otherAmount: otherAmountNum,
      installationDate: installationDate.trim(),
      rechargeDate: rechargeDate.trim(),
      connectionProvider: connectionProvider.trim(),
      connectionType,
      boxNumber: boxNumber.trim(),
      packageCable: packageCable.trim(),
      discount,
      amount: amountNum,
      packageInternet: packageInternet.trim(),
      createBalance,
      balanceDays: balanceDaysNum,
      sameDiscount,
      sameAmount: sameAmountNum,
      status,
      splitterId: splitterId.trim(),
      splitterPort: port,
      transactionId: existing?.transactionId || '',
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

  const discountLabel = (value: string, isInternet: boolean) => {
    const prefix = isInternet ? 'Internet ' : '';
    switch (value) {
      case 'quarter':
        return `${prefix}Quarterly Amount (25% off)`;
      case 'half':
        return `${prefix}Half Amount (50% off)`;
      case 'full_free':
        return 'Full Free (100% off)';
      case 'custom':
        return `${prefix}Amount`;
      default:
        return `${prefix}Amount`;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <View style={[styles.headerAccent, {backgroundColor: '#4F46E5'}]} />
        <AnimatedBackArrow onPress={() => navigation.goBack()} color="#4F46E5" />
        <Text style={styles.headerTitle}>{isEdit ? 'Edit' : 'Add'} Subscriber</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Field label="Internet ID *" value={internetId} onChangeText={setInternetId} placeholder="e.g., INT-001" />

        <SelectField
          label="Sublocality"
          value={sublocalityId}
          placeholder="Select sublocality"
          options={areaOptions}
          disabled={loading}
          onPress={() => setPicker('sublocality')}
        />

        <Field label="Name *" value={name} onChangeText={setName} placeholder="Full name" />
        <Field label="Address" value={address} onChangeText={setAddress} placeholder="Installation address" multiline />
        <Field label="Cell" value={cell} onChangeText={setCell} placeholder="e.g., 0300-1234567" keyboardType="phone-pad" />
        <Field label="Mobile" value={mobile} onChangeText={setMobile} placeholder="e.g., 0312-7654321" keyboardType="phone-pad" />

        <View style={fieldStyles.row}>
          <View style={fieldStyles.rowItem}>
            <Field
              label="Installation Amount"
              value={installationAmount}
              onChangeText={setInstallationAmount}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View style={fieldStyles.rowItem}>
            <Field
              label="Other Amount"
              value={otherAmount}
              onChangeText={setOtherAmount}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={fieldStyles.row}>
          <View style={fieldStyles.rowItem}>
            <Field
              label="Installation Date"
              value={installationDate}
              onChangeText={setInstallationDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
          <View style={fieldStyles.rowItem}>
            <Field
              label="Recharge Date"
              value={rechargeDate}
              onChangeText={setRechargeDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>

        <SelectField
          label="Connection Provider"
          value={connectionProvider}
          placeholder="Select provider"
          options={providerOptions}
          disabled={loading}
          onPress={() => setPicker('connectionProvider')}
        />

        <Text style={styles.label}>Connection Type</Text>
        <View style={styles.chipRow}>
          {CONNECTION_TYPE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, connectionType === opt.value && styles.chipActive]}
              disabled={loading}
              onPress={() => setConnectionType(opt.value)}>
              <Text style={[styles.chipText, connectionType === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <SelectField
          label="Status"
          value={status}
          placeholder="Select status"
          options={STATUS_OPTIONS}
          disabled={loading}
          onPress={() => setPicker('status')}
        />

        <SelectField
          label="Box Number"
          value={boxNumber}
          placeholder="Select box number"
          options={boxOptions}
          disabled={loading}
          onPress={() => setPicker('boxNumber')}
        />

        <SelectField
          label="Splitter"
          value={splitterId ? (splitterOptions.find(o => o.value === splitterId)?.label ?? '') : ''}
          placeholder="Select splitter"
          options={splitterOptions}
          disabled={loading}
          onPress={() => setPicker('splitter')}
        />

        {splitterId ? (
          <Field
            label={`Splitter Port (1-${maxPorts})`}
            value={splitterPort}
            onChangeText={setSplitterPort}
            placeholder="0"
            keyboardType="numeric"
          />
        ) : null}

        {/* Cable Information */}
        <View style={[styles.group, isCableDisabled && styles.groupDisabled]}>
          <View style={styles.groupHeader}>
            <View style={[styles.groupDot, {backgroundColor: '#F97316'}]} />
            <Text style={styles.groupTitle}>Cable Information</Text>
            {isCableDisabled ? (
              <Text style={styles.groupDisabledNote}>(Disabled - Internet only)</Text>
            ) : null}
          </View>

          <SelectField
            label="Package Cable"
            value={packageCable ? selectedCablePkg?.name ?? packageCable : ''}
            placeholder="Select cable package"
            options={cablePackageOptions}
            disabled={loading || isCableDisabled}
            onPress={() => setPicker('packageCable')}
          />

          <SelectField
            label="Discount"
            value={DISCOUNT_OPTIONS.find(o => o.value === discount)?.label ?? ''}
            placeholder="Select discount"
            options={DISCOUNT_OPTIONS}
            disabled={loading || isCableDisabled}
            onPress={() => setPicker('discount')}
          />

          <Field
            label={discountLabel(discount, false)}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            keyboardType="numeric"
            editable={!isCableDisabled && discount === 'custom'}
          />
          {discount !== 'custom' && discount !== 'no_discount' ? (
            <Text style={styles.hint}>
              Base: {cablePackagePrice} → {calcDiscountedAmount(cablePackagePrice, discount)}
            </Text>
          ) : null}
          {selectedCablePkg ? (
            <Text style={styles.hint}>
              {selectedCablePkg.name} fee = PKR {cablePackagePrice}
            </Text>
          ) : null}
        </View>

        {/* Internet Information */}
        <View style={[styles.group, isInternetDisabled && styles.groupDisabled]}>
          <View style={styles.groupHeader}>
            <View style={[styles.groupDot, {backgroundColor: '#3B82F6'}]} />
            <Text style={styles.groupTitle}>Internet Information</Text>
            {isInternetDisabled ? (
              <Text style={styles.groupDisabledNote}>(Disabled - Cable only)</Text>
            ) : null}
          </View>

          <SelectField
            label="Package Internet"
            value={packageInternet ? selectedInternetPkg?.name ?? packageInternet : ''}
            placeholder="Select internet package"
            options={internetPackageOptions}
            disabled={loading || isInternetDisabled}
            onPress={() => setPicker('packageInternet')}
          />

          <SelectField
            label="Internet Discount"
            value={DISCOUNT_OPTIONS.find(o => o.value === sameDiscount)?.label ?? ''}
            placeholder="Select discount"
            options={DISCOUNT_OPTIONS}
            disabled={loading || isInternetDisabled}
            onPress={() => setPicker('sameDiscount')}
          />

          <Field
            label={discountLabel(sameDiscount, true)}
            value={sameAmount}
            onChangeText={setSameAmount}
            placeholder="0"
            keyboardType="numeric"
            editable={!isInternetDisabled && sameDiscount === 'custom'}
          />
          {sameDiscount !== 'custom' && sameDiscount !== 'no_discount' ? (
            <Text style={styles.hint}>
              Base: {internetPackagePrice} → {calcDiscountedAmount(internetPackagePrice, sameDiscount)}
            </Text>
          ) : null}
          {selectedInternetPkg ? (
            <Text style={styles.hint}>
              {selectedInternetPkg.name} fee = PKR {internetPackagePrice}
            </Text>
          ) : null}
        </View>

        {selectedCablePkg && selectedInternetPkg ? (
          <View style={styles.totalBox}>
            <Text style={styles.totalTitle}>Total Amount</Text>
            <Text style={styles.totalText}>
              {selectedCablePkg.name} (PKR {amountNum}) + {selectedInternetPkg.name} (PKR
              {' '}{sameAmountNum}) + Installation (PKR {installationAmountNum}) + Other (PKR
              {' '}{otherAmountNum}) = PKR {totalAmount}
            </Text>
          </View>
        ) : null}

        <View style={styles.switchRow}>
          <View style={styles.switchLabelWrap}>
            <Text style={styles.label}>Create Balance</Text>
          </View>
          <Switch
            value={createBalance}
            onValueChange={setCreateBalance}
            trackColor={{false: '#D1D5DB', true: '#166534'}}
            thumbColor="#FFFFFF"
          />
        </View>

        {createBalance ? (
          <>
            <Field
              label="Balance Days"
              value={balanceDays}
              onChangeText={setBalanceDays}
              placeholder="0"
              keyboardType="numeric"
            />
            <Text style={styles.hint}>
              Opening balance: PKR {formatPkr(openingBalance)}
              {packageFeeTotal > 0 && balanceDaysNum > 0 ? (
                <Text> (PKR {packageFeeTotal} ÷ 30 × {balanceDaysNum} days)</Text>
              ) : null}
            </Text>
          </>
        ) : null}

        <GradientButton
          colors={['#166534', '#22c55e']}
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEdit ? 'Update Subscriber' : 'Add Subscriber'}
            </Text>
          )}
        </GradientButton>
      </ScrollView>

      <OptionPickerSheet
        visible={!!picker}
        title={pickerTitle}
        options={
          picker === 'sublocality'
            ? areaOptions
            : picker === 'connectionProvider'
            ? providerOptions
            : picker === 'connectionType'
            ? CONNECTION_TYPE_OPTIONS
            : picker === 'status'
            ? STATUS_OPTIONS
            : picker === 'boxNumber'
            ? boxOptions
            : picker === 'splitter'
            ? splitterOptions
            : picker === 'packageCable'
            ? cablePackageOptions
            : picker === 'discount'
            ? DISCOUNT_OPTIONS
            : picker === 'packageInternet'
            ? internetPackageOptions
            : DISCOUNT_OPTIONS
        }
        value={pickerValue}
        onSelect={onPickerSelect}
        onClose={() => setPicker(null)}
      />
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  multiline?: boolean;
  editable?: boolean;
}) {
  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[
          fieldStyles.input,
          multiline && fieldStyles.multiline,
          !editable && fieldStyles.inputDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        editable={editable}
      />
    </View>
  );
}

function SelectField({
  label,
  value,
  placeholder,
  options,
  onPress,
  disabled,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: Option[];
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TouchableOpacity
        style={[
          fieldStyles.input,
          (disabled || options.length === 0) && fieldStyles.inputDisabled,
        ]}
        onPress={onPress}
        disabled={disabled || options.length === 0}
        activeOpacity={0.7}>
        <Text style={[fieldStyles.selectText, !value && fieldStyles.placeholder]} numberOfLines={1}>
          {value || (options.length === 0 ? 'No options available' : placeholder)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  group: {marginBottom: 14},
  row: {flexDirection: 'row', gap: 10},
  rowItem: {flex: 1},
  label: {fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6},
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827',
  },
  inputDisabled: {backgroundColor: '#F3F4F6', color: '#9CA3AF'},
  selectText: {fontSize: 15, color: '#111827'},
  placeholder: {color: '#9CA3AF'},
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
  group: {
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 14, marginBottom: 14,
  },
  groupDisabled: {opacity: 0.4},
  groupHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  groupDot: {width: 8, height: 8, borderRadius: 4, marginRight: 8},
  groupTitle: {fontSize: 12, fontWeight: '700', color: '#6B7280', letterSpacing: 0.6, textTransform: 'uppercase'},
  groupDisabledNote: {fontSize: 11, color: '#9CA3AF', marginLeft: 'auto'},
  hint: {fontSize: 11, color: '#6B7280', marginBottom: 8, marginTop: -4},
  totalBox: {
    backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 14, marginBottom: 14,
  },
  totalTitle: {fontSize: 14, fontWeight: '600', color: '#111827'},
  totalText: {fontSize: 11, color: '#6B7280', marginTop: 4},
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
  },
  switchLabelWrap: {flex: 1},
  saveBtn: {borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 10},
  saveBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
});