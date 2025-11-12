import { Request, Response, NextFunction } from "express";
import { hasPermission, hasAnyPermission, hasAllPermissions } from "./auth-helpers";

// Require authentication (already exists in auth.ts, duplicated here for middleware module)
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized - Please log in" });
}

// Require specific role(s)
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please log in" });
    }
    
    const user = req.user as Express.User;
    if (!roles.includes(user.role)) {
      return res.status(403).json({ 
        message: "Forbidden - Insufficient permissions",
        required: roles,
        current: user.role
      });
    }
    
    next();
  };
}

// Require specific permission(s) - user must have at least one
export function requirePermission(...permissionNames: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please log in" });
    }
    
    const user = req.user as Express.User;
    try {
      const hasAccess = await hasAnyPermission(user.id, permissionNames);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "Forbidden - Missing required permissions",
          required: permissionNames
        });
      }
      
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({ message: "Error checking permissions" });
    }
  };
}

// Require all specified permissions
export function requireAllPermissions(...permissionNames: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please log in" });
    }
    
    const user = req.user as Express.User;
    try {
      const hasAccess = await hasAllPermissions(user.id, permissionNames);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "Forbidden - Missing required permissions",
          required: permissionNames
        });
      }
      
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({ message: "Error checking permissions" });
    }
  };
}
