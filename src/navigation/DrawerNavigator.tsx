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
import StockScreen from '../screens/subscribers/StockScreen';
import BrandsScreen from '../screens/subscribers/BrandsScreen';
import UnitTypesScreen from '../screens/subscribers/UnitTypesScreen';
import ProductTypesScreen from '../screens/subscribers/ProductTypesScreen';
import PurchasesScreen from '../screens/subscribers/PurchasesScreen';
import InventoryStatusScreen from '../screens/subscribers/InventoryStatusScreen';
import VendorsScreen from '../screens/subscribers/VendorsScreen';
import VendorInvoicesScreen from '../screens/subscribers/VendorInvoicesScreen';
import InstallmentPlansScreen from '../screens/subscribers/InstallmentPlansScreen';
import SalesScreen from '../screens/subscribers/SalesScreen';
import SalesCustomersScreen from '../screens/subscribers/SalesCustomersScreen';
import PosScreen from '../screens/subscribers/PosScreen';
import NewMessagesScreen from '../screens/subscribers/NewMessagesScreen';
import DraftMessagesScreen from '../screens/subscribers/DraftMessagesScreen';
import SentMessagesScreen from '../screens/subscribers/SentMessagesScreen';
import ExpiryMessagesScreen from '../screens/subscribers/ExpiryMessagesScreen';
import OtherMessagesScreen from '../screens/subscribers/OtherMessagesScreen';
import WhatsAppDraftScreen from '../screens/subscribers/WhatsAppDraftScreen';
import MyDealersScreen from '../screens/subscribers/MyDealersScreen';
import SubscriberCollectionsScreen from '../screens/transaction/SubscriberCollectionsScreen';
import DealersCollectionsScreen from '../screens/transaction/DealersCollectionsScreen';
import AllocatedCollectionsScreen from '../screens/transaction/AllocatedCollectionsScreen';
import TransactionTypeScreen from '../screens/transaction/TransactionTypeScreen';
import BadDebtCollectionsScreen from '../screens/transaction/BadDebtCollectionsScreen';
import BillCreatorScreen from '../screens/transaction/BillCreatorScreen';
import CollectionsScreen from '../screens/reports/CollectionsScreen';
import DefaultersScreen from '../screens/reports/DefaultersScreen';
import NewDealersScreen from '../screens/reports/NewDealersScreen';
import DealerInvoicesScreen from '../screens/reports/DealerInvoicesScreen';
import AccountHeadScreen from '../screens/accounts/AccountHeadScreen';
import AccountEntryScreen from '../screens/accounts/AccountEntryScreen';
import AccountReportsScreen from '../screens/accounts/AccountReportsScreen';
import OneDayBalanceSheetScreen from '../screens/accounts/OneDayBalanceSheetScreen';
import UserComplaintScreen from '../screens/complaints/UserComplaintScreen';
import AllocatedComplaintScreen from '../screens/complaints/AllocatedComplaintScreen';
import SubjectTypeScreen from '../screens/complaints/SubjectTypeScreen';
import ComplaintReportScreen from '../screens/complaints/ComplaintReportScreen';
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
       {label: 'New Messages', icon: Inbox, screen: 'NewMessages'},
      {label: 'Other Messages', icon: MailQuestionMark, screen: 'OtherMessages'},
      {label: 'Draft Messages', icon: FilePen, screen: 'DraftMessages'},
      {label: 'Sent Messages', icon: Send, screen: 'SentMessages'},
      {label: 'Expiry Messages', icon: Clock, screen: 'ExpiryMessages'},
      {label: 'WhatsApp Drafts', icon: MessageCircle, screen: 'WhatsAppDraft'},
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
      {label: 'Sales', icon: ShoppingCart, screen: 'Sales'},
      {label: 'Customers', icon: UserRound, screen: 'SalesCustomers'},
      {label: 'Installment Plans', icon: FileCog, screen: 'InstallmentPlans'},
      {label: 'Point of Sale', icon: ShoppingCart, screen: 'Pos'},
    ],
  },
  {
    title: 'Transaction',
    items: [
      {label: 'Subscriber Collections', icon: Users, screen: 'SubscriberCollections'},
      {label: 'Dealers Collections', icon: Handshake, screen: 'DealersCollections'},
      {label: 'Allocated Collections', icon: ClipboardPen, screen: 'AllocatedCollections'},
      {label: 'Transaction Type', icon: FileCog, screen: 'TransactionType'},
      {label: 'Bad Debt Collections', icon: TriangleAlert, screen: 'BadDebtCollections'},
      {label: 'Bill Creator', icon: ClipboardPen, screen: 'BillCreator'},
    ],
  },
   {
    title: 'Dealer Management',
    items: [
       {label: 'My Dealers', icon: Users, screen: 'MyDealers'},
      {label: 'Reports', icon: FolderClosed},
      {label: 'Collections', icon: Wallet, screen: 'Collections'},
      {label: 'Defaulters', icon: TriangleAlert, screen: 'Defaulters'},
      {label: 'New Dealers', icon: UserPlus, screen: 'NewDealers'},
      {label: 'Invoices', icon: FileText, screen: 'DealerInvoices'},
    ],
  },
  {
    title: 'Inventory',
    items: [
      {label: 'Products', icon: Box, screen: 'Products'},
      {label: 'Stock', icon: Warehouse, screen: 'Stock'},
      {label: 'Brands', icon: Tag, screen: 'Brands'},
      {label: 'Unit Type', icon: Ruler, screen: 'UnitTypes'},
      {label: 'Product Type', icon: Shapes, screen: 'ProductTypes'},
      {label: 'Inventory Status', icon: Activity, screen: 'InventoryStatus'},
      {label: 'Purchase', icon: ArrowLeftRight, screen: 'Purchases'},
      {label: 'Vendors', icon: Building2, screen: 'Vendors'},
      {label: 'Vendor Invoice', icon: FileText, screen: 'VendorInvoices'},
    ],
  },
  {
    title: 'Accounts',
    items: [
      {label: 'Account Head', icon: Layers, screen: 'AccountHead'},
      {label: 'Account Entry', icon: ClipboardPen, screen: 'AccountEntry'},
      {label: 'Account Reports', icon: FileText, screen: 'AccountReports'},
      {label: 'One Day Balance Sheet', icon: ChartBarBig, screen: 'OneDayBalanceSheet'},
    ],
  },
  {
    title: 'Complaints',
    items: [
      {label: 'User Complaint', icon: UserPlus, screen: 'UserComplaints'},
      {label: 'Allocated Complaint', icon: ClipboardPen, screen: 'AllocatedComplaints'},
      {label: 'Subject Type', icon: BookOpen, screen: 'SubjectType'},
      {label: 'Complaint Report', icon: FileText, screen: 'ComplaintReport'},
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
        name="NewMessages"
        component={NewMessagesScreen}
      />
      <Drawer.Screen
        name="DraftMessages"
        component={DraftMessagesScreen}
      />
      <Drawer.Screen
        name="SentMessages"
        component={SentMessagesScreen}
      />
      <Drawer.Screen
        name="ExpiryMessages"
        component={ExpiryMessagesScreen}
      />
      <Drawer.Screen
        name="OtherMessages"
        component={OtherMessagesScreen}
      />
      <Drawer.Screen
        name="WhatsAppDraft"
        component={WhatsAppDraftScreen}
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
        name="Stock"
        component={StockScreen}
      />
      <Drawer.Screen
        name="Brands"
        component={BrandsScreen}
      />
      <Drawer.Screen
        name="UnitTypes"
        component={UnitTypesScreen}
      />
      <Drawer.Screen
        name="ProductTypes"
        component={ProductTypesScreen}
      />
      <Drawer.Screen
        name="Purchases"
        component={PurchasesScreen}
      />
      <Drawer.Screen
        name="InventoryStatus"
        component={InventoryStatusScreen}
      />
      <Drawer.Screen
        name="Vendors"
        component={VendorsScreen}
      />
      <Drawer.Screen
        name="VendorInvoices"
        component={VendorInvoicesScreen}
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
        component={SalesScreen}
      />
      <Drawer.Screen
        name="Pos"
        component={PosScreen}
      />
      <Drawer.Screen
        name="Transaction"
        component={() => <PlaceholderScreen title="Transaction" />}
      />
      <Drawer.Screen
        name="SubscriberCollections"
        component={SubscriberCollectionsScreen}
      />
      <Drawer.Screen
        name="DealersCollections"
        component={DealersCollectionsScreen}
      />
      <Drawer.Screen
        name="AllocatedCollections"
        component={AllocatedCollectionsScreen}
      />
      <Drawer.Screen
        name="TransactionType"
        component={TransactionTypeScreen}
      />
      <Drawer.Screen
        name="BadDebtCollections"
        component={BadDebtCollectionsScreen}
      />
      <Drawer.Screen
        name="BillCreator"
        component={BillCreatorScreen}
      />
      <Drawer.Screen
        name="MyDealers"
        component={MyDealersScreen}
      />
      <Drawer.Screen
        name="Collections"
        component={CollectionsScreen}
      />
      <Drawer.Screen
        name="Defaulters"
        component={DefaultersScreen}
      />
      <Drawer.Screen
        name="NewDealers"
        component={NewDealersScreen}
      />
      <Drawer.Screen
        name="DealerInvoices"
        component={DealerInvoicesScreen}
      />
      <Drawer.Screen
        name="AccountHead"
        component={AccountHeadScreen}
      />
      <Drawer.Screen
        name="AccountEntry"
        component={AccountEntryScreen}
      />
      <Drawer.Screen
        name="AccountReports"
        component={AccountReportsScreen}
      />
      <Drawer.Screen
        name="OneDayBalanceSheet"
        component={OneDayBalanceSheetScreen}
      />
      <Drawer.Screen
        name="UserComplaints"
        component={UserComplaintScreen}
      />
      <Drawer.Screen
        name="AllocatedComplaints"
        component={AllocatedComplaintScreen}
      />
      <Drawer.Screen
        name="SubjectType"
        component={SubjectTypeScreen}
      />
      <Drawer.Screen
        name="ComplaintReport"
        component={ComplaintReportScreen}
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
