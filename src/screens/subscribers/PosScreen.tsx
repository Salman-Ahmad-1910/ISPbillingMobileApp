import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import {useFocusEffect, useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Landmark,
  CircleDollarSign,
  Users,
  UserRound,
  Handshake,
  Receipt,
  CalendarDays,
  X,
  Loader,
  Check,
  ChevronDown,
} from 'lucide-react-native';
import {getPurchasedProducts, getDealers, getInstallmentForCustomer, createSale, createInstallmentSale, payInstallment, PosProduct, Dealer} from '../../api/pos';
import {getConnections} from '../../api/connections';
import {getCustomers, getInstallmentPlans} from '../../api/subscribers';
import {Customer, Connection, InstallmentPlan} from '../../types';
import {GradientView} from '../../components/GradientView';

const fmtPKR = (n: number) => new Intl.NumberFormat('en-US').format(Number(n) || 0);
const fmtPKR2 = (n: number) =>
  new Intl.NumberFormat('en-US', {minimumFractionDigits: 2}).format(Number(n) || 0);

type CustomerType = 'subscriber' | 'customer' | 'dealer' | '';

interface CartItem {
  product: PosProduct;
  quantity: number;
}

interface DropdownOption {
  id: string;
  name: string;
  secondary?: string;
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

function PosDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="posHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#F59E0B" stopOpacity={1} />
            <Stop offset="0.7" stopColor="#F97316" stopOpacity={0.6} />
            <Stop offset="1" stopColor="#F97316" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#posHeroGrad)" />
      </Svg>
    </View>
  );
}

export default function PosScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();

  const [products, setProducts] = useState<PosProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [subscribers, setSubscribers] = useState<Connection[]>([]);
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const [customerType, setCustomerType] = useState<CustomerType>('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');

  const [isInstallment, setIsInstallment] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planQuery, setPlanQuery] = useState('');
  const [existingInstallment, setExistingInstallment] = useState<any>(null);
  const [fetchingInstallment, setFetchingInstallment] = useState(false);
  const [pendingSaleItems, setPendingSaleItems] = useState<any[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank'>('cash');
  const [discount, setDiscount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderVisible, setOrderVisible] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const openDrawer = () => {
    nav.dispatch(DrawerActions.openDrawer());
  };

  const toggleDropdown = (key: string) => {
    setOpenDropdown(prev => (prev === key ? null : key));
  };

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      const [prod, cust, deal, conn, plan] = await Promise.all([
        getPurchasedProducts(),
        getCustomers().catch(() => [] as Customer[]),
        getDealers().catch(() => [] as Dealer[]),
        getConnections().catch(() => [] as Connection[]),
        getInstallmentPlans().catch(() => [] as InstallmentPlan[]),
      ]);
      setProducts((prod || []).map(p => ({
        ...p,
        stock: Number(p.stock) || 0,
        price: Number(p.price) || 0,
        taxPercent: Number(p.taxPercent) || 0,
      })));
      setCustomers(cust || []);
      setDealers(deal || []);
      setSubscribers(conn || []);
      setPlans(plan || []);
    } catch {
      Alert.alert('Error', 'Failed to load POS data');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {fetchData();}, [fetchData]));

  const posProducts = useMemo(() => products, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return posProducts;
    return posProducts.filter(p => (p.name || '').toLowerCase().includes(q));
  }, [posProducts, searchTerm]);

  const customerList: DropdownOption[] = useMemo(
    () => customers.map(c => ({id: c.id, name: c.name, secondary: c.phone})),
    [customers],
  );

  const subscriberList: DropdownOption[] = useMemo(
    () =>
      subscribers.map(s => ({
        id: s.id,
        name: `${String(s.id || '').slice(0, 8)} | ${s.name}`,
        secondary: s.cell || s.mobile || '',
      })),
    [subscribers],
  );

  const dealerList: DropdownOption[] = useMemo(
    () => dealers.map(d => ({id: d.id, name: d.name, secondary: d.phone})),
    [dealers],
  );

  const planList: DropdownOption[] = useMemo(
    () =>
      plans.map(p => ({
        id: p.id,
        name: `${p.name} (${p.installments} installments, +${p.percentageIncrease}%)`,
      })),
    [plans],
  );

  const currentOptions: DropdownOption[] = useMemo(() => {
    if (customerType === 'subscriber') return subscriberList;
    if (customerType === 'customer') return customerList;
    if (customerType === 'dealer') return dealerList;
    return [];
  }, [customerType, subscriberList, customerList, dealerList]);

  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return null;
    return plans.find(p => p.id === selectedPlanId) || null;
  }, [selectedPlanId, plans]);

  // Fetch existing installment when a customer is selected
  useEffect(() => {
    if (customerType === 'subscriber' && customerId) {
      setFetchingInstallment(true);
      getInstallmentForCustomer(customerId)
        .then(payload => {
          const inst = payload?.installment || payload;
          if (inst && inst.id) {
            if (!inst.installmentAmount || Number(inst.installmentAmount) === 0) {
              inst.installmentAmount =
                (Number(inst.totalAmount) || 0) / (Number(inst.totalInstallments) || 1);
            }
            setExistingInstallment(inst);
            setIsInstallment(true);
            setSelectedPlanId(inst.installmentPlanId || '');
            setPendingSaleItems(payload?.saleItems || []);
          } else {
            setExistingInstallment(null);
            setPendingSaleItems([]);
          }
        })
        .catch(() => {
          setExistingInstallment(null);
          setPendingSaleItems([]);
        })
        .finally(() => setFetchingInstallment(false));
    } else {
      setExistingInstallment(null);
      setPendingSaleItems([]);
    }
  }, [customerType, customerId]);

  // Populate cart with original sale items when an existing installment is found
  useEffect(() => {
    if (existingInstallment && pendingSaleItems.length > 0 && posProducts.length > 0) {
      const items: CartItem[] = pendingSaleItems
        .map((si: any) => {
          const product = posProducts.find(p => p.id === si.productId);
          return {
            product: product || {
              id: si.productId,
              purchaseItemId: si.productId,
              name: si.productName,
              price: Number(si.price) || 0,
              stock: 0,
              taxPercent: Number(si.taxPercent) || 0,
            },
            quantity: Number(si.quantity) || 0,
          };
        })
        .filter((ci: CartItem) => ci.product && ci.quantity > 0);
      if (items.length > 0) {
        setCart(items);
      }
      setPendingSaleItems([]);
    }
  }, [existingInstallment, pendingSaleItems, posProducts]);

  const selectCustomerType = (type: CustomerType) => {
    setCustomerType(type);
    setCustomerId('');
    setCustomerName('');
    setCustomerQuery('');
    setIsInstallment(false);
    setSelectedPlanId('');
    setExistingInstallment(null);
    setPendingSaleItems([]);
  };

  const handleSelectCustomer = (id: string) => {
    const option = currentOptions.find(o => o.id === id);
    setCustomerId(id);
    setCustomerName(option?.name || '');
    setCustomerQuery('');
    setIsInstallment(false);
    setSelectedPlanId('');
    setExistingInstallment(null);
  };

  const clearCustomer = () => {
    setCustomerType('');
    setCustomerId('');
    setCustomerName('');
    setCustomerQuery('');
    setIsInstallment(false);
    setSelectedPlanId('');
    setExistingInstallment(null);
    setPendingSaleItems([]);
  };

  const addToCart = (product: PosProduct) => {
    if (!product.stock || product.stock <= 0) {
      Alert.alert('Out of Stock', `${product.name} is currently out of stock.`);
      return;
    }
    setCart(current => {
      const existing = current.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          Alert.alert('Stock Limit Reached', `You cannot add more of ${product.name}.`);
          return current;
        }
        return current.map(i =>
          i.product.id === product.id ? {...i, quantity: i.quantity + 1} : i,
        );
      }
      return [...current, {product, quantity: 1}];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(current => current.filter(i => i.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    const product = posProducts.find(p => p.id === productId);
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    if (product && quantity > product.stock) {
      Alert.alert('Stock Limit Exceeded', `Only ${product.stock} units of ${product.name} available.`);
      quantity = product.stock;
    }
    setCart(current =>
      current.map(i => (i.product.id === productId ? {...i, quantity} : i)),
    );
  };

  const subtotal = useMemo(
    () => cart.reduce((acc, i) => acc + (Number(i.product.price) || 0) * i.quantity, 0),
    [cart],
  );

  const tax = useMemo(
    () =>
      cart.reduce(
        (acc, i) =>
          acc + (Number(i.product.price) || 0) * i.quantity * ((Number(i.product.taxPercent) || 0) / 100),
        0,
      ),
    [cart],
  );

  const percentageIncrease = useMemo(() => {
    if (!isInstallment) return 0;
    const plan = existingInstallment
      ? plans.find((p: InstallmentPlan) => p.id === existingInstallment.installmentPlanId)
      : selectedPlan;
    return plan ? (Number(plan.percentageIncrease) || 0) : 0;
  }, [isInstallment, existingInstallment, selectedPlan, plans]);

  const increaseAmount = subtotal * (percentageIncrease / 100);
  const adjustedSubtotal = subtotal + increaseAmount;
  const discountValue = parseFloat(discount) || 0;
  const total = adjustedSubtotal + tax - discountValue;

  const installmentDetails = useMemo(() => {
    if (!isInstallment) return null;
    if (existingInstallment) {
      const paid = Number(existingInstallment.paidInstallments) || 0;
      const totalInst = Number(existingInstallment.totalInstallments) || 0;
      const remaining = totalInst - paid;
      const totalAmount = Number(existingInstallment.totalAmount) || 0;
      const instAmount = Number(existingInstallment.installmentAmount) || (totalAmount / (totalInst || 1));
      return {
        planName: existingInstallment.planName || 'Installment Plan',
        amountPerInstallment: instAmount,
        totalInstallments: totalInst,
        paidInstallments: paid,
        remainingInstallments: remaining,
        paidMoney: paid * instAmount,
        remainingMoney: remaining * instAmount,
        totalWithIncrease: totalAmount,
      };
    }
    if (selectedPlan) {
      const pct = Number(selectedPlan.percentageIncrease) || 0;
      const totalWithIncrease = subtotal * (1 + pct / 100);
      const amountPerInstallment =
        selectedPlan.installments > 0 ? totalWithIncrease / selectedPlan.installments : 0;
      return {
        planName: selectedPlan.name,
        amountPerInstallment,
        totalInstallments: selectedPlan.installments || 0,
        paidInstallments: 0,
        remainingInstallments: selectedPlan.installments || 0,
        paidMoney: 0,
        remainingMoney: totalWithIncrease,
        totalWithIncrease,
      };
    }
    return null;
  }, [isInstallment, existingInstallment, selectedPlan, subtotal]);

  const cartItemsForApi = (serialNumbers: boolean) =>
    cart.map(i => ({
      productId: i.product.id,
      productName: i.product.name,
      quantity: i.quantity,
      price: Number(i.product.price) || 0,
      taxPercent: Number(i.product.taxPercent) || 0,
      serialNumber: serialNumbers ? i.product.serialNumber || '' : '',
    }));

  const resetOrder = () => {
    setCart([]);
    setCustomerType('');
    setCustomerId('');
    setCustomerName('');
    setCustomerQuery('');
    setIsInstallment(false);
    setSelectedPlanId('');
    setExistingInstallment(null);
    setPendingSaleItems([]);
    setDiscount('');
    setPaymentMethod('cash');
  };

  const handleCompletePayment = async () => {
    if (!customerId) {
      Alert.alert('Customer not selected', 'Please select a customer to proceed.');
      return;
    }
    if (!paymentMethod) {
      Alert.alert('Payment method not selected', 'Please select a payment method.');
      return;
    }
    if (!isInstallment && cart.length === 0) {
      Alert.alert('Cart is empty', 'Please add at least one product.');
      return;
    }

    setIsProcessing(true);
    try {
      if (isInstallment && selectedPlanId && !existingInstallment) {
        await createInstallmentSale({
          subscriberId: customerId,
          subscriberName: customerName || 'Unknown',
          installmentPlanId: selectedPlanId,
          subtotal,
          taxAmount: tax,
          paymentMethod,
          date: new Date().toISOString(),
          items: cartItemsForApi(true),
        });
        Alert.alert('Installment Sale Created!', 'First installment has been paid.');
      } else if (isInstallment && existingInstallment) {
        const payAmount =
          Number(existingInstallment.installmentAmount) ||
          (Number(existingInstallment.totalAmount) / Number(existingInstallment.totalInstallments)) ||
          0;
        if (payAmount <= 0) {
          Alert.alert('Invalid Amount', 'Installment amount is zero.');
          return;
        }
        await payInstallment(existingInstallment.id, {
          amount: payAmount,
          date: new Date().toISOString(),
          method: paymentMethod,
        });
        Alert.alert(
          'Installment Paid!',
          `PKR ${fmtPKR(payAmount)} paid. Next installment: #${(Number(existingInstallment.paidInstallments) || 0) + 1}`,
        );
        const refreshed = await getInstallmentForCustomer(customerId).catch(() => null);
        const inst = refreshed?.installment || refreshed;
        if (inst && inst.id) {
          setExistingInstallment(inst);
        } else {
          setExistingInstallment(null);
          setIsInstallment(false);
        }
      } else {
        await createSale({
          subscriberId: customerId,
          subscriberName: customerName || 'Unknown',
          totalAmount: total,
          taxAmount: tax,
          paymentMethod,
          date: new Date().toISOString(),
          isInstallment: false,
          items: cartItemsForApi(true),
        });
        Alert.alert('Sale Completed!', 'The transaction has been recorded successfully.');
      }
      setOrderVisible(false);
      resetOrder();
      fetchData(true);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || err.response?.data?.error || 'Failed to process sale',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHoldBill = async () => {
    if (!customerId) {
      Alert.alert('Customer not selected', 'Please select a customer to hold a bill.');
      return;
    }
    setIsProcessing(true);
    try {
      await createSale({
        subscriberId: customerId,
        subscriberName: customerName || 'Unknown',
        totalAmount: total,
        taxAmount: tax,
        paymentMethod: 'hold',
        date: new Date().toISOString(),
        status: 'hold',
        discount: discountValue,
        items: cartItemsForApi(false),
      });
      Alert.alert('Bill On Hold', 'This bill has been held and can be paid later.');
      setOrderVisible(false);
      resetOrder();
      fetchData(true);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || err.response?.data?.error || 'Failed to hold bill',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const renderProduct = ({item}: {item: PosProduct}) => {
    const inCart = cart.find(i => i.product.id === item.id)?.quantity || 0;
    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.7}
        onPress={() => addToCart(item)}>
        <View style={styles.productImage}>
          <Text style={styles.productImageIcon}>📦</Text>
          <View
            style={[
              styles.stockBadge,
              item.stock > 0 ? styles.stockBadgeOk : styles.stockBadgeOut,
            ]}>
            <Text style={styles.stockBadgeText}>
              {item.stock > 0 ? `Stock: ${item.stock}` : 'Out of Stock'}
            </Text>
          </View>
          {inCart > 0 && (
            <View style={styles.cartCountBadge}>
              <Text style={styles.cartCountText}>{inCart}</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productPrice}>PKR {fmtPKR(item.price)}</Text>
          {item.serialNumber ? (
            <Text style={styles.productSerial} numberOfLines={1}>
              SN: {item.serialNumber}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderDropdown = (
    label: string,
    Icon: any,
    options: DropdownOption[],
    selectedId: string,
    onSelect: (id: string) => void,
    query: string,
    setQuery: (q: string) => void,
    color: string,
    open: boolean,
    toggle: () => void,
    placeholder: string,
  ) => (
    <View style={styles.dropdownWrap}>
      <View style={styles.dropdownLabelRow}>
        <Icon size={14} color={color} />
        <Text style={styles.dropdownLabel}>
          {label}
          {options.find(o => o.id === selectedId)
            ? ` (${options.find(o => o.id === selectedId)!.name})`
            : ''}
        </Text>
      </View>
      <TouchableOpacity style={styles.dropdownInput} onPress={toggle}>
        {selectedId && !open ? (
          <Text style={styles.dropdownInputText}>
            {options.find(o => o.id === selectedId)?.name}
          </Text>
        ) : (
          <TextInput
            style={styles.dropdownInputField}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={open ? query : ''}
            onChangeText={text => {
              setQuery(text);
              if (!open) toggle();
            }}
            onFocus={toggle}
          />
        )}
        <ChevronDown size={16} color="#6B7280" />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownList}>
          {options.length === 0 && (
            <Text style={styles.dropdownEmpty}>No options available</Text>
          )}
          {filteredOptionsFor(options, query).map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.dropdownItem, selectedId === item.id && styles.dropdownItemActive]}
              onPress={() => {
                onSelect(item.id);
                toggle();
              }}>
              <View style={styles.dropdownItemTextWrap}>
                <Text style={styles.dropdownItemName}>{item.name}</Text>
                {item.secondary ? (
                  <Text style={styles.dropdownItemSecondary}>{item.secondary}</Text>
                ) : null}
              </View>
              {selectedId === item.id && <Check size={16} color="#10B981" />}
            </TouchableOpacity>
          ))}
          {options.length > 0 && filteredOptionsFor(options, query).length === 0 && (
            <Text style={styles.dropdownEmpty}>No results found</Text>
          )}
        </View>
      )}
    </View>
  );

  const filteredOptionsFor = (options: DropdownOption[], query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o =>
      (o.name || '').toLowerCase().includes(q) ||
      (o.secondary || '').toLowerCase().includes(q),
    );
  };

  const paymentChip = (
    method: 'cash' | 'card' | 'bank',
    Icon: any,
    label: string,
  ) => (
    <TouchableOpacity
      style={[styles.paymentChip, paymentMethod === method && styles.paymentChipActive]}
      onPress={() => setPaymentMethod(method)}>
      <Icon size={15} color={paymentMethod === method ? '#FFFFFF' : '#374151'} />
      <Text
        style={[
          styles.paymentChipText,
          paymentMethod === method && styles.paymentChipTextActive,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GradientView colors={['#166534', '#22c55e']} style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Point of Sale</Text>
          <Text style={styles.headerCount}>POS Counter</Text>
        </View>
      </GradientView>

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={styles.heroHeader}>
              <GradientView colors={['#F59E0B', '#F97316']} style={styles.heroIconBox}>
                <ShoppingCart size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Point of Sale (POS)</Text>
                <Text style={styles.heroSubtitle}>
                  A retail counter for quick billing, recharges, and device sales.
                </Text>
              </View>
            </View>

            <PosDivider />

            <View style={styles.searchBox}>
              <Search size={16} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
                placeholderTextColor="#9CA3AF"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>Try adjusting your search</Text>
          </View>
        }
      />

      {cart.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomCartInfo}>
            <View style={styles.bottomCartIcon}>
              <ShoppingCart size={18} color="#FFFFFF" />
              {cartItemCount > 0 && (
                <View style={styles.bottomCartCount}>
                  <Text style={styles.bottomCartCountText}>{cartItemCount}</Text>
                </View>
              )}
            </View>
            <View>
              <Text style={styles.bottomCartItems}>
                {cartItemCount} item{cartItemCount !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.bottomCartTotal}>PKR {fmtPKR(isInstallment ? subtotal * (1 + percentageIncrease / 100) : total)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.viewOrderBtn}
            onPress={() => setOrderVisible(true)}>
            <Text style={styles.viewOrderBtnText}>View Order</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Order Details Modal */}
      <Modal
        visible={orderVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOrderVisible(false)}>
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.detailSheetHeader}>
              <View style={styles.orderTitleRow}>
                <ShoppingCart size={18} color="#D97706" />
                <Text style={styles.detailSheetTitle}>Order Details</Text>
              </View>
              <TouchableOpacity onPress={() => setOrderVisible(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.detailContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {/* Sell To */}
              <View style={styles.sellToSection}>
                <Text style={styles.sectionLabel}>Sell To</Text>
                <View style={styles.sellToRow}>
                  {([
                    {type: 'subscriber' as CustomerType, label: 'Subscriber', Icon: Users, color: '#3B82F6'},
                    {type: 'customer' as CustomerType, label: 'Others', Icon: UserRound, color: '#8B5CF6'},
                    {type: 'dealer' as CustomerType, label: 'Dealer', Icon: Handshake, color: '#D97706'},
                  ]).map(({type, label, Icon, color}) => {
                    const active = customerType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[styles.sellToChip, active && styles.sellToChipActive]}
                        onPress={() => (active ? selectCustomerType('') : selectCustomerType(type))}>
                        <Icon size={14} color={active ? '#FFFFFF' : color} />
                        <Text
                          style={[
                            styles.sellToChipText,
                            active && styles.sellToChipTextActive,
                          ]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Customer selector */}
              {customerType !== '' && (
                <View style={styles.block}>
                  {customerType === 'subscriber' &&
                    renderDropdown(
                      'Subscriber',
                      Users,
                      subscriberList,
                      customerId,
                      handleSelectCustomer,
                      customerQuery,
                      setCustomerQuery,
                      '#3B82F6',
                      openDropdown === 'subscriber',
                      () => toggleDropdown('subscriber'),
                      `${subscriberList.length} subscribers available...`,
                    )}
                  {customerType === 'customer' &&
                    renderDropdown(
                      'Others',
                      UserRound,
                      customerList,
                      customerId,
                      handleSelectCustomer,
                      customerQuery,
                      setCustomerQuery,
                      '#8B5CF6',
                      openDropdown === 'customer',
                      () => toggleDropdown('customer'),
                      `${customerList.length} customers available...`,
                    )}
                  {customerType === 'dealer' &&
                    renderDropdown(
                      'Dealer',
                      Handshake,
                      dealerList,
                      customerId,
                      handleSelectCustomer,
                      customerQuery,
                      setCustomerQuery,
                      '#D97706',
                      openDropdown === 'dealer',
                      () => toggleDropdown('dealer'),
                      `${dealerList.length} dealers available...`,
                    )}
                </View>
              )}

              {customerType !== '' && customerId && (
                <View style={styles.selectedCustomerRow}>
                  <View style={styles.selectedCustomerInfo}>
                    <Text style={styles.selectedCustomerName} numberOfLines={1}>
                      {customerName}
                    </Text>
                    <View style={styles.selectedCustomerBadge}>
                      <Text style={styles.selectedCustomerBadgeText}>{customerType}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={clearCustomer}>
                    <Text style={styles.clearText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Installment Sale */}
              {customerType !== '' && customerId && (
                <View style={styles.block}>
                  <TouchableOpacity
                    style={styles.installmentToggleRow}
                    onPress={() => {
                      setIsInstallment(prev => {
                        const next = !prev;
                        if (!next) {
                          setSelectedPlanId('');
                          setExistingInstallment(null);
                        }
                        return next;
                      });
                    }}>
                    <View
                      style={[
                        styles.checkbox,
                        isInstallment && styles.checkboxChecked,
                      ]}>
                      {isInstallment && <Check size={12} color="#FFFFFF" />}
                    </View>
                    <Receipt size={14} color="#059669" />
                    <Text style={styles.installmentToggleText}>Installment Sale</Text>
                  </TouchableOpacity>

                  {isInstallment && !existingInstallment &&
                    renderDropdown(
                      'Installment Plan',
                      CalendarDays,
                      planList,
                      selectedPlanId,
                      id => {
                        setSelectedPlanId(id);
                      },
                      planQuery,
                      setPlanQuery,
                      '#059669',
                      openDropdown === 'plan',
                      () => toggleDropdown('plan'),
                      'Select installment plan...',
                    )}

                  {fetchingInstallment && (
                    <View style={styles.checkingRow}>
                      <ActivityIndicator size="small" color="#059669" />
                      <Text style={styles.checkingText}>Checking installment status...</Text>
                    </View>
                  )}

                  {isInstallment && !selectedPlanId && !existingInstallment && !fetchingInstallment && (
                    <Text style={styles.planHint}>Select an installment plan to continue</Text>
                  )}
                </View>
              )}

              <View style={styles.dividerH} />

              {/* Cart Items */}
              <Text style={styles.sectionLabel}>Cart Items</Text>
              {cart.length > 0 ? (
                cart.map(item => (
                  <View key={item.product.id} style={styles.cartItemRow}>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName} numberOfLines={1}>
                        {item.product.name}
                      </Text>
                      {item.product.serialNumber ? (
                        <Text style={styles.cartItemSerial} numberOfLines={1}>
                          SN / MAC: {item.product.serialNumber}
                        </Text>
                      ) : null}
                      <Text style={styles.cartItemPrice}>PKR {fmtPKR(item.product.price)}</Text>
                      <View style={styles.qtyStepper}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => updateCartQuantity(item.product.id, item.quantity - 1)}>
                          <Minus size={14} color="#374151" />
                        </TouchableOpacity>
                        <TextInput
                          style={styles.qtyInput}
                          keyboardType="numeric"
                          value={String(item.quantity)}
                          onChangeText={text => {
                            const n = parseInt(text, 10);
                            updateCartQuantity(item.product.id, isNaN(n) ? 0 : n);
                          }}
                        />
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => updateCartQuantity(item.product.id, item.quantity + 1)}>
                          <Plus size={14} color="#374151" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.cartItemRight}>
                      <Text style={styles.cartItemTotal}>
                        PKR {fmtPKR((Number(item.product.price) || 0) * item.quantity)}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeFromCart(item.product.id)}>
                        <Trash2 size={15} color="#E11D48" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyCartText}>Cart is empty</Text>
              )}

              {cart.length > 0 && (
                <View style={styles.footerBlock}>
                  {/* Installment Info */}
                  {isInstallment && installmentDetails && (
                    <View style={styles.installmentInfoCard}>
                      <View style={styles.installmentInfoHeader}>
                        <View style={styles.installmentInfoTitleRow}>
                          <Receipt size={14} color="#059669" />
                          <Text style={styles.installmentInfoTitle}>
                            {installmentDetails.planName}
                          </Text>
                        </View>
                        <View style={styles.installmentBadge}>
                          <Text style={styles.installmentBadgeText}>Installment</Text>
                        </View>
                      </View>
                      <View style={styles.installmentGrid}>
                        <View style={styles.installmentCol}>
                          <Text style={styles.installmentColLabel}>Each Installment</Text>
                          <Text style={styles.installmentColValue}>
                            PKR {fmtPKR(installmentDetails.amountPerInstallment)}
                          </Text>
                        </View>
                        <View style={styles.installmentCol}>
                          <Text style={styles.installmentColLabel}>Total Installments</Text>
                          <Text style={styles.installmentColValue}>
                            {installmentDetails.totalInstallments}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.installmentGrid}>
                        <View style={styles.paidBox}>
                          <Text style={styles.paidLabel}>Paid</Text>
                          <Text style={styles.paidValue}>
                            {installmentDetails.paidInstallments}/{installmentDetails.totalInstallments}
                          </Text>
                          <Text style={styles.paidMoney}>
                            PKR {fmtPKR(installmentDetails.paidMoney)}
                          </Text>
                        </View>
                        <View style={styles.remainingBox}>
                          <Text style={styles.remainingLabel}>Remaining</Text>
                          <Text style={styles.remainingValue}>
                            {installmentDetails.remainingInstallments}/{installmentDetails.totalInstallments}
                          </Text>
                          <Text style={styles.remainingMoney}>
                            PKR {fmtPKR(installmentDetails.remainingMoney)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Discount */}
                  {!isInstallment && (
                    <View style={styles.discountRow}>
                      <Text style={styles.discountLabel}>Discount</Text>
                      <TextInput
                        style={styles.discountInput}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                        value={discount}
                        onChangeText={text => {
                          if (text === '' || /^\d*\.?\d*$/.test(text)) {
                            setDiscount(text);
                          }
                        }}
                      />
                    </View>
                  )}

                  {/* Totals */}
                  <View style={styles.totals}>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Subtotal</Text>
                      <Text style={styles.totalValue}>PKR {fmtPKR(subtotal)}</Text>
                    </View>
                    {isInstallment && percentageIncrease > 0 && (
                      <View style={styles.totalRow}>
                        <Text style={styles.increaseLabel}>+ {percentageIncrease}% Increase</Text>
                        <Text style={styles.increaseValue}>PKR {fmtPKR(increaseAmount)}</Text>
                      </View>
                    )}
                    {!isInstallment && discountValue > 0 && (
                      <View style={styles.totalRow}>
                        <Text style={styles.discountTotalLabel}>Discount</Text>
                        <Text style={styles.discountTotalValue}>- PKR {fmtPKR(discountValue)}</Text>
                      </View>
                    )}
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Tax</Text>
                      <Text style={styles.totalValue}>PKR {fmtPKR2(tax)}</Text>
                    </View>
                    <View style={[styles.totalRow, styles.totalFinalRow]}>
                      <Text style={styles.totalFinalLabel}>Total</Text>
                      <Text style={styles.totalFinalValue}>
                        PKR {isInstallment ? fmtPKR(subtotal * (1 + percentageIncrease / 100)) : fmtPKR2(total)}
                      </Text>
                    </View>
                  </View>

                  {/* Payment methods */}
                  {isInstallment ? (
                    <View style={styles.paymentRow}>
                      {paymentChip('card', CreditCard, 'Card')}
                      {paymentChip('bank', Landmark, 'Bank')}
                      {paymentChip('cash', CircleDollarSign, 'Cash')}
                    </View>
                  ) : (
                    <View style={styles.paymentRow}>
                      {paymentChip('card', CreditCard, 'Card')}
                      {paymentChip('bank', Landmark, 'Bank')}
                      {paymentChip('cash', CircleDollarSign, 'Cash')}
                    </View>
                  )}

                  {isInstallment ? (
                    <TouchableOpacity
                      style={[
                        styles.payBtn,
                        (isProcessing || (!existingInstallment && (cart.length === 0 || !selectedPlanId)) ||
                          (!!existingInstallment && (!installmentDetails || installmentDetails.remainingInstallments <= 0))) &&
                          styles.btnDisabled,
                      ]}
                      disabled={
                        isProcessing ||
                        (!existingInstallment && (cart.length === 0 || !selectedPlanId)) ||
                        (!!existingInstallment &&
                          (!installmentDetails || installmentDetails.remainingInstallments <= 0))
                      }
                      onPress={handleCompletePayment}>
                      {isProcessing ? (
                        <Loader size={16} color="#FFFFFF" />
                      ) : (
                        <Receipt size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.payBtnText}>
                        {isProcessing
                          ? 'Processing...'
                          : `Pay Installment - PKR ${fmtPKR(installmentDetails?.amountPerInstallment || 0)}`}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.holdBtn, (isProcessing || cart.length === 0) && styles.btnDisabled]}
                        disabled={isProcessing || cart.length === 0}
                        onPress={handleHoldBill}>
                        <Text style={styles.holdBtnText}>Hold Bill</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.completeBtn, (isProcessing || cart.length === 0) && styles.btnDisabled]}
                        disabled={isProcessing || cart.length === 0}
                        onPress={handleCompletePayment}>
                        {isProcessing ? (
                          <Loader size={16} color="#FFFFFF" />
                        ) : null}
                        <Text style={styles.completeBtnText}>
                          {isProcessing ? 'Processing...' : 'Complete Payment'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100},
  productRow: {gap: 10, marginBottom: 10},
  productCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  productImage: {
    height: 110,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImageIcon: {fontSize: 34},
  stockBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockBadgeOk: {backgroundColor: '#D1FAE5'},
  stockBadgeOut: {backgroundColor: '#FEE2E2'},
  stockBadgeText: {fontSize: 9, fontWeight: '700', color: '#065F46'},
  cartCountBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  cartCountText: {fontSize: 11, fontWeight: '700', color: '#FFFFFF'},
  productInfo: {padding: 10},
  productName: {fontSize: 13, fontWeight: '600', color: '#111827', minHeight: 34},
  productPrice: {fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 4},
  productSerial: {
    fontSize: 9,
    color: '#9CA3AF',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    marginTop: 2,
  },
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 40, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280'},
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    shadowOffset: {width: 0, height: -3},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomCartInfo: {flexDirection: 'row', alignItems: 'center'},
  bottomCartIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bottomCartCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  bottomCartCountText: {fontSize: 10, fontWeight: '700', color: '#FFFFFF'},
  bottomCartItems: {fontSize: 12, color: '#6B7280'},
  bottomCartTotal: {fontSize: 16, fontWeight: '700', color: '#111827'},
  viewOrderBtn: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  viewOrderBtnText: {fontSize: 14, fontWeight: '700', color: '#FFFFFF'},
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '94%',
  },
  detailSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  orderTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  detailSheetTitle: {fontSize: 16, fontWeight: '600', color: '#111827'},
  detailContent: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40},
  sellToSection: {marginBottom: 14},
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sellToRow: {flexDirection: 'row', gap: 8},
  sellToChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  sellToChipActive: {backgroundColor: '#10B981', borderColor: '#10B981'},
  sellToChipText: {fontSize: 13, fontWeight: '600', color: '#374151'},
  sellToChipTextActive: {color: '#FFFFFF'},
  block: {marginBottom: 14},
  dropdownWrap: {marginBottom: 12},
  dropdownLabelRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6},
  dropdownLabel: {fontSize: 12, fontWeight: '500', color: '#374151'},
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownInputField: {flex: 1, fontSize: 14, color: '#111827', padding: 0},
  dropdownInputText: {flex: 1, fontSize: 14, color: '#111827', fontWeight: '500'},
  dropdownList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    maxHeight: 180,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {backgroundColor: '#ECFDF5'},
  dropdownItemTextWrap: {flex: 1, marginRight: 8},
  dropdownItemName: {fontSize: 13, fontWeight: '600', color: '#111827'},
  dropdownItemSecondary: {fontSize: 11, color: '#6B7280', marginTop: 1},
  dropdownEmpty: {fontSize: 13, color: '#6B7280', padding: 14, textAlign: 'center'},
  selectedCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  selectedCustomerInfo: {flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1},
  selectedCustomerName: {fontSize: 13, fontWeight: '600', color: '#047857', flexShrink: 1},
  selectedCustomerBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  selectedCustomerBadgeText: {fontSize: 10, fontWeight: '600', color: '#047857', textTransform: 'capitalize'},
  clearText: {fontSize: 12, fontWeight: '600', color: '#059669'},
  installmentToggleRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12},
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {backgroundColor: '#10B981', borderColor: '#10B981'},
  installmentToggleText: {fontSize: 13, fontWeight: '600', color: '#374151'},
  checkingRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6},
  checkingText: {fontSize: 12, color: '#6B7280'},
  planHint: {fontSize: 12, color: '#6B7280', textAlign: 'center', paddingVertical: 4},
  dividerH: {height: 1, backgroundColor: '#E5E7EB', marginBottom: 14},
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cartItemInfo: {flex: 1, marginRight: 10},
  cartItemName: {fontSize: 14, fontWeight: '600', color: '#111827'},
  cartItemSerial: {
    fontSize: 10,
    color: '#9CA3AF',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    marginTop: 2,
  },
  cartItemPrice: {fontSize: 13, color: '#6B7280', marginTop: 4},
  qtyStepper: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8},
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyInput: {
    width: 44,
    height: 28,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 13,
    color: '#111827',
    paddingVertical: 0,
    backgroundColor: '#FFFFFF',
  },
  cartItemRight: {alignItems: 'flex-end', gap: 8},
  cartItemTotal: {fontSize: 14, fontWeight: '700', color: '#111827'},
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCartText: {fontSize: 13, color: '#6B7280', textAlign: 'center', paddingVertical: 24},
  footerBlock: {paddingTop: 8},
  installmentInfoCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  installmentInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
    marginBottom: 10,
  },
  installmentInfoTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1},
  installmentInfoTitle: {fontSize: 13, fontWeight: '700', color: '#047857'},
  installmentBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  installmentBadgeText: {fontSize: 9, fontWeight: '700', color: '#047857'},
  installmentGrid: {flexDirection: 'row', gap: 10, marginBottom: 8},
  installmentCol: {flex: 1},
  installmentColLabel: {fontSize: 11, color: '#6B7280'},
  installmentColValue: {fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 2},
  paidBox: {
    flex: 1,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 10,
  },
  paidLabel: {fontSize: 11, fontWeight: '600', color: '#047857'},
  paidValue: {fontSize: 15, fontWeight: '700', color: '#047857', marginTop: 2},
  paidMoney: {fontSize: 11, color: '#047857', marginTop: 2},
  remainingBox: {
    flex: 1,
    backgroundColor: '#FFEDD5',
    borderRadius: 8,
    padding: 10,
  },
  remainingLabel: {fontSize: 11, fontWeight: '600', color: '#C2410C'},
  remainingValue: {fontSize: 15, fontWeight: '700', color: '#C2410C', marginTop: 2},
  remainingMoney: {fontSize: 11, color: '#C2410C', marginTop: 2},
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  discountLabel: {fontSize: 13, color: '#6B7280'},
  discountInput: {
    width: 110,
    height: 34,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    textAlign: 'right',
    fontSize: 14,
    color: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 0,
    backgroundColor: '#FFFFFF',
  },
  totals: {marginBottom: 12},
  totalRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3},
  totalLabel: {fontSize: 13, color: '#6B7280'},
  totalValue: {fontSize: 13, color: '#374151', fontWeight: '500'},
  increaseLabel: {fontSize: 13, color: '#047857', fontWeight: '500'},
  increaseValue: {fontSize: 13, color: '#047857', fontWeight: '600'},
  discountTotalLabel: {fontSize: 13, color: '#059669'},
  discountTotalValue: {fontSize: 13, color: '#059669', fontWeight: '600'},
  totalFinalRow: {borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 6, marginTop: 4},
  totalFinalLabel: {fontSize: 15, fontWeight: '700', color: '#111827'},
  totalFinalValue: {fontSize: 15, fontWeight: '700', color: '#111827'},
  paymentRow: {flexDirection: 'row', gap: 8, marginBottom: 12},
  paymentChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  paymentChipActive: {backgroundColor: '#10B981', borderColor: '#10B981'},
  paymentChipText: {fontSize: 12, fontWeight: '600', color: '#374151'},
  paymentChipTextActive: {color: '#FFFFFF'},
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 14,
  },
  payBtnText: {fontSize: 14, fontWeight: '700', color: '#FFFFFF'},
  actionRow: {flexDirection: 'row', gap: 10},
  holdBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  holdBtnText: {fontSize: 14, fontWeight: '700', color: '#374151'},
  completeBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 14,
  },
  completeBtnText: {fontSize: 14, fontWeight: '700', color: '#FFFFFF'},
  btnDisabled: {opacity: 0.5},
});
