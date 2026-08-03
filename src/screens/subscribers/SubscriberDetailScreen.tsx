import React, {useEffect, useState} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import {getSubscriber, deleteSubscriber} from '../../api/subscribers';
import {Subscriber} from '../../types';

export default function SubscriberDetailScreen({route, navigation}: any) {
  const {id} = route.params;
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getSubscriber(id);
        setSubscriber(data);
      } catch {
        Alert.alert('Error', 'Failed to load subscriber');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = () => {
    if (!subscriber) {return;}
    Alert.alert('Delete Subscriber', `Delete ${subscriber.name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteSubscriber(subscriber.id);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  if (loading || !subscriber) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const statusColors: Record<string, string> = {
    active: '#10B981', suspended: '#F59E0B', inactive: '#6B7280', deactivated: '#EF4444',
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('SubscriberForm', {subscriber})}>
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
          <Text style={styles.identity}>{subscriber.subscriber_identity}</Text>
          <View style={[styles.statusBadge, {backgroundColor: (statusColors[subscriber.status] || '#6B7280') + '20'}]}>
            <Text style={[styles.statusText, {color: statusColors[subscriber.status] || '#6B7280'}]}>
              {subscriber.status}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <Text style={styles.fieldValue}>{subscriber.phone}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>CNIC</Text>
            <Text style={styles.fieldValue}>{subscriber.cnic}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Address</Text>
            <Text style={styles.fieldValue}>{subscriber.installationAddress}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Package</Text>
            <Text style={styles.fieldValue}>{subscriber.packageName || '-'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Billing Cycle</Text>
            <Text style={styles.fieldValue}>{subscriber.billingCycle}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Balance</Text>
            <Text style={[styles.fieldValue, subscriber.balance > 0 && styles.warning]}>
              {subscriber.balance.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Network</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Area</Text>
            <Text style={styles.fieldValue}>{subscriber.areaName || '-'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Splitter Port</Text>
            <Text style={styles.fieldValue}>{subscriber.splitterPort || '-'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Connection Date</Text>
            <Text style={styles.fieldValue}>{subscriber.connectionDate || '-'}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6'},
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: {paddingVertical: 4},
  backText: {fontSize: 16, color: '#4F46E5', fontWeight: '500'},
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
  warning: {color: '#F59E0B'},
});
