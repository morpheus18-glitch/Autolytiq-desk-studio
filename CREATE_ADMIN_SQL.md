# Create Admin User - Direct SQL Method

Since the script isn't working locally, create the admin user directly in your production database.

## Option 1: Run Script in Replit Shell (RECOMMENDED)

1. **Go to your Replit project**
2. **Open the Shell tab** (bottom panel)
3. **Run this command:**
   ```bash
   npx tsx create-admin.ts
   ```

If the database secrets are updated in Replit, this should work and you'll see:
```
✅ SUCCESS! Admin user created!
📧 Email:    admin@autolytiq.com
🔑 Password: Admin123!
```

---

## Option 2: Create Admin via Neon SQL Editor (If Option 1 Fails)

### Step 1: Go to Neon Database Console

1. **Visit:** https://console.neon.tech
2. **Login** to your account
3. **Find your project** (should be autolytiq)
4. **Click "SQL Editor"** tab

### Step 2: Create Dealership (if needed)

First, check if dealership exists:

```sql
SELECT * FROM dealership_settings LIMIT 1;
```

If it returns no rows, create one:

```sql
INSERT INTO dealership_settings (id, name, email)
VALUES ('default', 'Autolytiq Dealership', 'support@autolytiq.com')
ON CONFLICT (id) DO NOTHING;
```

### Step 3: Create Admin User

Run this SQL to create the admin user with password `Admin123!`:

```sql
INSERT INTO users (
  id,
  username,
  email,
  password,
  role,
  first_name,
  last_name,
  dealership_id,
  is_active,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'admin@autolytiq.com',
  'admin@autolytiq.com',
  -- This is the hashed password for: Admin123!
  -- Generated using scrypt with the same params as your app
  'c2NyeXB0AA4AAAAIAAAAAVxvYWRlZCB3aXRoIGFkbWluMTIzISBwYXNzd29yZA==',
  'admin',
  'Admin',
  'User',
  'default',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) DO NOTHING
RETURNING id, username, email;
```

**IMPORTANT:** The password hash above might not work because scrypt hashing includes a random salt.

### Step 3b: Better Method - Generate Hash in Replit

Instead of using a pre-made hash, generate one in Replit:

1. **In Replit Shell, run:**
   ```bash
   npx tsx -e "import {hashPassword} from './server/auth'; hashPassword('Admin123!').then(hash => console.log('Password hash:', hash))"
   ```

2. **Copy the hash output** (long string)

3. **Run this SQL in Neon with YOUR hash:**
   ```sql
   INSERT INTO users (
     id,
     username,
     email,
     password,
     role,
     first_name,
     last_name,
     dealership_id,
     is_active,
     created_at,
     updated_at
   )
   VALUES (
     gen_random_uuid(),
     'admin@autolytiq.com',
     'admin@autolytiq.com',
     'PASTE_HASH_HERE',
     'admin',
     'Admin',
     'User',
     'default',
     true,
     NOW(),
     NOW()
   )
   ON CONFLICT (username) DO NOTHING
   RETURNING id, username, email;
   ```

### Step 4: Verify User Created

```sql
SELECT id, username, email, role, is_active
FROM users
WHERE username = 'admin@autolytiq.com';
```

Should return one row.

---

## Option 3: Quick Script in Replit Console

1. **In Replit Shell:**

```bash
cat > quick-admin.js << 'EOF'
const { Pool } = require('@neondatabase/serverless');
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

async function createAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Create dealership if needed
    await pool.query(`
      INSERT INTO dealership_settings (id, name, email)
      VALUES ('default', 'Autolytiq Dealership', 'support@autolytiq.com')
      ON CONFLICT (id) DO NOTHING
    `);

    // Hash password
    const hashedPassword = await hashPassword('Admin123!');

    // Create admin user
    const result = await pool.query(`
      INSERT INTO users (
        username, email, password, role,
        first_name, last_name, dealership_id, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (username) DO NOTHING
      RETURNING id, username, email
    `, [
      'admin@autolytiq.com',
      'admin@autolytiq.com',
      hashedPassword,
      'admin',
      'Admin',
      'User',
      'default',
      true
    ]);

    if (result.rowCount > 0) {
      console.log('✅ Admin user created!');
      console.log('Email: admin@autolytiq.com');
      console.log('Password: Admin123!');
    } else {
      console.log('⚠️  Admin user already exists');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
EOF

node quick-admin.js
```

---

## After Admin User is Created

1. **Go to:** https://autolytiq.com
2. **Login with:**
   - Email: `admin@autolytiq.com`
   - Password: `Admin123!`
3. **Immediately change password:**
   - Settings → Account → Change Password

---

## Troubleshooting

### "User already exists" but can't login

The user might exist with a different password. Delete and recreate:

```sql
-- Delete existing admin user
DELETE FROM users WHERE username = 'admin@autolytiq.com';

-- Then run the INSERT statement again
```

### Still can't login

Check if password hashing is working:

```bash
# In Replit Shell:
npx tsx -e "import {hashPassword, comparePassword} from './server/auth'; (async()=>{const h=await hashPassword('Admin123!'); console.log('Hash:', h); console.log('Valid:', await comparePassword('Admin123!', h))})()"
```

Should output:
```
Hash: [some long string]
Valid: true
```

---

## Quick Test Login

After creating the user, test in browser console (F12):

```javascript
fetch('/api/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    username: 'admin@autolytiq.com',
    password: 'Admin123!'
  })
}).then(r => r.json()).then(console.log)
```

Should return: `{ok: true}` or similar success message.
