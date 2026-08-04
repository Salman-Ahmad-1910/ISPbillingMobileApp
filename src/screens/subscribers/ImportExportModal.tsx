import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react-native';
import * as XLSX from 'xlsx/dist/xlsx.full.min.js';
import {pick, types, keepLocalCopy} from '@react-native-documents/picker';
import {
  readFile,
  writeFile,
  CachesDirectoryPath,
} from '@dr.pogodin/react-native-fs';
import Share from 'react-native-share';
import {createConnection} from '../../api/connections';
import {Connection} from '../../types';

const TEMPLATE_HEADERS = [
  'Internet ID*',
  'Name*',
  'Address',
  'Cell',
  'Mobile',
  'Sublocality',
  'Connection Provider',
  'Connection Type',
  'Box Number',
  'Package Cable',
  'Cable Discount',
  'Cable Amount',
  'Package Internet',
  'Internet Discount',
  'Internet Amount',
  'Installation Amount',
  'Other Amount',
  'Installation Date',
  'Recharge Date',
  'Status',
];

const EXAMPLE_ROW = [
  'INT-001',
  'Ahmed Khan',
  'House 123, Street 5',
  '0300-1234567',
  '0312-7654321',
  'DHA Phase 5',
  'My ISP',
  'both',
  'BOX-01',
  'Basic Cable',
  'no_discount',
  '1500',
  'Basic Internet',
  'no_discount',
  '2000',
  '5000',
  '1000',
  '2026-01-15',
  '2026-01-15',
  'active',
];

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

interface ImportExportModalProps {
  visible: boolean;
  onClose: () => void;
  connections: Connection[];
  areaNames: Record<string, string>;
  onImported: () => void;
}

type ImportResult = {success: number; failed: number; errors: string[]};

export default function ImportExportModal({
  visible,
  onClose,
  connections,
  areaNames,
  onImported,
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importFile, setImportFile] = useState<{uri: string; name: string} | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleClose = () => {
    setImportFile(null);
    setImportResult(null);
    setActiveTab('export');
    onClose();
  };

  const writeAndShare = async (workbook: XLSX.WorkBook, fileName: string) => {
    const b64 = XLSX.write(workbook, {type: 'base64', bookType: 'xlsx'});
    const path = `${CachesDirectoryPath}/${fileName}`;
    await writeFile(path, b64, 'base64');
    await Share.open({
      url: `file://${path}`,
      type: MIME_XLSX,
      filename: fileName,
      title: 'Share Subscriber File',
    });
  };

  const handleExport = async () => {
    if (connections.length === 0) {
      Alert.alert('Nothing to export', 'No subscribers found.');
      return;
    }
    setIsExporting(true);
    try {
      const exportData = connections.map((c, idx) => {
        const areaName =
          (areaNames[c.sublocalityId || ''] || '').trim();
        return {
          '#': idx + 1,
          'Internet ID': c.internetId,
          'Name': c.name,
          'Address': c.address || '',
          'Cell': c.cell || '',
          'Mobile': c.mobile || '',
          'Sublocality': areaName,
          'Connection Provider': c.connectionProvider || '',
          'Connection Type': c.connectionType,
          'Box Number': c.boxNumber || '',
          'Package Cable': c.packageCable || '',
          'Cable Discount': c.discount || '',
          'Cable Amount': c.amount || 0,
          'Package Internet': c.packageInternet || '',
          'Internet Discount': c.sameDiscount || '',
          'Internet Amount': c.sameAmount || 0,
          'Installation Amount': c.installationAmount || 0,
          'Other Amount': c.otherAmount || 0,
          'Installation Date': c.installationDate || '',
          'Recharge Date': c.rechargeDate || '',
          'Status': c.status,
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Subscribers');
      const fileName = `subscribers_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      await writeAndShare(wb, fileName);
      Alert.alert('Export complete', `Exported ${connections.length} subscribers.`);
    } catch (err: any) {
      const msg = err?.message || 'Failed to export subscribers';
      Alert.alert('Error', msg);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsExporting(true);
    try {
      const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, EXAMPLE_ROW]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      await writeAndShare(wb, 'subscriber_import_template.xlsx');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to download template');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePickFile = async () => {
    try {
      const [res] = await pick({
        mode: 'open',
        requestLongTermAccess: true,
        type: [types.xlsx, types.xls],
      });
      const fileName = res.name || 'subscribers.xlsx';
      let uri = res.uri;
      try {
        const [copy] = await keepLocalCopy({
          files: [{uri: res.uri, fileName}],
          destination: 'cachesDirectory',
        });
        if (copy && copy.status === 'success' && copy.localUri) {
          uri = copy.localUri;
        }
      } catch {
        uri = res.uri;
      }
      setImportFile({uri, name: fileName});
      setImportResult(null);
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        Alert.alert('Error', 'Could not open the file picker.');
      }
    }
  };

  const handleImport = async () => {
    if (!importFile) {return;}
    setIsImporting(true);
    setImportResult(null);
    try {
      const b64 = await readFile(importFile.uri, 'base64');
      const workbook = XLSX.read(b64, {type: 'base64'});
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {defval: ''});

      if (rows.length === 0) {
        setImportResult({success: 0, failed: 1, errors: ['The uploaded file contains no data rows.']});
        setIsImporting(false);
        return;
      }

      const headers = Object.keys(rows[0]);
      const hasInternetHeader = headers.some(h => h.includes('Internet ID'));
      const hasNameHeader = headers.some(h => h.includes('Name'));
      if (!hasInternetHeader || !hasNameHeader) {
        setImportResult({
          success: 0,
          failed: 1,
          errors: ['File must have "Internet ID" and "Name" columns. Please download the template first.'],
        });
        setIsImporting(false);
        return;
      }

      const internetHeader = headers.find(h => h.includes('Internet ID')) || '';
      const nameHeader = headers.find(h => h === 'Name*' || h === 'Name') || '';
      const col = (row: Record<string, unknown>, label: string) =>
        String(row[headers.find(h => h === label) || ''] || '').trim();

      const reverseAreas = Object.entries(areaNames);

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const internetId = String(row[internetHeader] || '').trim();
        const name = String(row[nameHeader] || '').trim();

        if (!internetId || !name) {
          failed++;
          errors.push(`Row ${rowNum}: Missing required fields (Internet ID or Name)`);
          continue;
        }

        const sublocalityName = col(row, 'Sublocality');
        let sublocalityId = '';
        if (sublocalityName) {
          const match = reverseAreas.find(
            ([, label]) => label.toLowerCase() === sublocalityName.toLowerCase(),
          );
          if (match) {
            sublocalityId = match[0];
          }
        }

        const connectionType = col(row, 'Connection Type') || 'both';
        const status = col(row, 'Status') || 'active';

        const payload: Partial<Connection> = {
          internetId,
          name,
          address: col(row, 'Address'),
          cell: col(row, 'Cell'),
          mobile: col(row, 'Mobile'),
          sublocalityId,
          connectionProvider: col(row, 'Connection Provider'),
          connectionType: ['both', 'internet', 'tv_cable'].includes(connectionType)
            ? connectionType
            : 'both',
          boxNumber: col(row, 'Box Number'),
          packageCable: col(row, 'Package Cable'),
          discount: col(row, 'Cable Discount'),
          amount: parseFloat(col(row, 'Cable Amount')) || 0,
          packageInternet: col(row, 'Package Internet'),
          sameDiscount: col(row, 'Internet Discount'),
          sameAmount: parseFloat(col(row, 'Internet Amount')) || 0,
          installationAmount: parseFloat(col(row, 'Installation Amount')) || 0,
          otherAmount: parseFloat(col(row, 'Other Amount')) || 0,
          installationDate: col(row, 'Installation Date'),
          rechargeDate: col(row, 'Recharge Date'),
          status: ['active', 'inactive', 'deactivated', 'suspended'].includes(status)
            ? status
            : 'active',
        };

        try {
          await createConnection(payload);
          success++;
        } catch (err: any) {
          failed++;
          const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to create';
          errors.push(`Row ${rowNum} (${internetId}): ${msg}`);
        }
      }

      setImportResult({success, failed, errors});
      onImported();
    } catch {
      setImportResult({
        success: 0,
        failed: 1,
        errors: ['Could not read the Excel file. Please ensure it is a valid .xlsx file.'],
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleIcon}>
                <FileSpreadsheet size={18} color="#059669" />
              </View>
              <View style={styles.titleInfo}>
                <Text style={styles.title}>Subscriber Import and Export</Text>
                <Text style={styles.subtitle}>
                  Export existing subscribers or import new subscribers from Excel file
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'export' && styles.tabActive]}
                onPress={() => setActiveTab('export')}>
                <Download size={14} color={activeTab === 'export' ? '#FFFFFF' : '#6B7280'} />
                <Text style={[styles.tabText, activeTab === 'export' && styles.tabTextActive]}>
                  Export Subscribers
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'import' && styles.tabActive]}
                onPress={() => setActiveTab('import')}>
                <Upload size={14} color={activeTab === 'import' ? '#FFFFFF' : '#6B7280'} />
                <Text style={[styles.tabText, activeTab === 'import' && styles.tabTextActive]}>
                  Import Subscribers
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {activeTab === 'export' ? (
              <View>
                <Text style={styles.heading}>Export Subscribers</Text>
                <Text style={styles.description}>
                  Export all subscribers of your company to an Excel file
                </Text>
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    {connections.length} subscriber(s) will be exported.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.greenBtn, isExporting && styles.btnDisabled]}
                  onPress={handleExport}
                  disabled={isExporting}>
                  {isExporting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Download size={16} color="#FFFFFF" />
                      <Text style={styles.greenBtnText}>Export Excel</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.importHeaderRow}>
                  <View style={styles.importHeaderInfo}>
                    <Text style={styles.heading}>Import Subscribers</Text>
                    <Text style={styles.description}>
                      Import subscribers from an Excel file
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.outlineBtn}
                    onPress={handleDownloadTemplate}
                    disabled={isExporting}>
                    <Download size={14} color="#059669" />
                    <Text style={styles.outlineBtnText}>Download Template</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.dropZone} onPress={handlePickFile}>
                  {importFile ? (
                    <View style={styles.dropFileInfo}>
                      <FileSpreadsheet size={36} color="#059669" />
                      <Text style={styles.dropFileName} numberOfLines={1}>
                        {importFile.name}
                      </Text>
                      <Text style={styles.dropHint}>Tap to choose a different file</Text>
                    </View>
                  ) : (
                    <View style={styles.dropFileInfo}>
                      <Upload size={36} color="#9CA3AF" />
                      <Text style={styles.dropTitle}>
                        Tap to browse your Excel file
                      </Text>
                      <Text style={styles.dropHint}>Supports .xlsx and .xls files</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {importFile && !importResult && (
                  <TouchableOpacity
                    style={[styles.greenBtn, styles.importBtn, isImporting && styles.btnDisabled]}
                    onPress={handleImport}
                    disabled={isImporting}>
                    {isImporting ? (
                      <>
                        <ActivityIndicator color="#FFFFFF" size="small" />
                        <Text style={styles.greenBtnText}>Importing...</Text>
                      </>
                    ) : (
                      <>
                        <Upload size={16} color="#FFFFFF" />
                        <Text style={styles.greenBtnText}>Import Subscribers</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {importResult && (
                  <View
                    style={[
                      styles.resultBox,
                      importResult.failed > 0 ? styles.resultWarn : styles.resultOk,
                    ]}>
                    <View style={styles.resultTitleRow}>
                      {importResult.failed > 0 ? (
                        <AlertCircle size={18} color="#D97706" />
                      ) : (
                        <CheckCircle2 size={18} color="#059669" />
                      )}
                      <Text style={styles.resultTitle}>
                        {importResult.success} imported, {importResult.failed} failed
                      </Text>
                    </View>
                    {importResult.errors.length > 0 && (
                      <View style={styles.errorList}>
                        {importResult.errors.map((err, i) => (
                          <Text key={i} style={styles.errorText}>
                            {err}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
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
    maxHeight: '80%',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleRow: {flexDirection: 'row', alignItems: 'center'},
  titleIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  titleInfo: {flex: 1},
  title: {fontSize: 16, fontWeight: '700', color: '#111827'},
  subtitle: {fontSize: 12, color: '#6B7280', marginTop: 2},
  closeBtn: {padding: 4},
  tabs: {flexDirection: 'row', marginTop: 14, gap: 8},
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  tabActive: {backgroundColor: '#166534'},
  tabText: {fontSize: 13, fontWeight: '600', color: '#6B7280'},
  tabTextActive: {color: '#FFFFFF'},
  content: {padding: 20},
  heading: {fontSize: 15, fontWeight: '700', color: '#111827'},
  description: {fontSize: 13, color: '#6B7280', marginTop: 2},
  infoBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  infoText: {fontSize: 13, color: '#6B7280'},
  greenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#166534',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 14,
  },
  importBtn: {marginTop: 14},
  greenBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
  btnDisabled: {opacity: 0.6},
  importHeaderRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
  importHeaderInfo: {flex: 1},
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  outlineBtnText: {fontSize: 12, fontWeight: '600', color: '#059669'},
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 14,
  },
  dropFileInfo: {alignItems: 'center'},
  dropFileName: {fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 8},
  dropTitle: {fontSize: 14, color: '#374151', marginTop: 8, fontWeight: '500'},
  dropHint: {fontSize: 12, color: '#9CA3AF', marginTop: 4},
  resultBox: {
    borderRadius: 10,
    padding: 14,
    marginTop: 14,
  },
  resultOk: {backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0'},
  resultWarn: {backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A'},
  resultTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  resultTitle: {fontSize: 14, fontWeight: '700', color: '#111827'},
  errorList: {marginTop: 8, maxHeight: 130},
  errorText: {fontSize: 12, color: '#6B7280', marginBottom: 3},
});
