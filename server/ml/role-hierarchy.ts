/**
 * ROLE HIERARCHY SYSTEM
 *
 * Comprehensive user role hierarchy with settings and configurations.
 * Supports multi-level organizational structure with role-specific features.
 *
 * Features:
 * - 8 role types with different levels
 * - Manager-subordinate relationships
 * - Role-specific permissions and settings
 * - Performance targets and compensation
 * - Access control and feature toggles
 */

// ============================================================================
// ROLE TYPES
// ============================================================================

export enum UserRole {
  // Sales Team
  SALES = 'sales',
  SALES_TRAINEE = 'sales_trainee',
  SENIOR_SALES = 'senior_sales',

  // BDC (Business Development Center)
  BDC = 'bdc',
  BDC_MANAGER = 'bdc_manager',

  // Management
  SALES_MANAGER = 'sales_manager',
  GENERAL_MANAGER = 'general_manager',

  // F&I
  FI_MANAGER = 'fi_manager',

  // Service
  SERVICE_ADVISOR = 'service_advisor',
  SERVICE_MANAGER = 'service_manager',

  // Admin
  ADMIN = 'admin',
}

export enum RoleLevel {
  ENTRY = 1,        // Trainee, new hires
  ASSOCIATE = 2,    // Standard sales, BDC
  SENIOR = 3,       // Senior sales, experienced
  LEAD = 4,         // Team leads, BDC manager
  MANAGER = 5,      // Sales manager, F&I manager
  DIRECTOR = 6,     // General manager
  EXECUTIVE = 7,    // Owner, executive
}

// ============================================================================
// ROLE METADATA
// ============================================================================

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

export const ROLE_METADATA: Record<UserRole, RoleMetadata> = {
  [UserRole.SALES_TRAINEE]: {
    role: UserRole.SALES_TRAINEE,
    level: RoleLevel.ENTRY,
    title: 'Sales Trainee',
    description: 'Entry-level sales position, learning the ropes',
    canManageRoles: [],
    reportsTo: UserRole.SALES_MANAGER,
    maxSubordinates: 0,
    isManagement: false,
  },

  [UserRole.SALES]: {
    role: UserRole.SALES,
    level: RoleLevel.ASSOCIATE,
    title: 'Sales Consultant',
    description: 'Standard sales position, sells vehicles',
    canManageRoles: [],
    reportsTo: UserRole.SALES_MANAGER,
    maxSubordinates: 0,
    isManagement: false,
  },

  [UserRole.SENIOR_SALES]: {
    role: UserRole.SENIOR,
    level: RoleLevel.SENIOR,
    title: 'Senior Sales Consultant',
    description: 'Experienced salesperson, can mentor others',
    canManageRoles: [UserRole.SALES_TRAINEE],
    reportsTo: UserRole.SALES_MANAGER,
    maxSubordinates: 3,
    isManagement: false,
  },

  [UserRole.BDC]: {
    role: UserRole.BDC,
    level: RoleLevel.ASSOCIATE,
    title: 'BDC Representative',
    description: 'Business Development Center, handles leads and appointments',
    canManageRoles: [],
    reportsTo: UserRole.BDC_MANAGER,
    maxSubordinates: 0,
    isManagement: false,
  },

  [UserRole.BDC_MANAGER]: {
    role: UserRole.BDC_MANAGER,
    level: RoleLevel.LEAD,
    title: 'BDC Manager',
    description: 'Manages BDC team, oversees lead generation',
    canManageRoles: [UserRole.BDC],
    reportsTo: UserRole.GENERAL_MANAGER,
    maxSubordinates: 10,
    isManagement: true,
  },

  [UserRole.SALES_MANAGER]: {
    role: UserRole.SALES_MANAGER,
    level: RoleLevel.MANAGER,
    title: 'Sales Manager',
    description: 'Manages sales team, approves deals',
    canManageRoles: [UserRole.SALES, UserRole.SALES_TRAINEE, UserRole.SENIOR_SALES],
    reportsTo: UserRole.GENERAL_MANAGER,
    maxSubordinates: 15,
    isManagement: true,
  },

  [UserRole.FI_MANAGER]: {
    role: UserRole.FI_MANAGER,
    level: RoleLevel.MANAGER,
    title: 'F&I Manager',
    description: 'Finance and Insurance, handles financing and products',
    canManageRoles: [],
    reportsTo: UserRole.GENERAL_MANAGER,
    maxSubordinates: 0,
    isManagement: true,
  },

  [UserRole.SERVICE_ADVISOR]: {
    role: UserRole.SERVICE_ADVISOR,
    level: RoleLevel.ASSOCIATE,
    title: 'Service Advisor',
    description: 'Handles service appointments and repairs',
    canManageRoles: [],
    reportsTo: UserRole.SERVICE_MANAGER,
    maxSubordinates: 0,
    isManagement: false,
  },

  [UserRole.SERVICE_MANAGER]: {
    role: UserRole.SERVICE_MANAGER,
    level: RoleLevel.MANAGER,
    title: 'Service Manager',
    description: 'Manages service department',
    canManageRoles: [UserRole.SERVICE_ADVISOR],
    reportsTo: UserRole.GENERAL_MANAGER,
    maxSubordinates: 10,
    isManagement: true,
  },

  [UserRole.GENERAL_MANAGER]: {
    role: UserRole.GENERAL_MANAGER,
    level: RoleLevel.DIRECTOR,
    title: 'General Manager',
    description: 'Oversees entire dealership operations',
    canManageRoles: [
      UserRole.SALES_MANAGER,
      UserRole.BDC_MANAGER,
      UserRole.FI_MANAGER,
      UserRole.SERVICE_MANAGER,
    ],
    maxSubordinates: 20,
    isManagement: true,
  },

  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    level: RoleLevel.EXECUTIVE,
    title: 'Administrator',
    description: 'System administrator with full access',
    canManageRoles: Object.values(UserRole),
    maxSubordinates: 999,
    isManagement: true,
  },
};

// ============================================================================
// ROLE SETTINGS
// ============================================================================

export interface RoleSettings {
  // Performance & Targets
  performanceTargets: PerformanceTargets;

  // Permissions
  permissions: RolePermissions;

  // Compensation
  compensation: CompensationSettings;

  // Features & Access
  features: FeatureToggles;

  // Workflow
  workflow: WorkflowSettings;

  // Notifications
  notifications: NotificationSettings;

  // Intelligence
  intelligence: IntelligenceSettings;
}

export interface PerformanceTargets {
  // Sales Targets
  monthlyDealsTarget?: number;
  monthlyRevenueTarget?: number;
  monthlyGrossProfitTarget?: number;

  // Conversion Targets
  leadToAppointmentRate?: number; // %
  appointmentToShowRate?: number; // %
  showToSoldRate?: number; // %

  // Quality Targets
  customerSatisfactionTarget?: number; // 1-5
  surveyResponseTarget?: number; // %
  repeatCustomerTarget?: number; // %

  // Activity Targets
  dailyCallsTarget?: number;
  dailyEmailsTarget?: number;
  dailyTestDrivesTarget?: number;

  // Time Targets
  avgDealTimeTarget?: number; // minutes
  avgResponseTimeTarget?: number; // minutes
}

export interface RolePermissions {
  // Deal Management
  canCreateDeals: boolean;
  canEditDeals: boolean;
  canDeleteDeals: boolean;
  canApproveDeal: boolean;
  maxDealDiscount?: number; // % or amount
  requiresManagerApproval: boolean;

  // Customer Management
  canCreateCustomers: boolean;
  canEditCustomers: boolean;
  canDeleteCustomers: boolean;
  canViewAllCustomers: boolean;
  canReassignCustomers: boolean;

  // Inventory
  canViewInventory: boolean;
  canEditInventory: boolean;
  canPriceVehicles: boolean;

  // Reports & Analytics
  canViewReports: boolean;
  canViewTeamReports: boolean;
  canViewDealershipReports: boolean;
  canExportData: boolean;

  // System
  canManageUsers: boolean;
  canManageSettings: boolean;
  canAccessAuditLog: boolean;
}

export interface CompensationSettings {
  // Base Compensation
  baseSalary?: number;
  hourlyRate?: number;

  // Commission Structure
  commissionType: 'flat' | 'tiered' | 'percentage' | 'hybrid';
  commissionRate?: number; // %
  commissionPerUnit?: number; // $ per deal

  // Tiered Commission
  tiers?: Array<{
    threshold: number; // deals per month
    rate: number; // % or $
  }>;

  // Bonuses
  bonuses: {
    monthly?: number;
    quarterly?: number;
    annual?: number;
    performance?: boolean;
    teamPerformance?: boolean;
  };

  // Spiffs & Incentives
  eligibleForSpiffs: boolean;
  eligibleForManufacturerIncentives: boolean;

  // Draws & Guarantees
  hasDrawAgainstCommission: boolean;
  drawAmount?: number;
  hasMinimumGuarantee: boolean;
  guaranteeAmount?: number;
}

export interface FeatureToggles {
  // CRM Features
  crmAccess: boolean;
  emailIntegration: boolean;
  smsIntegration: boolean;
  calendarIntegration: boolean;

  // Deal Tools
  dealWorksheet: boolean;
  quickQuote: boolean;
  creditApplication: boolean;
  tradeInAppraisal: boolean;

  // Intelligence Features
  aiCompanion: boolean;
  mlRecommendations: boolean;
  customerSegmentation: boolean;
  teamCoordination: boolean;
  performanceAnalytics: boolean;

  // Advanced Features
  customReports: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  mobileApp: boolean;
}

export interface WorkflowSettings {
  // Lead Assignment
  leadAssignment: 'round_robin' | 'performance_based' | 'manual' | 'intelligent';
  canReceiveLeads: boolean;
  maxConcurrentLeads?: number;

  // Deal Workflow
  dealWorkflow: string; // ID of workflow template
  requiresApprovalAt?: number; // discount % threshold
  autoNotifyManager: boolean;

  // Follow-up
  autoFollowUpEnabled: boolean;
  followUpInterval?: number; // days
  maxFollowUpAttempts?: number;

  // Scheduling
  canSetOwnSchedule: boolean;
  workingHours?: {
    start: string; // "09:00"
    end: string; // "18:00"
    days: number[]; // [1,2,3,4,5] = Mon-Fri
  };
}

export interface NotificationSettings {
  // Channels
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;

  // Events
  notifyOnNewLead: boolean;
  notifyOnAppointment: boolean;
  notifyOnDealUpdate: boolean;
  notifyOnCustomerResponse: boolean;
  notifyOnTeamActivity: boolean;

  // Manager Notifications
  notifyOnSubordinateActivity?: boolean;
  notifyOnPerformanceIssues?: boolean;
  notifyOnMilestones?: boolean;

  // Frequency
  digestFrequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
}

export interface IntelligenceSettings {
  // Oscillator Network
  participateInOscillatorNetwork: boolean;
  skillLevel: number; // 0-1
  naturalFrequency: number; // deal velocity

  // WHACO Clustering
  influenceCustomerSegmentation: boolean;
  minConfidenceForAssignment: number; // 0-1

  // Performance Optimization
  enablePerformanceOptimization: boolean;
  optimizationGoals: Array<'revenue' | 'volume' | 'satisfaction' | 'efficiency'>;

  // Learning
  learnFromSuccesses: boolean;
  learnFromFailures: boolean;
  shareInsightsWithTeam: boolean;
}

// ============================================================================
// DEFAULT SETTINGS BY ROLE
// ============================================================================

export function getDefaultRoleSettings(role: UserRole): RoleSettings {
  const metadata = ROLE_METADATA[role];

  // Base settings
  const settings: RoleSettings = {
    performanceTargets: getDefaultPerformanceTargets(role),
    permissions: getDefaultPermissions(role),
    compensation: getDefaultCompensation(role),
    features: getDefaultFeatures(role),
    workflow: getDefaultWorkflow(role),
    notifications: getDefaultNotifications(role),
    intelligence: getDefaultIntelligence(role),
  };

  return settings;
}

function getDefaultPerformanceTargets(role: UserRole): PerformanceTargets {
  switch (role) {
    case UserRole.SALES:
    case UserRole.SENIOR_SALES:
      return {
        monthlyDealsTarget: 10,
        monthlyRevenueTarget: 250000,
        monthlyGrossProfitTarget: 25000,
        showToSoldRate: 20,
        customerSatisfactionTarget: 4.5,
        dailyCallsTarget: 20,
        dailyTestDrivesTarget: 3,
        avgDealTimeTarget: 180,
      };

    case UserRole.BDC:
      return {
        leadToAppointmentRate: 30,
        appointmentToShowRate: 70,
        dailyCallsTarget: 50,
        dailyEmailsTarget: 30,
        avgResponseTimeTarget: 15,
      };

    case UserRole.SALES_MANAGER:
      return {
        monthlyDealsTarget: 80, // Team target
        monthlyGrossProfitTarget: 200000,
        customerSatisfactionTarget: 4.7,
        showToSoldRate: 25,
      };

    default:
      return {};
  }
}

function getDefaultPermissions(role: UserRole): RolePermissions {
  const isManagement = ROLE_METADATA[role].isManagement;
  const level = ROLE_METADATA[role].level;

  return {
    canCreateDeals: level >= RoleLevel.ASSOCIATE,
    canEditDeals: level >= RoleLevel.ASSOCIATE,
    canDeleteDeals: isManagement,
    canApproveDeal: isManagement,
    maxDealDiscount: level === RoleLevel.MANAGER ? 10 : level === RoleLevel.SENIOR ? 5 : 2,
    requiresManagerApproval: !isManagement,

    canCreateCustomers: level >= RoleLevel.ASSOCIATE,
    canEditCustomers: level >= RoleLevel.ASSOCIATE,
    canDeleteCustomers: isManagement,
    canViewAllCustomers: isManagement,
    canReassignCustomers: isManagement,

    canViewInventory: true,
    canEditInventory: isManagement,
    canPriceVehicles: level >= RoleLevel.MANAGER,

    canViewReports: true,
    canViewTeamReports: level >= RoleLevel.LEAD,
    canViewDealershipReports: level >= RoleLevel.MANAGER,
    canExportData: level >= RoleLevel.LEAD,

    canManageUsers: level >= RoleLevel.MANAGER,
    canManageSettings: level >= RoleLevel.DIRECTOR,
    canAccessAuditLog: level >= RoleLevel.MANAGER,
  };
}

function getDefaultCompensation(role: UserRole): CompensationSettings {
  switch (role) {
    case UserRole.SALES:
      return {
        commissionType: 'tiered',
        commissionPerUnit: 300,
        tiers: [
          { threshold: 0, rate: 300 },
          { threshold: 10, rate: 350 },
          { threshold: 15, rate: 400 },
        ],
        bonuses: {
          monthly: 500,
          performance: true,
        },
        eligibleForSpiffs: true,
        eligibleForManufacturerIncentives: true,
        hasMinimumGuarantee: true,
        guaranteeAmount: 2500,
      };

    case UserRole.BDC:
      return {
        hourlyRate: 18,
        commissionType: 'flat',
        commissionPerUnit: 50, // per appointment shown
        bonuses: {
          monthly: 200,
          performance: true,
        },
        eligibleForSpiffs: false,
        eligibleForManufacturerIncentives: false,
        hasMinimumGuarantee: false,
      };

    case UserRole.SALES_MANAGER:
      return {
        baseSalary: 60000,
        commissionType: 'percentage',
        commissionRate: 5, // % of team gross
        bonuses: {
          monthly: 1000,
          quarterly: 5000,
          performance: true,
          teamPerformance: true,
        },
        eligibleForSpiffs: false,
        eligibleForManufacturerIncentives: true,
        hasMinimumGuarantee: false,
      };

    default:
      return {
        commissionType: 'flat',
        bonuses: {},
        eligibleForSpiffs: false,
        eligibleForManufacturerIncentives: false,
        hasMinimumGuarantee: false,
      };
  }
}

function getDefaultFeatures(role: UserRole): FeatureToggles {
  const level = ROLE_METADATA[role].level;

  return {
    crmAccess: true,
    emailIntegration: level >= RoleLevel.ASSOCIATE,
    smsIntegration: level >= RoleLevel.ASSOCIATE,
    calendarIntegration: true,

    dealWorksheet: level >= RoleLevel.ASSOCIATE,
    quickQuote: level >= RoleLevel.ASSOCIATE,
    creditApplication: level >= RoleLevel.ASSOCIATE,
    tradeInAppraisal: level >= RoleLevel.ASSOCIATE,

    aiCompanion: level >= RoleLevel.ASSOCIATE,
    mlRecommendations: true,
    customerSegmentation: level >= RoleLevel.LEAD,
    teamCoordination: level >= RoleLevel.MANAGER,
    performanceAnalytics: level >= RoleLevel.LEAD,

    customReports: level >= RoleLevel.MANAGER,
    apiAccess: level >= RoleLevel.DIRECTOR,
    webhooks: level >= RoleLevel.DIRECTOR,
    mobileApp: true,
  };
}

function getDefaultWorkflow(role: UserRole): WorkflowSettings {
  const isManagement = ROLE_METADATA[role].isManagement;

  return {
    leadAssignment: isManagement ? 'manual' : 'intelligent',
    canReceiveLeads: !isManagement || role === UserRole.BDC_MANAGER,
    maxConcurrentLeads: role === UserRole.BDC ? 50 : role === UserRole.SALES ? 25 : undefined,

    dealWorkflow: 'standard',
    requiresApprovalAt: isManagement ? undefined : 5,
    autoNotifyManager: !isManagement,

    autoFollowUpEnabled: true,
    followUpInterval: 2,
    maxFollowUpAttempts: 5,

    canSetOwnSchedule: isManagement,
    workingHours: {
      start: '09:00',
      end: '18:00',
      days: [1, 2, 3, 4, 5, 6], // Mon-Sat
    },
  };
}

function getDefaultNotifications(role: UserRole): NotificationSettings {
  const isManagement = ROLE_METADATA[role].isManagement;

  return {
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,

    notifyOnNewLead: !isManagement,
    notifyOnAppointment: true,
    notifyOnDealUpdate: true,
    notifyOnCustomerResponse: !isManagement,
    notifyOnTeamActivity: isManagement,

    notifyOnSubordinateActivity: isManagement,
    notifyOnPerformanceIssues: isManagement,
    notifyOnMilestones: true,

    digestFrequency: isManagement ? 'daily' : 'real_time',
  };
}

function getDefaultIntelligence(role: UserRole): IntelligenceSettings {
  const level = ROLE_METADATA[role].level;
  const skillLevel = Math.min(0.5 + (level * 0.1), 1.0);

  return {
    participateInOscillatorNetwork: level >= RoleLevel.ASSOCIATE,
    skillLevel,
    naturalFrequency: 1.0,

    influenceCustomerSegmentation: level >= RoleLevel.ASSOCIATE,
    minConfidenceForAssignment: 0.6,

    enablePerformanceOptimization: true,
    optimizationGoals: ['revenue', 'volume', 'satisfaction'],

    learnFromSuccesses: true,
    learnFromFailures: true,
    shareInsightsWithTeam: level >= RoleLevel.SENIOR,
  };
}
