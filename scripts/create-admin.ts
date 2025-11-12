import { db } from "../server/db";
import { users } from "../shared/schema";
import { hashPassword } from "../server/auth";
import { eq, sql } from "drizzle-orm";

async function createMasterAdmin() {
  try {
    console.log("🔍 Checking for existing master admin account...");
    
    // Check if master admin exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@autolytiq.com"))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("✅ Master admin account already exists!");
      console.log("📧 Email: admin@autolytiq.com");
      console.log("🔑 Password: Admin123!");
      return;
    }

    // Get first dealership
    const dealershipResult = await db.execute(
      sql`SELECT id FROM dealership_settings LIMIT 1`
    );
    
    if (!dealershipResult.rows || dealershipResult.rows.length === 0) {
      throw new Error("No dealership found. Please create a dealership first.");
    }

    const dealershipId = dealershipResult.rows[0].id as string;
    console.log(`📍 Using dealership ID: ${dealershipId}`);

    // Hash password
    const hashedPassword = await hashPassword("Admin123!");

    // Create admin user
    await db.insert(users).values({
      email: "admin@autolytiq.com",
      password: hashedPassword,
      username: "admin",
      fullName: "Master Admin",
      role: "admin",
      dealershipId,
      accountLockedUntil: null,
      failedLoginAttempts: 0,
      mfaEnabled: false,
      emailVerified: true,
      permissions: ["*"], // All permissions
    });

    console.log("\n✅ Master admin account created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:    admin@autolytiq.com");
    console.log("🔑 Password: Admin123!");
    console.log("👤 Role:     admin");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🔐 Please change this password after first login!");

  } catch (error) {
    console.error("❌ Error creating master admin:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createMasterAdmin();
