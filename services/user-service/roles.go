package main

// Role constants
const (
	RoleAdmin       = "admin"
	RoleManager     = "manager"
	RoleSalesperson = "salesperson"
)

// Permission constants
const (
	PermissionViewAll       = "view_all"
	PermissionEditAll       = "edit_all"
	PermissionViewOwn       = "view_own"
	PermissionEditOwn       = "edit_own"
	PermissionManageUsers   = "manage_users"
	PermissionManageSettings = "manage_settings"
)

// rolePermissions maps roles to their permissions
var rolePermissions = map[string][]string{
	RoleAdmin: {
		PermissionViewAll,
		PermissionEditAll,
		PermissionViewOwn,
		PermissionEditOwn,
		PermissionManageUsers,
		PermissionManageSettings,
	},
	RoleManager: {
		PermissionViewAll,
		PermissionViewOwn,
		PermissionEditOwn,
	},
	RoleSalesperson: {
		PermissionViewOwn,
		PermissionEditOwn,
	},
}

// GetRolePermissions returns all permissions for a given role
func GetRolePermissions(role string) []string {
	permissions, ok := rolePermissions[role]
	if !ok {
		return []string{}
	}
	return permissions
}

// RoleHasPermission checks if a role has a specific permission (simple check)
func RoleHasPermission(role, permission string) bool {
	permissions := GetRolePermissions(role)
	for _, p := range permissions {
		if p == permission {
			return true
		}
	}
	return false
}

// IsValidRole checks if a role is valid
func IsValidRole(role string) bool {
	_, ok := rolePermissions[role]
	return ok
}

// CanManageUser checks if a role can manage another user's role
func CanManageUser(managerRole, targetRole string) bool {
	// Only admins can manage users
	if managerRole != RoleAdmin {
		return false
	}

	// Admins can manage all roles
	return IsValidRole(targetRole)
}

// CanAccessResource checks if a user can access a resource
func CanAccessResource(userRole string, resourceOwnerID, userID string, requiresEdit bool) bool {
	// Admins can access everything
	if userRole == RoleAdmin {
		return true
	}

	// Managers can view everything, but only edit their own
	if userRole == RoleManager {
		if requiresEdit {
			return resourceOwnerID == userID
		}
		return RoleHasPermission(userRole, PermissionViewAll)
	}

	// Salesperson can only access their own resources
	if userRole == RoleSalesperson {
		return resourceOwnerID == userID
	}

	return false
}
