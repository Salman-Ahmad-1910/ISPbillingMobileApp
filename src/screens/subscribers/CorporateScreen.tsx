import React, {useCallback, useState} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {getCorporateCustomers, deleteCorporateCustomer} from '../../api/subscribers';
import {CorporateCustomer} from '../../types';

export default function CorporateScreen(_props: any) {
  const [customers, setCustomers] = useState<CorporateCustomer[]>([]);
  const [filtered, setFiltered] = useState<CorporateCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {setRefreshing(true);} else {setLoading(true);}
      const data = await getCorporateCustomers();
      setCustomers(data);
      setFiltered(data);
    } catch {
      Alert.alert('Error', 'Failed to load corporate customers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {fetchData();}, []));

  const onSearch = (text: string) => {
    setSearch(text);
    if (!text.trim()) {setFiltered(customers); return;}
    const q = text.toLowerCase();
    setFiltered(customers.filter(c => c.companyName.toLowerCase().includes(q) || c.contactPerson.toLowerCase().includes(q)));
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete', `Delete ${name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteCorporateCustomer(id);
            const updated = customers.filter(c => c.id !== id);
            setCustomers(updated);
            setFiltered(updated);
          } catch {Alert.alert('Error', 'Failed to delete');}
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#4F46E5" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Corporate Clients</Text>
        <Text style={styles.headerCount}>{filtered.length}</Text>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search corporate clients..."
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
                <Text style={styles.avatarText}>{item.companyName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{item.companyName}</Text>
                <Text style={styles.cardSub}>{item.contactPerson}</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardField}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <Text style={styles.fieldValue}>{item.contactPhone}</Text>
              </View>
              <View style={styles.cardField}>
                <Text style={styles.fieldLabel}>Connections</Text>
                <Text style={styles.fieldValue}>{item.totalConnections}</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.contractText}>
                {item.contractStartDate} → {item.contractEndDate}
              </Text>
              <TouchableOpacity onPress={() => handleDelete(item.id, item.companyName)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.emptyTitle}>No corporate clients</Text>
            <Text style={styles.emptyText}>Corporate clients will appear here</Text>
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
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  cardAvatar: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  avatarText: {fontSize: 16, fontWeight: '600', color: '#4F46E5'},
  cardInfo: {flex: 1},
  cardName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  cardSub: {fontSize: 12, color: '#6B7280', marginTop: 1},
  cardBody: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10},
  cardField: {flex: 1},
  fieldLabel: {fontSize: 11, color: '#9CA3AF', marginBottom: 2},
  fieldValue: {fontSize: 13, color: '#374151', fontWeight: '500'},
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8,
  },
  contractText: {fontSize: 12, color: '#6B7280'},
  deleteText: {fontSize: 12, color: '#EF4444', fontWeight: '500'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280'},
});
