import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import type {ComponentType} from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {useAuth} from '../context/AuthContext';
import DashboardScreen from '../screens/DashboardScreen';
import SubscribersNavigator from './SubscribersNavigator';
import BillingScreen from '../screens/BillingScreen';
import MoreScreen from '../screens/MoreScreen';
import InquiriesScreen from '../screens/subscribers/InquiriesScreen';
import CorporateScreen from '../screens/subscribers/CorporateScreen';
import CustomersScreen from '../screens/subscribers/CustomersScreen';
import GuarantorsScreen from '../screens/subscribers/GuarantorsScreen';
import PackagesScreen from '../screens/subscribers/PackagesScreen';
import ProductsScreen from '../screens/subscribers/ProductsScreen';
import InstallmentPlansScreen from '../screens/subscribers/InstallmentPlansScreen';
import SalesCustomersScreen from '../screens/subscribers/SalesCustomersScreen';
import {
  AreasNavigator,
  PopsNavigator,
  OltsNavigator,
  SplittersNavigator,
  BoxesNavigator,
} from './NetworkNavigator';
import {
  LayoutDashboard,
  Network,
  TowerControl,
  GitFork,
  Box,
  Archive,
  Inbox,
  MailQuestionMark,
  FilePen,
  Send,
  Clock,
  MessageCircle,
  Users,
  UserPlus,
  Building,
  UserRound,
  UserCheck,
  Receipt,
  ShoppingCart,
  FileCog,
  Handshake,
  ClipboardPen,
  TriangleAlert,
  FolderClosed,
  Wallet,
  FileText,
  Tag,
  Building2,
  Ruler,
  ArrowLeftRight,
  Activity,
  Shapes,
  Warehouse,
  Layers,
  ChartBarBig,
  BookOpen,
  BellRing,
  Headphones,
  Map,
  Briefcase,
  CalendarDays,
  HandHelping,
  ShieldCheck,
  Settings,
  FileClock,
  HandCoins,
  UserSearch,
  LifeBuoy,
  LogOut,
} from 'lucide-react-native';

const Drawer = createDrawerNavigator();

type NavItem = {
  label: string;
  icon: string | ComponentType<{size?: number; color?: string; strokeWidth?: number}>;
  screen?: string;
  children?: NavItem[];
};

const navItems: {title: string; items: NavItem[]}[] = [
  {
    title: 'Dashboard',
    items: [{label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard'}],
  },
  {
    title: 'Network',
    items: [
      {label: 'Areas', icon: Network, screen: 'Areas'},
      {label: 'POPs', icon: TowerControl, screen: 'POPs'},
      {label: 'OLTs', icon: GitFork, screen: 'OLTs'},
      {label: 'Splitters', icon: Box, screen: 'Splitters'},
      {label: 'Box / Media', icon: Archive, screen: 'Boxes'},
    ],
  },
  {
    title: 'Messages',
    items: [
      {label: 'New Messages', icon: Inbox},
      {label: 'Other Messages', icon: MailQuestionMark},
      {label: 'Draft Messages', icon: FilePen},
      {label: 'Sent Messages', icon: Send},
      {label: 'Expiry Messages', icon: Clock},
      {label: 'WhatsApp Drafts', icon: MessageCircle},
    ],
  },
  {
    title: 'Subscribers Management',
    items: [
      {label: 'Subscriber Detail', icon: Users, screen: 'Subscribers'},
      {label: 'New Inquiries', icon: UserPlus, screen: 'Inquiries'},
      {label: 'Corporate Clients', icon: Building, screen: 'Corporate'},
      {label: 'Customers', icon: UserRound, screen: 'Customers'},
      {label: 'Guarantors', icon: UserCheck, screen: 'Guarantors'},
      {label: 'Packages', icon: Receipt, screen: 'Packages'},
    ],
  },
  {
    title: 'Sales',
    items: [
      {label: 'Sales', icon: ShoppingCart},
      {label: 'Customers', icon: UserRound, screen: 'SalesCustomers'},
      {label: 'Installment Plans', icon: FileCog, screen: 'InstallmentPlans'},
      {label: 'Point of Sale', icon: ShoppingCart},
    ],
  },
  {
    title: 'Transaction',
    items: [
      {label: 'Subscriber Collections', icon: Users},
      {label: 'Dealers Collections', icon: Handshake},
      {label: 'Allocated Collections', icon: ClipboardPen},
      {label: 'Transaction Type', icon: FileCog},
      {label: 'Bad Debt Collections', icon: TriangleAlert},
      {label: 'Bill Creator', icon: ClipboardPen},
    ],
  },
  {
    title: 'Dealer Management',
    items: [
      {label: 'My Dealers', icon: Users},
      {label: 'Dealer Dashboard', icon: FolderClosed},
      {label: 'Collections', icon: Wallet},
      {label: 'Defaulters', icon: TriangleAlert},
      {label: 'New Dealers', icon: UserPlus},
      {label: 'Invoices', icon: FileText},
    ],
  },
  {
    title: 'Inventory',
    items: [
      {label: 'Products', icon: Box, screen: 'Products'},
      {label: 'Stock', icon: Warehouse},
      {label: 'Brands', icon: Tag},
      {label: 'Unit Type', icon: Ruler},
      {label: 'Product Type', icon: Shapes},
      {label: 'Inventory Status', icon: Activity},
      {label: 'Purchase', icon: ArrowLeftRight},
      {label: 'Vendors', icon: Building2},
      {label: 'Store', icon: Warehouse},
    ],
  },
  {
    title: 'Accounts',
    items: [
      {label: 'Account Head', icon: Layers},
      {label: 'Account Entry', icon: ClipboardPen},
      {label: 'Account Reports', icon: FileText},
      {label: 'One Day Balance Sheet', icon: ChartBarBig},
    ],
  },
  {
    title: 'Complaints',
    items: [
      {label: 'User Complaint', icon: UserPlus},
      {label: 'Allocated Complaint', icon: ClipboardPen},
      {label: 'Subject Type', icon: BookOpen},
      {label: 'Complaint Report', icon: FileText},
    ],
  },
  {
    title: 'Service Desk',
    items: [
      {label: 'Alerts', icon: BellRing},
      {label: 'Support Tickets', icon: Headphones},
    ],
  },
  {
    title: 'Recovery Officers',
    items: [
      {label: 'Areas', icon: Map},
      {label: 'Officers', icon: UserCheck},
    ],
  },
  {
    title: 'Human Resources',
    items: [
      {label: 'Staff', icon: Briefcase},
      {label: 'Attendance', icon: CalendarDays},
      {label: 'Advances & Loans', icon: HandHelping},
    ],
  },
  {
    title: 'Administration',
    items: [
      {label: 'My Company Profile', icon: Building},
      {label: 'Companies', icon: Building2},
      {label: 'Roles & Permissions', icon: ShieldCheck},
      {label: 'System Config', icon: Settings},
      {label: 'System Logs', icon: FileText},
    ],
  },
  {
    title: 'Reports',
    items: [
      {label: 'User Collection', icon: Wallet},
      {label: 'Deactivate Users List', icon: UserSearch},
      {label: 'Package Wise List', icon: Box},
      {label: 'Promise Date Reports', icon: FileClock},
      {label: 'Allocated Defaulters', icon: TriangleAlert},
      {label: 'Expiry Wise Defaulters', icon: ChartBarBig},
      {label: 'Month Wise Defaulters', icon: FileText},
      {label: 'Monthly Collections', icon: HandCoins},
      {label: 'User Creator Summary', icon: UserPlus},
    ],
  },
];

function DrawerContent(props: any) {
  const {navigation} = props;
  const {user, logout} = useAuth();
  const [openGroup, setOpenGroup] = useState<string | null>('Dashboard');

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Sign Out', style: 'destructive', onPress: () => logout()},
    ]);
  };

  const handleItemPress = (item: NavItem) => {
    if (item.screen) {
      navigation.navigate(item.screen);
    } else {
      Alert.alert('Coming Soon', `${item.label} will be available in a future update.`);
    }
    navigation.closeDrawer();
  };

  const toggleGroup = (title: string) => {
    setOpenGroup(openGroup === title ? null : title);
  };

  return (
    <View style={styles.drawerContainer}>
      {/* Header */}
      <View style={styles.drawerHeader}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>F</Text>
        </View>
        <Text style={styles.appName}>Fintrack ERP</Text>
      </View>

      {/* User Card */}
      <View style={styles.userCard}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.userRole}>{user?.role || 'Admin'}</Text>
        </View>
      </View>

      {/* Navigation */}
      <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
        {navItems.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.navGroup}>
            <TouchableOpacity
              style={styles.navGroupHeader}
              onPress={() => toggleGroup(group.title)}>
              <Text style={styles.navGroupTitle}>{group.title}</Text>
              <Text style={styles.navGroupArrow}>
                {openGroup === group.title ? '▾' : '▸'}
              </Text>
            </TouchableOpacity>
            {openGroup === group.title && (
              <View style={styles.navGroupItems}>
                {group.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    style={styles.navItem}
                    onPress={() => handleItemPress(item)}>
                    {typeof item.icon === 'string' ? (
                      <Text style={styles.navItemIcon}>{item.icon}</Text>
                    ) : (
                      <View style={styles.navItemIconBox}>
                        <item.icon size={16} color="#9CA3AF" />
                      </View>
                    )}
                    <Text style={styles.navItemLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.drawerFooter}>
        <TouchableOpacity style={styles.footerItem}>
          <View style={styles.navItemIconBox}>
            <LifeBuoy size={16} color="#9CA3AF" />
          </View>
          <Text style={styles.footerLabel}>Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerItem} onPress={handleLogout}>
          <View style={styles.navItemIconBox}>
            <LogOut size={16} color="#9CA3AF" />
          </View>
          <Text style={styles.footerLabel}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PlaceholderScreen({title}: {title: string}) {
  return (
    <View style={styles.placeholderContainer}>
      <View style={styles.placeholderHeader}>
        <Text style={styles.placeholderTitle}>{title}</Text>
      </View>
      <View style={styles.placeholderContent}>
        <Text style={styles.placeholderIcon}>🚧</Text>
        <Text style={styles.placeholderText}>Coming Soon</Text>
        <Text style={styles.placeholderSubtext}>
          {title} will be available in a future update.
        </Text>
      </View>
    </View>
  );
}

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={props => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        swipeEnabled: true,
        swipeEdgeWidth: 40,
        drawerStyle: {
          width: 280,
          backgroundColor: '#111827',
        },
      }}>
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Subscribers" component={SubscribersNavigator} />
      <Drawer.Screen name="Areas" component={AreasNavigator} />
      <Drawer.Screen name="POPs" component={PopsNavigator} />
      <Drawer.Screen name="OLTs" component={OltsNavigator} />
      <Drawer.Screen name="Splitters" component={SplittersNavigator} />
      <Drawer.Screen name="Boxes" component={BoxesNavigator} />
      <Drawer.Screen name="Billing" component={BillingScreen} />
      <Drawer.Screen name="More" component={MoreScreen} />
      <Drawer.Screen
        name="Messages"
        component={() => <PlaceholderScreen title="Messages" />}
      />
      <Drawer.Screen
        name="Inquiries"
        component={InquiriesScreen}
      />
      <Drawer.Screen
        name="Corporate"
        component={CorporateScreen}
      />
      <Drawer.Screen
        name="Customers"
        component={CustomersScreen}
      />
      <Drawer.Screen
        name="Guarantors"
        component={GuarantorsScreen}
      />
      <Drawer.Screen
        name="Packages"
        component={PackagesScreen}
      />
      <Drawer.Screen
        name="Products"
        component={ProductsScreen}
      />
      <Drawer.Screen
        name="InstallmentPlans"
        component={InstallmentPlansScreen}
      />
      <Drawer.Screen
        name="SalesCustomers"
        component={SalesCustomersScreen}
      />
      <Drawer.Screen
        name="Sales"
        component={() => <PlaceholderScreen title="Sales" />}
      />
      <Drawer.Screen
        name="Transaction"
        component={() => <PlaceholderScreen title="Transaction" />}
      />
      <Drawer.Screen
        name="DealerManagement"
        component={() => <PlaceholderScreen title="Dealer Management" />}
      />
      <Drawer.Screen
        name="Inventory"
        component={() => <PlaceholderScreen title="Inventory" />}
      />
      <Drawer.Screen
        name="Accounts"
        component={() => <PlaceholderScreen title="Accounts" />}
      />
      <Drawer.Screen
        name="Complaints"
        component={() => <PlaceholderScreen title="Complaints" />}
      />
      <Drawer.Screen
        name="ServiceDesk"
        component={() => <PlaceholderScreen title="Service Desk" />}
      />
      <Drawer.Screen
        name="RecoveryOfficers"
        component={() => <PlaceholderScreen title="Recovery Officers" />}
      />
      <Drawer.Screen
        name="HumanResources"
        component={() => <PlaceholderScreen title="Human Resources" />}
      />
      <Drawer.Screen
        name="Administration"
        component={() => <PlaceholderScreen title="Administration" />}
      />
      <Drawer.Screen
        name="Reports"
        component={() => <PlaceholderScreen title="Reports" />}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  userEmail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  userRole: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
    textTransform: 'capitalize',
  },
  navScroll: {
    flex: 1,
  },
  navGroup: {
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  navGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D1D5DB',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  navGroupArrow: {
    fontSize: 14,
    color: '#6B7280',
  },
  navGroupItems: {
    paddingBottom: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    paddingLeft: 36,
  },
  navItemIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
    color: '#D1D5DB',
  },
  navItemIconBox: {
    width: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemLabel: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 30,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerLabel: {
    fontSize: 14,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  placeholderContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  placeholderHeader: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
