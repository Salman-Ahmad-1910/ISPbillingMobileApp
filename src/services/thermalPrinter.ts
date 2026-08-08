import ThermalPrinter, {
  text,
  line,
  feed,
  cut,
  type Node,
  type TextStyle,
} from 'react-native-thermal-printer-driver';
import type {Company, Payment, PromiseEntry, DealerCollection} from '../types';

export interface ThermalPrinterDevice {
  name: string;
  address: string;
  deviceType: string;
}

export interface PrintReceiptData {
  company?: Partial<Company>;
  subscriberName?: string;
  collectorName?: string;
}

export interface PaymentReceiptData extends PrintReceiptData {
  payment: Payment;
}

export interface PromiseReceiptData extends PrintReceiptData {
  promise: PromiseEntry;
}

export interface DealerCollectionReceiptData extends PrintReceiptData {
  collection: DealerCollection;
}

export async function scanPrinters(): Promise<ThermalPrinterDevice[]> {
  const {paired, found} = await ThermalPrinter.scan();
  const devices = [...paired, ...found].map(d => ({
    name: d.name || 'Unknown Printer',
    address: d.address,
    deviceType: d.deviceType,
  }));
  const seen = new Set<string>();
  return devices.filter(d => {
    if (seen.has(d.address)) return false;
    seen.add(d.address);
    return true;
  });
}

export async function connectPrinter(address: string): Promise<void> {
  await ThermalPrinter.connect(address, {timeout: 10000});
}

export async function isPrinterConnected(address: string): Promise<boolean> {
  return ThermalPrinter.isConnected(address);
}

export async function disconnectPrinter(address: string): Promise<void> {
  await ThermalPrinter.disconnect(address);
}

export async function printPaymentReceipt(
  address: string,
  data: PaymentReceiptData,
): Promise<void> {
  const nodes = buildPaymentNodes(data);
  const result = await ThermalPrinter.print(address, nodes, {
    paperWidthMm: 58,
    disableCutPaper: false,
  });
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to print receipt');
  }
}

export async function printPromiseReceipt(
  address: string,
  data: PromiseReceiptData,
): Promise<void> {
  const nodes = buildPromiseNodes(data);
  const result = await ThermalPrinter.print(address, nodes, {
    paperWidthMm: 58,
    disableCutPaper: false,
  });
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to print promise slip');
  }
}

export async function printDealerCollectionReceipt(
  address: string,
  data: DealerCollectionReceiptData,
): Promise<void> {
  const nodes = buildDealerCollectionNodes(data);
  const result = await ThermalPrinter.print(address, nodes, {
    paperWidthMm: 58,
    disableCutPaper: false,
  });
  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to print collection receipt');
  }
}

const center: TextStyle = {align: 'center'};
const boldCenter: TextStyle = {align: 'center', bold: true};
const right: TextStyle = {align: 'right', bold: true};

function buildPaymentNodes(data: PaymentReceiptData): Node[] {
  const {payment, company, subscriberName, collectorName} = data;
  const amount = Number(payment.amount) || 0;
  const monthLabel = formatThermalMonth(payment.paymentDate);
  const companyName = company?.name || 'Fintrack ERP';
  const companyAddress = company?.address || '';
  const companyPhone = company?.contact1 || company?.contact2 || '';

  return [
    text(companyName, {align: 'center', bold: true, size: 2}),
    ...(companyAddress ? [text(companyAddress, center)] : []),
    ...(companyPhone ? [text(companyPhone, center)] : []),
    line(),
    text('PAYMENT RECEIPT', boldCenter),
    text('Computer Generated', center),
    line(),
    columns([
      {content: 'Bill No:', width: 14},
      {content: String(payment.billNo || (payment.id || '---').slice(0, 8)), width: 20, align: 'right'},
    ]),
    columns([
      {content: 'Date:', width: 14},
      {content: formatThermalDate(payment.paymentDate), width: 20, align: 'right'},
    ]),
    columns([
      {content: 'Month:', width: 14},
      {content: monthLabel, width: 20, align: 'right'},
    ]),
    line(),
    columns([
      {content: 'Subscriber:', width: 14},
      {content: subscriberName || payment.subscriberName || '---', width: 20, align: 'right'},
    ]),
    columns([
      {content: 'Method:', width: 14},
      {content: (payment.method || 'Cash').toUpperCase(), width: 20, align: 'right'},
    ]),
    columns([
      {content: 'Received By:', width: 14},
      {content: collectorName || payment.collectedByName || (payment.collectorId || '---').slice(0, 8), width: 20, align: 'right'},
    ]),
    line(),
    columns([
      {content: 'AMOUNT', style: {bold: true}},
      {content: `PKR ${amount.toLocaleString()}`, style: right},
    ]),
    feed(1),
    text(`Amount in words: ${amountInWords(amount)}`, {font: 'B'}),
    feed(2),
    line({style: 'dashed'}),
    text('Company Stamp', center),
    feed(1),
    text('Authorized Signature', center),
    feed(2),
    text(companyName, boldCenter),
    text('Computer generated receipt', center),
    feed(3),
    cut(),
  ];
}

function buildPromiseNodes(data: PromiseReceiptData): Node[] {
  const {promise, company, subscriberName, collectorName} = data;
  const amount = Number(promise.amount) || 0;
  const companyName = company?.name || 'Fintrack ERP';
  const companyAddress = company?.address || '';
  const companyPhone = company?.contact1 || company?.contact2 || '';

  return [
    text(companyName, {align: 'center', bold: true, size: 2}),
    ...(companyAddress ? [text(companyAddress, center)] : []),
    ...(companyPhone ? [text(companyPhone, center)] : []),
    line(),
    text('PROMISE SLIP', {align: 'center', bold: true, size: 2}),
    line(),
    columns([
      {content: 'Promise ID:', width: 14},
      {content: (promise.id || '---').slice(0, 8), width: 20, align: 'right'},
    ]),
    columns([
      {content: 'Date:', width: 14},
      {content: formatThermalDate(promise.promiseDate), width: 20, align: 'right'},
    ]),
    columns([
      {content: 'Status:', width: 14},
      {content: 'PENDING', width: 20, align: 'right', style: {bold: true}},
    ]),
    line(),
    columns([
      {content: 'Subscriber:', width: 14},
      {content: subscriberName || promise.subscriberName || '---', width: 20, align: 'right'},
    ]),
    columns([
      {content: 'Type:', width: 14},
      {content: (promise.connectionType || 'Internet').toUpperCase(), width: 20, align: 'right'},
    ]),
    ...(promise.phone
      ? [
          columns([
            {content: 'Phone:', width: 14},
            {content: promise.phone, width: 20, align: 'right'},
          ]),
        ]
      : []),
    columns([
      {content: 'Promised By:', width: 14},
      {content: collectorName || promise.collectorName || '---', width: 20, align: 'right'},
    ]),
    line(),
    ...(promise.description
      ? [
          text(`Description: ${promise.description}`, {font: 'B'}),
          line(),
        ]
      : []),
    columns([
      {content: 'OUTSTANDING', style: {bold: true}},
      {content: `PKR ${amount.toLocaleString()}`, style: right},
    ]),
    feed(2),
    line({style: 'dashed'}),
    text('Company Stamp', center),
    feed(1),
    text('Authorized Signature', center),
    feed(2),
    text(companyName, boldCenter),
    text('Computer generated slip', center),
    feed(3),
    cut(),
  ];
}

function buildDealerCollectionNodes(data: DealerCollectionReceiptData): Node[] {
  const {collection, company, collectorName} = data;
  const amount = Number(collection.amount) || 0;
  const companyName = company?.name || 'Fintrack ERP';
  const companyAddress = company?.address || '';
  const companyPhone = company?.contact1 || company?.contact2 || '';
  const status = collection.settlementStatus === 'settled' ? 'PAID' : 'UNPAID';

  return [
    text(companyName, {align: 'center', bold: true, size: 2}),
    ...(companyAddress ? [text(companyAddress, center)] : []),
    ...(companyPhone ? [text(companyPhone, center)] : []),
    line(),
    text('DEALER COLLECTION', boldCenter),
    text('Computer Generated', center),
    line(),
    columns([
      {content: 'Bill No:', width: 14},
      {content: (collection.id || '---').slice(0, 8).toUpperCase(), width: 20, align: 'right'},
    ]),
    columns([
      {content: 'Date:', width: 14},
      {content: formatThermalDate(collection.collectionDate), width: 20, align: 'right'},
    ]),
    columns([
      {content: 'Month:', width: 14},
      {content: formatThermalMonth(collection.collectionDate), width: 20, align: 'right'},
    ]),
    columns([
      {content: 'Status:', width: 14},
      {content: status, width: 20, align: 'right', style: {bold: true}},
    ]),
    line(),
    columns([
      {content: 'Dealer:', width: 14},
      {content: collection.dealerName || '---', width: 20, align: 'right'},
    ]),
    ...(collection.dealerAddress
      ? [
          text(`Address: ${collection.dealerAddress}`, {font: 'B'}),
          line(),
        ]
      : []),
    columns([
      {content: 'Type:', width: 14},
      {content: (collection.transactionType || 'cash').toUpperCase(), width: 20, align: 'right'},
    ]),
    columns([
      {content: 'Received By:', width: 14},
      {content: collectorName || collection.receivedByName || (collection.receivedById || '---').slice(0, 8), width: 20, align: 'right'},
    ]),
    line(),
    ...(collection.comment
      ? [
          text(`Comment: ${collection.comment}`, {font: 'B'}),
          line(),
        ]
      : []),
    columns([
      {content: 'AMOUNT', style: {bold: true}},
      {content: `PKR ${amount.toLocaleString()}`, style: right},
    ]),
    feed(1),
    text(`Amount in words: ${amountInWords(amount)}`, {font: 'B'}),
    feed(2),
    line({style: 'dashed'}),
    text('Company Stamp', center),
    feed(1),
    text('Authorized Signature', center),
    feed(2),
    text(companyName, boldCenter),
    text('Computer generated receipt', center),
    feed(3),
    cut(),
  ];
}

function columns(cols: {content: string; width?: number; align?: TextStyle['align']; style?: TextStyle}[]): Node {
  return {
    type: 'columns',
    columns: cols.map(c => ({
      content: c.content,
      width: c.width || 12,
      align: c.align,
      style: c.style,
    })),
  };
}

const THERMAL_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatThermalDate(iso?: string): string {
  if (!iso) return '---';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '---';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatThermalMonth(iso?: string): string {
  if (!iso) return '---';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '---';
  return `${THERMAL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function amountInWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return 'Zero Rupees Only';
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];
  const twoDigits = (x: number): string => {
    if (x < 20) return ones[x];
    return `${tens[Math.floor(x / 10)]}${x % 10 ? ' ' + ones[x % 10] : ''}`;
  };
  const threeDigits = (x: number): string => {
    const h = Math.floor(x / 100);
    const rest = x % 100;
    let out = '';
    if (h) out += `${ones[h]} Hundred`;
    if (rest) out += `${out ? ' ' : ''}${twoDigits(rest)}`;
    return out;
  };
  const amount = Math.round(n);
  let out = '';
  const crore = Math.floor(amount / 10000000);
  const lakh = Math.floor((amount % 10000000) / 100000);
  const thousand = Math.floor((amount % 100000) / 1000);
  const remainder = amount % 1000;
  if (crore) out += `${threeDigits(crore)} Crore `;
  if (lakh) out += `${twoDigits(lakh)} Lakh `;
  if (thousand) out += `${twoDigits(thousand)} Thousand `;
  if (remainder) out += `${threeDigits(remainder)} `;
  return `${out.trim()} Rupees Only`;
}
