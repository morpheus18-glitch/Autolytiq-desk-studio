// Referenced from javascript_auth_all_persistance blueprint integration
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, LoginData, RegisterData, loginSchema, registerSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      fullName: string;
      email: string;
      role: string;
      emailVerified: boolean;
      mfaEnabled: boolean;
      mfaSecret: string | null;
      lastLogin: Date | null;
      preferences: any;
      resetToken: string | null;
      resetTokenExpires: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}

const scryptAsync = promisify(scrypt);

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        // Check if account is locked
        if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
          const minutesRemaining = Math.ceil(
            (user.accountLockedUntil.getTime() - Date.now()) / 60000
          );
          return done(null, false, { 
            message: `Account locked. Try again in ${minutesRemaining} minute(s)` 
          });
        }

        // Verify password
        const isValid = await comparePasswords(password, user.password);
        
        if (!isValid) {
          // Increment failed attempts
          const newAttempts = (user.failedLoginAttempts || 0) + 1;
          const updates: any = { 
            failedLoginAttempts: newAttempts 
          };

          // Lock account if max attempts reached
          if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            updates.accountLockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
          }

          await storage.updateUser(user.id, updates);
          
          if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            return done(null, false, { 
              message: "Too many failed attempts. Account locked for 15 minutes" 
            });
          }

          return done(null, false, { 
            message: `Invalid username or password (${newAttempts}/${MAX_LOGIN_ATTEMPTS})` 
          });
        }

        // Successful login - reset failed attempts and update last login
        await storage.updateUser(user.id, {
          failedLoginAttempts: 0,
          accountLockedUntil: null,
          lastLogin: new Date(),
        });

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate request body
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validation.error.errors 
        });
      }

      const { username, email, fullName, password } = validation.data;

      // Check if username exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Create user with hashed password - role is ALWAYS "salesperson" for self-registration
      // Only admins can create users with other roles via separate admin endpoint
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        email,
        fullName,
        password: hashedPassword,
        role: "salesperson", // Force role to salesperson - prevent privilege escalation
      });

      // Auto-login after registration
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed", error: error.message });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    // Validate request body
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: validation.error.errors 
      });
    }

    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      // Check if 2FA is enabled for this user
      if (user.mfaEnabled) {
        // Store user ID in session temporarily for 2FA verification
        (req.session as any).pending2faUserId = user.id;
        return res.status(200).json({ 
          requires2fa: true, 
          message: "Please verify with your authenticator app" 
        });
      }

      // No 2FA required - complete login
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie("connect.sid");
        res.sendStatus(200);
      });
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.sendStatus(401);
    }
    
    // Remove password from response using type assertion (password exists in DB but not needed in response)
    const { password: _, ...userWithoutPassword } = req.user as User;
    res.json(userWithoutPassword);
  });
}

// Middleware to require authentication
export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Middleware to require specific role
export function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    next();
  };
}

export { hashPassword, comparePasswords };
