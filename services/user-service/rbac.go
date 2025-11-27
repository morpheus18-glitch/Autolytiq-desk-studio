package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// =====================================================
// RBAC DATA STRUCTURES
// =====================================================

// Permission represents a single permission
type Permission struct {
	ID          string    `json:"id"`
	Resource    string    `json:"resource"`    // "deals", "customers", "inventory", etc.
	Action      string    `json:"action"`      // "create", "read", "update", "delete", "manage"
	Scope       string    `json:"scope"`       // "own", "team", "dealership", "all"
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

// Role represents a role with associated permissions
type Role struct {
	ID           string       `json:"id"`
	DealershipID *string      `json:"dealership_id"` // NULL for system roles
	Name         string       `json:"name"`
	DisplayName  string       `json:"display_name"`
	Description  string       `json:"description"`
	IsSystem     bool         `json:"is_system"` // System roles cannot be modified
	Priority     int          `json:"priority"`  // Higher priority = more permissions
	Permissions  []Permission `json:"permissions"`
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
}

// RolePermission represents a role-permission association
type RolePermission struct {
	RoleID       string    `json:"role_id"`
	PermissionID string    `json:"permission_id"`
	GrantedAt    time.Time `json:"granted_at"`
	GrantedBy    string    `json:"granted_by"`
}

// UserRole represents a user's role assignment
type UserRole struct {
	UserID       string    `json:"user_id"`
	RoleID       string    `json:"role_id"`
	DealershipID string    `json:"dealership_id"`
	AssignedAt   time.Time `json:"assigned_at"`
	AssignedBy   string    `json:"assigned_by"`
}

// =====================================================
// DEFAULT PERMISSIONS - All possible permissions
// =====================================================

// DefaultPermissions defines all available permissions in the system
var DefaultPermissions = []Permission{
	// Deals
	{Resource: "deals", Action: "create", Scope: "dealership", Description: "Create new deals"},
	{Resource: "deals", Action: "read", Scope: "own", Description: "View own deals"},
	{Resource: "deals", Action: "read", Scope: "team", Description: "View team deals"},
	{Resource: "deals", Action: "read", Scope: "dealership", Description: "View all dealership deals"},
	{Resource: "deals", Action: "update", Scope: "own", Description: "Update own deals"},
	{Resource: "deals", Action: "update", Scope: "team", Description: "Update team deals"},
	{Resource: "deals", Action: "update", Scope: "dealership", Description: "Update all deals"},
	{Resource: "deals", Action: "delete", Scope: "own", Description: "Delete own deals"},
	{Resource: "deals", Action: "delete", Scope: "dealership", Description: "Delete any deal"},
	{Resource: "deals", Action: "manage", Scope: "dealership", Description: "Full deal management"},

	// Customers
	{Resource: "customers", Action: "create", Scope: "dealership", Description: "Create customers"},
	{Resource: "customers", Action: "read", Scope: "own", Description: "View own customers"},
	{Resource: "customers", Action: "read", Scope: "dealership", Description: "View all customers"},
	{Resource: "customers", Action: "update", Scope: "own", Description: "Update own customers"},
	{Resource: "customers", Action: "update", Scope: "dealership", Description: "Update any customer"},
	{Resource: "customers", Action: "delete", Scope: "dealership", Description: "Delete customers"},
	{Resource: "customers", Action: "manage", Scope: "dealership", Description: "Full customer management"},
	{Resource: "customers", Action: "export", Scope: "dealership", Description: "Export customer data"},

	// Inventory
	{Resource: "inventory", Action: "create", Scope: "dealership", Description: "Add vehicles"},
	{Resource: "inventory", Action: "read", Scope: "dealership", Description: "View inventory"},
	{Resource: "inventory", Action: "update", Scope: "dealership", Description: "Update vehicles"},
	{Resource: "inventory", Action: "delete", Scope: "dealership", Description: "Remove vehicles"},
	{Resource: "inventory", Action: "manage", Scope: "dealership", Description: "Full inventory management"},
	{Resource: "inventory", Action: "pricing", Scope: "dealership", Description: "Manage pricing"},
	{Resource: "inventory", Action: "import", Scope: "dealership", Description: "Import inventory"},

	// Showroom
	{Resource: "showroom", Action: "read", Scope: "dealership", Description: "View showroom"},
	{Resource: "showroom", Action: "checkin", Scope: "dealership", Description: "Check in customers"},
	{Resource: "showroom", Action: "assign", Scope: "dealership", Description: "Assign salespeople"},
	{Resource: "showroom", Action: "manage", Scope: "dealership", Description: "Full showroom management"},

	// Email
	{Resource: "email", Action: "send", Scope: "own", Description: "Send emails"},
	{Resource: "email", Action: "read", Scope: "own", Description: "Read own emails"},
	{Resource: "email", Action: "read", Scope: "dealership", Description: "Read all emails"},
	{Resource: "email", Action: "manage_templates", Scope: "dealership", Description: "Manage email templates"},

	// Messages
	{Resource: "messages", Action: "send", Scope: "dealership", Description: "Send messages"},
	{Resource: "messages", Action: "read", Scope: "own", Description: "Read own messages"},
	{Resource: "messages", Action: "read", Scope: "dealership", Description: "Read all messages"},

	// Reports
	{Resource: "reports", Action: "read", Scope: "own", Description: "View own reports"},
	{Resource: "reports", Action: "read", Scope: "team", Description: "View team reports"},
	{Resource: "reports", Action: "read", Scope: "dealership", Description: "View all reports"},
	{Resource: "reports", Action: "export", Scope: "dealership", Description: "Export reports"},
	{Resource: "reports", Action: "manage", Scope: "dealership", Description: "Full report management"},

	// Settings
	{Resource: "settings", Action: "read", Scope: "own", Description: "View own settings"},
	{Resource: "settings", Action: "update", Scope: "own", Description: "Update own settings"},
	{Resource: "settings", Action: "read", Scope: "dealership", Description: "View dealership settings"},
	{Resource: "settings", Action: "update", Scope: "dealership", Description: "Update dealership settings"},
	{Resource: "settings", Action: "manage", Scope: "dealership", Description: "Full settings management"},

	// Users (Admin)
	{Resource: "users", Action: "create", Scope: "dealership", Description: "Create users"},
	{Resource: "users", Action: "read", Scope: "dealership", Description: "View users"},
	{Resource: "users", Action: "update", Scope: "dealership", Description: "Update users"},
	{Resource: "users", Action: "delete", Scope: "dealership", Description: "Deactivate users"},
	{Resource: "users", Action: "manage", Scope: "dealership", Description: "Full user management"},
	{Resource: "users", Action: "assign_roles", Scope: "dealership", Description: "Assign roles to users"},

	// Roles (Super Admin)
	{Resource: "roles", Action: "create", Scope: "dealership", Description: "Create custom roles"},
	{Resource: "roles", Action: "read", Scope: "dealership", Description: "View roles"},
	{Resource: "roles", Action: "update", Scope: "dealership", Description: "Update custom roles"},
	{Resource: "roles", Action: "delete", Scope: "dealership", Description: "Delete custom roles"},
	{Resource: "roles", Action: "manage", Scope: "dealership", Description: "Full role management"},

	// Finance
	{Resource: "finance", Action: "read", Scope: "own", Description: "View own finance data"},
	{Resource: "finance", Action: "read", Scope: "dealership", Description: "View all finance data"},
	{Resource: "finance", Action: "manage", Scope: "dealership", Description: "Full finance management"},
	{Resource: "finance", Action: "approve", Scope: "dealership", Description: "Approve financial transactions"},

	// Integrations
	{Resource: "integrations", Action: "read", Scope: "dealership", Description: "View integrations"},
	{Resource: "integrations", Action: "manage", Scope: "dealership", Description: "Manage integrations"},

	// AI Features
	{Resource: "ai", Action: "use", Scope: "dealership", Description: "Use AI features"},
	{Resource: "ai", Action: "configure", Scope: "dealership", Description: "Configure AI settings"},
}

// =====================================================
// DEFAULT ROLES
// =====================================================

// SystemRoles defines the default system roles
var SystemRoles = []Role{
	{
		Name:        "SUPER_ADMIN",
		DisplayName: "Super Administrator",
		Description: "Full system access with all permissions",
		IsSystem:    true,
		Priority:    1000,
	},
	{
		Name:        "ADMIN",
		DisplayName: "Administrator",
		Description: "Dealership-level admin with most permissions",
		IsSystem:    true,
		Priority:    900,
	},
	{
		Name:        "MANAGER",
		DisplayName: "Sales Manager",
		Description: "Team management and reporting access",
		IsSystem:    true,
		Priority:    800,
	},
	{
		Name:        "FINANCE_MANAGER",
		DisplayName: "Finance Manager",
		Description: "Finance and deal approval access",
		IsSystem:    true,
		Priority:    750,
	},
	{
		Name:        "SALESPERSON",
		DisplayName: "Sales Representative",
		Description: "Standard sales access",
		IsSystem:    true,
		Priority:    500,
	},
	{
		Name:        "BDC_AGENT",
		DisplayName: "BDC Agent",
		Description: "Business Development Center agent",
		IsSystem:    true,
		Priority:    400,
	},
	{
		Name:        "SERVICE_ADVISOR",
		DisplayName: "Service Advisor",
		Description: "Service department access",
		IsSystem:    true,
		Priority:    450,
	},
	{
		Name:        "VIEWER",
		DisplayName: "View Only",
		Description: "Read-only access to most resources",
		IsSystem:    true,
		Priority:    100,
	},
}

// RolePermissionMap defines which permissions each role has
var RolePermissionMap = map[string][]string{
	"SUPER_ADMIN": {
		// Has all permissions
		"*:*:*",
	},
	"ADMIN": {
		"deals:*:dealership",
		"customers:*:dealership",
		"inventory:*:dealership",
		"showroom:*:dealership",
		"email:*:dealership",
		"messages:*:dealership",
		"reports:*:dealership",
		"settings:*:dealership",
		"users:*:dealership",
		"roles:read:dealership",
		"finance:read:dealership",
		"integrations:*:dealership",
		"ai:*:dealership",
	},
	"MANAGER": {
		"deals:*:team",
		"deals:read:dealership",
		"customers:*:team",
		"customers:read:dealership",
		"inventory:read:dealership",
		"showroom:*:dealership",
		"email:*:dealership",
		"messages:*:dealership",
		"reports:*:team",
		"reports:read:dealership",
		"settings:read:own",
		"settings:update:own",
		"users:read:dealership",
		"finance:read:team",
		"ai:use:dealership",
	},
	"FINANCE_MANAGER": {
		"deals:read:dealership",
		"deals:update:dealership",
		"customers:read:dealership",
		"inventory:read:dealership",
		"finance:*:dealership",
		"reports:*:dealership",
		"settings:read:own",
		"settings:update:own",
		"ai:use:dealership",
	},
	"SALESPERSON": {
		"deals:create:dealership",
		"deals:read:own",
		"deals:update:own",
		"customers:create:dealership",
		"customers:read:own",
		"customers:update:own",
		"inventory:read:dealership",
		"showroom:read:dealership",
		"showroom:checkin:dealership",
		"email:send:own",
		"email:read:own",
		"messages:send:dealership",
		"messages:read:own",
		"reports:read:own",
		"settings:read:own",
		"settings:update:own",
		"ai:use:dealership",
	},
	"BDC_AGENT": {
		"customers:create:dealership",
		"customers:read:dealership",
		"customers:update:dealership",
		"email:send:own",
		"email:read:own",
		"messages:send:dealership",
		"messages:read:dealership",
		"showroom:read:dealership",
		"showroom:checkin:dealership",
		"settings:read:own",
		"settings:update:own",
	},
	"SERVICE_ADVISOR": {
		"customers:read:dealership",
		"inventory:read:dealership",
		"email:send:own",
		"email:read:own",
		"messages:send:dealership",
		"messages:read:own",
		"settings:read:own",
		"settings:update:own",
	},
	"VIEWER": {
		"deals:read:dealership",
		"customers:read:dealership",
		"inventory:read:dealership",
		"showroom:read:dealership",
		"reports:read:dealership",
		"settings:read:own",
	},
}

// =====================================================
// PERMISSION CHECK FUNCTIONS
// =====================================================

// CheckPermissionRequest represents a permission check request
type CheckPermissionRequest struct {
	UserID       string `json:"user_id"`
	DealershipID string `json:"dealership_id"`
	Resource     string `json:"resource"`
	Action       string `json:"action"`
	TargetScope  string `json:"target_scope,omitempty"` // "own", "team", "dealership"
	TargetUserID string `json:"target_user_id,omitempty"`
}

// CheckPermissionResponse represents a permission check response
type CheckPermissionResponse struct {
	Allowed     bool     `json:"allowed"`
	Reason      string   `json:"reason,omitempty"`
	UserRole    string   `json:"user_role"`
	Permissions []string `json:"applicable_permissions"`
}

// HasPermission checks if a user has a specific permission
func HasPermission(role string, resource string, action string, scope string) bool {
	permissions, ok := RolePermissionMap[role]
	if !ok {
		return false
	}

	for _, perm := range permissions {
		// Check for wildcard permissions
		if perm == "*:*:*" {
			return true
		}

		// Parse permission pattern
		parts := splitPermission(perm)
		if len(parts) != 3 {
			continue
		}

		permResource, permAction, permScope := parts[0], parts[1], parts[2]

		// Check resource match
		if permResource != "*" && permResource != resource {
			continue
		}

		// Check action match
		if permAction != "*" && permAction != action && permAction != "manage" {
			continue
		}

		// Check scope (higher scope includes lower)
		if scopeIncludes(permScope, scope) {
			return true
		}
	}

	return false
}

// scopeIncludes checks if the granted scope includes the required scope
func scopeIncludes(granted, required string) bool {
	scopeHierarchy := map[string]int{
		"own":        1,
		"team":       2,
		"dealership": 3,
		"all":        4,
	}

	grantedLevel := scopeHierarchy[granted]
	requiredLevel := scopeHierarchy[required]

	// If granted is "*", it includes everything
	if granted == "*" {
		return true
	}

	return grantedLevel >= requiredLevel
}

func splitPermission(perm string) []string {
	result := make([]string, 0, 3)
	current := ""
	for _, c := range perm {
		if c == ':' {
			result = append(result, current)
			current = ""
		} else {
			current += string(c)
		}
	}
	result = append(result, current)
	return result
}

// GetUserPermissions returns all permissions for a user's role
func GetUserPermissions(role string) []Permission {
	permStrings, ok := RolePermissionMap[role]
	if !ok {
		return []Permission{}
	}

	permissions := []Permission{}
	for _, permStr := range permStrings {
		if permStr == "*:*:*" {
			// Return all permissions for super admin
			return DefaultPermissions
		}

		parts := splitPermission(permStr)
		if len(parts) != 3 {
			continue
		}

		// Find matching permissions
		for _, p := range DefaultPermissions {
			if (parts[0] == "*" || parts[0] == p.Resource) &&
				(parts[1] == "*" || parts[1] == p.Action) &&
				(parts[2] == "*" || scopeIncludes(parts[2], p.Scope)) {
				permissions = append(permissions, p)
			}
		}
	}

	return permissions
}

// =====================================================
// RBAC HTTP HANDLERS
// =====================================================

// CheckPermissionHandler checks if a user has a specific permission
func checkPermissionHandler(w http.ResponseWriter, r *http.Request) {
	var req CheckPermissionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Get user from database
	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user_id")
		return
	}

	dealershipID, err := uuid.Parse(req.DealershipID)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid dealership_id")
		return
	}

	user, err := db.GetUser(userID, dealershipID)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	// Check permission
	scope := req.TargetScope
	if scope == "" {
		scope = "own"
	}

	allowed := HasPermission(user.Role, req.Resource, req.Action, scope)

	response := CheckPermissionResponse{
		Allowed:     allowed,
		UserRole:    user.Role,
		Permissions: []string{},
	}

	if !allowed {
		response.Reason = fmt.Sprintf("Role '%s' does not have '%s:%s' permission for scope '%s'",
			user.Role, req.Resource, req.Action, scope)
	}

	// Get applicable permissions for this user
	for _, p := range GetUserPermissions(user.Role) {
		if p.Resource == req.Resource || p.Resource == "*" {
			response.Permissions = append(response.Permissions,
				fmt.Sprintf("%s:%s:%s", p.Resource, p.Action, p.Scope))
		}
	}

	respondJSON(w, http.StatusOK, response)
}

// GetUserPermissionsHandler returns all permissions for a user
func getUserPermissionsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID, err := uuid.Parse(vars["id"])
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user_id")
		return
	}

	dealershipIDStr := r.URL.Query().Get("dealership_id")
	if dealershipIDStr == "" {
		respondError(w, http.StatusBadRequest, "dealership_id is required")
		return
	}

	dealershipID, err := uuid.Parse(dealershipIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid dealership_id")
		return
	}

	user, err := db.GetUser(userID, dealershipID)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	permissions := GetUserPermissions(user.Role)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"user_id":     user.ID,
		"role":        user.Role,
		"permissions": permissions,
	})
}

// ListRolesHandler returns all available roles
func listRolesHandler(w http.ResponseWriter, r *http.Request) {
	roles := make([]map[string]interface{}, len(SystemRoles))

	for i, role := range SystemRoles {
		permissions := GetUserPermissions(role.Name)
		permStrings := make([]string, len(permissions))
		for j, p := range permissions {
			permStrings[j] = fmt.Sprintf("%s:%s:%s", p.Resource, p.Action, p.Scope)
		}

		roles[i] = map[string]interface{}{
			"name":             role.Name,
			"display_name":     role.DisplayName,
			"description":      role.Description,
			"is_system":        role.IsSystem,
			"priority":         role.Priority,
			"permission_count": len(permissions),
			"permissions":      permStrings,
		}
	}

	respondJSON(w, http.StatusOK, roles)
}

// ListPermissionsHandler returns all available permissions
func listPermissionsHandler(w http.ResponseWriter, r *http.Request) {
	// Group permissions by resource
	grouped := make(map[string][]Permission)

	for _, p := range DefaultPermissions {
		if _, ok := grouped[p.Resource]; !ok {
			grouped[p.Resource] = []Permission{}
		}
		grouped[p.Resource] = append(grouped[p.Resource], p)
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"total":       len(DefaultPermissions),
		"permissions": grouped,
	})
}

// GetRoleHandler returns details about a specific role
func getRoleHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	roleName := vars["name"]

	for _, role := range SystemRoles {
		if role.Name == roleName {
			permissions := GetUserPermissions(role.Name)

			respondJSON(w, http.StatusOK, map[string]interface{}{
				"name":         role.Name,
				"display_name": role.DisplayName,
				"description":  role.Description,
				"is_system":    role.IsSystem,
				"priority":     role.Priority,
				"permissions":  permissions,
			})
			return
		}
	}

	respondError(w, http.StatusNotFound, "Role not found")
}

// =====================================================
// SETTINGS RBAC
// =====================================================

// SettingPermission defines which roles can access/modify which settings
type SettingPermission struct {
	Category string   `json:"category"`
	ReadRoles  []string `json:"read_roles"`
	WriteRoles []string `json:"write_roles"`
}

// SettingsRBAC defines RBAC rules for settings categories
var SettingsRBAC = map[string]SettingPermission{
	"appearance": {
		Category:   "appearance",
		ReadRoles:  []string{"*"}, // Everyone can read
		WriteRoles: []string{"*"}, // Everyone can change their own
	},
	"localization": {
		Category:   "localization",
		ReadRoles:  []string{"*"},
		WriteRoles: []string{"*"},
	},
	"notifications": {
		Category:   "notifications",
		ReadRoles:  []string{"*"},
		WriteRoles: []string{"*"},
	},
	"dashboard": {
		Category:   "dashboard",
		ReadRoles:  []string{"*"},
		WriteRoles: []string{"*"},
	},
	"deals": {
		Category:   "deals",
		ReadRoles:  []string{"SUPER_ADMIN", "ADMIN", "MANAGER", "FINANCE_MANAGER", "SALESPERSON"},
		WriteRoles: []string{"SUPER_ADMIN", "ADMIN", "MANAGER"},
	},
	"customers": {
		Category:   "customers",
		ReadRoles:  []string{"SUPER_ADMIN", "ADMIN", "MANAGER", "SALESPERSON", "BDC_AGENT"},
		WriteRoles: []string{"SUPER_ADMIN", "ADMIN", "MANAGER"},
	},
	"inventory": {
		Category:   "inventory",
		ReadRoles:  []string{"SUPER_ADMIN", "ADMIN", "MANAGER", "SALESPERSON"},
		WriteRoles: []string{"SUPER_ADMIN", "ADMIN"},
	},
	"showroom": {
		Category:   "showroom",
		ReadRoles:  []string{"SUPER_ADMIN", "ADMIN", "MANAGER", "SALESPERSON", "BDC_AGENT"},
		WriteRoles: []string{"SUPER_ADMIN", "ADMIN", "MANAGER"},
	},
	"messages": {
		Category:   "messages",
		ReadRoles:  []string{"*"},
		WriteRoles: []string{"*"},
	},
	"privacy": {
		Category:   "privacy",
		ReadRoles:  []string{"*"},
		WriteRoles: []string{"*"},
	},
	"security": {
		Category:   "security",
		ReadRoles:  []string{"*"},
		WriteRoles: []string{"*"},
	},
	"branding": {
		Category:   "branding",
		ReadRoles:  []string{"SUPER_ADMIN", "ADMIN"},
		WriteRoles: []string{"SUPER_ADMIN", "ADMIN"},
	},
	"business_hours": {
		Category:   "business_hours",
		ReadRoles:  []string{"*"},
		WriteRoles: []string{"SUPER_ADMIN", "ADMIN"},
	},
	"features": {
		Category:   "features",
		ReadRoles:  []string{"SUPER_ADMIN", "ADMIN"},
		WriteRoles: []string{"SUPER_ADMIN", "ADMIN"},
	},
	"defaults": {
		Category:   "defaults",
		ReadRoles:  []string{"SUPER_ADMIN", "ADMIN", "MANAGER"},
		WriteRoles: []string{"SUPER_ADMIN", "ADMIN"},
	},
	"integrations": {
		Category:   "integrations",
		ReadRoles:  []string{"SUPER_ADMIN", "ADMIN"},
		WriteRoles: []string{"SUPER_ADMIN", "ADMIN"},
	},
	"ai_settings": {
		Category:   "ai_settings",
		ReadRoles:  []string{"SUPER_ADMIN", "ADMIN"},
		WriteRoles: []string{"SUPER_ADMIN", "ADMIN"},
	},
	"email_settings": {
		Category:   "email_settings",
		ReadRoles:  []string{"SUPER_ADMIN", "ADMIN", "MANAGER"},
		WriteRoles: []string{"SUPER_ADMIN", "ADMIN"},
	},
	"finance_settings": {
		Category:   "finance_settings",
		ReadRoles:  []string{"SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER"},
		WriteRoles: []string{"SUPER_ADMIN", "ADMIN"},
	},
}

// CanAccessSetting checks if a role can access a setting
func CanAccessSetting(role string, category string, action string) bool {
	perm, ok := SettingsRBAC[category]
	if !ok {
		return false
	}

	var allowedRoles []string
	if action == "read" {
		allowedRoles = perm.ReadRoles
	} else {
		allowedRoles = perm.WriteRoles
	}

	for _, r := range allowedRoles {
		if r == "*" || r == role {
			return true
		}
	}

	return false
}

// GetSettingsRBACHandler returns the settings RBAC configuration
func getSettingsRBACHandler(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, SettingsRBAC)
}

// CheckSettingAccessHandler checks if a user can access a setting
func checkSettingAccessHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID       string `json:"user_id"`
		DealershipID string `json:"dealership_id"`
		Category     string `json:"category"`
		Action       string `json:"action"` // "read" or "write"
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	userID, _ := uuid.Parse(req.UserID)
	dealershipID, _ := uuid.Parse(req.DealershipID)

	user, err := db.GetUser(userID, dealershipID)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	allowed := CanAccessSetting(user.Role, req.Category, req.Action)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"allowed":  allowed,
		"role":     user.Role,
		"category": req.Category,
		"action":   req.Action,
	})
}
