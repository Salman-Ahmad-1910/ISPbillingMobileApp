import React, {useCallback, useState} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {getInquiries, deleteInquiry} from '../../api/subscribers';
import {Inquiry} from '../../types';

export default function InquiriesScreen(_props: any) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filtered, setFiltered] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {setRefreshing(true);} else {setLoading(true);}
      const data = await getInquiries();
      setInquiries(data);
      setFiltered(data);
    } catch {
      Alert.alert('Error', 'Failed to load inquiries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {fetchData();}, []));

  const onSearch = (text: string) => {
    setSearch(text);
    if (!text.trim()) {setFiltered(inquiries); return;}
    const q = text.toLowerCase();
    setFiltered(inquiries.filter(i => i.name.toLowerCase().includes(q) || i.mobile?.includes(q)));
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Inquiry', `Delete inquiry for ${name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteInquiry(id);
            const updated = inquiries.filter(i => i.id !== id);
            setInquiries(updated);
            setFiltered(updated);
          } catch {Alert.alert('Error', 'Failed to delete');}
        },
      },
    ]);
  };

  const statusColors: Record<string, string> = {
    new: '#3B82F6', 'in-progress': '#F59E0B', converted: '#10B981', closed: '#6B7280',
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#4F46E5" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inquiries</Text>
        <Text style={styles.headerCount}>{filtered.length}</Text>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search inquiries..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={onSearch}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#4F46E5']} />}
        renderItem={({item}) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardAvatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardSub}>{item.mobile || item.cell || '-'}</Text>
              </View>
              <View style={[styles.statusBadge, {backgroundColor: (statusColors[item.status] || '#6B7280') + '20'}]}>
                <Text style={[styles.statusText, {color: statusColors[item.status] || '#6B7280'}]}>
                  {item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardDate}>{item.connectionType || '-'}</Text>
              <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No inquiries</Text>
            <Text style={styles.emptyText}>New inquiries will appear here</Text>
          </View>
        }
      />
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
  headerTitle: {fontSize: 20, fontWeight: '700', color: '#111827'},
  headerCount: {fontSize: 13, color: '#6B7280'},
  searchContainer: {paddingHorizontal: 16, paddingTop: 12},
  searchInput: {
    backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: '#111827', borderWidth: 1, borderColor: '#E5E7EB',
  },
  list: {paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20},
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05,
    shadowRadius: 4, elevation: 2,
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  cardAvatar: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#FEF3C7',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  avatarText: {fontSize: 14, fontWeight: '600', color: '#92400E'},
  cardInfo: {flex: 1},
  cardName: {fontSize: 14, fontWeight: '600', color: '#111827'},
  cardSub: {fontSize: 12, color: '#6B7280', marginTop: 1},
  statusBadge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8},
  statusText: {fontSize: 11, fontWeight: '600', textTransform: 'capitalize'},
  cardAddress: {fontSize: 12, color: '#9CA3AF', marginBottom: 8},
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8,
  },
  cardDate: {fontSize: 12, color: '#6B7280'},
  deleteText: {fontSize: 12, color: '#EF4444', fontWeight: '500'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280'},
});
