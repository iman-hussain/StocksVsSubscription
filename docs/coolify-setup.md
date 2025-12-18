# Deploying StocksVsSubscriptions to Coolify

This guide walks you through deploying the frontend and backend as **separate resources** in Coolify.

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                         COOLIFY                                  │
│                                                                  │
│  ┌─────────────────────┐      ┌─────────────────────┐           │
│  │      FRONTEND       │      │       BACKEND       │           │
│  │  svs.imanhussain.com│      │ api.svs.imanhussain │           │
│  │                     │      │        .com         │           │
│  │   Nginx + React     │ ───▶ │   Hono + Node.js    │           │
│  │      (Port 80)      │      │     (Port 3000)     │           │
│  └─────────────────────┘      └──────────┬──────────┘           │
│                                          │                       │
│                                          ▼                       │
│                               ┌─────────────────────┐           │
│                               │       REDIS         │           │
│                               │  (Internal only)    │           │
│                               └─────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

**URLs:**

* **Frontend**: `https://svs.imanhussain.com`
* **Backend API**: `https://api.svs.imanhussain.com`

---

## Prerequisites

* A running [Coolify](https://coolify.io/) instance
* Your GitHub repository connected to Coolify
* A domain with DNS pointing to your Coolify server

---

## Step 1: Create a Project

1. Log in to your Coolify dashboard
2. Click **"+ Add"** → **"Project"**
3. Name it `StocksVsSubscription` (or similar)
4. Click **"Continue"**

---

## Step 2: Deploy Redis (Optional but Recommended)

Redis provides persistent caching. Without it, the cache is lost on container restart.

1. Inside your project, click **"+ Add Resource"**
2. Select **"Database"** → **"Redis"**
3. Configure:
   * **Name**: `svs-redis`
   * Leave other settings as default
4. Click **"Deploy"**
5. Once deployed, copy the **Internal URL** (looks like `redis://svs-redis:6379`)
   * You'll need this for the backend

---

## Step 3: Deploy the Backend API

### 3.1 Create the Resource

1. Click **"+ Add Resource"**
2. Select **"Git Repository"** (Public or Private)
3. Choose your Git source and select the `StocksVsSubscription` repository
4. Branch: `main`

### 3.2 Configure Build Settings

In the resource settings:

| Setting                 | Value      |
| ----------------------- | ---------- |
| **Build Pack**          | Dockerfile |
| **Dockerfile Location** | `Dockerfile` |
| **Base Directory**      | `/backend` |

### 3.3 Configure Environment Variables

Go to **"Environment Variables"** and add:

```env
NODE_ENV=production
PORT=3000
REDIS_URL=redis://svs-redis:6379
CORS_ORIGIN=https://svs.imanhussain.com
```

> **CRITICAL**: When adding `NODE_ENV=production`, make sure it is set to **"Runtime only"** in the Coolify UI, NOT "Available at Buildtime". If marked as available at buildtime, npm will skip installing devDependencies (like TypeScript), causing the build to fail with `tsc: not found`.

> **Note**: Replace `svs-redis` with your actual Redis resource name if different.

### 3.4 Configure Domain

Go to **"Domains"** and add:

* **Domain**: `api.svs.imanhussain.com`
* **Port**: `3000`

Enable **"Generate SSL Certificate"** (Let's Encrypt).

### 3.5 Configure Healthcheck

Go to **"Health Checks"** and ensure these settings are configured:

* **Enabled**: Toggle on
* **Path**: `/` (root path – the API responds with "StocksVsSubscription API is running!")
* **Port**: `3000`
* **Interval**: `30` seconds
* **Timeout**: `3` seconds
* **Retries**: `3`

Coolify will automatically use `wget` (which is included in the Dockerfile) to verify the backend is running.

### 3.6 Deploy

Click **"Deploy"** and wait for it to complete.

**Verify**: Visit `https://api.svs.imanhussain.com` - you should see:

```text
StocksVsSubscription API is running!
```

---

## Step 4: Deploy the Frontend

### 4.1 Create the Resource

1. Click **"+ Add Resource"**
2. Select **"Git Repository"**
3. Select the same `StocksVsSubscription` repository
4. Branch: `main`

### 4.2 Configure Build Settings

| Setting                 | Value      |
| ----------------------- | ---------- |
| **Build Pack**          | Dockerfile |
| **Dockerfile Location** | `Dockerfile` |
| **Base Directory**      | `/frontend` |

### 4.3 Configure Build Arguments

Go to **"Build"** → **"Build Arguments"** (or similar section) and add:

```env
VITE_API_URL=https://api.svs.imanhussain.com
```

> **IMPORTANT**: This MUST be a **Build Argument**, not a runtime environment variable! Vite bakes environment variables into the JavaScript bundle at build time.

### 4.4 Configure Domain

Go to **"Domains"** and add:

* **Domain**: `svs.imanhussain.com`
* **Port**: `80`

Enable **"Generate SSL Certificate"** (Let's Encrypt).

### 4.5 Deploy

Click **"Deploy"** and wait for it to complete.

---

## Step 5: Configure DNS

Add these DNS records to your domain registrar:

| Type         | Name      | Value               | TTL  |
| ------------ | --------- | ------------------- | ---- |
| A (or CNAME) | `svs`     | `<your-coolify-ip>` | 3600 |
| A (or CNAME) | `api.svs` | `<your-coolify-ip>` | 3600 |

> If using Cloudflare, you can proxy the traffic (orange cloud) for additional protection.

---

## Step 6: Verify Deployment

### Test the Backend

```bash
curl https://api.svs.imanhussain.com
# Expected: StocksVsSubscription API is running!

curl "https://api.svs.imanhussain.com/api/stock?symbol=AAPL"
# Expected: JSON with Apple stock data
```

### Test the Frontend

1. Open `https://svs.imanhussain.com` in your browser
2. The app should load
3. Try adding a subscription (e.g., Netflix) and verify stock data loads

---

## Troubleshooting

### Frontend shows blank page or errors

**Check browser console** (F12 → Console tab):

* **CORS errors?** → Backend `CORS_ORIGIN` doesn't match frontend domain
* **Network errors?** → `VITE_API_URL` is wrong or backend isn't running

**Solution**: Verify `VITE_API_URL` build argument matches your backend URL exactly (including `https://`).

### API returns CORS errors

**Check backend logs** in Coolify:

1. Click on the backend resource
2. Go to **"Logs"**
3. Look for `CORS origins:` line

**Solution**: Update `CORS_ORIGIN` environment variable to include your frontend domain.

### Redis connection errors

**Check if Redis is running**:

1. Go to your Redis resource in Coolify
2. Verify status is "Running"
3. Check the internal URL matches what you set in `REDIS_URL`

**Without Redis**: The app works fine with in-memory caching, but cache is lost on restart.

### Build fails

**Common issues**:

* **Wrong Dockerfile path**: Ensure it's `/backend/Dockerfile` or `/frontend/Dockerfile`
* **Wrong base directory**: Should match the Dockerfile location
* **Missing build argument**: `VITE_API_URL` must be set for frontend

---

## Environment Variables Reference

### Backend (`/backend`)

| Variable      | Required | Default                 | Description                        |
| ------------- | -------- | ----------------------- | ---------------------------------- |
| `NODE_ENV`    | No       | `development`           | Set to `production` for production |
| `PORT`        | No       | `3000`                  | Server port                        |
| `REDIS_URL`   | No       | (none)                  | Redis connection URL for caching   |
| `CORS_ORIGIN` | Yes      | `http://localhost:5173` | Allowed origins (comma-separated)  |

### Frontend (`/frontend`) - Build Arguments

| Variable       | Required | Default | Description                                               |
| -------------- | -------- | ------- | --------------------------------------------------------- |
| `VITE_API_URL` | Yes      | (none)  | Backend API URL (e.g., `https://api.svs.imanhussain.com`) |

---

## Updating the App

When you push changes to your repository:

1. **Automatic**: If you enabled webhooks, Coolify will auto-deploy
2. **Manual**: Click **"Deploy"** on each resource that changed

> **Tip**: If you only changed frontend code, you only need to redeploy the frontend resource.

---

## Production Checklist

Before going live:

* [ ] Backend deployed and responding at `https://api.svs.imanhussain.com`
* [ ] Frontend deployed and loading at `https://svs.imanhussain.com`
* [ ] SSL certificates generated (green padlock in browser)
* [ ] CORS configured correctly (no console errors)
* [ ] Redis connected (check backend logs for "Redis Connected")
* [ ] Stock data loading (try adding Netflix or Spotify)

---

**Questions?** Check the [Coolify documentation](https://coolify.io/docs) or open an issue on GitHub.
