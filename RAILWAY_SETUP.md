# Railway Deployment Guide

## Quick Setup (5 minutes)

### 1. Create Railway Account

- Go to https://railway.app
- Sign up with GitHub (connects automatically)
- You get $5 free credit

### 2. Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `morpheus18-glitch/Autolytiq-desk-studio`
4. Railway will auto-detect the configuration

### 3. Add PostgreSQL Database

1. In your project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway creates the database instantly
4. Copy the `DATABASE_URL` from the database service

### 4. Configure Environment Variables

For each service, add these variables:

```bash
# Database (copy from Railway PostgreSQL service)
DATABASE_URL=postgresql://...

# JWT Configuration
JWT_SECRET=your-secret-key-here-change-this
JWT_ISSUER=autolytiq

# CORS
ALLOWED_ORIGINS=*

# Ports (Railway auto-assigns)
PORT=${{PORT}}
```

### 5. Deploy Services

Railway will automatically:

- ✅ Build all Docker images
- ✅ Deploy all services from docker-compose.yml
- ✅ Assign public URLs
- ✅ Connect database

### 6. Run Database Migrations

In the Railway dashboard:

1. Open the PostgreSQL service
2. Click "Query" tab
3. Run `services/init-db.sql` to create tables

### 7. Access Your App

Railway provides a public URL like:

```
https://autolytiq-desk-studio-production.up.railway.app
```

## Cost Estimate

- **Free Tier**: $5 credit (good for ~1 week of testing)
- **Developer Plan**: $5/month
  - 500 hours execution time
  - PostgreSQL included
  - Good for development

- **Team Plan**: $20/month (if you need production)
  - Unlimited hours
  - Better performance

## Services That Will Deploy

From `docker-compose.yml`:

1. api-gateway (port 8080)
2. auth-service (port 8087)
3. user-service (port 8085)
4. customer-service (port 8082)
5. deal-service (port 8081)
6. inventory-service (port 8083)
7. email-service (port 8084)
8. config-service (port 8086)
9. messaging-service (port 8089)
10. settings-service (port 8090)
11. showroom-service (port 8088)

## Alternative: Local Docker Compose

To run locally for FREE:

```bash
# Start all services
docker-compose up

# Access at
http://localhost:8080
```

## Troubleshooting

**Services won't start?**

- Check Railway logs in dashboard
- Verify DATABASE_URL is set
- Make sure PostgreSQL is running

**Out of memory?**

- Reduce number of services
- Run only essential ones (api-gateway, auth, database)

**Database connection failed?**

- Copy DATABASE_URL exactly from Railway PostgreSQL service
- Check service can reach database (same project)

## Next Steps After Deploy

1. Test login at your Railway URL
2. Create admin user
3. Import seed data if needed
4. Monitor logs in Railway dashboard
5. Set up custom domain (optional, $0)
