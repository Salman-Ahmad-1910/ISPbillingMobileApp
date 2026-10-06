import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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
  Building2,
  Calendar,
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  Filter,
  Printer,
  Package,
  Percent,
  Plus,
} from 'lucide-react-native';
import {
  getVendorInvoices,
  createVendorInvoice,
  updateVendorInvoice,
  deleteVendorInvoice,
  getVendors,
  getProducts,
} from '../../api/inventory';
import {VendorInvoice, Vendor, Product, VendorInvoiceItem, Company} from '../../types';
import {GradientButton} from '../../components/GradientButton';
import {GradientView} from '../../components/GradientView';
import {useAuth} from '../../context/AuthContext';

const PAGE_SIZES = [5, 10, 20, 50, 100];

const fmtPKR = (n: number) => new Intl.NumberFormat('en-US').format(Number(n) || 0);

const unitTypeLabel = (u?: string) =>
  u === 'piece'
    ? 'Per Piece'
    : u === 'meter'
      ? 'Per Meter'
      : u === 'kilogram'
        ? 'Per Kg'
        : u === 'liter'
          ? 'Per Liter'
          : u || '—';

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

function VendorInvoicesDivider() {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="vendorInvoicesHeroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#F59E0B" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#EA580C" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#EA580C" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#vendorInvoicesHeroGrad)" />
      </Svg>
    </View>
  );
}

interface FormEntry {
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  sellingPrice: string;
  unitType: string;
  serialNumber: string;
  expandedItems: VendorInvoiceItem[];
}

const emptyEntry = (): FormEntry => ({
  productId: '',
  productName: '',
  quantity: '1',
  unitPrice: '',
  sellingPrice: '',
  unitType: 'piece',
  serialNumber: '',
  expandedItems: [],
});

interface FormState {
  vendorId: string;
  vendorName: string;
  invoiceDate: string;
  batch: string;
  discount: string;
  entries: FormEntry[];
}

const emptyForm: FormState = {
  vendorId: '',
  vendorName: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  batch: '',
  discount: '',
  entries: [emptyEntry()],
};

function buildInvoicePrintHtml(
  invoice: VendorInvoice,
  vendor: Vendor | undefined,
  company: Company | null,
): string {
  const companyName = company?.name || 'Fintrack ERP';
  const companyAddress = company?.address || '';
  const companyPhone = company?.contact1 || company?.contact2 || '';
  const discount = invoice.discount || 0;
  const subtotal = (invoice.items || []).reduce(
    (sum, item) => sum + (Number(item.subtotal) || 0),
    0,
  ) || invoice.totalAmount;
  const total = invoice.totalAmount;

  const expandedRows: {productName: string; serialNumber: string; quantity: number; unitType: string; unitPrice: number; subtotal: number}[] = [];
  for (const item of invoice.items || []) {
    const sns = parseSNs(item.serialNumber);
    const perUnit = Number(item.purchasePrice ?? item.unitPrice) || 0;
    if (sns.length === 0) {
      expandedRows.push({productName: item.productName, serialNumber: '-', quantity: item.quantity || 1, unitType: item.unitType || 'pcs', unitPrice: perUnit, subtotal: perUnit * (item.quantity || 1)});
    } else {
      for (const sn of sns) {
        expandedRows.push({productName: item.productName, serialNumber: sn, quantity: 1, unitType: item.unitType || 'pcs', unitPrice: perUnit, subtotal: perUnit});
      }
    }
  }

  const rowsHtml = expandedRows
    .map(
      row => `<tr class="${row.serialNumber === '-' ? 'no-sn' : ''}">
        <td>${escapeHtml(row.productName)}</td>
        <td class="mono">${escapeHtml(row.serialNumber)}</td>
        <td class="c">${row.quantity}</td>
        <td class="c">${row.unitType === 'meter' ? 'Mtr' : 'Pcs'}</td>
        <td class="r">${row.unitPrice.toFixed(2)}</td>
        <td class="r">${row.subtotal.toFixed(2)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; margin: 0; padding: 24px; }
  .container { max-width: 700px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #111827; margin-bottom: 32px; }
  .company h1 { font-size: 22px; font-weight: 800; margin: 0 0 4px 0; }
  .company p { color: #4B5563; font-size: 13px; margin: 2px 0; }
  .title { font-size: 32px; font-weight: 800; letter-spacing: 2px; color: #059669; margin: 0; }
  .meta { font-size: 13px; margin-top: 12px; color: #6B7280; text-align: right; }
  .meta span { color: #111827; font-weight: 600; }
  h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #374151; margin: 0 0 8px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px; }
  th { background: #059669; color: #fff; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  th.r { text-align: right; } th.c { text-align: center; }
  td { border: 1px solid #D1D5DB; padding: 10px; }
  td.r { text-align: right; font-weight: 600; } td.c { text-align: center; } td.mono { font-family: monospace; font-size: 12px; }
  tr.no-sn td { color: #6B7280; }
  tfoot td { background: #F9FAFB; font-weight: 800; }
  footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #D1D5DB; }
  .sig { display: flex; justify-content: space-between; margin-top: 48px; }
  .sig div { width: 200px; text-align: center; }
  .sig .line { border-bottom: 1px solid #111827; height: 40px; }
  .sig p { font-size: 11px; color: #6B7280; margin: 4px 0 0 0; }
  .center { text-align: center; margin-top: 24px; color: #6B7280; }
  .center b { font-size: 16px; color: #111827; }
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
        <h2 class="title">VENDOR INVOICE</h2>
        <div class="meta">
          <div>Invoice #: <span>${escapeHtml(invoice.invoiceNumber)}</span></div>
          <div>Date: <span>${escapeHtml(invoice.invoiceDate)}</span></div>
          <div>Vendor: <span>${escapeHtml(vendor?.name || invoice.vendorName)}</span></div>
          ${discount > 0 ? `<div>Discount: <span>${discount.toFixed(2)}</span></div>` : ''}
        </div>
      </div>
    </header>

    <h3>Product Details</h3>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>SN / MAC</th>
          <th class="c">Qty</th>
          <th class="c">Unit</th>
          <th class="r">Price</th>
          <th class="r">Total</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        ${discount > 0 ? `<tr><td colspan="5">SUBTOTAL</td><td class="r">${subtotal.toFixed(2)}</td></tr>` : ''}
        ${discount > 0 ? `<tr><td colspan="5">DISCOUNT</td><td class="r">- ${discount.toFixed(2)}</td></tr>` : ''}
        <tr><td colspan="5">${discount > 0 ? 'TOTAL' : 'TOTAL'}</td><td class="r">${total.toFixed(2)}</td></tr>
      </tfoot>
    </table>

    <footer>
      <div class="sig">
        <div>
          <div class="line"></div>
          <p>Company Stamp</p>
        </div>
        <div>
          <div class="line"></div>
          <p>Vendor Signature</p>
        </div>
      </div>
      <div class="center">
        <b>${escapeHtml(companyName)}</b>
        ${companyPhone ? `<p>Phone: ${escapeHtml(companyPhone)}</p>` : ''}
      </div>
    </footer>
  </div>
</body>
</html>`;
}

export default function VendorInvoicesScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();
  const {companyId, companies} = useAuth();
  const [items, setItems] = useState<VendorInvoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VendorInvoice | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<
    {kind: 'vendor'} | {kind: 'product'; index: number} | null
  >(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [printTarget, setPrintTarget] = useState<VendorInvoice | null>(null);
  const [printing, setPrinting] = useState(false);

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
      const [invoices, vendorData, productData] = await Promise.all([
        getVendorInvoices(),
        getVendors().catch(() => [] as Vendor[]),
        getProducts().catch(() => [] as Product[]),
      ]);
      setItems(invoices);
      setFiltered(invoices);
      setVendors(vendorData);
      setProducts(productData);
    } catch (err: any) {
      const reason =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load vendor invoices. Check your connection and try again.';
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
  }, [search, vendorFilter]);

  useEffect(() => {
    let result = items;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(q) ||
        (invoice.vendorName || '').toLowerCase().includes(q) ||
        (invoice.items || []).some(item => (item.productName || '').toLowerCase().includes(q)),
      );
    }

    if (vendorFilter.trim()) {
      result = result.filter(invoice => invoice.vendorId === vendorFilter);
    }

    setFiltered(result);
  }, [items, search, vendorFilter]);

  const totalSpent = items.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  const avgPerPurchase = items.length > 0 ? Math.round(totalSpent / items.length) : 0;

  const statCards: {key: string; label: string; value: string; icon: any; gradient: [string, string]}[] = [
    {key: 'total', label: 'Total Invoices', value: String(items.length), icon: ShoppingCart, gradient: ['#F59E0B', '#EA580C']},
    {key: 'spent', label: 'Total Spent', value: `PKR ${fmtPKR(totalSpent)}`, icon: DollarSign, gradient: ['#10B981', '#16A34A']},
    {key: 'avg', label: 'Avg Per Purchase', value: `PKR ${fmtPKR(avgPerPurchase)}`, icon: Receipt, gradient: ['#3B82F6', '#06B6D4']},
  ];

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getAvailableSNs = useCallback(
    (productId: string, excludeEntryIndex: number): string[] => {
      const product = products.find(p => p.id === productId);
      if (!product) return [];
      const allSNs = parseSNs(product.serialNumber);
      const usedByOthers = new Set<string>();
      form.entries.forEach((entry, i) => {
        if (i === excludeEntryIndex) return;
        if (entry.productId === productId) {
          entry.expandedItems.forEach(item => {
            parseSNs(item.serialNumber).forEach(sn => usedByOthers.add(sn));
          });
        }
      });
      return allSNs.filter(sn => !usedByOthers.has(sn));
    },
    [products, form.entries],
  );

  const entrySubtotal = (entry: FormEntry) =>
    entry.expandedItems.reduce((s, item) => s + (Number(item.subtotal) || 0), 0);

  const formSubtotal = useMemo(
    () => form.entries.reduce((sum, entry) => sum + entrySubtotal(entry), 0),
    [form.entries],
  );

  const formDiscount = parseFloat(form.discount) || 0;
  const totalAmount = Math.max(0, formSubtotal - formDiscount);

  const updateEntry = (index: number, field: keyof FormEntry, value: any) => {
    setForm(prev => {
      const updated = prev.entries.map(entry => ({...entry}));

      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        if (!product) return prev;
        const unitPrice = Number(product.purchasePrice || product.price) || 0;
        const sellingPrice = Number(product.salePrice || product.price) || 0;
        const usedByOthers = new Set<string>();
        prev.entries.forEach((entry, i) => {
          if (i === index) return;
          if (entry.productId === value) {
            entry.expandedItems.forEach(item => {
              parseSNs(item.serialNumber).forEach(sn => usedByOthers.add(sn));
            });
          }
        });
        const allSNs = parseSNs(product.serialNumber);
        const availableSNs = allSNs.filter(sn => !usedByOthers.has(sn));
        const maxQty = availableSNs.length;
        const qty =
          availableSNs.length > 0
            ? Math.max(1, Math.min(Number(updated[index].quantity) || 1, maxQty))
            : Math.max(1, Number(updated[index].quantity) || 1);
        const selectedSNs = availableSNs.slice(0, qty);
        const snString = selectedSNs.join(', ');
        const item: VendorInvoiceItem = {
          productId: value,
          productName: product.name,
          quantity: qty,
          unitPrice,
          purchasePrice: unitPrice,
          sellingPrice,
          unitType: product.unitType || 'piece',
          subtotal: unitPrice * qty,
          serialNumber: snString,
        };
        updated[index] = {
          ...updated[index],
          productId: value,
          productName: product.name,
          unitType: product.unitType || 'piece',
          unitPrice: String(unitPrice),
          sellingPrice: String(sellingPrice),
          quantity: String(qty),
          serialNumber: snString,
          expandedItems: [item],
        };
      } else if (field === 'quantity') {
        const productId = updated[index].productId;
        if (!productId) return prev;
        const availableSNs = getAvailableSNs(productId, index);
        const maxQty = availableSNs.length;
        const qty =
          availableSNs.length > 0
            ? Math.max(1, Math.min(Number(value) || 1, maxQty))
            : Math.max(1, Number(value) || 1);
        const unitPrice = parseFloat(updated[index].unitPrice) || 0;
        const sellingPrice = parseFloat(updated[index].sellingPrice) || 0;
        const snString = availableSNs.slice(0, qty).join(', ');
        const item: VendorInvoiceItem = {
          productId,
          productName: updated[index].productName,
          quantity: qty,
          unitPrice,
          purchasePrice: unitPrice,
          sellingPrice,
          unitType: updated[index].unitType,
          subtotal: unitPrice * qty,
          serialNumber: snString,
        };
        updated[index] = {
          ...updated[index],
          quantity: String(qty),
          serialNumber: snString,
          expandedItems: [item],
        };
      } else if (field === 'unitPrice') {
        const price = parseFloat(value) || 0;
        updated[index] = {
          ...updated[index],
          unitPrice: String(price),
          expandedItems: updated[index].expandedItems.map(item => ({
            ...item,
            unitPrice: price,
            purchasePrice: price,
            subtotal: price * (Number(item.quantity) || 1),
          })),
        };
      } else if (field === 'sellingPrice') {
        const price = parseFloat(value) || 0;
        updated[index] = {
          ...updated[index],
          sellingPrice: String(price),
          expandedItems: updated[index].expandedItems.map(item => ({
            ...item,
            sellingPrice: price,
          })),
        };
      }

      return {...prev, entries: updated};
    });
  };

  const addEntry = () => {
    setForm(prev => ({...prev, entries: [...prev.entries, emptyEntry()]}));
  };

  const removeEntry = (index: number) => {
    setForm(prev => {
      let entries = prev.entries.filter((_, i) => i !== index);
      if (entries.length === 0) {
        entries = [emptyEntry()];
      }
      return {...prev, entries};
    });
  };

  const openAdd = () => {
    setEditing(null);
    setForm({...emptyForm, entries: [emptyEntry()]});
    setFormOpen(true);
  };

  const openEdit = (invoice: VendorInvoice) => {
    setEditing(invoice);
    const grouped = new Map<string, FormEntry>();
    for (const item of invoice.items || []) {
      const key = item.productId;
      if (grouped.has(key)) {
        grouped.get(key)!.expandedItems.push(item);
      } else {
        grouped.set(key, {
          productId: key,
          productName: item.productName,
          quantity: String(item.quantity || 1),
          unitPrice: String(item.purchasePrice ?? item.unitPrice ?? ''),
          sellingPrice: String(item.sellingPrice ?? ''),
          unitType: item.unitType || 'piece',
          serialNumber: parseSNs(item.serialNumber).join(', '),
          expandedItems: [item],
        });
      }
    }
    setForm(prev => ({
      ...prev,
      vendorId: invoice.vendorId || '',
      vendorName: invoice.vendorName || '',
      invoiceDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
      batch: invoice.batch || '',
      discount: String(invoice.discount || ''),
      entries: grouped.size > 0 ? Array.from(grouped.values()) : [emptyEntry()],
    }));
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.vendorId) {
      Alert.alert('Error', 'Please select a vendor');
      return;
    }
    if (!form.invoiceDate.trim()) {
      Alert.alert('Error', 'Buying date is required');
      return;
    }
    const allItems: VendorInvoiceItem[] = [];
    for (const entry of form.entries) {
      if (!entry.productId) continue;
      allItems.push(...entry.expandedItems);
    }
    if (allItems.length === 0) {
      Alert.alert('Error', 'Please add at least one product with a valid quantity.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        vendorId: form.vendorId,
        vendorName: form.vendorName || form.vendorId,
        invoiceNumber: editing?.invoiceNumber || '',
        invoiceDate: form.invoiceDate.trim(),
        batch: form.batch.trim(),
        discount: formDiscount || 0,
        totalAmount,
        items: allItems,
      };
      if (editing) {
        await updateVendorInvoice(editing.id, payload);
      } else {
        await createVendorInvoice(payload);
      }
      setFormOpen(false);
      setEditing(null);
      fetchData(false);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to save vendor invoice';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (invoice: VendorInvoice) => {
    Alert.alert(
      'Delete Vendor Invoice',
      `Delete invoice ${invoice.invoiceNumber}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVendorInvoice(invoice.id);
              fetchData(false);
            } catch (err: any) {
              const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                'Failed to delete vendor invoice';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  const handlePrint = async (invoice: VendorInvoice) => {
    setPrintTarget(invoice);
    setPrinting(true);
    try {
      const vendor = vendors.find(v => v.id === invoice.vendorId);
      const company = companies.find(c => c.id === companyId) || companies[0] || null;
      const html = buildInvoicePrintHtml(invoice, vendor, company);
      await RNPrint.print({
        html,
        jobName: `Vendor Invoice ${invoice.invoiceNumber}`,
      });
    } catch (err: any) {
      Alert.alert('Print Error', err?.message || 'Could not start the print job.');
    } finally {
      setPrinting(false);
      setPrintTarget(null);
    }
  };

  const currentCompany = useMemo(
    () => companies.find(c => c.id === companyId) || companies[0] || null,
    [companies, companyId],
  );

  const groupedProducts = useMemo(
    () =>
      products.map(p => ({
        id: p.id,
        name: p.name,
        totalSNs: parseSNs(p.serialNumber).length,
      })),
    [products],
  );

  const filteredVendors = vendors.filter(v => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return true;
    return (v.name || '').toLowerCase().includes(q);
  });

  const filteredProducts = groupedProducts.filter(p => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return true;
    return (p.name || '').toLowerCase().includes(q);
  });

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

  const selectedVendorFilter = vendors.find(v => v.id === vendorFilter);

  const renderItem = ({item, index}: {item: VendorInvoice; index: number}) => {
    const itemsArr = item.items || [];
    const productNames = itemsArr
      .map(i => i.productName)
      .filter(Boolean)
      .join(', ');
    const totalQty = itemsArr.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const allSNs = itemsArr.flatMap(i => parseSNs(i.serialNumber));
    const distinctProductIds = new Set(itemsArr.map(i => i.productId).filter(Boolean));
    const itemCount = distinctProductIds.size;
    const singleProductId = distinctProductIds.size === 1 ? Array.from(distinctProductIds)[0] : '';
    const product = products.find(p => p.id === singleProductId);
    let remaining = allSNs.length;
    if (product && singleProductId) {
      const productSNs = parseSNs(product.serialNumber);
      const consumed = Math.min(product.currentSerialIndex ?? 0, productSNs.length);
      const consumedSet = new Set(productSNs.slice(0, consumed));
      remaining = allSNs.filter(sn => !consumedSet.has(sn)).length;
    }
    const displaySn =
      allSNs.length === 0
        ? '—'
        : allSNs.length === 1
          ? allSNs[0]
          : `${allSNs[0]} (${remaining}/${allSNs.length})`;
    const purchasePrice =
      itemCount > 1 ? '—' : `PKR ${Number((itemsArr[0]?.purchasePrice ?? itemsArr[0]?.unitPrice) || 0).toFixed(2)}`;
    const expandable = allSNs.length > 1;
    const isExpanded = expanded.has(item.id);
    const toggleExpand = () => {
      setExpanded(prev => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });
    };
    const entryRows: {productName: string; serialNumber: string; price: number}[] = [];
    for (const itm of itemsArr) {
      for (const sn of parseSNs(itm.serialNumber)) {
        entryRows.push({
          productName: itm.productName,
          serialNumber: sn,
          price: Number(itm.purchasePrice ?? itm.unitPrice) || 0,
        });
      }
    }
    return (
      <View style={styles.card}>
        <TouchableOpacity activeOpacity={0.7} onPress={toggleExpand}>
          <View style={styles.cardHeader}>
            <Text style={styles.rowIndex}>{index + 1 + (currentPage - 1) * pageSize}</Text>
            <View style={styles.cardInfo}>
              <Text style={styles.invoiceNumber} numberOfLines={1}>
                {item.invoiceNumber || '—'}
              </Text>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.vendorName || '—'}
              </Text>
            </View>
            <View style={[styles.expandChip, !expandable && styles.expandChipDisabled]}>
              <Text style={styles.expandChipText}>{expandable ? (isExpanded ? '−' : '+') : ''}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vendor</Text>
            <View style={styles.infoValueRow}>
              <Building2 size={13} color="#6B7280" />
              <Text style={styles.infoValue} numberOfLines={1}>
                {item.vendorName || '-'}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Buying Date</Text>
            <View style={styles.infoValueRow}>
              <Calendar size={13} color="#6B7280" />
              <Text style={styles.infoValue} numberOfLines={1}>
                {item.invoiceDate || '-'}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Batch</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {item.batch || '—'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Product</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {productNames || '—'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SN / MAC</Text>
            <Text style={styles.infoValueMono} numberOfLines={1}>
              {displaySn}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Qty</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {totalQty}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Purchase Price</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {purchasePrice}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              PKR {fmtPKR(item.totalAmount)}
            </Text>
          </View>
        </TouchableOpacity>

        {isExpanded && expandable ? (
          <View style={styles.entriesBox}>
            <View style={styles.entriesHeaderRow}>
              <View style={styles.entriesTitleRow}>
                <Text style={styles.entriesHeader}>Serial entries ({entryRows.length})</Text>
              </View>
            </View>
            <View style={styles.entriesTable}>
              <View style={styles.entriesRowHead}>
                <Text style={[styles.entryCell, styles.entryNum]}>#</Text>
                <Text style={[styles.entryCell, styles.entryProduct]}>Product</Text>
                <Text style={[styles.entryCell, styles.entrySn]}>SN / MAC</Text>
                <Text style={[styles.entryCell, styles.entryPrice]}>Price</Text>
              </View>
              {entryRows.map((row, i) => (
                <View key={`${item.id}-${i}-${row.serialNumber}`} style={styles.entriesRow}>
                  <Text style={[styles.entryCell, styles.entryNum]}>{i + 1}</Text>
                  <Text style={[styles.entryCell, styles.entryProduct]} numberOfLines={1}>
                    {row.productName}
                  </Text>
                  <Text style={[styles.entryCell, styles.entrySn]} numberOfLines={1}>
                    {row.serialNumber}
                  </Text>
                  <Text style={[styles.entryCell, styles.entryPrice]}>
                    PKR {fmtPKR(row.price)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Invoice Total</Text>
            <Text style={styles.totalValue}>PKR {fmtPKR(item.totalAmount)}</Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.printBtn}
              onPress={() => handlePrint(item)}
              disabled={printing}>
              {printing && printTarget?.id === item.id ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Printer size={15} color="#2563EB" />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
              <Pencil size={15} color="#D97706" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Trash2 size={15} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  const formRow = (
    label: string,
    value: string,
    onChangeText: (t: string) => void,
    placeholder = '',
    keyboardType: 'default' | 'email-address' | 'phone-pad' | 'numeric' | 'decimal-pad' = 'default',
    editable = true,
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={[styles.formInput, !editable && styles.formInputReadonly]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        editable={editable}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <GradientView colors={['#166534', '#22c55e']} style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Vendor Invoices</Text>
          <Text style={styles.headerCount}>{filtered.length} total</Text>
        </View>
      </GradientView>

      <FlatList
        data={paginated}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={['#F59E0B']}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Hero Header */}
            <View style={styles.heroHeader}>
              <GradientView colors={['#F59E0B', '#EA580C']} style={styles.heroIconBox}>
                <ShoppingCart size={20} color="#FFFFFF" />
              </GradientView>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>Vendor Invoices</Text>
                <Text style={styles.heroSubtitle}>
                  Manage vendor invoices and track product purchases with serial numbers.
                </Text>
              </View>
            </View>

            <VendorInvoicesDivider />

            {/* Stat cards */}
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
                    <Text style={styles.statValue} numberOfLines={1}>
                      {card.value}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Search + Filter + Add */}
            <View style={styles.toolbar}>
              <View style={styles.searchBox}>
                <Search size={16} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search purchases..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
                <Filter size={15} color="#D97706" />
                <Text style={styles.filterBtnText} numberOfLines={1}>
                  {selectedVendorFilter ? selectedVendorFilter.name : 'All Vendors'}
                </Text>
                <ChevronDown size={14} color="#6B7280" />
              </TouchableOpacity>
              <GradientButton
                colors={['#10B981', '#16A34A']}
                style={styles.addBtn}
                onPress={openAdd}>
                <PlusCircle size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText} numberOfLines={1}>
                  Buy a Product
                </Text>
              </GradientButton>
            </View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={styles.emptyTitle}>Failed to load vendor invoices</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyTitle}>No vendor invoices found</Text>
              <Text style={styles.emptyText}>
                {search || vendorFilter ? 'Try adjusting your search' : 'Buy your first product'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.pagination}>
            <Text style={styles.paginationInfo}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} invoices
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
                  style={[styles.pageNum, currentPage === page && {backgroundColor: '#F59E0B'}]}
                  onPress={() => setCurrentPage(page)}>
                  <Text
                    style={[
                      styles.pageNumText,
                      currentPage === page && styles.pageNumTextActive,
                    ]}>
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
                <Text
                  style={[
                    styles.pageBtnText,
                    currentPage === totalPages && styles.pageBtnTextDisabled,
                  ]}>
                  Next
                </Text>
                <ChevronRight size={14} color={currentPage === totalPages ? '#D1D5DB' : '#374151'} />
              </TouchableOpacity>
            </View>

            <View style={styles.pageSizeRow}>
              <Text style={styles.pageSizeLabel}>Rows per page</Text>
              <TouchableOpacity style={styles.pageSizeSelect} onPress={() => setPageSizeOpen(true)}>
                <Text style={styles.pageSizeSelectText}>{pageSize}</Text>
                <ChevronDown size={16} color="#6B7280" />
              </TouchableOpacity>
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
              <Text style={styles.sheetTitle}>Rows per page</Text>
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
                  {active ? <Check size={16} color="#F59E0B" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Vendor filter sheet */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter by Vendor</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll}>
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => {
                  setVendorFilter('');
                  setFilterOpen(false);
                }}>
                <View style={styles.sheetOptionRow}>
                  <Text
                    style={[
                      styles.sheetOptionText,
                      !vendorFilter && styles.sheetOptionTextActive,
                    ]}>
                    All Vendors
                  </Text>
                  {!vendorFilter ? <Check size={16} color="#F59E0B" /> : null}
                </View>
              </TouchableOpacity>
              {vendors.map(vendor => {
                const active = vendorFilter === vendor.id;
                return (
                  <TouchableOpacity
                    key={vendor.id}
                    style={styles.sheetOption}
                    onPress={() => {
                      setVendorFilter(vendor.id);
                      setFilterOpen(false);
                    }}>
                    <View style={styles.sheetOptionRow}>
                      <Building2 size={16} color="#6B7280" />
                      <Text
                        style={[
                          styles.sheetOptionText,
                          active && styles.sheetOptionTextActive,
                        ]}>
                        {vendor.name}
                      </Text>
                      {active ? <Check size={16} color="#F59E0B" /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Vendor / Product picker sheet */}
      <Modal
        visible={pickerTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerTarget(null)}>
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, styles.pickerSheet]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {pickerTarget?.kind === 'vendor' ? 'Select Vendor' : 'Select Product'}
              </Text>
              <TouchableOpacity onPress={() => setPickerTarget(null)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearch}>
              <Search size={16} color="#6B7280" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder={
                  pickerTarget?.kind === 'vendor' ? 'Search vendors...' : 'Search products...'
                }
                placeholderTextColor="#9CA3AF"
                value={pickerQuery}
                onChangeText={setPickerQuery}
                autoFocus
              />
            </View>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              {pickerTarget?.kind === 'vendor' &&
                filteredVendors.map(vendor => {
                  const active = form.vendorId === vendor.id;
                  return (
                    <TouchableOpacity
                      key={vendor.id}
                      style={styles.sheetOption}
                      onPress={() => {
                        setForm(prev => ({...prev, vendorId: vendor.id, vendorName: vendor.name}));
                        setPickerTarget(null);
                        setPickerQuery('');
                      }}>
                      <View style={styles.sheetOptionRow}>
                        <Building2 size={16} color="#6B7280" />
                        <Text
                          style={[
                            styles.sheetOptionText,
                            active && styles.sheetOptionTextActive,
                          ]}>
                          {vendor.name}
                        </Text>
                        {active ? <Check size={16} color="#F59E0B" /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              {pickerTarget?.kind === 'product' &&
                filteredProducts.map(product => {
                  const targetIndex = pickerTarget?.kind === 'product' ? pickerTarget.index : -1;
                  const active =
                    targetIndex >= 0 && form.entries[targetIndex]?.productId === product.id;
                  return (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.sheetOption}
                      onPress={() => {
                        if (pickerTarget?.kind === 'product') {
                          updateEntry(pickerTarget.index, 'productId', product.id);
                        }
                        setPickerTarget(null);
                        setPickerQuery('');
                      }}>
                      <View style={styles.sheetOptionRow}>
                        <View style={styles.pickIcon}>
                          <Package size={16} color="#059669" />
                        </View>
                        <Text
                          style={[
                            styles.sheetOptionText,
                            active && styles.sheetOptionTextActive,
                          ]}>
                          {product.name}
                        </Text>
                        {product.totalSNs > 0 ? (
                          <Text style={styles.pickerSecondary}>{product.totalSNs} SNs</Text>
                        ) : null}
                        {active ? <Check size={16} color="#F59E0B" /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              {((pickerTarget?.kind === 'vendor' && filteredVendors.length === 0) ||
                (pickerTarget?.kind === 'product' && filteredProducts.length === 0)) && (
                <Text style={styles.pickerEmpty}>No results found</Text>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add/Edit Vendor Invoice form */}
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
                <GradientView colors={['#F59E0B', '#EA580C']} style={styles.formSheetIcon}>
                  <ShoppingCart size={16} color="#FFFFFF" />
                </GradientView>
                <Text style={styles.formSheetTitle}>
                  {editing ? 'Edit Vendor Invoice' : 'Buy a Product'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFormOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Vendor *</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() => {
                    setPickerQuery('');
                    setPickerTarget({kind: 'vendor'});
                  }}>
                  <Building2 size={16} color="#D97706" />
                  <Text
                    style={[
                      styles.formSelectText,
                      !form.vendorId && styles.formSelectPlaceholder,
                    ]}
                    numberOfLines={1}>
                    {form.vendorId ? form.vendorName || form.vendorId : 'Search vendor...'}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formRow2}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Buying Date *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={form.invoiceDate}
                    onChangeText={t => setForm(prev => ({...prev, invoiceDate: t}))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Batch</Text>
                  <TextInput
                    style={styles.formInput}
                    value={form.batch}
                    onChangeText={t => setForm(prev => ({...prev, batch: t}))}
                    placeholder="e.g., BATCH-001"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.productSection}>
                <View style={styles.productSectionHeader}>
                  <Text style={styles.sectionLabel}>Product Details</Text>
                  <TouchableOpacity style={styles.addProductBtn} onPress={addEntry}>
                    <Plus size={15} color="#059669" />
                    <Text style={styles.addProductBtnText}>Add Product</Text>
                  </TouchableOpacity>
                </View>

                {form.entries.map((entry, index) => {
                  const product = products.find(p => p.id === entry.productId);
                  const totalSNs = product ? parseSNs(product.serialNumber || '').length : 0;
                  const availableSNs = entry.productId ? getAvailableSNs(entry.productId, index) : [];
                  const maxQty = availableSNs.length;
                  const entrySNs = parseSNs(entry.expandedItems[0]?.serialNumber);
                  const entrySnBadge =
                    entrySNs.length === 0
                      ? ''
                      : entrySNs.length === 1
                        ? `SN: ${entrySNs[0]}`
                        : `${entrySNs[0]} (1/${entrySNs.length})`;

                  return (
                    <View key={index} style={styles.entryCard}>
                      <View style={styles.entryCardHeader}>
                        <Text style={styles.entryIndex}>#{index + 1}</Text>
                        {entrySnBadge ? (
                          <View style={styles.entrySnBadge}>
                            <Text style={styles.entrySnBadgeText} numberOfLines={1}>
                              {entrySnBadge}
                            </Text>
                          </View>
                        ) : null}
                        <View style={{flex: 1}} />
                        <TouchableOpacity
                          style={styles.entryRemoveBtn}
                          onPress={() => removeEntry(index)}>
                          <Trash2 size={16} color="#DC2626" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Product *</Text>
                        <View style={styles.entryProductRow}>
                          <TouchableOpacity
                            style={[styles.formSelect, styles.entryProductSelect]}
                            onPress={() => {
                              setPickerQuery('');
                              setPickerTarget({kind: 'product', index});
                            }}>
                            <Package size={16} color="#059669" />
                            <Text
                              style={[
                                styles.formSelectText,
                                !entry.productId && styles.formSelectPlaceholder,
                              ]}
                              numberOfLines={1}>
                              {entry.productId ? entry.productName : 'Search product...'}
                            </Text>
                            <ChevronDown size={16} color="#6B7280" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {formRow(
                        'Unit Type',
                        entry.unitType === 'piece' ? 'Per Piece' : entry.unitType === 'meter' ? 'Per Meter' : entry.unitType || '—',
                        () => {},
                        '',
                        'default',
                        false,
                      )}

                      <View style={styles.formRow3}>
                        <View style={styles.formGroup}>
                          <Text style={styles.formLabel}>
                            Quantity *{maxQty > 0 ? ` (max ${maxQty})` : ''}
                          </Text>
                          <TextInput
                            style={styles.formInput}
                            keyboardType="numeric"
                            value={entry.quantity}
                            onChangeText={t => {
                              if (t === '' || /^\d*$/.test(t)) {
                                updateEntry(index, 'quantity', t === '' ? '1' : t);
                              }
                            }}
                          />
                          {entry.productId ? (
                            <Text style={styles.fieldHint}>
                              {totalSNs > 0
                                ? `${entry.quantity} of ${totalSNs} SNs will be consumed`
                                : 'No SNs on this product'}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.formGroup}>
                          <Text style={styles.formLabel}>Purchase Price *</Text>
                          <TextInput
                            style={styles.formInput}
                            keyboardType="decimal-pad"
                            value={entry.unitPrice}
                            onChangeText={t => {
                              if (t === '' || /^\d*\.?\d*$/.test(t)) {
                                updateEntry(index, 'unitPrice', t);
                              }
                            }}
                            placeholder={entry.productId ? 'Auto from product' : 'Select product first'}
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                        <View style={styles.formGroup}>
                          <Text style={styles.formLabel}>Selling Price *</Text>
                          <TextInput
                            style={styles.formInput}
                            keyboardType="decimal-pad"
                            value={entry.sellingPrice}
                            onChangeText={t => {
                              if (t === '' || /^\d*\.?\d*$/.test(t)) {
                                updateEntry(index, 'sellingPrice', t);
                              }
                            }}
                            placeholder={entry.productId ? 'Auto from product' : 'Select product first'}
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                      </View>

                      <View style={styles.entryFooterRow}>
                        <Text style={styles.entrySubtotalLabel}>Subtotal</Text>
                        <Text style={styles.entrySubtotalValue}>
                          PKR {entrySubtotal(entry).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>PKR {formSubtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <View style={styles.discountLabelRow}>
                    <Percent size={14} color="#059669" />
                    <Text style={styles.summaryLabel}>Discount</Text>
                  </View>
                  <TextInput
                    style={styles.discountInput}
                    keyboardType="decimal-pad"
                    value={form.discount}
                    onChangeText={t => {
                      if (t === '' || /^\d*\.?\d*$/.test(t)) {
                        setForm(prev => ({...prev, discount: t}));
                      }
                    }}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.summaryTotalRow}>
                  <Text style={styles.summaryTotalLabel}>Total Amount:</Text>
                  <Text style={styles.summaryTotalValue}>PKR {totalAmount.toFixed(2)}</Text>
                </View>
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
                    <Text style={styles.saveBtnText}>{editing ? 'Update' : 'Save'}</Text>
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
    backgroundColor: '#166534', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#166534', shadowOffset: {width: 0, height: 4},
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
    minWidth: 180,
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
  statValue: {fontSize: 17, fontWeight: '700', color: '#111827'},
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    minWidth: 90,
  },
  searchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 5,
    maxWidth: 140,
    flexShrink: 0,
  },
  filterBtnText: {fontSize: 12, color: '#374151', fontWeight: '600', flexShrink: 1},
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
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
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 4},
  rowIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    marginRight: 10,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  cardInfo: {flex: 1},
  invoiceNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    marginBottom: 2,
  },
  cardName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  expandChip: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: '#ECFDF5',
    justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  expandChipDisabled: {backgroundColor: '#F3F4F6'},
  expandChipText: {fontSize: 18, fontWeight: '700', color: '#10B981'},
  entriesBox: {
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    backgroundColor: '#F9FAFB',
  },
  entriesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  entriesTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  entriesHeader: {fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4},
  entriesTable: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  entriesRowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  entriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  entryCell: {fontSize: 12, color: '#374151'},
  entryNum: {width: 22, color: '#9CA3AF', fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'})},
  entryProduct: {flex: 1.2, fontWeight: '500', paddingRight: 8},
  entrySn: {flex: 1.5, fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}), paddingRight: 8},
  entryPrice: {width: 80, textAlign: 'right', color: '#4B5563'},
  cardActions: {flexDirection: 'row', gap: 8},
  printBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {flexDirection: 'row', paddingVertical: 5},
  infoLabel: {fontSize: 12, color: '#9CA3AF', width: 105},
  infoValue: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  infoValueMono: {
    flex: 1, fontSize: 12, color: '#374151', fontWeight: '500',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  infoValueRow: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6},
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 6,
  },
  totalBox: {alignItems: 'flex-start'},
  totalLabel: {fontSize: 11, color: '#9CA3AF'},
  totalValue: {fontSize: 16, fontWeight: '700', color: '#B45309'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280', textAlign: 'center'},
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
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
  pickerSheet: {maxHeight: '80%'},
  sheetScroll: {maxHeight: 480},
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
  sheetOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetOptionRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  sheetOptionText: {flex: 1, fontSize: 15, color: '#374151', fontWeight: '500'},
  sheetOptionTextActive: {color: '#D97706', fontWeight: '600'},
  pickIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginTop: 14,
  },
  pickerSearchInput: {flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', marginLeft: 8},
  pickerSecondary: {fontSize: 12, color: '#9CA3AF'},
  pickerEmpty: {
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 14,
    color: '#6B7280',
  },
  formOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  formSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
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
  formSheetTitleRow: {flexDirection: 'row', alignItems: 'center'},
  formSheetIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  formSheetTitle: {fontSize: 16, fontWeight: '600', color: '#111827'},
  formBody: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40},
  formGroup: {marginBottom: 14, flex: 1},
  formRow2: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
  formRow3: {flexDirection: 'row', gap: 10, alignItems: 'flex-start'},
  formLabel: {fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6},
  formInput: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827',
  },
  formInputReadonly: {backgroundColor: '#F3F4F6', color: '#6B7280'},
  formSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  formSelectText: {flex: 1, fontSize: 15, color: '#111827'},
  formSelectPlaceholder: {color: '#9CA3AF'},
  productSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
    marginTop: 4,
  },
  productSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  addProductBtnText: {fontSize: 12, fontWeight: '600', color: '#059669'},
  entryCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  entryCardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  entryIndex: {fontSize: 13, fontWeight: '600', color: '#374151'},
  entrySnBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    maxWidth: '60%',
  },
  entrySnBadgeText: {fontSize: 11, fontWeight: '600', color: '#047857', fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'})},
  entryRemoveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryProductRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  entryProductSelect: {flex: 1},
  fieldHint: {fontSize: 10, color: '#9CA3AF', marginTop: 4},
  entryFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 4,
  },
  entrySubtotalLabel: {fontSize: 13, color: '#6B7280'},
  entrySubtotalValue: {fontSize: 15, fontWeight: '700', color: '#111827'},
  summaryBox: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 14,
    marginTop: 4,
    paddingRight: 4,
  },
  summaryRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4},
  summaryLabel: {fontSize: 13, color: '#6B7280'},
  summaryValue: {fontSize: 13, color: '#111827', fontWeight: '600'},
  discountLabelRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  discountInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    textAlign: 'right',
    fontSize: 13,
    color: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 110,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  summaryTotalLabel: {fontSize: 15, color: '#111827', fontWeight: '600'},
  summaryTotalValue: {fontSize: 18, fontWeight: '700', color: '#B45309'},
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
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