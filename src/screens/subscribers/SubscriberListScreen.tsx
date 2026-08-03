import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {DrawerActions} from '@react-navigation/drawer';
import {getSubscribers, deleteSubscriber} from '../../api/subscribers';
import {Subscriber} from '../../types';

type StatusFilter = 'all' | 'active' | 'suspended' | 'inactive' | 'deactivated';

export default function SubscriberListScreen({navigation}: any) {
  const nav = useNavigation();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [filtered, setFiltered] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const openDrawer = () => {
    nav.dispatch(DrawerActions.openDrawer());
  };

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getSubscribers();
      setSubscribers(data);
      applyFilters(data, search, statusFilter);
    } catch {
      Alert.alert('Error', 'Failed to load subscribers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const applyFilters = (data: Subscriber[], query: string, status: StatusFilter) => {
    let result = data;
    if (status !== 'all') {
      result = result.filter(s => s.status === status);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.subscriber_identity.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          s.cnic.includes(q),
      );
    }
    setFiltered(result);
  };

  const onSearch = (text: string) => {
    setSearch(text);
    applyFilters(subscribers, text, statusFilter);
  };

  const onStatusFilter = (status: StatusFilter) => {
    setStatusFilter(status);
    applyFilters(subscribers, search, status);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Subscriber', `Are you sure you want to delete ${name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSubscriber(id);
            const updated = subscribers.filter(s => s.id !== id);
            setSubscribers(updated);
            applyFilters(updated, search, statusFilter);
          } catch {
            Alert.alert('Error', 'Failed to delete subscriber');
          }
        },
      },
    ]);
  };

  const statusColors: Record<string, string> = {
    active: '#10B981',
    suspended: '#F59E0B',
    inactive: '#6B7280',
    deactivated: '#EF4444',
  };

  const filters: StatusFilter[] = ['all', 'active', 'suspended', 'inactive', 'deactivated'];

  const renderItem = ({item}: {item: Subscriber}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('SubscriberDetail', {id: item.id})}>
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatar}>
          <Text style={styles.cardAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardId}>{item.subscriber_identity}</Text>
        </View>
        <View style={[styles.statusDot, {backgroundColor: statusColors[item.status] || '#6B7280'}]} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardField}>
          <Text style={styles.cardLabel}>Phone</Text>
          <Text style={styles.cardValue}>{item.phone}</Text>
        </View>
        <View style={styles.cardField}>
          <Text style={styles.cardLabel}>Package</Text>
          <Text style={styles.cardValue}>{item.packageName || '-'}</Text>
        </View>
        <View style={styles.cardField}>
          <Text style={styles.cardLabel}>Balance</Text>
          <Text style={[styles.cardValue, item.balance > 0 && styles.cardValueWarning]}>
            {item.balance.toFixed(2)}
          </Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={[styles.statusText, {color: statusColors[item.status] || '#6B7280'}]}>
          {item.status}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('SubscriberForm', {subscriber: item})}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id, item.name)}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Subscribers</Text>
          <Text style={styles.headerCount}>{filtered.length} total</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID, phone..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={onSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => onStatusFilter(f)}>
            <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#4F46E5']} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No subscribers found</Text>
            <Text style={styles.emptyText}>
              {search ? 'Try a different search term' : 'Add your first subscriber'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('SubscriberForm', {})}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6'},
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuIcon: {
    fontSize: 20,
    color: '#374151',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {fontSize: 20, fontWeight: '700', color: '#111827'},
  headerCount: {fontSize: 13, color: '#6B7280'},
  searchContainer: {paddingHorizontal: 16, paddingTop: 12},
  searchInput: {
    backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: '#111827', borderWidth: 1, borderColor: '#E5E7EB',
  },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  filterChipActive: {backgroundColor: '#4F46E5', borderColor: '#4F46E5'},
  filterText: {fontSize: 12, color: '#6B7280', fontWeight: '500'},
  filterTextActive: {color: '#FFFFFF'},
  list: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 80},
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
  cardAvatarText: {fontSize: 16, fontWeight: '600', color: '#4F46E5'},
  cardInfo: {flex: 1},
  cardName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  cardId: {fontSize: 12, color: '#6B7280', marginTop: 1},
  statusDot: {width: 10, height: 10, borderRadius: 5},
  cardBody: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10},
  cardField: {flex: 1},
  cardLabel: {fontSize: 11, color: '#9CA3AF', marginBottom: 2},
  cardValue: {fontSize: 13, color: '#374151', fontWeight: '500'},
  cardValueWarning: {color: '#F59E0B'},
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10,
  },
  statusText: {fontSize: 12, fontWeight: '600', textTransform: 'capitalize'},
  cardActions: {flexDirection: 'row', gap: 8},
  editBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6,
    backgroundColor: '#EEF2FF',
  },
  editBtnText: {fontSize: 12, fontWeight: '500', color: '#4F46E5'},
  deleteBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: {fontSize: 12, fontWeight: '500', color: '#EF4444'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4},
  emptyText: {fontSize: 13, color: '#6B7280'},
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#4F46E5', justifyContent: 'center',
    alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  fabText: {fontSize: 28, color: '#FFFFFF', fontWeight: '300', marginTop: -2},
});
