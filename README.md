# Trackora - Production Deployment Guide

Trackora is a comprehensive daily life tracking and productivity platform featuring task management, habit tracking, goals setting, and real-time collaboration.

## Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB (v6.0 or higher)
- Redis (optional but recommended for queue/job processing)
- Nginx or Apache (for reverse proxying the frontend and backend)
- PM2 (for running the backend in production)

## 1. Backend Setup

1. **Navigate to backend:**
   ```bash
   cd backend
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment:**
   Copy `.env.example` to `.env` and update the values.
   ```bash
   cp .env.example .env
   ```
   **CRITICAL:** Change `JWT_SECRET` to a strong, random string. Do NOT use the default.
4. **Build the Backend (TypeScript):**
   ```bash
   npm run build
   ```
5. **Start Production Server with PM2:**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name "trackora-backend"
   ```

## 2. Frontend Setup

1. **Navigate to admin-dashboard:**
   ```bash
   cd admin-dashboard
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment:**
   Copy `.env.example` to `.env` and set the production backend API URL.
   ```bash
   cp .env.example .env
   # Update VITE_API_URL to your production domain, e.g., https://api.yourdomain.com/api
   ```
4. **Build the Frontend:**
   ```bash
   npm run build
   ```
   This will generate a `dist` folder.

## 3. Web Server Configuration (Nginx Example)

Create an Nginx configuration file (`/etc/nginx/sites-available/trackora`):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Serve Frontend Static Files
    location / {
        root /var/www/trackora/admin-dashboard/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API Requests to Backend
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

## Security Best Practices
- **HTTPS:** Always secure your site with an SSL certificate (e.g., Let's Encrypt).
- **Environment Variables:** Never commit `.env` files to source control.
- **Database:** Ensure MongoDB is secured with authentication and not exposed to the public internet.
- **Rate Limiting:** The backend utilizes rate limiters by default. Do not disable them.

## Monitoring and Maintenance
- **Logs:** View backend logs using `pm2 logs trackora-backend`.
- **Database Backups:** Use `mongodump` regularly to backup your data.
- **Admin Audit Logs:** The Trackora interface includes a built-in "Audit Logs" page to monitor administrative actions.
# trackora
# trackora
