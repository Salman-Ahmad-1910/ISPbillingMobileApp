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
  invoiceId?: string;
  subscriberId?: string;
  subscriberName: string;
  amount: number;
  paymentDate: string;
  method: string;
  collectorId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Complaint {
  id: string;
  subscriberId: string;
  subscriberName: string;
  category: string;
  description: string;
  status: string;
  assignedToId?: string;
  resolvedAt?: string;
  created_at?: string;
  updated_at?: string;
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
