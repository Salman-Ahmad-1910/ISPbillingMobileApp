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
} from 'react-native';
import RNPrint from 'react-native-print';
import Share from 'react-native-share';
import {Printer, FileText, X} from 'lucide-react-native';
import {useAuth} from '../context/AuthContext';
import {getApiBaseUrl} from '../api/client';
import {GradientView} from './GradientView';

export type PrintColumn<T> = {
  header: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T, index: number) => string | number;
};

interface SubscriberReportPrintModalProps<T> {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accent: string;
  columns: PrintColumn<T>[];
  data: T[];
  jobName?: string;
  emptyMessage?: string;
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dateLabel(): string {
  const now = new Date();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

const ACCENT_TEXT = '#059669';

export default function SubscriberReportPrintModal<T>({
  visible,
  onClose,
  title,
  subtitle,
  accent,
  columns,
  data,
  jobName,
  emptyMessage = 'No records found.',
}: SubscriberReportPrintModalProps<T>) {
  const {companies, companyId} = useAuth();
  const [busy, setBusy] = useState<'print' | 'pdf' | null>(null);

  const company = companies.find(c => c.id === companyId) || null;
  const companyName = company?.name || 'Fintrack ERP';
  const companyAddress = company?.address || '';
  const companyPhone = company?.contact1 || company?.contact2 || '';
  const companyEmail = company?.email || '';

  const buildHtml = (baseUrl: string): string => {
    const logoUrl = company?.logo
      ? `${baseUrl}/uploads/company_images/${company.id}`
      : null;
    const stampUrl = company?.stamp
      ? `${baseUrl}/uploads/company_stamps/${company.id}`
      : null;

    const headerCells = columns
      .map(col => {
        const alignClass =
          col.align === 'right'
            ? 'class="r"'
            : col.align === 'center'
              ? 'class="c"'
              : '';
        return `<th ${alignClass}>${escapeHtml(col.header)}</th>`;
      })
      .join('');

    const bodyRows =
      data.length === 0
        ? `<tr><td colspan="${columns.length}" style="border:1px solid #D1D5DB;padding:20px;text-align:center;color:#6B7280;">${escapeHtml(emptyMessage)}</td></tr>`
        : data
            .map((row, index) => {
              const cells = columns
                .map(col => {
                  const alignStyle =
                    col.align === 'right'
                      ? 'text-align:right;'
                      : col.align === 'center'
                        ? 'text-align:center;'
                        : '';
                  return `<td style="border:1px solid #D1D5DB;padding:8px;${alignStyle}">${escapeHtml(
                    String(col.render(row, index) ?? ''),
                  )}</td>`;
                })
                .join('');
              return `<tr>${cells}</tr>`;
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
    @page { size: A4 landscape; margin: 12mm; }
  }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; margin: 0; padding: 0; }
  .print-area { max-width: 100%; padding: 24px; }
  header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid ${accent}; margin-bottom: 28px; }
  .company h1 { font-size: 22px; font-weight: 800; margin: 0 0 4px 0; color: #111827; }
  .company p { color: #4B5563; font-size: 13px; margin: 2px 0; }
  .report-right { text-align: right; }
  .report-title { font-size: 30px; font-weight: 800; letter-spacing: 2px; color: ${accent}; margin: 0; }
  .meta { font-size: 13px; margin-top: 10px; color: #6B7280; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: ${accent}; color: #fff; border: 1px solid ${accent}; padding: 9px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th.r { text-align: right; }
  thead th.c { text-align: center; }
  td { border: 1px solid #D1D5DB; padding: 7px 8px; }
  footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #D1D5DB; }
  .sig { display: flex; justify-content: space-between; margin-top: 8px; }
  .sig div { width: 200px; text-align: center; }
  .sig img { max-height: 80px; max-width: 180px; object-fit: contain; margin-bottom: 5px; }
  .sig .line { border-bottom: 1px solid #000; height: 40px; }
  .sig p { font-size: 11px; color: #6B7280; margin: 4px 0 0 0; }
  .center { text-align: center; margin-top: 24px; color: #6B7280; font-size: 12px; }
  .center b { font-size: 15px; color: #111827; }
</style>
</head>
<body>
  <div class="print-area">
    <header>
      <div class="company">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="width:60px;height:60px;object-fit:contain;margin-bottom:6px;" />` : ''}
        <h1>${escapeHtml(companyName)}</h1>
        ${companyAddress ? `<p>${escapeHtml(companyAddress)}</p>` : ''}
        ${companyEmail ? `<p>Email: ${escapeHtml(companyEmail)}</p>` : ''}
        ${companyPhone ? `<p>Phone: ${escapeHtml(companyPhone)}</p>` : ''}
      </div>
      <div class="report-right">
        <h2 class="report-title">${escapeHtml(title)}</h2>
        ${subtitle ? `<div class="meta">${escapeHtml(subtitle)}</div>` : ''}
        <div class="meta">Generated: ${dateLabel()}</div>
      </div>
    </header>

    <table>
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>

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
        ${companyEmail ? `<p>Email: ${escapeHtml(companyEmail)}</p>` : ''}
        <p style="font-size:11px;color:#9CA3AF;margin-top:6px;">This is a computer-generated report and does not require a signature</p>
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
        html: buildHtml(baseUrl),
        jobName: jobName || title,
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
      const res = await (RNPrint as any).printToFile({html: buildHtml(baseUrl)});
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
    Alert.alert('Print Report', 'Print the report or save it as a PDF file.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Save as PDF', onPress: handleSaveAsPdf},
      {text: 'Print', onPress: handlePrint},
    ]);
  };

  const renderCell = (text: string | number, col: PrintColumn<T>) => (
    <Text
      style={[
        styles.tableCell,
        col.align === 'right' && styles.cellRight,
        col.align === 'center' && styles.cellCenter,
      ]}
      numberOfLines={1}>
      {String(text ?? '')}
    </Text>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={[styles.topBarIcon, {backgroundColor: accent}]}>
              <FileText size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.topBarTitle}>Print Preview</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.printBtn, busy && styles.printBtnBusy]}
            disabled={!!busy}
            onPress={handlePrintPress}>
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Printer size={16} color="#FFFFFF" />
            )}
            <Text style={styles.printBtnText}>
              {busy === 'pdf' ? 'Saving...' : busy === 'print' ? 'Printing...' : 'Print'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.invoice}>
            <View style={[styles.invoiceHeader, {borderBottomColor: accent}]}>
              <View style={styles.companyBlock}>
                <Text style={styles.companyName}>{companyName}</Text>
                {companyAddress ? (
                  <Text style={styles.companySub}>{companyAddress}</Text>
                ) : null}
                {companyEmail ? (
                  <Text style={styles.companySub}>Email: {companyEmail}</Text>
                ) : null}
                {companyPhone ? (
                  <Text style={styles.companySub}>Phone: {companyPhone}</Text>
                ) : null}
              </View>
              <View style={styles.reportBlock}>
                <Text style={[styles.reportTitle, {color: accent}]}>{title}</Text>
                {subtitle ? (
                  <Text style={styles.metaText}>{subtitle}</Text>
                ) : null}
                <Text style={styles.metaText}>Generated: {dateLabel()}</Text>
              </View>
            </View>

            {data.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{emptyMessage}</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableScroll}>
                <View style={styles.table}>
                  <View style={[styles.tableRow, {backgroundColor: accent}]}>
                    {columns.map((col, i) => (
                      <View key={i} style={[styles.headCell, col.align === 'right' && styles.cellRight, col.align === 'center' && styles.cellCenter]}>
                        <Text style={styles.headCellText}>{col.header}</Text>
                      </View>
                    ))}
                  </View>

                  {data.map((row, idx) => (
                    <View key={idx} style={styles.tableRow}>
                      {columns.map((col, i) => (
                        <View key={i} style={[styles.bodyCell, col.align === 'right' && styles.cellRight, col.align === 'center' && styles.cellCenter]}>
                          {renderCell(col.render(row, idx), col)}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

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
              {companyEmail ? (
                <Text style={styles.footerSub}>Email: {companyEmail}</Text>
              ) : null}
              <Text style={styles.footerNote}>
                This is a computer-generated report and does not require a signature
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
    paddingHorizontal: 16,
    paddingTop: 46,
    paddingBottom: 12,
    backgroundColor: '#166534',
  },
  topBarLeft: {flexDirection: 'row', alignItems: 'center', gap: 10},
  topBarIcon: {width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center'},
  topBarTitle: {color: '#FFFFFF', fontSize: 15, fontWeight: '700'},
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  printBtnBusy: {opacity: 0.6},
  printBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '700'},
  scroll: {paddingHorizontal: 16, paddingBottom: 40},
  invoice: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    paddingBottom: 14,
    marginBottom: 14,
  },
  companyBlock: {flex: 1, marginRight: 12},
  companyName: {fontSize: 17, fontWeight: '800', color: '#111827'},
  companySub: {fontSize: 12, color: '#6B7280', marginTop: 2},
  reportBlock: {alignItems: 'flex-end'},
  reportTitle: {fontSize: 20, fontWeight: '800', letterSpacing: 1},
  metaText: {fontSize: 12, color: '#6B7280', marginTop: 4},
  tableScroll: {paddingBottom: 10},
  table: {borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, overflow: 'hidden'},
  tableRow: {flexDirection: 'row'},
  headCell: {paddingHorizontal: 8, paddingVertical: 8, minWidth: 90, maxWidth: 160},
  headCellText: {fontSize: 10, fontWeight: '700', color: '#FFFFFF', textTransform: 'uppercase'},
  bodyCell: {paddingHorizontal: 8, paddingVertical: 7, minWidth: 90, maxWidth: 160},
  tableCell: {fontSize: 12, color: '#374151'},
  cellCenter: {alignItems: 'center', justifyContent: 'center'},
  cellRight: {alignItems: 'flex-end', justifyContent: 'center'},
  empty: {paddingVertical: 32, alignItems: 'center'},
  emptyText: {fontSize: 13, color: '#9CA3AF'},
  sigRow: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#D1D5DB'},
  sigItem: {width: 180, alignItems: 'center'},
  sigLine: {width: '100%', borderBottomWidth: 1, borderBottomColor: '#000', height: 36},
  sigLabel: {fontSize: 11, color: '#6B7280', marginTop: 4},
  footerCenter: {alignItems: 'center', marginTop: 20},
  footerCompany: {fontSize: 15, fontWeight: '700', color: '#111827'},
  footerSub: {fontSize: 12, color: '#6B7280', marginTop: 2},
  footerNote: {fontSize: 11, color: '#9CA3AF', marginTop: 6},
});
