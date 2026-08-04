import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import {deleteConnection} from '../../api/connections';
import {Connection} from '../../types';
import AnimatedBackArrow from '../../components/AnimatedBackArrow';

export default function SubscriberDetailScreen({route, navigation}: any) {
  const connection: Connection = route.params?.connection;
  const subscriber: Connection | null = connection || null;

  const handleDelete = () => {
    if (!subscriber) {return;}
    Alert.alert('Delete Subscriber', `Delete ${subscriber.name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteConnection(subscriber.id);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  if (!subscriber) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Subscriber not found</Text>
      </View>
    );
  }

  const statusColors: Record<string, string> = {
    active: '#10B981', suspended: '#F59E0B', inactive: '#6B7280', deactivated: '#EF4444',
  };
  const typeLabels: Record<string, string> = {
    both: 'Both', internet: 'Internet', tv_cable: 'TV Cable',
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.headerAccent, {backgroundColor: '#4F46E5'}]} />
        <AnimatedBackArrow onPress={() => navigation.goBack()} color="#4F46E5" />
        <Text style={styles.headerTitle}>Subscriber</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('SubscriberForm', {connection: subscriber})}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{subscriber.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{subscriber.name}</Text>
          <Text style={styles.identity}>{subscriber.internetId}</Text>
          <View style={[styles.statusBadge, {backgroundColor: (statusColors[subscriber.status] || '#6B7280') + '20'}]}>
            <Text style={[styles.statusText, {color: statusColors[subscriber.status] || '#6B7280'}]}>
              {subscriber.status}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Cell</Text>
            <Text style={styles.fieldValue}>{subscriber.cell || '-'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Mobile</Text>
            <Text style={styles.fieldValue}>{subscriber.mobile || '-'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>CNIC</Text>
            <Text style={styles.fieldValue}>{subscriber.cnic || '-'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Address</Text>
            <Text style={styles.fieldValue}>{subscriber.address || '-'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Type</Text>
            <Text style={styles.fieldValue}>{typeLabels[subscriber.connectionType] || subscriber.connectionType || '-'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Install Date</Text>
            <Text style={styles.fieldValue}>{subscriber.installationDate || '-'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Recharge Date</Text>
            <Text style={styles.fieldValue}>{subscriber.rechargeDate || '-'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Cable Package</Text>
            <Text style={styles.fieldValue}>{subscriber.packageCable || '-'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Internet Package</Text>
            <Text style={styles.fieldValue}>{subscriber.packageInternet || '-'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Connection Provider</Text>
            <Text style={styles.fieldValue}>{subscriber.connectionProvider || '-'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Network</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Box Number</Text>
            <Text style={styles.fieldValue}>{subscriber.boxNumber || '-'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Splitter Port</Text>
            <Text style={styles.fieldValue}>{subscriber.splitterPort || '-'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Amount</Text>
            <Text style={styles.fieldValue}>{subscriber.amount ? subscriber.amount.toFixed(2) : '-'}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6'},
  emptyText: {fontSize: 14, color: '#6B7280'},
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
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#111827', marginRight: 12},
  headerActions: {flexDirection: 'row', gap: 8},
  editBtn: {paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: '#EEF2FF'},
  editBtnText: {fontSize: 13, fontWeight: '600', color: '#4F46E5'},
  deleteBtn: {paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: '#FEF2F2'},
  deleteBtnText: {fontSize: 13, fontWeight: '600', color: '#EF4444'},
  content: {paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30},
  profileCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05,
    shadowRadius: 4, elevation: 2, marginBottom: 16,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 16, backgroundColor: '#4F46E5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: {fontSize: 26, fontWeight: '700', color: '#FFFFFF'},
  name: {fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4},
  identity: {fontSize: 14, color: '#6B7280', marginBottom: 10},
  statusBadge: {paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12},
  statusText: {fontSize: 13, fontWeight: '600', textTransform: 'capitalize'},
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05,
    shadowRadius: 4, elevation: 2,
  },
  sectionTitle: {fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12},
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  fieldLabel: {fontSize: 13, color: '#6B7280'},
  fieldValue: {fontSize: 13, color: '#111827', fontWeight: '500', flex: 1, textAlign: 'right'},
});
