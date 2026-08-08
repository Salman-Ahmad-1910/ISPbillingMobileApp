import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import RNPrint from 'react-native-print';
import {Printer, FileText, Smartphone, RefreshCw, Bluetooth, Loader2} from 'lucide-react-native';
import type {Company, Payment, PromiseEntry, DealerCollection} from '../types';
import {
  scanPrinters,
  connectPrinter,
  disconnectPrinter,
  printPaymentReceipt,
  printPromiseReceipt,
  printDealerCollectionReceipt,
  type ThermalPrinterDevice,
} from '../services/thermalPrinter';
import {GradientButton} from './GradientButton';

interface PrintReceiptDialogProps {
  visible: boolean;
  onClose: () => void;
  payment?: Payment | null;
  promise?: PromiseEntry | null;
  collection?: DealerCollection | null;
  company?: Company | null;
  subscriberName?: string;
  dealerName?: string;
  collectorName?: string;
}

export function PrintReceiptDialog({
  visible,
  onClose,
  payment,
  promise,
  collection,
  company,
  subscriberName,
  dealerName,
  collectorName,
}: PrintReceiptDialogProps) {
  const [tab, setTab] = useState<'a4' | 'thermal'>('a4');
  const [devices, setDevices] = useState<ThermalPrinterDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectingAddress, setConnectingAddress] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (visible) {
      setTab('a4');
      setDevices([]);
    }
  }, [visible]);

  if (!payment && !promise && !collection) return null;

  const isPromise = !!promise;
  const isCollection = !!collection;
  const companyName = company?.name || 'Fintrack ERP';
  const companyAddress = company?.address || '';
  const companyPhone = company?.contact1 || company?.contact2 || '';
  const companyEmail = company?.email || '';

  const buildA4Html = (): string => {
    if (isPromise && promise) {
      return buildPromiseA4();
    }
    if (isCollection && collection) {
      return buildCollectionA4();
    }
    return buildPaymentA4();
  };

  const buildPaymentA4 = (): string => {
    const pay = payment!;
    const amount = Number(pay.amount) || 0;
    const dateObj = pay.paymentDate ? new Date(pay.paymentDate) : null;
    const monthLabel = dateObj
      ? dateObj.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})
      : '---';
    const dateLabel = pay.paymentDate || '---';
    const billNo = String(pay.billNo || (pay.id || '---').slice(0, 8));
    const receivedBy = collectorName || pay.collectedByName || (pay.collectorId || '---').slice(0, 8);
    const subName = subscriberName || pay.subscriberName || '---';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; margin: 0; padding: 0; }
  .container { max-width: 700px; margin: 0 auto; padding: 24px; }
  header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #111827; margin-bottom: 32px; }
  .company h1 { font-size: 22px; font-weight: 800; margin: 0 0 4px 0; }
  .company p { color: #4B5563; font-size: 13px; margin: 2px 0; }
  .receipt-title { font-size: 34px; font-weight: 800; letter-spacing: 2px; color: #2563EB; margin: 0; }
  .meta { font-size: 13px; margin-top: 12px; color: #6B7280; text-align: right; }
  .meta span { color: #111827; font-weight: 600; }
  h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #374151; margin: 0 0 8px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 24px 0; }
  th { background: #2563EB; color: #fff; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  th.r { text-align: right; }
  td { border: 1px solid #D1D5DB; padding: 12px; }
  td.r { text-align: right; font-weight: 600; }
  tr.total td { background: #F9FAFB; font-weight: 800; font-size: 16px; color: #2563EB; }
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
        ${companyEmail ? `<p>Email: ${escapeHtml(companyEmail)}</p>` : ''}
        ${companyPhone ? `<p>Phone: ${escapeHtml(companyPhone)}</p>` : ''}
      </div>
      <div>
        <h2 class="receipt-title">RECEIPT</h2>
        <div class="meta">
          <div>Bill ID: <span>${escapeHtml(billNo)}</span></div>
          <div>Date: <span>${escapeHtml(dateLabel)}</span></div>
          <div>Status: <span style="background:#D1FAE5;color:#047857;padding:2px 8px;border-radius:4px;font-size:11px;">PAID</span></div>
        </div>
      </div>
    </header>

    <h3>Subscriber Information</h3>
    <p style="font-size:14px;font-weight:600;margin:0;">${escapeHtml(subName)}</p>

    <table>
      <thead><tr><th>Description</th><th class="r">Value</th></tr></thead>
      <tbody>
        <tr><td>Payment Method</td><td class="r">${escapeHtml((pay.method || 'Cash').toLowerCase())}</td></tr>
        <tr><td>Payment Month</td><td class="r">${escapeHtml(monthLabel)}</td></tr>
        <tr><td>Received By</td><td class="r">${escapeHtml(receivedBy)}</td></tr>
      </tbody>
      <tfoot>
        <tr class="total"><td>AMOUNT RECEIVED</td><td class="r">PKR ${amount.toLocaleString()}</td></tr>
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
          <p>Authorized Signature</p>
        </div>
      </div>
      <div class="center">
        <b>${escapeHtml(companyName)}</b>
        ${companyPhone || companyEmail ? `<p>Phone: ${escapeHtml(companyPhone)}${companyEmail ? ` | Email: ${escapeHtml(companyEmail)}` : ''}</p>` : ''}
        <p style="font-size:11px;color:#9CA3AF;">This is a computer-generated receipt and does not require a signature</p>
      </div>
    </footer>
  </div>
</body>
</html>`;
  };

  const buildPromiseA4 = (): string => {
    const pr = promise!;
    const amount = Number(pr.amount) || 0;
    const dateObj = pr.promiseDate ? new Date(pr.promiseDate) : null;
    const dateLabel = dateObj
      ? dateObj.toLocaleDateString('en-US', {day: 'numeric', month: 'long', year: 'numeric'})
      : '---';
    const promiseId = (pr.id || '---').slice(0, 8);
    const promisedBy = collectorName || pr.collectorName || '---';
    const subName = subscriberName || pr.subscriberName || '---';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; margin: 0; padding: 0; }
  .container { max-width: 700px; margin: 0 auto; padding: 24px; }
  header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #111827; margin-bottom: 32px; }
  .company h1 { font-size: 22px; font-weight: 800; margin: 0 0 4px 0; }
  .company p { color: #4B5563; font-size: 13px; margin: 2px 0; }
  .receipt-title { font-size: 34px; font-weight: 800; letter-spacing: 2px; color: #D97706; margin: 0; }
  .meta { font-size: 13px; margin-top: 12px; color: #6B7280; text-align: right; }
  .meta span { color: #111827; font-weight: 600; }
  h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #374151; margin: 0 0 8px 0; }
  p.sub { font-size: 14px; margin: 2px 0; }
  p.sub .mono { font-family: monospace; font-size: 12px; color: #6B7280; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 24px 0; }
  th { background: #D97706; color: #fff; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  th.r { text-align: right; }
  td { border: 1px solid #D1D5DB; padding: 12px; }
  td.r { text-align: right; font-weight: 600; }
  tr.total td { background: #F9FAFB; font-weight: 800; font-size: 16px; color: #D97706; }
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
        ${companyEmail ? `<p>Email: ${escapeHtml(companyEmail)}</p>` : ''}
        ${companyPhone ? `<p>Phone: ${escapeHtml(companyPhone)}</p>` : ''}
      </div>
      <div>
        <h2 class="receipt-title">PROMISE SLIP</h2>
        <div class="meta">
          <div>Promise ID: <span>${escapeHtml(promiseId)}</span></div>
          <div>Date: <span>${escapeHtml(pr.promiseDate || '---')}</span></div>
          <div>Status: <span style="background:#FEF3C7;color:#B45309;padding:2px 8px;border-radius:4px;font-size:11px;">PENDING</span></div>
        </div>
      </div>
    </header>

    <h3>Subscriber Information</h3>
    <p class="sub" style="font-weight:600;">${escapeHtml(subName)}</p>
    ${pr.subscriberId ? `<p class="sub">ID: <span class="mono">${escapeHtml(pr.subscriberId.slice(0, 8))}</span></p>` : ''}
    ${pr.phone ? `<p class="sub">Phone: ${escapeHtml(pr.phone)}</p>` : ''}
    ${pr.address ? `<p class="sub">${escapeHtml(pr.address)}</p>` : ''}

    <table>
      <thead><tr><th>Description</th><th class="r">Value</th></tr></thead>
      <tbody>
        <tr><td>Connection Type</td><td class="r">${escapeHtml(pr.connectionType || 'internet')}</td></tr>
        <tr><td>Promise Date</td><td class="r">${escapeHtml(dateLabel)}</td></tr>
        <tr><td>Description</td><td class="r">${escapeHtml(pr.description || '---')}</td></tr>
        <tr><td>Promised By</td><td class="r">${escapeHtml(promisedBy)}</td></tr>
      </tbody>
      <tfoot>
        <tr class="total"><td>OUTSTANDING AMOUNT</td><td class="r">PKR ${amount.toLocaleString()}</td></tr>
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
          <p>Authorized Signature</p>
        </div>
      </div>
      <div class="center">
        <b>${escapeHtml(companyName)}</b>
        ${companyPhone || companyEmail ? `<p>Phone: ${escapeHtml(companyPhone)}${companyEmail ? ` | Email: ${escapeHtml(companyEmail)}` : ''}</p>` : ''}
        <p style="font-size:11px;color:#9CA3AF;">This is a computer-generated slip and does not require a signature</p>
      </div>
    </footer>
  </div>
</body>
</html>`;
  };

  const buildCollectionA4 = (): string => {
    const col = collection!;
    const amount = Number(col.amount) || 0;
    const dateObj = col.collectionDate ? new Date(col.collectionDate) : null;
    const monthLabel = dateObj
      ? dateObj.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})
      : '---';
    const dateLabel = col.collectionDate || '---';
    const billNo = (col.id || '---').slice(0, 8).toUpperCase();
    const receivedBy = collectorName || col.receivedByName || (col.receivedById || '---').slice(0, 8);
    const dealer = dealerName || col.dealerName || '---';
    const statusPaid = col.settlementStatus === 'settled';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; margin: 0; padding: 0; }
  .container { max-width: 700px; margin: 0 auto; padding: 24px; }
  header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #111827; margin-bottom: 32px; }
  .company h1 { font-size: 22px; font-weight: 800; margin: 0 0 4px 0; }
  .company p { color: #4B5563; font-size: 13px; margin: 2px 0; }
  .receipt-title { font-size: 34px; font-weight: 800; letter-spacing: 2px; color: #F59E0B; margin: 0; }
  .meta { font-size: 13px; margin-top: 12px; color: #6B7280; text-align: right; }
  .meta span { color: #111827; font-weight: 600; }
  h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #374151; margin: 0 0 8px 0; }
  p.sub { font-size: 14px; margin: 2px 0; }
  p.sub .mono { font-family: monospace; font-size: 12px; color: #6B7280; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 24px 0; }
  th { background: #F59E0B; color: #fff; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  th.r { text-align: right; }
  td { border: 1px solid #D1D5DB; padding: 12px; }
  td.r { text-align: right; font-weight: 600; }
  tr.total td { background: #F9FAFB; font-weight: 800; font-size: 16px; color: #F59E0B; }
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
        ${companyEmail ? `<p>Email: ${escapeHtml(companyEmail)}</p>` : ''}
        ${companyPhone ? `<p>Phone: ${escapeHtml(companyPhone)}</p>` : ''}
      </div>
      <div>
        <h2 class="receipt-title">COLLECTION RECEIPT</h2>
        <div class="meta">
          <div>Bill ID: <span>${escapeHtml(billNo)}</span></div>
          <div>Date: <span>${escapeHtml(dateLabel)}</span></div>
          <div>Status: <span style="background:${statusPaid ? '#D1FAE5' : '#FEF3C7'};color:${statusPaid ? '#047857' : '#B45309'};padding:2px 8px;border-radius:4px;font-size:11px;">${statusPaid ? 'PAID' : 'UNPAID'}</span></div>
        </div>
      </div>
    </header>

    <h3>Dealer Information</h3>
    <p class="sub" style="font-weight:600;">${escapeHtml(dealer)}</p>
    ${col.dealerAddress ? `<p class="sub">${escapeHtml(col.dealerAddress)}</p>` : ''}

    <table>
      <thead><tr><th>Description</th><th class="r">Value</th></tr></thead>
      <tbody>
        <tr><td>Collection Month</td><td class="r">${escapeHtml(monthLabel)}</td></tr>
        <tr><td>Payment Type</td><td class="r">${escapeHtml((col.transactionType || 'cash').toLowerCase())}</td></tr>
        <tr><td>Comment</td><td class="r">${escapeHtml(col.comment || '---')}</td></tr>
        <tr><td>Received By</td><td class="r">${escapeHtml(receivedBy)}</td></tr>
      </tbody>
      <tfoot>
        <tr class="total"><td>AMOUNT RECEIVED</td><td class="r">PKR ${amount.toLocaleString()}</td></tr>
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
          <p>Authorized Signature</p>
        </div>
      </div>
      <div class="center">
        <b>${escapeHtml(companyName)}</b>
        ${companyPhone || companyEmail ? `<p>Phone: ${escapeHtml(companyPhone)}${companyEmail ? ` | Email: ${escapeHtml(companyEmail)}` : ''}</p>` : ''}
        <p style="font-size:11px;color:#9CA3AF;">This is a computer-generated receipt and does not require a signature</p>
      </div>
    </footer>
  </div>
</body>
</html>`;
  };

  const handlePrintA4 = async () => {
    setPrinting(true);
    try {
      await RNPrint.print({
        html: buildA4Html(),
        jobName: isPromise ? 'Promise Slip' : isCollection ? 'Collection Receipt' : 'Payment Receipt',
      });
    } catch (err: any) {
      Alert.alert('Print Error', err?.message || 'Could not start the print job.');
    } finally {
      setPrinting(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const found = await scanPrinters();
      setDevices(found);
      if (found.length === 0) {
        Alert.alert('No Printers Found', 'Turn on Bluetooth and make sure the printer is on.');
      }
    } catch (err: any) {
      Alert.alert(
        'Scan Failed',
        err?.message || 'Could not scan for printers. Check Bluetooth permissions.',
      );
    } finally {
      setScanning(false);
    }
  };

  const handleConnectAndPrint = async (address: string) => {
    setConnectingAddress(address);
    try {
      await connectPrinter(address);
      const data = {
        company: company || undefined,
        subscriberName,
        collectorName,
      };
      if (isPromise && promise) {
        await printPromiseReceipt(address, {...data, promise});
      } else if (isCollection && collection) {
        await printDealerCollectionReceipt(address, {...data, collection});
      } else if (payment) {
        await printPaymentReceipt(address, {...data, payment});
      }
      await disconnectPrinter(address);
      Alert.alert('Printed', 'Receipt sent to the printer.');
    } catch (err: any) {
      const msg = err?.message || 'Could not print to the selected printer.';
      Alert.alert('Print Failed', msg);
      try {
        await disconnectPrinter(address);
      } catch {
        // ignore
      }
    } finally {
      setConnectingAddress(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.titleRow}>
              <View style={[styles.titleIcon, isPromise ? styles.titleIconPromise : isCollection ? styles.titleIconCollection : null]}>
                <FileText size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.sheetTitle}>
                {isPromise ? 'Print Promise Slip' : isCollection ? 'Print Collection Receipt' : 'Print Payment Receipt'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'a4' && styles.tabActive]}
              onPress={() => setTab('a4')}>
              <FileText size={14} color={tab === 'a4' ? '#FFFFFF' : '#6B7280'} />
              <Text style={[styles.tabText, tab === 'a4' && styles.tabTextActive]}>A4</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'thermal' && styles.tabActiveThermal]}
              onPress={() => setTab('thermal')}>
              <Smartphone size={14} color={tab === 'thermal' ? '#FFFFFF' : '#6B7280'} />
              <Text style={[styles.tabText, tab === 'thermal' && styles.tabTextActive]}>
                Thermal Receipt
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetScroll}>
            {tab === 'a4' ? (
              <View style={styles.tabContent}>
                <View style={styles.previewCard}>
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewCompany}>{companyName}</Text>
                    <Text style={[styles.previewType, isPromise && styles.previewTypePromise, isCollection && styles.previewTypeCollection]}>
                      {isPromise ? 'PROMISE SLIP' : isCollection ? 'COLLECTION RECEIPT' : 'RECEIPT'}
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>
                      {isPromise ? 'Promise ID' : 'Bill ID'}
                    </Text>
                    <Text style={styles.previewValue}>
                      {isPromise
                        ? (promise!.id || '---').slice(0, 8)
                        : isCollection
                        ? (collection!.id || '---').slice(0, 8).toUpperCase()
                        : String(payment!.billNo || (payment!.id || '---').slice(0, 8))}
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>{isCollection ? 'Dealer' : 'Subscriber'}</Text>
                    <Text style={styles.previewValue}>
                      {isPromise
                        ? subscriberName || promise!.subscriberName || '---'
                        : isCollection
                        ? dealerName || collection!.dealerName || '---'
                        : subscriberName || payment!.subscriberName || '---'}
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Received By</Text>
                    <Text style={styles.previewValue}>
                      {collectorName ||
                        (isPromise
                          ? promise!.collectorName
                          : isCollection
                          ? collection!.receivedByName
                          : payment!.collectedByName) || '---'}
                    </Text>
                  </View>
                  <View style={styles.previewDivider} />
                  <View style={styles.previewRow}>
                    <Text style={styles.previewAmountLabel}>Amount</Text>
                    <Text style={[styles.previewAmount, isPromise && styles.previewAmountPromise, isCollection && styles.previewAmountCollection]}>
                      PKR{' '}
                      {(Number(
                        isPromise
                          ? promise!.amount
                          : isCollection
                          ? collection!.amount
                          : payment!.amount,
                      ) || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <GradientButton
                  colors={isPromise ? ['#F59E0B', '#EA580C'] : ['#3B82F6', '#06B6D4']}
                  style={styles.printBtn}
                  onPress={handlePrintA4}
                  disabled={printing}>
                  {printing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Printer size={16} color="#FFFFFF" />
                      <Text style={styles.printBtnText}>Print A4</Text>
                    </>
                  )}
                </GradientButton>
                <Text style={styles.printHint}>
                  Opens the system print dialog. Choose a printer or save as PDF.
                </Text>
              </View>
            ) : (
              <View style={styles.tabContent}>
                <View style={styles.thermalNote}>
                  <Bluetooth size={16} color="#0D9488" />
                  <Text style={styles.thermalNoteText}>
                    Connect to a Bluetooth thermal printer to print the{' '}
                    {isPromise ? 'promise slip' : isCollection ? 'collection receipt' : 'receipt'} on
                    58mm paper.
                  </Text>
                </View>

                <GradientButton
                  colors={['#0D9488', '#0F766E']}
                  style={styles.printBtn}
                  onPress={handleScan}
                  disabled={scanning}>
                  {scanning ? (
                    <>
                      <Loader2 size={16} color="#FFFFFF" />
                      <Text style={styles.printBtnText}>Scanning...</Text>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} color="#FFFFFF" />
                      <Text style={styles.printBtnText}>Scan for Printers</Text>
                    </>
                  )}
                </GradientButton>

                {devices.length > 0 ? (
                  <View style={styles.deviceList}>
                    <Text style={styles.deviceListTitle}>Available Printers</Text>
                    {devices.map(device => (
                      <TouchableOpacity
                        key={device.address}
                        style={styles.deviceRow}
                        onPress={() => handleConnectAndPrint(device.address)}
                        disabled={!!connectingAddress}>
                        <View style={styles.deviceIcon}>
                          <Printer size={16} color="#059669" />
                        </View>
                        <View style={styles.deviceInfo}>
                          <Text style={styles.deviceName} numberOfLines={1}>
                            {device.name}
                          </Text>
                          <Text style={styles.deviceAddr}>{device.address}</Text>
                        </View>
                        {connectingAddress === device.address ? (
                          <ActivityIndicator size="small" color="#059669" />
                        ) : (
                          <Text style={styles.deviceConnect}>Print</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                {!scanning && devices.length === 0 ? (
                  <Text style={styles.noDevices}>
                    No printers found. Tap &quot;Scan for Printers&quot; to look for nearby
                    Bluetooth printers.
                  </Text>
                ) : null}

                <Text style={styles.printHint}>
                  Requires a Bluetooth-enabled Android device and an ESC/POS compatible thermal
                  printer (e.g. Xprinter, Epson, Star).
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  titleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleIconPromise: {backgroundColor: '#D97706'},
  titleIconCollection: {backgroundColor: '#F59E0B'},
  sheetTitle: {fontSize: 16, fontWeight: '600', color: '#111827'},
  closeBtn: {padding: 4},
  closeText: {fontSize: 16, color: '#6B7280'},
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  tabActive: {backgroundColor: '#2563EB', borderColor: '#2563EB'},
  tabActiveThermal: {backgroundColor: '#0D9488', borderColor: '#0D9488'},
  tabText: {fontSize: 12, fontWeight: '600', color: '#6B7280'},
  tabTextActive: {color: '#FFFFFF'},
  sheetScroll: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30},
  tabContent: {},
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#111827',
    marginBottom: 12,
  },
  previewCompany: {fontSize: 14, fontWeight: '800', color: '#111827', flex: 1},
  previewType: {fontSize: 16, fontWeight: '800', letterSpacing: 1, color: '#2563EB'},
  previewTypePromise: {color: '#D97706'},
  previewTypeCollection: {color: '#F59E0B'},
  previewRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3},
  previewLabel: {fontSize: 12, color: '#9CA3AF'},
  previewValue: {fontSize: 13, color: '#111827', fontWeight: '600', flex: 1, textAlign: 'right'},
  previewDivider: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginVertical: 10,
  },
  previewAmountLabel: {fontSize: 12, color: '#374151', fontWeight: '700'},
  previewAmount: {fontSize: 18, fontWeight: '800', color: '#2563EB'},
  previewAmountPromise: {color: '#D97706'},
  previewAmountCollection: {color: '#F59E0B'},
  printBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
    gap: 6,
  },
  printBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700'},
  printHint: {fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 10},
  thermalNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    backgroundColor: '#F0FDFA',
    padding: 12,
  },
  thermalNoteText: {flex: 1, fontSize: 12, color: '#0F766E'},
  deviceList: {marginTop: 16},
  deviceListTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 10,
  },
  deviceIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceInfo: {flex: 1},
  deviceName: {fontSize: 13, color: '#111827', fontWeight: '600'},
  deviceAddr: {fontSize: 11, color: '#9CA3AF', marginTop: 1},
  deviceConnect: {fontSize: 12, color: '#059669', fontWeight: '700'},
  noDevices: {fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 16},
});
