import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { UserRole, RoleLevel } from '@/lib/hierarchy-types';
import { cn } from '@/lib/utils';

interface RoleSelectorProps {
  value?: UserRole;
  onValueChange: (role: UserRole) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ROLE_DEFINITIONS: Record<
  UserRole,
  {
    label: string;
    level: RoleLevel;
    description: string;
  }
> = {
  SALES_REP: {
    label: 'Sales Representative',
    level: 'ENTRY',
    description: 'Entry-level sales position',
  },
  ACCOUNT_EXECUTIVE: {
    label: 'Account Executive',
    level: 'MID',
    description: 'Manages client accounts',
  },
  SENIOR_ACCOUNT_EXECUTIVE: {
    label: 'Senior Account Executive',
    level: 'SENIOR',
    description: 'Senior account management',
  },
  SALES_MANAGER: {
    label: 'Sales Manager',
    level: 'MANAGER',
    description: 'Manages sales team',
  },
  REGIONAL_SALES_MANAGER: {
    label: 'Regional Sales Manager',
    level: 'MANAGER',
    description: 'Oversees regional sales',
  },
  VP_SALES: {
    label: 'VP of Sales',
    level: 'EXECUTIVE',
    description: 'Executive sales leadership',
  },
  CUSTOMER_SUCCESS_REP: {
    label: 'Customer Success Rep',
    level: 'ENTRY',
    description: 'Customer support role',
  },
  CUSTOMER_SUCCESS_MANAGER: {
    label: 'Customer Success Manager',
    level: 'MID',
    description: 'Manages customer success',
  },
  SALES_ENGINEER: {
    label: 'Sales Engineer',
    level: 'MID',
    description: 'Technical sales support',
  },
  SENIOR_SALES_ENGINEER: {
    label: 'Senior Sales Engineer',
    level: 'SENIOR',
    description: 'Senior technical sales',
  },
  SALES_OPERATIONS: {
    label: 'Sales Operations',
    level: 'MID',
    description: 'Sales ops specialist',
  },
  SALES_DIRECTOR: {
    label: 'Sales Director',
    level: 'EXECUTIVE',
    description: 'Director-level sales',
  },
};

const getRoleLevelColor = (level: RoleLevel): string => {
  const colors: Record<RoleLevel, string> = {
    ENTRY: 'bg-slate-100 text-slate-700 border-slate-300',
    JUNIOR: 'bg-blue-100 text-blue-700 border-blue-300',
    MID: 'bg-green-100 text-green-700 border-green-300',
    SENIOR: 'bg-amber-100 text-amber-700 border-amber-300',
    LEAD: 'bg-orange-100 text-orange-700 border-orange-300',
    MANAGER: 'bg-purple-100 text-purple-700 border-purple-300',
    EXECUTIVE: 'bg-red-100 text-red-700 border-red-300',
  };
  return colors[level] || 'bg-gray-100 text-gray-700 border-gray-300';
};

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  value,
  onValueChange,
  placeholder = 'Select a role',
  disabled = false,
}) => {
  // Group roles by level
  const rolesByLevel: Record<RoleLevel, UserRole[]> = {
    ENTRY: [],
    JUNIOR: [],
    MID: [],
    SENIOR: [],
    LEAD: [],
    MANAGER: [],
    EXECUTIVE: [],
  };

  (Object.keys(ROLE_DEFINITIONS) as UserRole[]).forEach((role) => {
    const level = ROLE_DEFINITIONS[role].level;
    rolesByLevel[level].push(role);
  });

  const levelOrder: RoleLevel[] = ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'EXECUTIVE'];

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {value && (
            <div className="flex items-center gap-2">
              <span>{ROLE_DEFINITIONS[value].label}</span>
              <Badge className={cn('text-xs ml-auto', getRoleLevelColor(ROLE_DEFINITIONS[value].level))}>
                {ROLE_DEFINITIONS[value].level}
              </Badge>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {levelOrder.map((level) => {
          const rolesInLevel = rolesByLevel[level];
          if (rolesInLevel.length === 0) return null;

          return (
            <SelectGroup key={level}>
              <SelectLabel className="flex items-center gap-2">
                <span>{level} Level</span>
                <Badge className={cn('text-xs', getRoleLevelColor(level))}>{level}</Badge>
              </SelectLabel>
              {rolesInLevel.map((role) => (
                <SelectItem key={role} value={role}>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{ROLE_DEFINITIONS[role].label}</span>
                    <span className="text-xs text-muted-foreground">
                      {ROLE_DEFINITIONS[role].description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
};

// Export role utilities
export const getRoleLabel = (role: UserRole): string => {
  return ROLE_DEFINITIONS[role]?.label || role;
};

export const getRoleLevel = (role: UserRole): RoleLevel => {
  return ROLE_DEFINITIONS[role]?.level || 'ENTRY';
};

export const getRoleDescription = (role: UserRole): string => {
  return ROLE_DEFINITIONS[role]?.description || '';
};

export const getAllRoles = (): UserRole[] => {
  return Object.keys(ROLE_DEFINITIONS) as UserRole[];
};

export const getRolesByLevel = (level: RoleLevel): UserRole[] => {
  return (Object.keys(ROLE_DEFINITIONS) as UserRole[]).filter(
    (role) => ROLE_DEFINITIONS[role].level === level
  );
};
