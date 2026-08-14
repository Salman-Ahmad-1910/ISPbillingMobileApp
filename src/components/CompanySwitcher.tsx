import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {getApiBaseUrl} from '../api/client';
import {Company} from '../types';
import {ChevronDown, Building2, Check} from 'lucide-react-native';

const ACCENT = '#059669';

function CompanyLogo({company, baseUrl, size}: {company: Company | null; baseUrl: string; size: number}) {
  const uri = company?.logo && baseUrl ? `${baseUrl}/uploads/company_images/${company.id}` : null;
  if (uri) {
    return (
      <Image
        source={{uri}}
        style={{width: size, height: size, borderRadius: size / 2}}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={[styles.logoFallback, {width: size, height: size, borderRadius: size / 2}]}>
      <Text style={[styles.logoFallbackText, {fontSize: size * 0.42}]}>
        {company?.name?.charAt(0)?.toUpperCase() || '?'}
      </Text>
    </View>
  );
}

export default function CompanySwitcher() {
  const {companyId, companies, refreshCompanies, selectCompany, user} = useAuth();
  const [baseUrl, setBaseUrl] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let mounted = true;
    getApiBaseUrl()
      .then(u => {
        if (mounted) {
          setBaseUrl(u);
        }
      })
      .catch(() => {});
    refreshCompanies()
      .catch(() => {})
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [refreshCompanies]);

  const selected = companies.find(c => c.id === companyId) || null;
  const displayName = selected?.name || user?.company?.name || 'Select company';
  const displaySub = selected?.email || 'Switch company';

  const handleSelect = async (company: Company) => {
    if (company.id === companyId) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await selectCompany(company);
      setOpen(false);
    } catch {
      setSwitching(false);
    }
  };

  const renderItem = ({item}: {item: Company}) => {
    const isSelected = item.id === companyId;
    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.itemSelected]}
        activeOpacity={0.7}
        disabled={switching}
        onPress={() => handleSelect(item)}>
        <CompanyLogo company={item} baseUrl={baseUrl} size={36} />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.itemSub} numberOfLines={1}>
            {item.email || 'No email'}
          </Text>
        </View>
        {isSelected ? <Check size={18} color={ACCENT} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} activeOpacity={0.8} onPress={() => setOpen(true)}>
        <CompanyLogo company={selected} baseUrl={baseUrl} size={40} />
        <View style={styles.triggerInfo}>
          <Text style={styles.triggerName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.triggerSub} numberOfLines={1}>
            {displaySub}
          </Text>
        </View>
        <ChevronDown size={18} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Switch Company</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={ACCENT} />
              </View>
            ) : companies.length === 0 ? (
              <View style={styles.centerBox}>
                <Text style={styles.emptyText}>No companies available</Text>
                <Text style={styles.emptySub}>Create a company from the Companies page.</Text>
              </View>
            ) : (
              <FlatList
                data={companies}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    backgroundColor: '#1F2937',
  },
  triggerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  triggerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  triggerSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  logoFallback: {
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoFallbackText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sheetClose: {
    fontSize: 18,
    color: '#6B7280',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  itemSelected: {
    backgroundColor: '#D1FAE5',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  itemSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  emptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
});
