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
import ReportsScreen from '../screens/reports/ReportsScreen';
import CollectionsScreen from '../screens/reports/CollectionsScreen';
import DefaultersScreen from '../screens/reports/DefaultersScreen';
import NewDealersScreen from '../screens/reports/NewDealersScreen';
import DealerInvoicesScreen from '../screens/reports/DealerInvoicesScreen';
import AccountHeadScreen from '../screens/accounts/AccountHeadScreen';
import AccountEntryScreen from '../screens/accounts/AccountEntryScreen';
import AccountReportsScreen from '../screens/accounts/AccountReportsScreen';
import OneDayBalanceSheetScreen from '../screens/accounts/OneDayBalanceSheetScreen';
import SaleReportScreen from '../screens/sale-report/SaleReportScreen';
import StockReportScreen from '../screens/stock-report/StockReportScreen';
import UserComplaintScreen from '../screens/complaints/UserComplaintScreen';
import AllocatedComplaintScreen from '../screens/complaints/AllocatedComplaintScreen';
import SubjectTypeScreen from '../screens/complaints/SubjectTypeScreen';
import ComplaintReportScreen from '../screens/complaints/ComplaintReportScreen';
import RecoveryAreasScreen from '../screens/recovery/RecoveryAreasScreen';
import RecoveryOfficersScreen from '../screens/recovery/RecoveryOfficersScreen';
import HumanResourcesNavigator from './HumanResourcesNavigator';
import AttendanceScreen from '../screens/human-resources/AttendanceScreen';
import AdvancesScreen from '../screens/human-resources/AdvancesScreen';
import CompanyProfileScreen from '../screens/administration/CompanyProfileScreen';
import CompaniesScreen from '../screens/administration/CompaniesScreen';
import RolesPermissionsScreen from '../screens/administration/RolesPermissionsScreen';
import SystemConfigScreen from '../screens/administration/SystemConfigScreen';
import DeletedCollectionsScreen from '../screens/system-logs/DeletedCollectionsScreen';
import DeletedMembersScreen from '../screens/system-logs/DeletedMembersScreen';
import UpdateConnectionLogsScreen from '../screens/system-logs/UpdateConnectionLogsScreen';
import SubscriberReportScreen from '../screens/subscriber-reports/SubscriberReportScreen';
import DeactivatedUsersScreen from '../screens/subscriber-reports/DeactivatedUsersScreen';
import PackageWiseScreen from '../screens/subscriber-reports/PackageWiseScreen';
import PromiseDateReportsScreen from '../screens/subscriber-reports/PromiseDateReportsScreen';
import AllocatedDefaultersScreen from '../screens/subscriber-reports/AllocatedDefaultersScreen';
import ExpiryDefaultersScreen from '../screens/subscriber-reports/ExpiryDefaultersScreen';
import MonthWiseDefaultersScreen from '../screens/subscriber-reports/MonthWiseDefaultersScreen';
import MonthlyCollectionsScreen from '../screens/subscriber-reports/MonthlyCollectionsScreen';
import SubscriberAllocatedCollectionsScreen from '../screens/subscriber-reports/AllocatedCollectionsScreen';
import MWCMCollectionMonthlyScreen from '../screens/subscriber-reports/MWCMCollectionMonthlyScreen';
import NotGeneratedCollectionsScreen from '../screens/subscriber-reports/NotGeneratedCollectionsScreen';
import UnpaidCollectionsScreen from '../screens/subscriber-reports/UnpaidCollectionsScreen';
import SubscribersDefaultersScreen from '../screens/subscriber-reports/SubscribersDefaultersScreen';
import NewSubscribersScreen from '../screens/subscriber-reports/NewSubscribersScreen';
import SubscribersCreatorSummaryScreen from '../screens/subscriber-reports/SubscribersCreatorSummaryScreen';
import SupportScreen from '../screens/support/SupportScreen';
import CompanySwitcher from '../components/CompanySwitcher';
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
  Trash2,
  UserX,
  FileClock,
  HandCoins,
  UserSearch,
  LifeBuoy,
  LogOut,
  FileX2,
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
      {label: 'Reports', icon: FolderClosed, screen: 'Reports'},
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
    title: 'Stock Report',
    items: [{label: 'Abstract Stock', icon: Box, screen: 'StockReport'}],
  },
  {
    title: 'Sale Report',
    items: [{label: 'Abstract Sale', icon: Receipt, screen: 'SaleReport'}],
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
      {label: 'Support', icon: Headphones, screen: 'Support'},
    ],
  },
  {
    title: 'Recovery Officers',
    items: [
      {label: 'Areas', icon: Map, screen: 'RecoveryAreas'},
      {label: 'Officers', icon: UserCheck, screen: 'RecoveryOfficers'},
    ],
  },
      {
        title: 'Human Resources',
        items: [
          {label: 'Staff', icon: Briefcase, screen: 'Staff'},
          {label: 'Attendance', icon: CalendarDays, screen: 'Attendance'},
          {label: 'Advances & Loans', icon: HandHelping, screen: 'Advances'},
        ],
      },
  {
    title: 'Administration',
    items: [
          {label: 'My Company Profile', icon: Building, screen: 'CompanyProfile'},
          {label: 'Companies', icon: Building2, screen: 'Companies'},
       {label: 'Roles & Permissions', icon: ShieldCheck, screen: 'RolesPermissions'},
       {label: 'System Config', icon: Settings, screen: 'SystemConfig'},
    ],
  },
  {
    title: 'System Log',
    items: [
      {label: 'Deleted Collections', icon: Trash2, screen: 'DeletedCollections'},
      {label: 'Deleted Members', icon: UserX, screen: 'DeletedMembers'},
      {label: 'Update Connection Log', icon: ArrowLeftRight, screen: 'UpdateConnectionLogs'},
    ],
  },
  {
    title: 'Subscriber Reports',
    items: [
      {label: 'Subscriber Report', icon: Wallet, screen: 'SubscriberReport'},
      {label: 'Deactivate Users List', icon: UserSearch, screen: 'DeactivatedUsers'},
      {label: 'Package Wise List', icon: Box, screen: 'PackageWise'},
      {label: 'Promise Date Reports', icon: FileClock, screen: 'PromiseDateReports'},
      {label: 'Allocated Defaulters', icon: TriangleAlert, screen: 'AllocatedDefaulters'},
      {label: 'Expiry Wise Defaulters', icon: ChartBarBig, screen: 'ExpiryDefaulters'},
      {label: 'Month Wise Defaulters', icon: FileText, screen: 'MonthWiseDefaulters'},
      {label: 'Monthly Collections', icon: HandCoins, screen: 'MonthlyCollections'},
      {label: 'Allocated Collections', icon: Handshake, screen: 'SubscriberAllocatedCollections'},
      {label: 'MWCM', icon: ChartBarBig, screen: 'MWCM'},
      {label: 'Not Generated Collection', icon: FileX2, screen: 'NotGeneratedCollections'},
      {label: 'UnPaid Collection', icon: Wallet, screen: 'UnpaidCollections'},
      {label: 'Subscribers Defaulters', icon: TriangleAlert, screen: 'SubscribersDefaulters'},
      {label: 'New Subscribers List', icon: UserPlus, screen: 'NewSubscribers'},
      {label: 'Subscribers Creator Summary', icon: UserSearch, screen: 'SubscribersCreatorSummary'},
    ],
  },
];

function DrawerContent(props: any) {
  const {navigation} = props;
  const {logout} = useAuth();
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

      {/* Company Switcher */}
      <CompanySwitcher />

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
        <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Support')}>
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
        swipeEnabled: false,
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
        name="StockReport"
        component={StockReportScreen}
      />
      <Drawer.Screen
        name="SaleReport"
        component={SaleReportScreen}
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
        name="RecoveryAreas"
        component={RecoveryAreasScreen}
      />
      <Drawer.Screen
        name="RecoveryOfficers"
        component={RecoveryOfficersScreen}
      />
      <Drawer.Screen
        name="Staff"
        component={HumanResourcesNavigator}
      />
      <Drawer.Screen
        name="Attendance"
        component={AttendanceScreen}
      />
      <Drawer.Screen
        name="Advances"
        component={AdvancesScreen}
      />
      <Drawer.Screen
        name="CompanyProfile"
        component={CompanyProfileScreen}
      />
      <Drawer.Screen
        name="Companies"
        component={CompaniesScreen}
      />
      <Drawer.Screen
        name="RolesPermissions"
        component={RolesPermissionsScreen}
      />
      <Drawer.Screen
        name="SystemConfig"
        component={SystemConfigScreen}
      />
      <Drawer.Screen
        name="DeletedCollections"
        component={DeletedCollectionsScreen}
      />
      <Drawer.Screen
        name="DeletedMembers"
        component={DeletedMembersScreen}
      />
      <Drawer.Screen
        name="UpdateConnectionLogs"
        component={UpdateConnectionLogsScreen}
      />
      <Drawer.Screen
        name="SubscriberReport"
        component={SubscriberReportScreen}
      />
      <Drawer.Screen
        name="DeactivatedUsers"
        component={DeactivatedUsersScreen}
      />
      <Drawer.Screen
        name="PackageWise"
        component={PackageWiseScreen}
      />
      <Drawer.Screen
        name="PromiseDateReports"
        component={PromiseDateReportsScreen}
      />
      <Drawer.Screen
        name="AllocatedDefaulters"
        component={AllocatedDefaultersScreen}
      />
      <Drawer.Screen
        name="ExpiryDefaulters"
        component={ExpiryDefaultersScreen}
      />
      <Drawer.Screen
        name="MonthWiseDefaulters"
        component={MonthWiseDefaultersScreen}
      />
      <Drawer.Screen
        name="MonthlyCollections"
        component={MonthlyCollectionsScreen}
      />
      <Drawer.Screen
        name="SubscriberAllocatedCollections"
        component={SubscriberAllocatedCollectionsScreen}
      />
      <Drawer.Screen
        name="MWCM"
        component={MWCMCollectionMonthlyScreen}
      />
      <Drawer.Screen
        name="NotGeneratedCollections"
        component={NotGeneratedCollectionsScreen}
      />
      <Drawer.Screen
        name="UnpaidCollections"
        component={UnpaidCollectionsScreen}
      />
      <Drawer.Screen
        name="SubscribersDefaulters"
        component={SubscribersDefaultersScreen}
      />
      <Drawer.Screen
        name="NewSubscribers"
        component={NewSubscribersScreen}
      />
      <Drawer.Screen
        name="SubscribersCreatorSummary"
        component={SubscribersCreatorSummaryScreen}
      />
      <Drawer.Screen
        name="Support"
        component={SupportScreen}
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
        name="HumanResources"
        component={() => <PlaceholderScreen title="Human Resources" />}
      />
      <Drawer.Screen
        name="Administration"
        component={() => <PlaceholderScreen title="Administration" />}
      />
      <Drawer.Screen
        name="Reports"
        component={ReportsScreen}
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
