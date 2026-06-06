# نشر النظام على الخادم | Deployment Guide

## المتطلبات | Requirements
- Node.js 20+
- PostgreSQL 15+
- PM2 (`npm i -g pm2`)
- Nginx

---

## الخطوات | Steps

### 1. قاعدة البيانات | Database
```bash
sudo -u postgres psql
CREATE DATABASE snow_factory;
CREATE USER snow_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE snow_factory TO snow_user;
\q
```

### 2. الباكند | Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env: set DATABASE_URL and JWT_SECRET

npm run db:generate
npm run db:push
npm run db:seed

# Start with PM2
pm2 start npm --name "snow-backend" -- start
pm2 save
pm2 startup
```

### 3. الفرونتند | Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local: set NEXT_PUBLIC_API_URL=https://yourdomain.com/api

npm run build

# Start with PM2
pm2 start npm --name "snow-frontend" -- start
pm2 save
```

### 4. Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## حسابات البدء الافتراضية | Default Accounts (after seed)

| المستخدم | كلمة المرور | الصلاحية |
|----------|-------------|----------|
| admin | admin123 | مالك (Owner) |
| supervisor1 | pass123 | مشرف |
| worker1 | pass123 | عامل |
| worker2 | pass123 | عامل |
| worker3 | pass123 | عامل |

**⚠️ غير كلمات المرور فوراً بعد أول تسجيل دخول.**

---

## النسخ الاحتياطي | Database Backup
```bash
# Backup
pg_dump -U snow_user snow_factory > backup_$(date +%Y%m%d).sql

# Restore
psql -U snow_user snow_factory < backup_20240101.sql
```

Add to crontab for daily backups:
```
0 2 * * * pg_dump -U snow_user snow_factory > /backups/snow_$(date +\%Y\%m\%d).sql
```
