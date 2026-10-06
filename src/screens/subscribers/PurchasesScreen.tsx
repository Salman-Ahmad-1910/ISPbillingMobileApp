import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import {useFocusEffect, useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import RNPrint from 'react-native-print';
import {
  ShoppingCart,
  DollarSign,
  Receipt,
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  Wallet,
  Printer,
  Package,
  Store,
  Percent,
} from 'lucide-react-native';
import {
  getPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
  updatePurchaseStatus,
  getVendors,
  getProducts,
  getVendorInvoices,
} from '../../api/inventory';
import {Purchase, PurchaseItem, Vendor, Product, VendorInvoice, Company} from '../../types';
import {useAuth} from '../../context/AuthContext';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';

const PAGE_SIZES = [5, 10, 20, 50, 100];

const fmtPKR = (n: number) => new Intl.NumberFormat('en-US').format(Number(n) || 0);

type SelectOption = {label: string; value: string};

const STATUS_FILTER_OPTIONS: SelectOption[] = [
  {label: 'All Statuses', value: 'all'},
  {label: 'Paid', value: 'paid'},
  {label: 'Unpaid', value: 'unpaid'},
  {label: 'Partial', value: 'partial'},
];

const STATUS_OPTIONS: SelectOption[] = [
  {label: 'Unpaid', value: 'unpaid'},
  {label: 'Paid', value: 'paid'},
  {label: 'Partial', value: 'partial'},
];

const FOC_OPTIONS: SelectOption[] = [
  {label: 'Normal', value: 'normal'},
  {label: 'FOC', value: 'foc'},
];

const STATUS_COLORS: Record<string, string> = {
  paid: '#10B981',
  unpaid: '#EF4444',
  partial: '#F59E0B',
};

const statusBadgeStyle = (color: string) => ({
  backgroundColor: `${color}20`,
  borderRadius: 12,
  paddingHorizontal: 8,
  paddingVertical: 2,
});

function parseSNs(raw?: string | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(/[\s,\-]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface FormItem {
  productId: string;
  productName: string;
  quantity: string;
  purchasePrice: string;
  sellingPrice: string;
  unitType: string;
  focNormal: string;
  serialNumber: string;
  expiryDate: string;
  mergeExisting: boolean;
}

interface PurchaseFormValues {
  vendorId: string;
  vendorName: string;
  billId: string;
  batch: string;
  purchaseDate: string;
  discount: string;
  salesTax: string;
  wthTax: string;
  status: string;
  items: FormItem[];
}

const emptyForm: PurchaseFormValues = {
  vendorId: '',
  vendorName: '',
  billId: '',
  batch: '',
  purchaseDate: '',
  discount: '',
  salesTax: '',
  wthTax: '',
  status: 'unpaid',
  items: [],
};

interface VendorProduct {
  productId: string;
  productName: string;
  unitPrice: number;
  sellingPrice: number;
  unitType: string;
  allSNs: string[];
  invoiceNumber: string;
  batch: string;
}

type SelectSheetState = {
  key: string;
  title: string;
  options: SelectOption[];
  selected: string;
  onSelect: (v: string) => void;
} | null;

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

function PurchasesDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="purchasesHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8B5CF6" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#7C3AED" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#purchasesHeroGrad)" />
      </Svg>
    </View>
  );
}

function buildPurchasePrintHtml(
  purchase: Purchase,
  company: Company | null,
  size: 'a4' | 'thermal',
): string {
  const companyName = company?.name || 'Fintrack ERP';
  const companyAddress = company?.address || '';
  const companyPhone = company?.contact1 || company?.contact2 || '';
  const receivableAmount = (purchase.items || []).reduce(
    (sum, item) => sum + (Number(item.subtotal) || 0),
    0,
  );
  const previousAmount = Number(purchase.remainingAmount) || 0;
  const billSubtotal = previousAmount + receivableAmount;
  const billId = purchase.billId || purchase.purchaseNumber || '-';
  const status = purchase.status || 'unpaid';

  if (size === 'thermal') {
    const rows = (purchase.items || [])
      .map(item => {
        const qty = Number(item.quantityEntered) || item.quantity || 0;
        return `<div style="display:flex;justify-content:space-between;margin-bottom:2px;">
          <span style="max-width:45mm;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.productName)} x${qty}</span>
          <span style="font-weight:700;">${(Number(item.subtotal) || 0).toFixed(0)}</span>
        </div>`;
      })
      .join('');
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { width: 72mm; font-family: monospace; font-size: 12px; line-height: 1.2; padding: 4px; margin: 0; color: #000; }
</style>
</head>
<body>
  <div style="text-align:center;border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">
    <div style="font-weight:bold;font-size:14px;">${escapeHtml(companyName).toUpperCase()}</div>
    ${companyAddress ? `<div style="font-size:10px;color:#444;">${escapeHtml(companyAddress)}</div>` : ''}
    ${companyPhone ? `<div style="font-size:10px;color:#444;">Tel: ${escapeHtml(companyPhone)}</div>` : ''}
  </div>
  <div style="text-align:center;font-weight:bold;font-size:13px;margin-bottom:8px;">PURCHASE INVOICE</div>
  <div style="border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">
    <div style="display:flex;justify-content:space-between;"><span>Bill ID:</span><span style="font-weight:700;">${escapeHtml(billId)}</span></div>
    <div style="display:flex;justify-content:space-between;"><span>Date:</span><span>${escapeHtml(purchase.purchaseDate)}</span></div>
    <div style="display:flex;justify-content:space-between;"><span>Vendor:</span><span>${escapeHtml(purchase.vendorName)}</span></div>
    ${purchase.batch ? `<div style="display:flex;justify-content:space-between;"><span>Batch:</span><span>${escapeHtml(purchase.batch)}</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;"><span>Status:</span><span style="font-weight:700;text-transform:uppercase;">${escapeHtml(status)}</span></div>
  </div>
  <div style="border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">
    ${rows}
  </div>
  <div style="padding-bottom:8px;margin-bottom:8px;">
    <div style="display:flex;justify-content:space-between;font-size:11px;"><span style="color:#555;">Previous:</span><span>${previousAmount.toFixed(0)}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:11px;"><span style="color:#555;">Receivable:</span><span>${receivableAmount.toFixed(0)}</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:700;font-size:13px;border-top:1px solid #000;padding-top:6px;margin-top:4px;">
      <span>TOTAL:</span><span>PKR ${billSubtotal.toFixed(0)}</span>
    </div>
  </div>
  <div style="text-align:center;margin-top:8px;border-top:1px dashed #000;padding-top:8px;">
    <div style="font-weight:700;font-size:10px;">${escapeHtml(companyName)}</div>
    <div style="font-size:9px;color:#999;margin-top:2px;">Thank you for your business!</div>
  </div>
</body>
</html>`;
  }

  const itemRows = (purchase.items || [])
    .map(item => {
      const qty = Number(item.quantityEntered) || item.quantity || 0;
      return `<tr>
        <td style="border:1px solid #D1D5DB;padding:12px;">${escapeHtml(item.productName)}</td>
        <td style="border:1px solid #D1D5DB;padding:12px;font-family:monospace;font-size:12px;">${escapeHtml(item.serialNumber || '-')}</td>
        <td style="border:1px solid #D1D5DB;padding:12px;text-align:right;">${(Number(item.purchasePrice) || 0).toFixed(2)}</td>
        <td style="border:1px solid #D1D5DB;padding:12px;text-align:center;font-weight:600;">${qty}</td>
        <td style="border:1px solid #D1D5DB;padding:12px;text-align:right;">${(Number(item.saleTax) || 0).toFixed(2)}</td>
        <td style="border:1px solid #D1D5DB;padding:12px;text-align:right;">${(Number(item.wthTax) || 0).toFixed(2)}</td>
        <td style="border:1px solid #D1D5DB;padding:12px;text-align:right;">${(Number(item.disc) || 0).toFixed(2)}</td>
        <td style="border:1px solid #D1D5DB;padding:12px;text-align:right;font-weight:600;">${(Number(item.subtotal) || 0).toFixed(2)}</td>
      </tr>`;
    })
    .join('');

  const statusBadge =
    status === 'paid'
      ? 'background:#D1FAE5;color:#065F46;'
      : status === 'partial'
        ? 'background:#FEF3C7;color:#92400E;'
        : 'background:#FEE2E2;color:#991B1B;';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; margin: 0; padding: 32px; }
  .container { max-width: 820px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #111827; margin-bottom: 32px; }
  .company h1 { font-size: 24px; font-weight: 800; margin: 0 0 4px 0; }
  .company p { color: #6B7280; font-size: 14px; margin: 2px 0; }
  .title { font-size: 36px; font-weight: 800; letter-spacing: 2px; color: #059669; margin: 0; }
  .meta { font-size: 14px; margin-top: 12px; color: #6B7280; text-align: right; }
  .meta span { color: #111827; font-weight: 600; }
  .meta .badge { display: inline-block; margin-left: 6px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; ${statusBadge} }
  h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #374151; margin: 0 0 8px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px; }
  th { background: #059669; color: #fff; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  th.r { text-align: right; } th.c { text-align: center; }
  td { border: 1px solid #D1D5DB; padding: 12px; }
  td.r { text-align: right; } td.c { text-align: center; }
  footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #D1D5DB; }
  .sig { display: flex; justify-content: space-between; margin-top: 48px; }
  .sig div { width: 200px; text-align: center; }
  .sig .line { border-bottom: 1px solid #111827; height: 40px; }
  .sig p { font-size: 12px; color: #6B7280; margin: 4px 0 0 0; }
  .center { text-align: center; margin-top: 24px; color: #6B7280; }
  .center b { font-size: 18px; color: #111827; }
  .summary { margin-left: auto; width: 300px; }
  .summary td { border: none; padding: 6px; font-size: 14px; }
  .summary tr.total td { border-top: 2px solid #111827; font-weight: 800; font-size: 16px; }
</style>
</head>
<body>
  <div class="container">
    <header>
      <div class="company">
        <h1>${escapeHtml(companyName)}</h1>
        ${companyAddress ? `<p>${escapeHtml(companyAddress)}</p>` : ''}
        ${companyPhone ? `<p>Phone: ${escapeHtml(companyPhone)}</p>` : ''}
      </div>
      <div>
        <h2 class="title">INVOICE</h2>
        <div class="meta">
          <div>Bill ID: <span>${escapeHtml(billId)}</span></div>
          <div>Date: <span>${escapeHtml(purchase.purchaseDate)}</span></div>
          <div>Batch: <span>${escapeHtml(purchase.batch || '-')}</span></div>
          <div>Status: <span class="badge">${escapeHtml(status.toUpperCase())}</span></div>
        </div>
      </div>
    </header>

    <div style="margin-bottom:32px;">
      <h3>Vendor Information</h3>
      <div style="font-size:14px;color:#374151;">
        <p style="font-weight:600;margin:0;">${escapeHtml(purchase.vendorName)}</p>
        ${purchase.vendorId ? `<p style="color:#6B7280;margin:4px 0 0 0;">Vendor ID: ${escapeHtml(purchase.vendorId.slice(0, 8))}</p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>SN</th>
          <th class="r">Price</th>
          <th class="c">Quantity</th>
          <th class="r">Sale Tax</th>
          <th class="r">WTH</th>
          <th class="r">Disc</th>
          <th class="r">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-top:32px;margin-bottom:32px;">
      <table class="summary">
        <tbody>
          <tr><td>Previous Amount</td><td style="text-align:right;">${previousAmount.toFixed(2)}</td></tr>
          <tr><td>Receivable Amount</td><td style="text-align:right;">${receivableAmount.toFixed(2)}</td></tr>
          <tr class="total"><td>Subtotal</td><td style="text-align:right;">${billSubtotal.toFixed(2)}</td></tr>
        </tbody>
      </table>
    </div>

    <footer>
      <div class="sig">
        <div>
          <div class="line"></div>
          <p>Company Stamp</p>
        </div>
        <div>
          <div class="line"></div>
          <p>Receiver Signature</p>
        </div>
      </div>
      <div class="center">
        <b>${escapeHtml(companyName)}</b>
        ${companyPhone ? `<p style="margin:4px 0 0 0;">Phone: ${escapeHtml(companyPhone)}</p>` : ''}
        <p style="margin:8px 0 0 0;font-size:12px;color:#9CA3AF;">Thank you for your business!</p>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

export default function PurchasesScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const {companyId, companies} = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([]);
  const [filtered, setFiltered] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [form, setForm] = useState<PurchaseFormValues>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<
    {kind: 'vendor'} | {kind: 'product'} | null
  >(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [selectSheet, setSelectSheet] = useState<SelectSheetState>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [printTarget, setPrintTarget] = useState<Purchase | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const openDrawer = () => {
    nav.dispatch(DrawerActions.openDrawer());
  };

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const [purchaseData, vendorData, productData, invoiceData] = await Promise.all([
        getPurchases().catch(() => [] as Purchase[]),
        getVendors().catch(() => [] as Vendor[]),
        getProducts().catch(() => [] as Product[]),
        getVendorInvoices().catch(() => [] as VendorInvoice[]),
      ]);
      setPurchases(purchaseData);
      setVendors(vendorData);
      setProducts(productData);
      setVendorInvoices(invoiceData);
      setFiltered(purchaseData);
    } catch (err: any) {
      const reason =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load purchases. Check your connection and try again.';
      setError(reason);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    let result = purchases;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        (p.billId || '').toLowerCase().includes(q) ||
        (p.purchaseNumber || '').toLowerCase().includes(q) ||
        (p.vendorName || '').toLowerCase().includes(q),
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    setFiltered(result);
  }, [purchases, search, statusFilter]);

  const totalSpent = purchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  const avgPerPurchase = purchases.length > 0 ? Math.round(totalSpent / purchases.length) : 0;

  const statCards: {key: string; label: string; value: string; icon: any; gradient: [string, string]}[] = [
    {key: 'total', label: 'Total Purchases', value: String(purchases.length), icon: ShoppingCart, gradient: ['#8B5CF6', '#7C3AED']},
    {key: 'amount', label: 'Total Amount', value: `PKR ${fmtPKR(totalSpent)}`, icon: DollarSign, gradient: ['#10B981', '#16A34A']},
    {key: 'avg', label: 'Avg Per Purchase', value: `PKR ${fmtPKR(avgPerPurchase)}`, icon: Receipt, gradient: ['#F59E0B', '#EA580C']},
  ];

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const usedSNsByOtherPurchases = (() => {
    const set = new Set<string>();
    for (const p of purchases) {
      if (editing && p.id === editing.id) continue;
      for (const item of p.items || []) {
        parseSNs(item.serialNumber || '').forEach(sn => set.add(sn));
      }
    }
    return set;
  })();

  const vendorProducts: VendorProduct[] = (() => {
    if (!form.vendorId) return [];
    const map = new Map<string, VendorProduct>();
    for (const vi of vendorInvoices) {
      if (vi.vendorId !== form.vendorId || !vi.items) continue;
      for (const item of vi.items) {
        const itemSNs = parseSNs(item.serialNumber || '');
        const product = products.find(p => p.id === item.productId);
        const isNoSN = !!product?.noSerialNumber || itemSNs.length === 0;
        const unconsumedSNs = itemSNs.filter(sn => !usedSNsByOtherPurchases.has(sn));
        if (!isNoSN && unconsumedSNs.length === 0) continue;
        const existing = map.get(item.productId);
        if (existing) {
          if (!isNoSN) existing.allSNs.push(...unconsumedSNs);
        } else {
          const unitPrice = Number(item.purchasePrice ?? item.unitPrice) || 0;
          map.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            unitPrice,
            sellingPrice: Number(item.sellingPrice ?? unitPrice) || 0,
            unitType: item.unitType || product?.unitType || 'piece',
            allSNs: isNoSN ? [] : [...unconsumedSNs],
            invoiceNumber: vi.invoiceNumber || '',
            batch: vi.batch || '',
          });
        }
      }
    }
    return Array.from(map.values());
  })();

  const getAvailableSNs = (productId: string, items: FormItem[], excludeIndex: number): string[] => {
    const vp = vendorProducts.find(p => p.productId === productId);
    if (!vp) return [];
    const usedByOthers = new Set<string>();
    items.forEach((item, i) => {
      if (i === excludeIndex) return;
      if (item.productId === productId && item.serialNumber) {
        parseSNs(item.serialNumber).forEach(sn => usedByOthers.add(sn));
      }
    });
    return vp.allSNs.filter(sn => !usedByOthers.has(sn));
  };

  const mergeTargets = form.items.map(item => {
    const matches = purchases
      .filter(
        p =>
          (p.batch || '') === (form.batch || '') &&
          (p.items || []).some(
            it =>
              it.productId === item.productId &&
              Number(it.purchasePrice) === Number(item.purchasePrice) &&
              Number(it.sellingPrice) === Number(item.sellingPrice) &&
              (it.unitType || '') === (item.unitType || ''),
          ),
      )
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return matches.length > 0
      ? {exists: true, purchaseNumber: matches[0].purchaseNumber}
      : {exists: false, purchaseNumber: ''};
  });

  const formSubtotal = form.items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.purchasePrice) || 0),
    0,
  );
  const formDiscount = parseFloat(form.discount) || 0;
  const formSalesTax = parseFloat(form.salesTax) || 0;
  const formWthTax = parseFloat(form.wthTax) || 0;
  const totalAmount = Math.max(0, formSubtotal - formDiscount + formSalesTax + formWthTax);

  const setField = (key: keyof PurchaseFormValues, value: any) => {
    setForm(prev => ({...prev, [key]: value}));
  };

  const addItem = (productId: string) => {
    const vp = vendorProducts.find(p => p.productId === productId);
    if (!vp) return;
    setForm(prev => {
      const currentItems = prev.items;
      const availableSNs = getAvailableSNs(productId, currentItems, currentItems.length);
      const isNoSN = vp.allSNs.length === 0;
      const qty = isNoSN ? 1 : Math.min(1, availableSNs.length || 1);
      const snString = isNoSN ? '' : availableSNs.slice(0, qty).join(', ');
      const item: FormItem = {
        productId,
        productName: vp.productName,
        quantity: String(qty),
        purchasePrice: String(vp.unitPrice),
        sellingPrice: String(vp.sellingPrice),
        unitType: vp.unitType,
        focNormal: 'normal',
        serialNumber: snString,
        expiryDate: '',
        mergeExisting: false,
      };
      return {
        ...prev,
        billId: prev.billId || vp.invoiceNumber,
        batch: prev.batch || vp.batch,
        items: [...currentItems, item],
      };
    });
  };

  const removeItem = (index: number) => {
    setForm(prev => ({...prev, items: prev.items.filter((_, i) => i !== index)}));
  };

  const updateItemField = (index: number, field: keyof FormItem | 'quantity', value: any) => {
    setForm(prev => {
      const items = prev.items.map(it => ({...it}));
      if (index >= items.length) return prev;
      const item = items[index];
      if (field === 'quantity') {
        const vp = vendorProducts.find(p => p.productId === item.productId);
        const isNoSN = !vp || vp.allSNs.length === 0;
        const availableSNs = getAvailableSNs(item.productId, items, index);
        const maxQty = isNoSN ? 99999 : availableSNs.length || 1;
        const qty = isNoSN
          ? Math.max(1, Number(value) || 1)
          : Math.max(1, Math.min(Number(value) || 1, maxQty));
        item.quantity = String(qty);
        item.serialNumber = isNoSN ? '' : availableSNs.slice(0, qty).join(', ');
      } else {
        (item as any)[field] = value;
      }
      return {...prev, items};
    });
  };

  const openAdd = () => {
    setEditing(null);
    setForm({...emptyForm, purchaseDate: new Date().toISOString().split('T')[0]});
    setFormOpen(true);
  };

  const openEdit = (purchase: Purchase) => {
    setEditing(purchase);
    setForm({
      vendorId: purchase.vendorId || '',
      vendorName: purchase.vendorName || '',
      billId: purchase.billId || '',
      batch: purchase.batch || '',
      purchaseDate: purchase.purchaseDate || '',
      discount: String(purchase.discount || ''),
      salesTax: String(purchase.salesTax || ''),
      wthTax: String(purchase.wthTax || ''),
      status: purchase.status || 'unpaid',
      items: (purchase.items || []).map((it: PurchaseItem) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: String(Number(it.quantityEntered) || it.quantity || 1),
        purchasePrice: String(it.purchasePrice || ''),
        sellingPrice: String(it.sellingPrice || ''),
        unitType: it.unitType || 'piece',
        focNormal: it.focNormal || 'normal',
        serialNumber: it.serialNumber || '',
        expiryDate: it.expiryDate || '',
        mergeExisting: false,
      })),
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.vendorId) {
      Alert.alert('Error', 'Vendor is required.');
      return;
    }
    if (!form.purchaseDate) {
      Alert.alert('Error', 'Purchase date is required.');
      return;
    }
    if (form.items.length === 0) {
      Alert.alert('Error', 'At least one item is required.');
      return;
    }
    for (const item of form.items) {
      if (!item.productId) {
        Alert.alert('Error', 'Select a product for every item.');
        return;
      }
      if ((Number(item.quantity) || 0) < 1) {
        Alert.alert('Error', 'Quantity must be at least 1.');
        return;
      }
    }
    setSaving(true);
    try {
      const items = form.items.map(it => ({
        productId: it.productId,
        productName: it.productName,
        quantity: Number(it.quantity) || 1,
        purchasePrice: parseFloat(it.purchasePrice) || 0,
        sellingPrice: parseFloat(it.sellingPrice) || 0,
        unitType: it.unitType,
        focNormal: it.focNormal,
        subtotal: (Number(it.quantity) || 1) * (parseFloat(it.purchasePrice) || 0),
        saleTax: 0,
        wthTax: 0,
        disc: 0,
        expiryDate: it.expiryDate || undefined,
        serialNumber: it.serialNumber,
        mergeExisting: it.mergeExisting,
      }));
      const payload = {
        vendorId: form.vendorId,
        vendorName: form.vendorName || vendors.find(v => v.id === form.vendorId)?.name || '',
        billId: form.billId,
        batch: form.batch,
        purchaseDate: form.purchaseDate,
        discount: formDiscount,
        salesTax: formSalesTax,
        wthTax: formWthTax,
        status: form.status as Purchase['status'],
        totalAmount,
        remainingAmount: form.status === 'paid' ? 0 : totalAmount,
        items,
      };
      if (editing) {
        await updatePurchase(editing.id, payload);
      } else {
        await createPurchase(payload);
      }
      setFormOpen(false);
      setEditing(null);
      fetchData(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to save purchase';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async (purchase: Purchase) => {
    const newStatus = purchase.status === 'paid' ? 'unpaid' : 'paid';
    try {
      await updatePurchaseStatus(purchase.id, newStatus);
      fetchData(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to update payment status';
      Alert.alert('Error', msg);
    }
  };

  const handleDelete = (purchase: Purchase) => {
    Alert.alert(
      'Delete Purchase',
      `Delete purchase ${purchase.purchaseNumber || purchase.billId}? This will revert stock for all items.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePurchase(purchase.id);
              fetchData(false);
            } catch (err: any) {
              const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete purchase';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  const handlePrint = async (purchase: Purchase, size: 'a4' | 'thermal') => {
    setPrintTarget(null);
    setPrintingId(purchase.id);
    setPrinting(true);
    try {
      const company = companies.find(c => c.id === companyId) || companies[0] || null;
      const html = buildPurchasePrintHtml(purchase, company, size);
      await RNPrint.print({
        html,
        jobName: `Purchase ${purchase.purchaseNumber || purchase.billId}`,
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err?.message || 'Failed to print purchase';
      Alert.alert('Error', msg);
    } finally {
      setPrintingId(null);
      setPrinting(false);
    }
  };

  const canExpand = (purchase: Purchase) =>
    (purchase.items || []).some(item => parseSNs(item.serialNumber).length > 1);

  const serialEntriesFor = (purchase: Purchase): {key: string; productName: string; serialNumber: string; price: number}[] => {
    const entries: {key: string; productName: string; serialNumber: string; price: number}[] = [];
    for (const item of purchase.items || []) {
      for (const sn of parseSNs(item.serialNumber)) {
        entries.push({
          key: `${item.productId}-${sn}`,
          productName: item.productName,
          serialNumber: sn,
          price: item.purchasePrice || 0,
        });
      }
    }
    return entries;
  };

  const renderItem = ({item, index}: {item: Purchase; index: number}) => {
    const statusColor = STATUS_COLORS[item.status] || '#6B7280';
    const productNames = (item.items || []).map(i => i.productName).filter(Boolean);
    const productLabel =
      productNames.length > 2
        ? `${productNames.slice(0, 2).join(', ')} +${productNames.length - 2} more`
        : productNames.join(', ');
    const allSNs: string[] = [];
    for (const it of item.items || []) {
      allSNs.push(...parseSNs(it.serialNumber));
    }
    const serialLabel =
      allSNs.length === 0
        ? '—'
        : allSNs.length === 1
          ? allSNs[0]
          : `${allSNs[0]} (1/${allSNs.length})`;
    const totalQty = (item.items || []).reduce(
      (sum, it) => sum + (Number(it.quantityEntered) || it.quantity || 0),
      0,
    );
    const hasSNs = allSNs.length > 0;
    const expandable = canExpand(item);
    const isExpanded = expanded.has(item.id);
    const entries = isExpanded ? serialEntriesFor(item) : [];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rowIndex}>{index + 1 + (currentPage - 1) * pageSize}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.billId} numberOfLines={1}>
              {item.billId || item.purchaseNumber || '-'}
            </Text>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.vendorName || '-'}
            </Text>
          </View>
          <View style={statusBadgeStyle(statusColor)}>
            <Text style={[styles.statusText, {color: statusColor}]}>
              {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Products</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{productLabel || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{item.purchaseDate || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>SN / MAC</Text>
          <Text style={styles.infoValueMono} numberOfLines={1}>{serialLabel}</Text>
        </View>

        {hasSNs && (
          <TouchableOpacity
            style={styles.expandChip}
            disabled={!expandable}
            onPress={() =>
              setExpanded(prev => {
                const next = new Set(prev);
                if (next.has(item.id)) {
                  next.delete(item.id);
                } else {
                  next.add(item.id);
                }
                return next;
              })
            }>
            <Text style={[styles.expandChipText, !expandable && styles.expandChipTextMuted]}>
              {expandable ? (isExpanded ? '− Collapse serials' : `+ ${allSNs.length} serials`) : `${allSNs.length} serial`}
            </Text>
            {expandable && <ChevronDown size={14} color="#8B5CF6" style={isExpanded ? styles.chevronUp : undefined} />}
          </TouchableOpacity>
        )}

        {isExpanded && (
          <View style={styles.entriesBox}>
            <Text style={styles.entriesTitle}>Serial entries ({entries.length})</Text>
            <View style={styles.entriesHeaderRow}>
              <Text style={[styles.entryHeadCell, styles.entryIndex]}>#</Text>
              <Text style={styles.entryHeadCell}>Product</Text>
              <Text style={styles.entryHeadCell}>SN / MAC</Text>
              <Text style={[styles.entryHeadCell, styles.entryRight]}>Price</Text>
            </View>
            {entries.map((e, i) => (
              <View key={e.key} style={styles.entriesTableRow}>
                <Text style={[styles.entryCell, styles.entryIndex, styles.entryMono]}>{i + 1}</Text>
                <Text style={styles.entryCell}>{e.productName}</Text>
                <Text style={[styles.entryCell, styles.entryMono]}>{e.serialNumber}</Text>
                <Text style={[styles.entryCell, styles.entryRight]}>{fmtPKR(e.price)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.quantityBox}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <Text style={styles.quantityValue}>{totalQty}</Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Total Amount</Text>
            <Text style={styles.priceValue}>PKR {fmtPKR(Number(item.totalAmount) || 0)}</Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.payBtn} onPress={() => handlePay(item)}>
              <Wallet size={14} color="#10B981" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.printBtn}
              onPress={() => setPrintTarget(item)}
              disabled={printing}>
              {printingId === item.id ? <ActivityIndicator size="small" color="#8B5CF6" /> : <Printer size={14} color="#8B5CF6" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
              <Pencil size={14} color="#7C3AED" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Trash2 size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const getVisiblePages = () => {
    const pages: number[] = [];
    const startPage = Math.max(1, currentPage - 3);
    const endPage = Math.min(totalPages, currentPage + 3);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const handlePageSubmit = () => {
    const page = parseInt(pageInput, 10);
    if (page && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput('');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  const formRow = (
    label: string,
    value: string,
    onChangeText: (t: string) => void,
    placeholder = '',
    keyboardType: 'default' | 'numeric' | 'phone-pad' = 'default',
    editable = true,
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={[styles.formInput, !editable && styles.formInputReadOnly]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        editable={editable}
      />
    </View>
  );

  const selectField = (label: string, display: string, placeholder: string, onPress: () => void) => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TouchableOpacity style={styles.formSelect} onPress={onPress}>
        <Text style={display ? styles.formSelectValue : styles.formSelectPlaceholder} numberOfLines={1}>
          {display || placeholder}
        </Text>
        <ChevronDown size={16} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );

  const pickerList: {id: string; name: string; secondary?: string}[] =
    pickerTarget?.kind === 'vendor'
      ? vendors
          .filter(v => !pickerQuery.trim() || v.name.toLowerCase().includes(pickerQuery.toLowerCase()))
          .map(v => ({id: v.id, name: v.name}))
      : pickerTarget?.kind === 'product'
        ? vendorProducts
            .filter(v => !pickerQuery.trim() || v.productName.toLowerCase().includes(pickerQuery.toLowerCase()))
            .map(v => ({
              id: v.productId,
              name: v.productName,
              secondary: v.allSNs.length > 0 ? `${v.allSNs.length} SNs` : 'No SN',
            }))
        : [];

  const selectedVendorProductsCount = vendorProducts.length;

  return (
    <View style={styles.container}>
      <GradientView colors={['#6D28D9', '#8B5CF6']} style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Purchases</Text>
          <Text style={styles.headerCount}>{filtered.length} total</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginated}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#8B5CF6']} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.heroHeader}>
              <GradientView colors={['#8B5CF6', '#7C3AED']} style={styles.heroIconBox}>
                <ShoppingCart size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Purchases</Text>
                <Text style={styles.heroSubtitle}>
                  Manage purchase orders from vendors.
                </Text>
              </View>
            </View>

            <PurchasesDivider />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}>
              {statCards.map(card => (
                <View key={card.key} style={styles.statCard}>
                  <GradientView colors={card.gradient} style={styles.statIcon}>
                    <card.icon size={18} color="#FFFFFF" />
                  </GradientView>
                  <View>
                    <Text style={styles.statLabel}>{card.label}</Text>
                    <Text style={styles.statValue}>{card.value}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.filterRow}>
              <View style={styles.filterField}>
                <Search size={16} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search purchases..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <TouchableOpacity
                style={styles.filterSelect}
                onPress={() =>
                  setSelectSheet({
                    key: 'statusFilter',
                    title: 'Select Status',
                    options: STATUS_FILTER_OPTIONS,
                    selected: statusFilter,
                    onSelect: setStatusFilter,
                  })
                }>
                <Text style={styles.filterSelectText} numberOfLines={1}>
                  {STATUS_FILTER_OPTIONS.find(o => o.value === statusFilter)?.label || 'Status'}
                </Text>
                <ChevronDown size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.toolbar}>
              <GradientButton
                colors={['#10B981', '#16A34A']}
                style={styles.addBtn}
                onPress={openAdd}>
                <PlusCircle size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText} numberOfLines={1}>
                  Add Purchase
                </Text>
              </GradientButton>
            </View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={styles.emptyTitle}>Failed to load purchases</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyTitle}>No purchases found</Text>
              <Text style={styles.emptyText}>
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your search'
                  : 'Add your first purchase'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.pagination}>
            <Text style={styles.paginationInfo}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} purchases
            </Text>

            <View style={styles.pageControls}>
              <TouchableOpacity
                style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                disabled={currentPage === 1}
                onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}>
                <ChevronLeft size={14} color={currentPage === 1 ? '#D1D5DB' : '#374151'} />
                <Text style={[styles.pageBtnText, currentPage === 1 && styles.pageBtnTextDisabled]}>
                  Previous
                </Text>
              </TouchableOpacity>

              {getVisiblePages().map(page => (
                <TouchableOpacity
                  key={page}
                  style={[styles.pageNum, currentPage === page && {backgroundColor: '#8B5CF6'}]}
                  onPress={() => setCurrentPage(page)}>
                  <Text style={[styles.pageNumText, currentPage === page && styles.pageNumTextActive]}>
                    {page}
                  </Text>
                </TouchableOpacity>
              ))}

              {currentPage + 3 < totalPages ? (
                <>
                  <Text style={styles.ellipsis}>...</Text>
                  <TouchableOpacity style={styles.pageNum} onPress={() => setCurrentPage(totalPages)}>
                    <Text style={styles.pageNumText}>{totalPages}</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              <View style={styles.goTo}>
                <TextInput
                  style={styles.goToInput}
                  placeholder="Go to"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={pageInput}
                  onChangeText={text => {
                    if (text === '' || /^\d+$/.test(text)) {
                      setPageInput(text);
                    }
                  }}
                  onSubmitEditing={handlePageSubmit}
                />
                <TouchableOpacity
                  style={[
                    styles.goToBtn,
                    (!pageInput ||
                      parseInt(pageInput, 10) < 1 ||
                      parseInt(pageInput, 10) > totalPages) &&
                      styles.pageBtnDisabled,
                  ]}
                  disabled={
                    !pageInput ||
                    parseInt(pageInput, 10) < 1 ||
                    parseInt(pageInput, 10) > totalPages
                  }
                  onPress={handlePageSubmit}>
                  <ArrowRight size={14} color="#374151" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                disabled={currentPage === totalPages}
                onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>
                <Text style={[styles.pageBtnText, currentPage === totalPages && styles.pageBtnTextDisabled]}>
                  Next
                </Text>
                <ChevronRight size={14} color={currentPage === totalPages ? '#D1D5DB' : '#374151'} />
              </TouchableOpacity>
            </View>

            <View style={styles.pageSizeRow}>
              <Text style={styles.pageSizeLabel}>Show</Text>
              <TouchableOpacity style={styles.pageSizeSelect} onPress={() => setPageSizeOpen(true)}>
                <Text style={styles.pageSizeSelectText}>{pageSize}</Text>
                <ChevronDown size={16} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.pageSizeLabel}>entries</Text>
            </View>
          </View>
        }
      />

      {/* Page size sheet */}
      <Modal
        visible={pageSizeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPageSizeOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Show entries</Text>
              <TouchableOpacity onPress={() => setPageSizeOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {PAGE_SIZES.map(size => {
              const active = pageSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  style={styles.sheetOption}
                  onPress={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                    setPageSizeOpen(false);
                  }}>
                  <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}>
                    {size} per page
                  </Text>
                  {active ? <Check size={16} color="#8B5CF6" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Select sheet (status / FOC) */}
      <Modal
        visible={!!selectSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectSheet(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{selectSheet?.title}</Text>
              <TouchableOpacity onPress={() => setSelectSheet(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll}>
              {selectSheet?.options.map(option => {
                const active = option.value === selectSheet!.selected;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.sheetOption}
                    onPress={() => {
                      selectSheet!.onSelect(option.value);
                      setSelectSheet(null);
                    }}>
                    <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]} numberOfLines={1}>
                      {option.label}
                    </Text>
                    {active ? <Check size={16} color="#8B5CF6" /> : null}
                  </TouchableOpacity>
                );
              })}
              {selectSheet && selectSheet.options.length === 0 ? (
                <View style={styles.sheetEmpty}>
                  <Text style={styles.sheetEmptyText}>No options available</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Vendor / Product picker sheet */}
      <Modal
        visible={!!pickerTarget}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setPickerTarget(null);
          setPickerQuery('');
        }}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {pickerTarget?.kind === 'vendor' ? 'Select vendor' : 'Select product to add'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPickerTarget(null);
                  setPickerQuery('');
                }}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearch}>
              <Search size={16} color="#6B7280" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder={pickerTarget?.kind === 'vendor' ? 'Search vendor...' : 'Search product...'}
                placeholderTextColor="#9CA3AF"
                autoFocus
                value={pickerQuery}
                onChangeText={setPickerQuery}
              />
            </View>
            <ScrollView style={styles.sheetScroll}>
              {pickerList.length > 0 ? (
                pickerList.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.sheetOption}
                    onPress={() => {
                      if (pickerTarget?.kind === 'vendor') {
                        const vendor = vendors.find(v => v.id === item.id);
                        setField('vendorId', item.id);
                        setField('vendorName', vendor?.name || '');
                        setField('items', []);
                        setField('billId', '');
                        setField('batch', '');
                      } else if (pickerTarget?.kind === 'product') {
                        addItem(item.id);
                      }
                      setPickerTarget(null);
                      setPickerQuery('');
                    }}>
                    <View style={styles.sheetOptionInfo}>
                      <Text style={styles.sheetOptionText2} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.secondary ? (
                        <Text style={styles.sheetOptionSub}>
                          {item.secondary}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.sheetEmpty}>
                  <Text style={styles.sheetEmptyText}>
                    {pickerTarget?.kind === 'product'
                      ? selectedVendorProductsCount === 0
                        ? 'No vendor invoices found for this vendor.'
                        : 'No matching products'
                      : 'No vendors found'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Print sheet */}
      <Modal
        visible={!!printTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setPrintTarget(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderTitleRow}>
                <Printer size={16} color="#8B5CF6" />
                <Text style={styles.sheetTitle}>Print Purchase</Text>
              </View>
              <TouchableOpacity onPress={() => setPrintTarget(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {printTarget ? (
              <View>
                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={() => handlePrint(printTarget, 'a4')}>
                  <Text style={styles.sheetOptionText}>A4 Invoice</Text>
                  <ChevronRight size={16} color="#9CA3AF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={() => handlePrint(printTarget, 'thermal')}>
                  <Text style={styles.sheetOptionText}>Thermal Receipt</Text>
                  <ChevronRight size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Add/Edit Purchase form */}
      <Modal
        visible={formOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView
          style={styles.formOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formSheet}>
            <View style={styles.formSheetHeader}>
              <View style={styles.formSheetTitleRow}>
                <GradientView colors={['#8B5CF6', '#7C3AED']} style={styles.formSheetIcon}>
                  <ShoppingCart size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>
                  {editing ? `Edit Purchase: ${editing.purchaseNumber || editing.billId}` : 'Add New Purchase'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFormOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              {selectField(
                'Vendor *',
                vendors.find(v => v.id === form.vendorId)?.name || form.vendorName,
                'Search vendor...',
                () => {
                  setPickerQuery('');
                  setPickerTarget({kind: 'vendor'});
                },
              )}
              <View style={styles.formRow2}>
                <View style={styles.formGroupFlex}>
                  {formRow('Bill ID', form.billId, t => setField('billId', t), 'e.g., BILL-001')}
                </View>
                <View style={styles.formGroupFlex}>
                  {formRow('Batch', form.batch, t => setField('batch', t), 'e.g., BATCH-001')}
                </View>
              </View>
              {formRow('Date *', form.purchaseDate, t => setField('purchaseDate', t), 'YYYY-MM-DD')}

              <Text style={styles.formSectionLabel}>Products</Text>
              {!form.vendorId ? (
                <Text style={styles.formEmptyText}>Select a vendor first to add products.</Text>
              ) : selectedVendorProductsCount === 0 ? (
                <Text style={styles.formEmptyText}>No vendor invoices found for this vendor.</Text>
              ) : null}

              {form.vendorId && selectedVendorProductsCount > 0 && (
                <View style={styles.addProductField}>
                  <Package size={16} color="#059669" />
                  <TouchableOpacity
                    style={styles.addProductSelect}
                    onPress={() => {
                      setPickerQuery('');
                      setPickerTarget({kind: 'product'});
                    }}>
                    <Text style={styles.addProductPlaceholder}>Select a product to add...</Text>
                    <ChevronDown size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              )}

              {form.items.length > 0 && (
                <View>
                  {form.items.map((item, index) => {
                    const vp = vendorProducts.find(p => p.productId === item.productId);
                    const availableSNs = getAvailableSNs(item.productId, form.items, index);
                    const totalSNs = vp ? vp.allSNs.length : 0;
                    const isNoSN = !vp || vp.allSNs.length === 0 || totalSNs === 0;
                    const maxQty = isNoSN ? 99999 : availableSNs.length || 1;
                    const entrySNs = parseSNs(item.serialNumber);
                    const itemSubtotal = (Number(item.quantity) || 0) * (parseFloat(item.purchasePrice) || 0);
                    const merge = mergeTargets[index];

                    return (
                      <View key={index} style={styles.itemBox}>
                        <View style={styles.itemHeader}>
                          <View style={styles.itemNameRow}>
                            <Text style={styles.itemTitle} numberOfLines={1}>
                              {item.productName}
                            </Text>
                            {entrySNs.length > 0 && (
                              <View style={styles.snChip}>
                                <Text style={styles.snChipText} numberOfLines={1}>
                                  {entrySNs.length === 1 ? `SN: ${entrySNs[0]}` : `${entrySNs[0]} (1/${entrySNs.length})`}
                                </Text>
                              </View>
                            )}
                          </View>
                          <TouchableOpacity style={styles.removeItemBtn} onPress={() => removeItem(index)}>
                            <Trash2 size={14} color="#DC2626" />
                          </TouchableOpacity>
                        </View>

                        {!editing && (
                          <TouchableOpacity
                            style={[styles.mergeRow, merge.exists ? styles.mergeRowActive : styles.mergeRowInactive]}
                            disabled={!merge.exists}
                            onPress={() => updateItemField(index, 'mergeExisting', !item.mergeExisting)}>
                            <View style={[styles.mergeCheck, item.mergeExisting && styles.mergeCheckOn]}>
                              {item.mergeExisting ? <Check size={12} color="#FFFFFF" /> : null}
                            </View>
                            <View style={styles.mergeInfo}>
                              <Text style={[styles.mergeLabel, merge.exists ? styles.mergeLabelActive : styles.mergeLabelInactive]}>
                                Merge into existing entry
                              </Text>
                              <Text style={styles.mergeHint}>
                                {merge.exists
                                  ? item.mergeExisting
                                    ? `Will add to purchase ${merge.purchaseNumber || '(no number)'}`
                                    : `A matching entry exists (${merge.purchaseNumber || 'same batch'})`
                                  : 'No matching existing entry for this product/price/batch'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        )}

                        <View style={styles.formRow2}>
                          <View style={styles.formGroupFlex}>
                            <View style={styles.formGroup}>
                              <Text style={styles.formLabel}>Selling Price (from vendor invoice)</Text>
                              <TextInput
                                style={[styles.formInput, styles.formInputReadOnly]}
                                value={item.sellingPrice}
                                editable={false}
                              />
                            </View>
                          </View>
                          <View style={styles.formGroupFlex}>
                            <View style={styles.formGroup}>
                              <Text style={styles.formLabel}>
                                Quantity * {!isNoSN && maxQty > 0 ? `(max ${maxQty})` : ''}
                              </Text>
                              <TextInput
                                style={styles.formInput}
                                keyboardType="numeric"
                                value={item.quantity}
                                onChangeText={t => {
                                  if (t === '' || /^\d+$/.test(t)) {
                                    updateItemField(index, 'quantity', t);
                                  }
                                }}
                              />
                              {item.productId ? (
                                <Text style={styles.fieldHint}>
                                  {totalSNs > 0
                                    ? `${item.quantity || 0} of ${totalSNs} SNs assigned`
                                    : 'No SNs on this product'}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        </View>

                        <View style={styles.formRow3}>
                          <View style={styles.formGroupFlex}>
                            <View style={styles.formGroup}>
                              <Text style={styles.formLabel}>FOC/Normal</Text>
                              <TouchableOpacity
                                style={styles.formSelect}
                                onPress={() =>
                                  setSelectSheet({
                                    key: `foc:${index}`,
                                    title: 'FOC / Normal',
                                    options: FOC_OPTIONS,
                                    selected: item.focNormal,
                                    onSelect: v => updateItemField(index, 'focNormal', v),
                                  })
                                }>
                                <Text style={styles.formSelectValue}>
                                  {FOC_OPTIONS.find(o => o.value === item.focNormal)?.label || 'Normal'}
                                </Text>
                                <ChevronDown size={16} color="#6B7280" />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <View style={styles.formGroupFlex}>
                            <View style={styles.formGroup}>
                              <Text style={styles.formLabel}>Expiry Date</Text>
                              <TextInput
                                style={styles.formInput}
                                value={item.expiryDate}
                                onChangeText={t => updateItemField(index, 'expiryDate', t)}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#9CA3AF"
                              />
                            </View>
                          </View>
                          <View style={styles.formGroupFlex}>
                            <View style={styles.formGroup}>
                              <Text style={styles.formLabel}>Serial / MAC</Text>
                              <TextInput
                                style={[styles.formInput, styles.formInputReadOnly, styles.formInputMono]}
                                value={item.serialNumber}
                                editable={false}
                                placeholder="Auto-assigned from vendor invoice"
                                placeholderTextColor="#9CA3AF"
                              />
                            </View>
                          </View>
                        </View>

                        <View style={styles.itemSubtotal}>
                          <Text style={styles.itemSubtotalLabel}>Amount</Text>
                          <Text style={styles.itemSubtotalValue}>
                            PKR {fmtPKR(itemSubtotal)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.formRow2}>
                <View style={styles.formGroupFlex}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Discount</Text>
                    <View style={styles.amountInputBox}>
                      <Percent size={14} color="#6B7280" />
                      <TextInput
                        style={styles.amountInput}
                        keyboardType="numeric"
                        value={form.discount}
                        onChangeText={t => setField('discount', t)}
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.formGroupFlex}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Sales Tax</Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="numeric"
                      value={form.salesTax}
                      onChangeText={t => setField('salesTax', t)}
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formRow2}>
                <View style={styles.formGroupFlex}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Wth Tax</Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="numeric"
                      value={form.wthTax}
                      onChangeText={t => setField('wthTax', t)}
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
                <View style={styles.formGroupFlex}>
                  {selectField(
                    'Status',
                    STATUS_OPTIONS.find(o => o.value === form.status)?.label || '',
                    'Select status',
                    () =>
                      setSelectSheet({
                        key: 'status',
                        title: 'Select status',
                        options: STATUS_OPTIONS,
                        selected: form.status,
                        onSelect: v => setField('status', v),
                      }),
                  )}
                </View>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>PKR {fmtPKR(totalAmount)}</Text>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setFormOpen(false)}
                  disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <GradientButton
                  colors={['#10B981', '#16A34A']}
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editing ? 'Update' : 'Add Purchase'}</Text>
                  )}
                </GradientButton>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6'},
  header: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    marginTop: 50, marginLeft: 16, paddingVertical: 8, paddingHorizontal: 8,
    backgroundColor: '#6D28D9', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#6D28D9', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
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
  headerCount: {fontSize: 12, color: '#E9D5FF'},
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
  statsRow: {paddingHorizontal: 16, paddingTop: 14, gap: 10},
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 10,
    minWidth: 170,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  statLabel: {fontSize: 11, color: '#6B7280', fontWeight: '500'},
  statValue: {fontSize: 18, fontWeight: '700', color: '#111827'},
  filterRow: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14},
  filterField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    flex: 1,
  },
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  filterSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 42,
    minWidth: 130,
    justifyContent: 'space-between',
  },
  filterSelectText: {flex: 1, fontSize: 13, color: '#111827', marginRight: 4},
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexShrink: 0,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginLeft: 6},
  list: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30},
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 6},
  rowIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1},
  billId: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    marginBottom: 2,
  },
  cardName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  statusText: {fontSize: 11, fontWeight: '600'},
  infoRow: {flexDirection: 'row', paddingVertical: 5},
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 80},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  infoValueMono: {
    flex: 1, fontSize: 12, color: '#374151', fontWeight: '500',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  expandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F5F3FF',
    gap: 4,
  },
  expandChipText: {fontSize: 12, color: '#8B5CF6', fontWeight: '600'},
  expandChipTextMuted: {color: '#9CA3AF'},
  chevronUp: {transform: [{rotate: '180deg'}]},
  entriesBox: {marginTop: 10, borderRadius: 8, borderWidth: 1, borderColor: '#EDE9FE', padding: 8, backgroundColor: '#FAFAFA'},
  entriesTitle: {fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6},
  entriesHeaderRow: {flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#E5E7EB'},
  entryHeadCell: {flex: 1, fontSize: 11, fontWeight: '600', color: '#6B7280'},
  entryIndex: {flex: 0.4},
  entryRight: {textAlign: 'right'},
  entriesTableRow: {flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6'},
  entryCell: {flex: 1, fontSize: 12, color: '#374151'},
  entryMono: {fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}), fontSize: 11},
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, marginTop: 6,
  },
  quantityBox: {alignItems: 'flex-start'},
  quantityLabel: {fontSize: 11, color: '#9CA3AF'},
  quantityValue: {fontSize: 16, fontWeight: '700', color: '#111827'},
  priceBox: {alignItems: 'flex-end', flex: 1, paddingHorizontal: 8},
  priceLabel: {fontSize: 11, color: '#9CA3AF'},
  priceValue: {fontSize: 13, fontWeight: '700', color: '#111827'},
  cardActions: {flexDirection: 'row', gap: 6},
  payBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#D1FAE5',
  },
  printBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
  },
  editBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#EDE9FE',
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FEF2F2',
  },
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280', textAlign: 'center'},
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
  },
  retryBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
  pagination: {paddingTop: 6},
  paginationInfo: {fontSize: 13, color: '#6B7280', marginBottom: 10},
  pageControls: {flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'},
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  pageBtnDisabled: {opacity: 0.5},
  pageBtnText: {fontSize: 12, color: '#374151', fontWeight: '500'},
  pageBtnTextDisabled: {color: '#D1D5DB'},
  pageNum: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNumText: {fontSize: 12, color: '#374151'},
  pageNumTextActive: {color: '#FFFFFF', fontWeight: '600'},
  ellipsis: {paddingHorizontal: 4, color: '#6B7280'},
  goTo: {flexDirection: 'row', alignItems: 'center', gap: 4},
  goToInput: {
    width: 52,
    height: 32,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 12,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    paddingVertical: 0,
  },
  goToBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageSizeRow: {flexDirection: 'row', alignItems: 'center', marginTop: 12},
  pageSizeLabel: {fontSize: 12, color: '#6B7280', marginRight: 8},
  pageSizeSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 84,
  },
  pageSizeSelectText: {fontSize: 13, color: '#111827', fontWeight: '600', marginRight: 8},
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '75%',
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
  sheetHeaderTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  sheetTitle: {fontSize: 16, fontWeight: '600', color: '#111827'},
  sheetClose: {fontSize: 16, color: '#6B7280', padding: 4},
  sheetScroll: {paddingBottom: 20},
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetOptionText: {fontSize: 15, color: '#374151', fontWeight: '500', flex: 1, marginRight: 8},
  sheetOptionTextActive: {color: '#8B5CF6', fontWeight: '600'},
  sheetOptionText2: {fontSize: 15, color: '#374151', fontWeight: '500'},
  sheetOptionInfo: {flex: 1},
  sheetOptionSub: {fontSize: 11, color: '#059669', marginTop: 2, fontWeight: '600'},
  sheetEmpty: {paddingVertical: 30, alignItems: 'center'},
  sheetEmptyText: {fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 24},
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  pickerSearchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  formOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  formSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '95%',
  },
  formSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  formSheetTitleRow: {flexDirection: 'row', alignItems: 'center', flex: 1},
  formSheetIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  formSheetTitle: {fontSize: 16, fontWeight: '600', color: '#111827', flex: 1},
  formBody: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40},
  formGroup: {marginBottom: 14},
  formGroupFlex: {flex: 1},
  formRow2: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
  formRow3: {flexDirection: 'row', gap: 8, alignItems: 'flex-start'},
  formLabel: {fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6},
  formInput: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827',
  },
  formInputReadOnly: {backgroundColor: '#F9FAFB', color: '#374151'},
  formInputMono: {fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}), fontSize: 12},
  formSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formSelectValue: {flex: 1, fontSize: 15, color: '#111827', marginRight: 8},
  formSelectPlaceholder: {flex: 1, fontSize: 15, color: '#9CA3AF', marginRight: 8},
  formSectionLabel: {fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 4, marginBottom: 10},
  formEmptyText: {fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16},
  fieldHint: {fontSize: 10, color: '#9CA3AF', marginTop: 4},
  addProductField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  addProductSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  addProductPlaceholder: {fontSize: 14, color: '#059669', fontWeight: '500'},
  itemBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemNameRow: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8},
  itemTitle: {fontSize: 13, fontWeight: '600', color: '#111827', flexShrink: 1},
  snChip: {
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: '60%',
  },
  snChipText: {fontSize: 10, color: '#047857', fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'})},
  removeItemBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mergeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  mergeRowActive: {borderColor: '#A7F3D0', backgroundColor: '#ECFDF5'},
  mergeRowInactive: {borderColor: '#E5E7EB', backgroundColor: '#F9FAFB'},
  mergeCheck: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  mergeCheckOn: {backgroundColor: '#059669', borderColor: '#059669'},
  mergeInfo: {flex: 1},
  mergeLabel: {fontSize: 12, fontWeight: '600'},
  mergeLabelActive: {color: '#047857'},
  mergeLabelInactive: {color: '#6B7280'},
  mergeHint: {fontSize: 10, color: '#6B7280', marginTop: 2, lineHeight: 14},
  itemSubtotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  itemSubtotalLabel: {fontSize: 12, color: '#9CA3AF'},
  itemSubtotalValue: {fontSize: 14, fontWeight: '700', color: '#111827'},
  amountInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 14,
  },
  amountInput: {flex: 1, paddingVertical: 10, fontSize: 15, color: '#111827', marginLeft: 6},
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  totalLabel: {fontSize: 14, fontWeight: '600', color: '#6B7280'},
  totalValue: {fontSize: 18, fontWeight: '700', color: '#059669'},
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {fontSize: 14, color: '#DC2626', fontWeight: '600'},
  saveBtn: {
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  saveBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
});