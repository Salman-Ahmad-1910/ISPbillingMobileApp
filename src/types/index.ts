export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
}

export interface User {
  id: string;
  name: string;
  email: string;
  companyId?: string;
  role?: string;
  status?: string;
  company?: {
    id: string;
    name: string;
  };
  company_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Company {
  id: string;
  name: string;
  logo?: string;
  stamp?: string;
  contact1?: string;
  contact2?: string;
  email?: string;
  address?: string;
  description?: string;
  taxRules?: string;
  invoiceTemplate?: string;
  subscriptionPlan?: string;
  subscriptionExpiry?: string;
  role?: string;
  user_company_id?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  companyName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface DashboardData {
  subscribersStats: {
    active: number;
    suspended: number;
  };
  totalCollectionToday: number;
  totalCollectionMonth: number;
  overdueCount: number;
  overdueAmount: number;
  payments: Payment[];
  complaintsCount: number;
  complaints: Complaint[];
  dailyCollection: ChartPoint[];
  subscriberGrowth: ChartPoint[];
}

export interface Payment {
  id: string;
  billNo?: number;
  invoiceId?: string;
  subscriberId?: string;
  subscriberName: string;
  amount: number;
  paymentDate: string;
  method: string;
  collectorId?: string;
  address?: string;
  areaName?: string;
  collectedByName?: string;
  companyId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PromiseEntry {
  id: string;
  companyId?: string;
  subscriberId?: string;
  subscriberName?: string;
  internetId?: string;
  phone?: string;
  address?: string;
  sublocality?: string;
  connectionType?: string;
  amount: number;
  promiseDate: string;
  description?: string;
  status: string;
  collectorId?: string;
  collectorName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransactionType {
  id: string;
  transaction: string;
  openingBalance?: number;
  title?: string;
  paymentChannel?: string;
  companyId?: string;
}

export interface Complaint {
  id: string;
  subscriberId: string;
  subscriberName: string;
  phone?: string;
  address?: string;
  type?: string;
  subject?: string;
  department?: string;
  priority?: string;
  deadline?: string;
  category?: string;
  description: string;
  status: string;
  assignedToId?: string | null;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ComplaintSubject {
  id: string;
  subject: string;
  type: string;
  companyId?: string;
}

export interface ComplaintType {
  id: string;
  name: string;
  companyId?: string;
}

// --- Subscriber Module ---

export interface Package {
  id: string;
  packageNumber: number;
  name: string;
  speed?: string;
  price: number;
  dataLimit?: string;
  companyName?: string;
  salePrice?: number;
  purchasePrice?: number;
  packageType?: string;
  companyId?: string;
}

export interface Area {
  id: string;
  city: string;
  zone: string;
  locality: string;
  subLocality?: string;
  recoveryOfficerId?: string;
  companyId?: string;
}

export interface POP {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  lastOutage?: string;
  companyId?: string;
}

export interface OLT {
  id: string;
  name: string;
  location: string;
  ipAddress: string;
  ports: number;
  popId?: string;
  companyId?: string;
}

export interface Splitter {
  id: string;
  name: string;
  location: string;
  oltId: string;
  totalPorts: number;
  availablePorts: number;
  companyId?: string;
}

export interface DistributionBox {
  id: string;
  name: string;
  companyId?: string;
}

export interface Connection {
  id: string;
  companyId: string;
  internetId: string;
  name: string;
  address?: string;
  cell?: string;
  mobile?: string;
  installationAmount: number;
  otherAmount: number;
  installationDate?: string;
  rechargeDate?: string;
  connectionProvider?: string;
  connectionType: string;
  boxNumber?: string;
  packageCable?: string;
  discount?: string;
  amount: number;
  packageInternet?: string;
  createBalance: boolean;
  balanceDays: number;
  sameDiscount?: string;
  sameAmount: number;
  status: string;
  sublocalityId?: string;
  splitterId?: string;
  splitterPort?: number;
  lastPaymentDate?: string;
  remainingAmount?: number;
  cnic?: string;
  leavingDate?: string;
  deactivationReason?: string;
  comments?: string;
  badDebt?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subscriber {
  id: string;
  subscriber_identity: string;
  name: string;
  cnic: string;
  phone: string;
  installationAddress: string;
  packageId: string;
  packageName: string;
  billingCycle: string;
  status: string;
  balance: number;
  areaId: string;
  areaName: string;
  splitterId: string;
  splitterPort: number;
  connectionDate?: string;
  dealerId?: string;
  collectorId?: string;
  package?: Package;
  area?: Area;
  splitter?: Splitter;
  companyId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Inquiry {
  id: string;
  name: string;
  internetId?: string;
  cell?: string;
  mobile?: string;
  address: string;
  installationAmount?: number;
  otherAmount?: number;
  installationDate?: string;
  rechargeDate?: string;
  subLocality?: string;
  connectionType?: string;
  boxNumber?: string;
  packageCable?: string;
  discount?: number;
  amount?: number;
  comments?: string;
  status: string;
  assignedToId?: string;
  notes?: string;
  companyId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CorporateCustomer {
  id: string;
  companyName: string;
  contactPerson: string;
  contactPhone: string;
  negotiatedPricing?: string;
  contractStartDate: string;
  contractEndDate: string;
  totalConnections: number;
  companyId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  cnic: string;
  phone: string;
  city: string;
  status: 'active' | 'inactive' | 'blacklisted';
  totalInvoices?: number;
  outstandingBalance?: number;
  companyId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Guarantor {
  id: string;
  name: string;
  cnic: string;
  phone: string;
  customerId: string;
  customerName: string;
  companyId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unitType: string;
  taxPercent?: number;
  image?: string;
  companyId?: string;
  barcode?: string;
  brandId?: string;
  brandName?: string;
  productTypeId?: string;
  productTypeName?: string;
  purchasePrice?: number;
  salePrice?: number;
  discount?: number;
  serialNumber?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  subscriberId: string;
  subscriberName: string;
  amount: number;
  paidAmount?: number;
  remainingAmount?: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  billingPeriod?: string;
  companyId?: string;
  batch?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceSubscriber {
  id: string;
  subscriber_identity: string;
  name: string;
  cnic: string;
  installationAddress: string;
  balance: number;
  dealerId?: string | null;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchasedProduct {
  purchaseItemId: string;
  id: string;
  name: string;
  price: number;
  stock: number;
  unitType: string;
  taxPercent: number;
  purchasePrice: number;
  billId: string;
  purchaseNumber: string;
  vendorName: string;
  purchaseDate: string;
  batch: string;
  serialNumber: string;
  image?: string;
}

export interface PurchaseItem {
  id?: string;
  purchaseId?: string;
  productId: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  unitType?: string;
  focNormal?: string;
  subtotal: number;
  saleTax?: number;
  wthTax?: number;
  disc?: number;
  expiryDate?: string;
  serialNumber?: string;
}

export interface Purchase {
  id: string;
  vendorId: string;
  vendorName: string;
  purchaseNumber: string;
  purchaseDate: string;
  billId: string;
  batch: string;
  totalAmount: number;
  remainingAmount: number;
  discount: number;
  salesTax: number;
  wthTax: number;
  status: 'paid' | 'unpaid' | 'partial';
  items: PurchaseItem[];
  createdAt?: string;
  updatedAt?: string;
  companyId?: string;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  companyId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductType {
  id: string;
  name: string;
  companyId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UnitType {
  id: string;
  name: string;
  companyId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  companyId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VendorInvoiceItem {
  id?: string;
  invoiceId?: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitType?: string;
  subtotal: number;
  serialNumber?: string;
}

export interface VendorInvoice {
  id: string;
  vendorId: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  batch?: string;
  items: VendorInvoiceItem[];
  createdAt?: string;
  updatedAt?: string;
  companyId?: string;
}

export interface SerialNumberPoolEntry {
  id: string;
  serialNumber: string;
  status: 'available' | 'used';
  productId?: string;
  companyId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InstallmentPlan {
  id: string;
  name: string;
  installments: number;
  percentageIncrease: number;
  status?: string;
  companyId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  saleTax?: number;
  wthTax?: number;
  serialNumber?: string;
}

export interface Sale {
  id: string;
  subscriberId: string;
  subscriberName: string;
  totalAmount: number;
  taxAmount: number;
  paymentMethod: string;
  date: string;
  companyId: string;
  isInstallment?: boolean;
  installmentPlanId?: string;
  items: SaleItem[];
}

// --- Messages Module ---

export type MessageTemplate = {
  id: string;
  title: string;
  message: string;
  parameters?: string;
  createdAt?: string;
  updatedAt?: string;
  companyId?: string;
};

export type Message = {
  id: string;
  status: string;
  entityId: string;
  internetId?: string;
  name: string;
  mobileNo?: string;
  phone?: string;
  address?: string;
  messageType: string;
  messageText: string;
  sentBy?: string;
  sendedAt?: string;
  sendTo: string;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Dealer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  cnic?: string;
  address?: string;
  commissionRate?: number;
  walletBalance?: number;
  companyId?: string;
  franchiseId?: string;
  parentDealerId?: string;
  areaId?: string;
  areaName?: string;
  lastPaymentDate?: string;
  remainingAmount?: number;
  internetId?: string;
  cell?: string;
  localityId?: string;
  joiningDate?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Staff = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  areaId?: string;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type RecoveryOfficer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  areaId?: string;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DealerCollection = {
  id: string;
  dealerId: string;
  dealerName: string;
  dealerAddress: string;
  amount: number;
  collectionDate: string;
  settlementStatus: 'pending' | 'settled';
  transactionType: 'cash' | 'bank' | 'easypaisa' | 'jazzcash';
  comment: string;
  receivedById?: string | null;
  receivedByName: string;
  subscriberId?: string;
  subscriberName?: string;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
};

// --- Accounts Module ---

export interface AccountHead {
  id: string;
  masterAccount: string;
  accountType: string;
  description?: string;
  companyId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccountSubHead {
  id: string;
  subMasterAccount: string;
  masterAccountId: string;
  masterAccount: string;
  accountType: string;
  budget?: string;
  description?: string;
  companyId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccountEntry {
  id: string;
  head: string;
  subHead: string;
  description: string;
  date: string;
  addBy: string;
  editBy: string;
  amount: number;
  transactionType: string;
  companyId?: string;
  created_at?: string;
  updated_at?: string;
}
