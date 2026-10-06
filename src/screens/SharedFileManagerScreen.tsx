import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Linking,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import {pick, types, isErrorWithCode, errorCodes} from '@react-native-documents/picker';
import {Download, Trash2, FileBox, Upload} from 'lucide-react-native';
import apiClient from '../api/client';

interface SharedFileItem {
  id: string;
  originalName: string;
  storedName: string;
  size: number;
  createdAt: string;
  downloadUrl: string;
}

interface SharedFileManagerScreenProps {
  title: string;
  description: string;
  kind: 'driver' | 'application';
  uploadEndpoint: string;
  listEndpoint: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
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

export default function SharedFileManagerScreen({
  title,
  description,
  uploadEndpoint,
  listEndpoint,
}: SharedFileManagerScreenProps) {
  const navigation = useNavigation();
  const drawerStatus = useDrawerStatus();
  const [files, setFiles] = useState<SharedFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(listEndpoint);
      const data = response.data.data as {files?: SharedFileItem[]};
      setFiles(data.files ?? []);
    } catch (error: any) {
      Alert.alert('Failed to load files', error?.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [listEndpoint]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async () => {
    try {
      const result = await pick({
        type: [types.allFiles],
        allowMultiSelection: false,
      });

      const file = result[0];
      const ext = file.name?.toLowerCase().split('.').pop();
      if (!['exe', 'msi', 'zip'].includes(ext || '')) {
        Alert.alert('Invalid file type', 'Only .exe, .msi, or .zip files are allowed.');
        return;
      }
      if (file.size && file.size > 100 * 1024 * 1024) {
        Alert.alert('File too large', 'Maximum size is 100MB.');
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name || 'file',
      } as any);

      await apiClient.post(uploadEndpoint, formData, {
        headers: {'Content-Type': 'multipart/form-data'},
      });

      Alert.alert('Upload successful', 'File uploaded successfully.');
      fetchFiles();
    } catch (error: any) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      Alert.alert('Upload failed', error?.response?.data?.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete File', 'Are you sure you want to delete this file?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/files/${id}`);
            Alert.alert('Deleted', 'File removed successfully.');
            setFiles(prev => prev.filter(f => f.id !== id));
          } catch (error: any) {
            Alert.alert('Delete failed', error?.response?.data?.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const handleDownload = (file: SharedFileItem) => {
    const url = file.downloadUrl;
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{title}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>{description}</Text>

        {/* Upload Button */}
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={uploading}>
          {uploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Upload size={18} color="#FFFFFF" />
          )}
          <Text style={styles.uploadButtonText}>
            {uploading ? 'Uploading...' : 'Choose & Upload File'}
          </Text>
        </TouchableOpacity>

        {/* Files List */}
        <View style={styles.filesCard}>
          <Text style={styles.filesTitle}>Available Files</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#6B7280" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : files.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FileBox size={32} color="#9CA3AF" />
              <Text style={styles.emptyText}>No files uploaded yet.</Text>
            </View>
          ) : (
            files.map(file => (
              <View key={file.id} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.originalName}
                  </Text>
                  <Text style={styles.fileMeta}>
                    {formatBytes(file.size)} · {new Date(file.createdAt).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.fileActions}>
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleDownload(file)}>
                    <Download size={16} color="#059669" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(file.id)}>
                    <Trash2 size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  topBar: {
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
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingRight: 8,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 18,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: '#059669',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  filesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  filesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  fileInfo: {
    flex: 1,
    marginRight: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  fileMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  fileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  downloadButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
