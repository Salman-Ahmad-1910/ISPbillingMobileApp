import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {Company} from '../types';

export default function CompanySelectScreen(_props: any) {
  const {companies, refreshCompanies, selectCompany, user, logout} = useAuth();
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCompanies = async () => {
    try {
      await refreshCompanies();
    } catch {
      Alert.alert('Error', 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = async (company: Company) => {
    setSelecting(company.id);
    try {
      await selectCompany(company);
    } catch {
      Alert.alert('Error', 'Failed to select company');
    } finally {
      setSelecting(null);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const renderCompany = ({item}: {item: Company}) => {
    const isSelecting = selecting === item.id;
    return (
      <TouchableOpacity
        style={[styles.companyCard, isSelecting && styles.companyCardSelected]}
        onPress={() => handleSelectCompany(item)}
        disabled={selecting !== null}>
        <View style={styles.companyHeader}>
          <View style={styles.companyAvatar}>
            <Text style={styles.companyInitial}>
              {item.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.role && (
              <Text style={styles.companyRole}>{item.role}</Text>
            )}
          </View>
          {isSelecting && (
            <ActivityIndicator size="small" color="#4F46E5" />
          )}
        </View>
        {item.address && (
          <Text style={styles.companyAddress} numberOfLines={1}>
            {item.address}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

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
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>⚡</Text>
        </View>
        <Text style={styles.title}>Select Company</Text>
        <Text style={styles.subtitle}>
          {user?.name ? `Welcome, ${user.name}` : 'Choose a company to continue'}
        </Text>
      </View>

      {companies.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No companies found</Text>
          <Text style={styles.emptySubtext}>
            You don't have access to any companies yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={companies}
          keyExtractor={item => item.id}
          renderItem={renderCompany}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  companyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  companyCardSelected: {
    borderColor: '#4F46E5',
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  companyRole: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  companyAddress: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
    marginLeft: 56,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginBottom: 40,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});
