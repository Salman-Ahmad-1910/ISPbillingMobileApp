import React from 'react';
import {
  Network,
  TowerControl,
  GitFork,
  Box,
  Archive,
  RadioTower,
  Server,
  SplitSquareHorizontal,
  Package,
  MapPin,
  Building2,
  Layers,
  Wifi,
  WifiOff,
  Plug,
  Globe,
} from 'lucide-react-native';
import {View, Text, StyleSheet} from 'react-native';
import {Area, POP, OLT, Splitter, DistributionBox} from '../../types';

export type SelectSource = 'static' | 'pops' | 'olts';

export interface ConfigField {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'number';
  required?: boolean;
  defaultValue?: string;
  selectOptions?: string[];
  selectSource?: SelectSource;
  validate?: (value: string, all: Record<string, string>) => string | null;
}

export interface StatCard {
  label: string;
  icon: React.ComponentType<{size?: number; color?: string; strokeWidth?: number}>;
  colors: [string, string];
  value: string | ((items: any[]) => string | number);
}

export interface InfoField {
  key: string;
  label: string;
  icon?: React.ComponentType<{size?: number; color?: string; strokeWidth?: number}>;
  iconColor?: string;
  render?: (item: any) => string | number;
}

export interface ModuleConfig {
  key: string;
  title: string;
  subtitle: string;
  singular: string;
  plural: string;
  icon: React.ComponentType<{size?: number; color?: string; strokeWidth?: number}>;
  gradient: [string, string];
  searchPlaceholder: string;
  addButtonLabel: string;
  formTitle: (isEdit: boolean) => string;
  fields: ConfigField[];
  stats: StatCard[];
  primaryField: InfoField;
  infoFields: InfoField[];
  statusBadge?: (item: any) => {label: string; online: boolean} | null;
  utilizationBar?: (item: any) => {used: number; total: number} | null;
  emptyIcon: string;
  emptyTitle: string;
  emptyText: string;
  match: (item: any, query: string) => boolean;
}

export const networkModules: Record<string, ModuleConfig> = {
  areas: {
    key: 'areas',
    title: 'Area Management',
    subtitle: 'Define and manage your service coverage areas.',
    singular: 'Area',
    plural: 'areas',
    icon: MapPin,
    gradient: ['#166534', '#22c55e'],
    searchPlaceholder: 'Filter by city, zone, or locality...',
    addButtonLabel: 'Add New Area',
    formTitle: isEdit => (isEdit ? 'Edit Area' : 'Add Area'),
    fields: [
      {key: 'city', label: 'City', placeholder: 'e.g., Karachi', required: true},
      {key: 'zone', label: 'Zone', placeholder: 'e.g., South', required: true},
      {key: 'locality', label: 'Locality', placeholder: 'e.g., DHA Phase 6', required: true},
      {key: 'subLocality', label: 'Sub-Locality (Optional)', placeholder: 'e.g., Street 1-10'},
    ],
    stats: [
      {
        label: 'Total Areas',
        icon: MapPin,
        colors: ['#166534', '#22c55e'],
        value: (items: Area[]) => items.length,
      },
      {
        label: 'Cities',
        icon: Building2,
        colors: ['#1E40AF', '#3B82F6'],
        value: (items: Area[]) => new Set(items.map(a => a.city)).size,
      },
      {
        label: 'Zones',
        icon: Layers,
        colors: ['#B45309', '#FB923C'],
        value: (items: Area[]) => new Set(items.map(a => a.zone)).size,
      },
    ],
    primaryField: {key: 'city', label: 'City', icon: MapPin, iconColor: '#166534'},
    infoFields: [
      {key: 'zone', label: 'Zone'},
      {key: 'locality', label: 'Locality'},
      {
        key: 'subLocality',
        label: 'Sub-Locality',
        render: (a: Area) => a.subLocality || 'N/A',
      },
    ],
    emptyIcon: '📍',
    emptyTitle: 'No areas found',
    emptyText: 'Get started by adding a new area.',
    match: (a: Area, q: string) =>
      [a.city, a.zone, a.locality, a.subLocality || ''].some(v =>
        v.toLowerCase().includes(q),
      ),
  },

  pops: {
    key: 'pops',
    title: 'POP Management',
    subtitle: 'Monitor your Point of Presence (POP) locations.',
    singular: 'POP',
    plural: 'POPs',
    icon: RadioTower,
    gradient: ['#BE123C', '#F43F5E'],
    searchPlaceholder: 'Filter by name or location...',
    addButtonLabel: 'Add POP',
    formTitle: isEdit => (isEdit ? 'Edit POP' : 'Add POP'),
    fields: [
      {key: 'name', label: 'POP Name', placeholder: 'e.g., DHA Phase 6 POP', required: true},
      {key: 'location', label: 'Location', placeholder: 'e.g., Office 1, Comm. Street 10', required: true},
      {
        key: 'status',
        label: 'Status',
        placeholder: 'Select status',
        required: true,
        selectOptions: ['online', 'offline'],
        defaultValue: 'online',
      },
    ],
    stats: [
      {
        label: 'Total POPs',
        icon: RadioTower,
        colors: ['#BE123C', '#F43F5E'],
        value: (items: POP[]) => items.length,
      },
      {
        label: 'Online',
        icon: Wifi,
        colors: ['#166534', '#22c55e'],
        value: (items: POP[]) => items.filter(p => p.status === 'online').length,
      },
      {
        label: 'Offline',
        icon: WifiOff,
        colors: ['#BE123C', '#F43F5E'],
        value: (items: POP[]) => items.filter(p => p.status !== 'online').length,
      },
    ],
    primaryField: {key: 'name', label: 'Name', icon: RadioTower, iconColor: '#BE123C'},
    infoFields: [{key: 'location', label: 'Location', icon: MapPin, iconColor: '#6B7280'}],
    statusBadge: (p: POP) => ({label: p.status, online: p.status === 'online'}),
    emptyIcon: '📡',
    emptyTitle: 'No POPs found',
    emptyText: 'Get started by adding a new POP location.',
    match: (p: POP, q: string) => [p.name, p.location].some(v => v.toLowerCase().includes(q)),
  },

  olts: {
    key: 'olts',
    title: 'OLT Management',
    subtitle: 'Manage your Optical Line Terminals.',
    singular: 'OLT',
    plural: 'OLTs',
    icon: Server,
    gradient: ['#1E40AF', '#3B82F6'],
    searchPlaceholder: 'Filter by name, location, or IP...',
    addButtonLabel: 'Add OLT',
    formTitle: isEdit => (isEdit ? 'Edit OLT' : 'Add OLT'),
    fields: [
      {key: 'name', label: 'OLT Name', placeholder: 'e.g., DHA-OLT-1', required: true},
      {key: 'location', label: 'Location', placeholder: 'e.g., DHA Phase 6 PoP', required: true},
      {
        key: 'popId',
        label: 'POP',
        placeholder: 'Select POP',
        selectSource: 'pops',
        defaultValue: '',
      },
      {key: 'ipAddress', label: 'IP Address', placeholder: 'e.g., 10.10.1.1', required: true},
      {
        key: 'ports',
        label: 'Total Ports',
        placeholder: '16',
        type: 'number',
        required: true,
        defaultValue: '16',
      },
    ],
    stats: [
      {
        label: 'Total OLTs',
        icon: Server,
        colors: ['#1E40AF', '#3B82F6'],
        value: (items: OLT[]) => items.length,
      },
      {
        label: 'Total Ports',
        icon: Layers,
        colors: ['#6D28D9', '#A78BFA'],
        value: (items: OLT[]) => items.reduce((sum, o) => sum + o.ports, 0),
      },
      {
        label: 'Locations',
        icon: Globe,
        colors: ['#166534', '#22c55e'],
        value: (items: OLT[]) => new Set(items.map(o => o.location)).size,
      },
    ],
    primaryField: {key: 'name', label: 'Name', icon: Server, iconColor: '#1E40AF'},
    infoFields: [
      {key: 'location', label: 'Location'},
      {key: 'ipAddress', label: 'IP Address', icon: Globe, iconColor: '#6B7280'},
      {key: 'ports', label: 'Ports'},
    ],
    emptyIcon: '🖥️',
    emptyTitle: 'No OLTs found',
    emptyText: 'Get started by adding a new OLT.',
    match: (o: OLT, q: string) =>
      [o.name, o.location, o.ipAddress].some(v => v.toLowerCase().includes(q)),
  },

  splitters: {
    key: 'splitters',
    title: 'Splitter Management',
    subtitle: 'Track your fiber optic splitters and port utilization.',
    singular: 'Splitter',
    plural: 'splitters',
    icon: SplitSquareHorizontal,
    gradient: ['#166534', '#22c55e'],
    searchPlaceholder: 'Filter by name or location...',
    addButtonLabel: 'Add Splitter',
    formTitle: isEdit => (isEdit ? 'Edit Splitter' : 'Add Splitter'),
    fields: [
      {key: 'name', label: 'Splitter Name', placeholder: 'e.g., DHA-P6-S1', required: true},
      {key: 'location', label: 'Location', placeholder: 'e.g., Street 5, DHA P6', required: true},
      {
        key: 'oltId',
        label: 'Parent OLT',
        placeholder: 'Select an OLT',
        required: true,
        selectSource: 'olts',
      },
      {
        key: 'totalPorts',
        label: 'Total Ports',
        placeholder: '8',
        type: 'number',
        required: true,
        defaultValue: '8',
      },
      {
        key: 'availablePorts',
        label: 'Available Ports',
        placeholder: '8',
        type: 'number',
        required: true,
        defaultValue: '8',
      },
    ],
    stats: [
      {
        label: 'Total Splitters',
        icon: SplitSquareHorizontal,
        colors: ['#166534', '#22c55e'],
        value: (items: Splitter[]) => items.length,
      },
      {
        label: 'Total Ports',
        icon: Plug,
        colors: ['#1E40AF', '#3B82F6'],
        value: (items: Splitter[]) => items.reduce((sum, s) => sum + s.totalPorts, 0),
      },
      {
        label: 'Available',
        icon: RadioTower,
        colors: ['#166534', '#22c55e'],
        value: (items: Splitter[]) => items.reduce((sum, s) => sum + s.availablePorts, 0),
      },
      {
        label: 'Used',
        icon: Plug,
        colors: ['#BE123C', '#F43F5E'],
        value: (items: Splitter[]) =>
          items.reduce((sum, s) => sum + (s.totalPorts - s.availablePorts), 0),
      },
    ],
    primaryField: {key: 'name', label: 'Name', icon: SplitSquareHorizontal, iconColor: '#166534'},
    infoFields: [
      {key: 'location', label: 'Location', icon: MapPin, iconColor: '#6B7280'},
      {
        key: 'oltId',
        label: 'Parent OLT',
        icon: RadioTower,
        iconColor: '#6B7280',
        render: (s: Splitter) => s.oltId.slice(0, 8),
      },
      {key: 'totalPorts', label: 'Total Ports', icon: Plug, iconColor: '#6B7280'},
      {key: 'availablePorts', label: 'Available'},
    ],
    utilizationBar: (s: Splitter) => ({used: s.totalPorts - s.availablePorts, total: s.totalPorts}),
    emptyIcon: '🔀',
    emptyTitle: 'No splitters found',
    emptyText: 'Get started by adding a new splitter.',
    match: (s: Splitter, q: string) =>
      [s.name, s.location].some(v => v.toLowerCase().includes(q)),
  },

  boxes: {
    key: 'boxes',
    title: 'Box / Media Management',
    subtitle: 'Define and manage your distribution box numbers.',
    singular: 'Box',
    plural: 'boxes',
    icon: Package,
    gradient: ['#166534', '#22c55e'],
    searchPlaceholder: 'Filter by box number...',
    addButtonLabel: 'Add Box Number',
    formTitle: isEdit => (isEdit ? 'Edit Box / Media Number' : 'Add Box / Media Number'),
    fields: [
      {key: 'name', label: 'Box / Media Number', placeholder: 'e.g., BX-001', required: true},
    ],
    stats: [
      {
        label: 'Total Boxes / Media',
        icon: Package,
        colors: ['#166534', '#22c55e'],
        value: (items: DistributionBox[]) => items.length,
      },
    ],
    primaryField: {key: 'name', label: 'Box / Media Number', icon: Package, iconColor: '#166534'},
    infoFields: [],
    emptyIcon: '📦',
    emptyTitle: 'No boxes found',
    emptyText: 'Get started by adding a new box / media number.',
    match: (b: DistributionBox, q: string) => b.name.toLowerCase().includes(q),
  },
};

export const networkIcons: Record<string, React.ComponentType<any>> = {
  Network,
  TowerControl,
  GitFork,
  Box,
  Archive,
};

export const utilStyles = StyleSheet.create({
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    flex: 1,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {height: '100%', borderRadius: 4},
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeOnline: {backgroundColor: '#10B981'},
  badgeOffline: {backgroundColor: '#EF4444'},
  badgeText: {fontSize: 11, fontWeight: '600', color: '#FFFFFF', marginLeft: 4},
  utilRow: {flexDirection: 'row', alignItems: 'center', flex: 1},
  utilPct: {fontSize: 12, color: '#6B7280'},
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoRowIcon: {marginRight: 6},
  infoLabel: {fontSize: 11, color: '#9CA3AF', marginRight: 6},
  infoValue: {fontSize: 13, color: '#374151', fontWeight: '500', flexShrink: 1},
});

export function StatusBadge({label, online}: {label: string; online: boolean}) {
  const Icon = online ? Wifi : WifiOff;
  return (
    <View
      style={[
        utilStyles.badge,
        online ? utilStyles.badgeOnline : utilStyles.badgeOffline,
      ]}>
      <Icon size={12} color="#FFFFFF" />
      <Text style={utilStyles.badgeText}>{label}</Text>
    </View>
  );
}

export function UtilizationBar({used, total}: {used: number; total: number}) {
  const pct = total === 0 ? 0 : (used / total) * 100;
  const color = pct > 80 ? '#EF4444' : pct > 50 ? '#22c55e' : '#10B981';
  return (
    <View style={utilStyles.utilRow}>
      <View style={utilStyles.progressTrack}>
        <View style={[utilStyles.progressFill, {backgroundColor: color, width: `${pct}%`}]} />
      </View>
      <Text style={utilStyles.utilPct}>{pct.toFixed(0)}%</Text>
    </View>
  );
}
