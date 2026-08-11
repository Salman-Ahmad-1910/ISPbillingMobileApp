import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import RNPrint from 'react-native-print';
import Share from 'react-native-share';
import {Printer, FileText} from 'lucide-react-native';
import {Company} from '../types';
import {getApiBaseUrl} from '../api/client';

export interface BillInvoiceRow {
  id: string;
  month: string;
  year: string;
  amount: number;
  subscribers: number;
  connectionType: string;
  sublocality: string;
}

interface BillInvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  rows: BillInvoiceRow[];
  periodMonth: string;
  periodYear: string;
  billTypeLabel: string;
  areaLabel: string;
  company: Company | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAmount(n: number): string {
  return `PKR ${(Number.isFinite(n) ? n : 0).toLocaleString()}`;
}

function dateLabel(): string {
  const now = new Date();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function badgeStyle(type: string): {bg: string; text: string; border: string} {
  if (type === 'Internet') {
    return {bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE'};
  }
  if (type === 'Cable') {
    return {bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA'};
  }
  return {bg: '#D1FAE5', text: '#047857', border: '#A7F3D0'};
}

export function BillInvoiceModal({
  visible,
  onClose,
  rows,
  periodMonth,
  periodYear,
  billTypeLabel,
  areaLabel,
  company,
}: BillInvoiceModalProps) {
  const [busy, setBusy] = useState<'print' | 'pdf' | null>(null);

  const companyName = company?.name || 'Fintrack ERP';
  const companyAddress = company?.address || '';
  const companyPhone = company?.contact1 || company?.contact2 || '';

  const totalAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalSubscribers = rows.reduce((sum, r) => sum + (Number(r.subscribers) || 0), 0);

  const buildInvoiceHtml = (baseUrl: string): string => {
    const logoUrl = company?.logo
      ? `${baseUrl}/uploads/company_images/${company.id}`
      : null;
    const stampUrl = company?.stamp
      ? `${baseUrl}/uploads/company_stamps/${company.id}`
      : null;

    const rowsHtml = rows
      .map((row, idx) => {
        const badge = badgeStyle(row.connectionType);
        return `
          <tr>
            <td style="border:1px solid #D1D5DB;padding:8px;text-align:center;color:#6B7280;font-weight:500;">${idx + 1}</td>
            <td style="border:1px solid #D1D5DB;padding:8px;font-weight:600;">${escapeHtml(row.month)}</td>
            <td style="border:1px solid #D1D5DB;padding:8px;">${escapeHtml(row.year)}</td>
            <td style="border:1px solid #D1D5DB;padding:8px;text-align:right;font-weight:600;">${(Number(row.amount) || 0).toLocaleString()}</td>
            <td style="border:1px solid #D1D5DB;padding:8px;text-align:center;font-weight:600;">${Number(row.subscribers) || 0}</td>
            <td style="border:1px solid #D1D5DB;padding:8px;text-align:center;">
              <span style="display:inline-block;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:600;border:1px solid ${badge.border};background:${badge.bg};color:${badge.text};">${escapeHtml(row.connectionType)}</span>
            </td>
            <td style="border:1px solid #D1D5DB;padding:8px;">${escapeHtml(row.sublocality)}</td>
          </tr>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @media print {
    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }
    .print-area { position: absolute; left: 0; top: 0; width: 100%; }
    @page { size: A4; margin: 15mm; }
  }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; margin: 0; padding: 0; }
  .print-area { max-width: 760px; margin: 0 auto; padding: 32px; }
  header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #111827; margin-bottom: 32px; }
  .company h1 { font-size: 22px; font-weight: 800; margin: 0 0 4px 0; color: #111827; }
  .company p { color: #4B5563; font-size: 13px; margin: 2px 0; }
  .bill-right { text-align: right; }
  .bill-title { font-size: 34px; font-weight: 800; letter-spacing: 3px; color: #059669; margin: 0; }
  .meta { font-size: 13px; margin-top: 12px; color: #6B7280; }
  .meta span { color: #111827; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th { background: #059669; color: #fff; border: 1px solid #059669; padding: 10px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th.r { text-align: right; }
  thead th.c { text-align: center; }
  td { border: 1px solid #D1D5DB; padding: 8px; }
  tr.total td { background: #F9FAFB; font-weight: 800; font-size: 15px; }
  .summary { display: flex; justify-content: flex-end; margin-top: 24px; text-align: right; }
  .summary p { font-size: 13px; color: #6B7280; margin: 2px 0; }
  .summary .big { font-size: 20px; font-weight: 800; color: #059669; }
  .summary .bold { font-weight: 800; color: #111827; }
  footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #D1D5DB; }
  .sig { display: flex; justify-content: space-between; margin-top: 8px; }
  .sig div { width: 200px; text-align: center; }
  .sig img { max-height: 80px; max-width: 180px; object-fit: contain; margin-bottom: 5px; }
  .sig .line { border-bottom: 1px solid #000; height: 40px; }
  .sig p { font-size: 11px; color: #6B7280; margin: 4px 0 0 0; }
  .center { text-align: center; margin-top: 24px; color: #6B7280; }
  .center b { font-size: 16px; color: #111827; }
</style>
</head>
<body>
  <div class="print-area">
    <header>
      <div class="company">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="width:60px;height:60px;object-fit:contain;margin-bottom:6px;" />` : ''}
        <h1>${escapeHtml(companyName)}</h1>
        ${companyAddress ? `<p>${escapeHtml(companyAddress)}</p>` : ''}
        ${companyPhone ? `<p>Phone: ${escapeHtml(companyPhone)}</p>` : ''}
      </div>
      <div class="bill-right">
        <h2 class="bill-title">BILL</h2>
        <div class="meta">
          <div>Date: <span>${dateLabel()}</span></div>
          <div>Period: <span>${escapeHtml(periodMonth)} ${escapeHtml(periodYear)}</span></div>
          <div>Type: <span>${escapeHtml(billTypeLabel)}</span></div>
          ${areaLabel ? `<div>Area: <span>${escapeHtml(areaLabel)}</span></div>` : ''}
        </div>
      </div>
    </header>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Month</th>
          <th>Year</th>
          <th class="r">Amount (PKR)</th>
          <th class="c">Subscribers</th>
          <th class="c">Type</th>
          <th>Sublocality</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr class="total">
          <td colspan="3" style="padding:8px;">TOTAL</td>
          <td style="padding:8px;text-align:right;">${totalAmount.toLocaleString()}</td>
          <td style="padding:8px;text-align:center;">${totalSubscribers}</td>
          <td colspan="2" style="padding:8px;"></td>
        </tr>
      </tfoot>
    </table>

    <div class="summary">
      <div>
        <p>Total Subscribers: <span class="bold">${totalSubscribers}</span></p>
        <p>Total Amount: <span class="big">PKR ${totalAmount.toLocaleString()}</span></p>
      </div>
    </div>

    <footer>
      <div class="sig">
        <div>
          ${stampUrl ? `<img src="${stampUrl}" alt="Stamp" />` : '<div class="line"></div>'}
          <p>Company Stamp</p>
        </div>
        <div>
          <div class="line"></div>
          <p>Authorized Signature</p>
        </div>
      </div>
      <div class="center">
        <b>${escapeHtml(companyName)}</b>
        ${companyPhone ? `<p>Phone: ${escapeHtml(companyPhone)}</p>` : ''}
        <p style="font-size:11px;color:#9CA3AF;margin-top:6px;">This is a computer-generated bill and does not require a signature</p>
      </div>
    </footer>
  </div>
</body>
</html>`;
  };

  const handlePrint = async () => {
    setBusy('print');
    try {
      const baseUrl = await getApiBaseUrl();
      await RNPrint.print({
        html: buildInvoiceHtml(baseUrl),
        jobName: 'Bill Invoice',
      });
    } catch (err: any) {
      Alert.alert('Print Error', err?.message || 'Could not start the print job.');
    } finally {
      setBusy(null);
    }
  };

  const handleSaveAsPdf = async () => {
    setBusy('pdf');
    try {
      const baseUrl = await getApiBaseUrl();
      const res = await RNPrint.printToFile({html: buildInvoiceHtml(baseUrl)});
      const filePath = res?.filePath;
      if (!filePath) {
        throw new Error('No PDF file was generated.');
      }
      const uri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
      await Share.open({url: uri, type: 'application/pdf'});
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'Could not save the PDF.');
    } finally {
      setBusy(null);
    }
  };

  const handlePrintPress = () => {
    Alert.alert('Print Bill', 'Print the invoice or save it as a PDF file.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Save as PDF', onPress: handleSaveAsPdf},
      {text: 'Print', onPress: handlePrint},
    ]);
  };

  const renderCell = (
    text: string,
    options: {width: number; align?: 'left' | 'center' | 'right'; bold?: boolean},
  ) => {
    const {width, align = 'left', bold = false} = options;
    return (
      <Text
        style={[
          styles.tableCell,
          {width},
          align === 'center' && styles.cellCenter,
          align === 'right' && styles.cellRight,
          bold && styles.cellBold,
        ]}
        numberOfLines={1}>
        {text}
      </Text>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={styles.topBarIcon}>
              <FileText size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.topBarTitle}>Bill Creator - Print Preview</Text>
          </View>
          <TouchableOpacity
            style={[styles.printBtn, busy && styles.printBtnBusy]}
            disabled={!!busy}
            onPress={handlePrintPress}>
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Printer size={16} color="#FFFFFF" />
            )}
            <Text style={styles.printBtnText}>{busy === 'pdf' ? 'Saving...' : busy === 'print' ? 'Printing...' : 'Print Bill'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.invoice}>
            <View style={styles.invoiceHeader}>
              <View style={styles.companyBlock}>
                <Text style={styles.companyName}>{companyName}</Text>
                {companyAddress ? (
                  <Text style={styles.companySub}>{companyAddress}</Text>
                ) : null}
                {companyPhone ? (
                  <Text style={styles.companySub}>Phone: {companyPhone}</Text>
                ) : null}
              </View>
              <View style={styles.billBlock}>
                <Text style={styles.billTitle}>BILL</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Date:</Text>
                  <Text style={styles.metaValue}>{dateLabel()}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Period:</Text>
                  <Text style={styles.metaValue}>
                    {periodMonth} {periodYear}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Type:</Text>
                  <Text style={styles.metaValue}>{billTypeLabel}</Text>
                </View>
                {areaLabel ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Area:</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      {areaLabel}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableScroll}>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  {renderCell('#', {width: 34, align: 'center'})}
                  {renderCell('Month', {width: 108})}
                  {renderCell('Year', {width: 58})}
                  {renderCell('Amount (PKR)', {width: 110, align: 'right'})}
                  {renderCell('Subscribers', {width: 86, align: 'center'})}
                  {renderCell('Type', {width: 72, align: 'center'})}
                  {renderCell('Sublocality', {width: 150})}
                </View>

                {rows.map((row, idx) => {
                  const badge = badgeStyle(row.connectionType);
                  return (
                    <View key={row.id || idx} style={styles.tableRow}>
                      {renderCell(String(idx + 1), {width: 34, align: 'center'})}
                      {renderCell(row.month, {width: 108, bold: true})}
                      {renderCell(row.year, {width: 58})}
                      {renderCell((Number(row.amount) || 0).toLocaleString(), {width: 110, align: 'right', bold: true})}
                      {renderCell(String(Number(row.subscribers) || 0), {width: 86, align: 'center', bold: true})}
                      <View style={styles.typeCell}>
                        <View style={[styles.typeBadge, {backgroundColor: badge.bg, borderColor: badge.border}]}>
                          <Text style={[styles.typeBadgeText, {color: badge.text}]}>{row.connectionType}</Text>
                        </View>
                      </View>
                      {renderCell(row.sublocality, {width: 150})}
                    </View>
                  );
                })}

                <View style={[styles.tableRow, styles.tableTotal]}>
                  {renderCell('TOTAL', {width: 200, bold: true})}
                  {renderCell(totalAmount.toLocaleString(), {width: 110, align: 'right', bold: true})}
                  {renderCell(String(totalSubscribers), {width: 86, align: 'center', bold: true})}
                  {renderCell('', {width: 72})}
                  {renderCell('', {width: 150})}
                </View>
              </View>
            </ScrollView>

            <View style={styles.summaryBlock}>
              <Text style={styles.summaryLine}>
                Total Subscribers:{' '}
                <Text style={styles.summaryValue}>{totalSubscribers}</Text>
              </Text>
              <Text style={styles.summaryLine}>
                Total Amount:{' '}
                <Text style={styles.summaryAmount}>{formatAmount(totalAmount)}</Text>
              </Text>
            </View>

            <View style={styles.sigRow}>
              <View style={styles.sigItem}>
                <View style={styles.sigLine} />
                <Text style={styles.sigLabel}>Company Stamp</Text>
              </View>
              <View style={styles.sigItem}>
                <View style={styles.sigLine} />
                <Text style={styles.sigLabel}>Authorized Signature</Text>
              </View>
            </View>

            <View style={styles.footerCenter}>
              <Text style={styles.footerCompany}>{companyName}</Text>
              {companyPhone ? (
                <Text style={styles.footerSub}>Phone: {companyPhone}</Text>
              ) : null}
              <Text style={styles.footerNote}>
                This is a computer-generated bill and does not require a signature
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F3F4F6'},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: Platform.select({ios: 56, android: 44}),
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  topBarLeft: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10},
  topBarIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {fontSize: 15, fontWeight: '700', color: '#111827', flex: 1},
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  printBtnBusy: {opacity: 0.6},
  printBtnText: {fontSize: 13, fontWeight: '700', color: '#FFFFFF'},
  scroll: {padding: 16, paddingBottom: 48},
  invoice: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#111827',
    marginBottom: 16,
  },
  companyBlock: {flex: 1, paddingRight: 12},
  companyName: {fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 3},
  companySub: {fontSize: 12, color: '#4B5563', marginTop: 1},
  billBlock: {alignItems: 'flex-end'},
  billTitle: {fontSize: 28, fontWeight: '800', letterSpacing: 3, color: '#059669', marginBottom: 10},
  metaRow: {flexDirection: 'row', gap: 6, marginTop: 2},
  metaLabel: {fontSize: 12, color: '#6B7280'},
  metaValue: {fontSize: 12, color: '#111827', fontWeight: '600'},
  tableScroll: {paddingBottom: 4},
  table: {borderRadius: 8, overflow: 'hidden'},
  tableRow: {flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#D1D5DB', backgroundColor: '#FFFFFF'},
  tableHead: {backgroundColor: '#059669', borderBottomWidth: 0},
  tableCell: {
    fontSize: 12,
    color: '#111827',
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  cellCenter: {textAlign: 'center'},
  cellRight: {textAlign: 'right'},
  cellBold: {fontWeight: '600'},
  typeCell: {width: 72, paddingVertical: 9, paddingHorizontal: 8},
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 5,
  },
  typeBadgeText: {fontSize: 10, fontWeight: '700'},
  tableTotal: {backgroundColor: '#F9FAFB'},
  summaryBlock: {alignItems: 'flex-end', marginTop: 20},
  summaryLine: {fontSize: 13, color: '#6B7280', marginTop: 2},
  summaryValue: {fontWeight: '800', color: '#111827'},
  summaryAmount: {fontSize: 18, fontWeight: '800', color: '#059669'},
  sigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
  },
  sigItem: {width: 140, alignItems: 'center'},
  sigLine: {width: '100%', borderBottomWidth: 1, borderBottomColor: '#111827', height: 36},
  sigLabel: {fontSize: 11, color: '#6B7280', marginTop: 4},
  footerCenter: {alignItems: 'center', marginTop: 28},
  footerCompany: {fontSize: 15, fontWeight: '800', color: '#111827'},
  footerSub: {fontSize: 12, color: '#6B7280', marginTop: 2},
  footerNote: {fontSize: 10, color: '#9CA3AF', marginTop: 4},
});
