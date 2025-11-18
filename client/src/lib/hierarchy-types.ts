/**
 * Role Hierarchy Types
 *
 * Matches server/ml/role-hierarchy.ts types for frontend use
 */

export enum UserRole {
  // Sales Roles
  SALES = 'SALES',
  SALES_TRAINEE = 'SALES_TRAINEE',
  SENIOR_SALES = 'SENIOR_SALES',

  // BDC Roles
  BDC = 'BDC',
  BDC_MANAGER = 'BDC_MANAGER',

  // Management Roles
  SALES_MANAGER = 'SALES_MANAGER',
  GENERAL_MANAGER = 'GENERAL_MANAGER',
  FI_MANAGER = 'FI_MANAGER',

  // Service Roles
  SERVICE_ADVISOR = 'SERVICE_ADVISOR',
  SERVICE_MANAGER = 'SERVICE_MANAGER',

  // System
  ADMIN = 'ADMIN',
}

export enum RoleLevel {
  ENTRY = 'ENTRY',
  JUNIOR = 'JUNIOR',
  MID = 'MID',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
  MANAGER = 'MANAGER',
  EXECUTIVE = 'EXECUTIVE',
}

export interface RoleMetadata {
  role: UserRole;
  level: RoleLevel;
  title: string;
  description: string;
  canManageRoles: UserRole[];
  reportsTo?: UserRole;
  maxSubordinates: number;
  isManagement: boolean;
}

export interface PerformanceTargets {
  monthlyDeals?: number;
  monthlyRevenue?: number;
  monthlyGrossProfit?: number;
  leadConversionRate?: number;
  appointmentShowRate?: number;
  closeRate?: number;
  avgDealTime?: number;
  customerSatisfaction?: number;
  callsPerDay?: number;
  emailsPerDay?: number;
  testDrivesPerWeek?: number;
}

export interface RolePermissions {
  canViewDeals: boolean;
  canEditDeals: boolean;
  canDeleteDeals: boolean;
  canApproveDeals: boolean;
  maxDealValue?: number;
  canViewCustomers: boolean;
  canEditCustomers: boolean;
  canDeleteCustomers: boolean;
  canViewInventory: boolean;
  canEditInventory: boolean;
  canViewReports: boolean;
  canEditReports: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canAccessFinance: boolean;
  requiresApprovalAbove?: number;
}

export interface CompensationSettings {
  baseSalary?: number;
  commissionType: 'flat' | 'percentage' | 'tiered' | 'none';
  commissionRate?: number;
  commissionTiers?: Array<{
    minDeals: number;
    rate: number;
  }>;
  bonusStructure?: Array<{
    metric: string;
    threshold: number;
    amount: number;
  }>;
  spiffEligible: boolean;
}

export interface FeatureToggles {
  crmAccess: boolean;
  advancedSearch: boolean;
  aiAssistant: boolean;
  mlInsights: boolean;
  customReports: boolean;
  apiAccess: boolean;
  mobileApp: boolean;
  dealAnalytics: boolean;
}

export interface WorkflowSettings {
  autoAssignLeads: boolean;
  leadAssignmentLogic: 'round_robin' | 'performance' | 'manual' | 'ai';
  requiresDealApproval: boolean;
  approvalThreshold?: number;
  canSelfAssignLeads: boolean;
  maxActiveDcustomer?: number;
  canScheduleAppointments: boolean;
  appointmentTypes: string[];
}

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  notifyOnLeadAssignment: boolean;
  notifyOnDealStatusChange: boolean;
  notifyOnApprovalNeeded: boolean;
  notifyOnCustomerActivity: boolean;
  notifyOnTeamUpdates: boolean;
  digestFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'never';
}

export interface IntelligenceSettings {
  participateInOscillator: boolean;
  skillLevel: number;
  specializationTags: string[];
  optimizationGoals: Array<'revenue' | 'volume' | 'satisfaction' | 'efficiency' | 'mentorship'>;
  acceptsAIRecommendations: boolean;
  sharesPerformanceData: boolean;
}

export interface RoleSettings {
  performanceTargets: PerformanceTargets;
  permissions: RolePermissions;
  compensation: CompensationSettings;
  features: FeatureToggles;
  workflow: WorkflowSettings;
  notifications: NotificationSettings;
  intelligence: IntelligenceSettings;
}

export interface PerformanceMetrics {
  dealsClosed: number;
  revenue: number;
  grossProfit: number;
  leadsReceived: number;
  appointmentsSet: number;
  appointmentShows: number;
  testDrives: number;
  customerSatisfaction?: number;
  surveyResponses: number;
  repeatCustomers: number;
  callsMade: number;
  emailsSent: number;
  avgDealTime?: number;
  avgResponseTime?: number;
  teamDealsClosed?: number;
  teamRevenue?: number;
  teamSatisfaction?: number;
}

export interface HierarchyUser {
  id: string;
  userId: string;
  name: string;
  role: UserRole;
  roleLevel: RoleLevel;
  managerId?: string;
  subordinateIds: string[];
  settings: RoleSettings;
  metrics: PerformanceMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamPerformance {
  managerId: string;
  teamSize: number;
  coherence: number;
  avgPerformanceScore: number;
  topPerformers: Array<{
    id: string;
    name: string;
    score: number;
  }>;
  underperformers: Array<{
    id: string;
    name: string;
    score: number;
    gaps: string[];
  }>;
  teamMetrics: PerformanceMetrics;
}

export interface PerformanceOptimization {
  userId: string;
  currentScore: number;
  potentialScore: number;
  recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
    actionItems: string[];
  }>;
}

export interface HierarchyAnalytics {
  totalUsers: number;
  usersByRole: Record<UserRole, number>;
  usersByLevel: Record<RoleLevel, number>;
  avgPerformanceByRole: Record<UserRole, number>;
  topPerformers: Array<{
    id: string;
    name: string;
    role: UserRole;
    score: number;
  }>;
  teamCoherence: number;
  overallMetrics: PerformanceMetrics;
}
