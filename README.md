# Stocks Vs Subscriptions 📉 vs 📈

> *"See what your spending could have become."*

A cinematic, high-performance web application that visualizes the opportunity cost of recurring subscriptions (like Netflix, Spotify) or one-off luxury purchases (like a new iPhone) versus investing that money in the stock market.

🔗 **Live Demo**: [svs.imanhussain.com](https://svs.imanhussain.com)

![App Screenshot](./client/public/vite.svg) *Add a real screenshot here!*

## ✨ Features

* **Cinematic "Wizard" UI**: A 4-step immersive flow (Intro -> Choice -> Build -> Reveal).
* **Automatic Product Detection**:
  * **Subscriptions**: Type "Netflix" or "Spotify" → auto-resolves to NFLX/SPOT with typical monthly cost.
  * **One-Off Products**: Type "iPhone" or "iPhone 15 Pro Max" → auto-detects AAPL ticker and £999 RRP.
  * **Fuzzy Matching**: Handles variations ("PS5" → PlayStation 5, "MacBook Pro" → AAPL) with intelligent keyword matching.
* **Real Financial Logic**:
  * **Pre-IPO Handling**: Holds cash if the start date is before the stock's IPO.
  * **Market Closures**: "Fill-forward" logic for weekends and holidays.
  * **Adjusted Close**: Accounts for stock splits and dividends.
  * **Multi-Stock Portfolio**: Compare multiple items against their respective company stocks simultaneously.
* **Performance**:
  * **Redis Caching**: Caches stock data for 12 hours to minimise API usage.
  * **Optimistic UI**: Debounced search and instant transitions using `framer-motion`.
  * **Smooth Animations**: Animated growth percentage counter with easing functions.
* **Tech Stack**:
  * **Frontend**: React (Vite), TailwindCSS v4, Zustand, Recharts, Framer Motion.
  * **Backend**: Hono (Node.js), Yahoo Finance 2, Redis (ioredis).
  * **Infra**: Docker, Coolify.

## 🛠️ Tech Stack

* **Monorepo**: Managed via npm workspaces concept (concurrently).
* **Frontend**: `frontend/` (React + Vite + TypeScript).
* **Backend**: `backend/` (Hono + TypeScript).
* **Database**: Redis (for caching, optional).
* **Deployment**: Docker.

## 🚀 Getting Started

### Prerequisites

* Node.js 20+
* Docker (for production deployment)

### Local Development

1. **Clone the repo**

   ```bash
   git clone https://github.com/your-username/StocksVsSubscription.git
   cd StocksVsSubscription
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Set up Environment Variables**

   Copy the example environment files and configure them:

   ```bash
   # Backend configuration
   cp backend/.env.example backend/.env

   # Frontend configuration
   cp frontend/.env.example frontend/.env
   ```

   **Backend (`backend/.env`):**

   * `NODE_ENV`: Set to `development` for local, `production` for deployed environments
   * `PORT`: Backend server port (default: 3000)
   * `REDIS_URL`: Redis connection URL (optional, recommended for production)
   * `CORS_ORIGIN`: Allowed frontend origins (comma-separated)

   **Frontend (`frontend/.env`):**

   * `VITE_API_URL`: Backend API URL
     * Local development: `http://localhost:3000`
     * Production: `https://api.yourdomain.com`

4. **Start Dev Server**

   ```bash
   npm run dev
   ```

   * **Frontend**: [http://localhost:5173](http://localhost:5173) (fallback 5174, 5175)
   * **Backend**: [http://localhost:3000](http://localhost:3000)

   *Note: Without a local Redis instance running, the server will silently fall back to in-memory caching.*

### Windows Quick Start

Simply double-click `start_local.bat` in the root directory. This will:

* Check for Node.js and npm
* Install dependencies
* Launch both frontend and backend servers
* Keep terminal open for logs

To stop, run `stop_local.bat` to kill servers on ports 3000/5173/5174.

### Production Deployment
Production deployment is handled via **Coolify**, which automatically builds the Dockerfiles in each service directory. See the deployment section below for more details.

## 🌐 Deployment

* **Frontend**: [yourdomain.com](https://yourdomain.com)
* **Backend API**: [api.yourdomain.com](https://api.yourdomain.com)

**Quick Reference - Environment Variables:**

| Service              | Variable       | Production Value                    |
| -------------------- | -------------- | ----------------------------------- |
| Backend              | `NODE_ENV`     | `production`                        |
| Backend              | `PORT`         | `3000`                              |
| Backend              | `REDIS_URL`    | `redis://your-redis:6379`           |
| Backend              | `CORS_ORIGIN`  | `https://yourdomain.com`            |
| Frontend (Build Arg) | `VITE_API_URL` | `https://api.yourdomain.com`        |

## 📂 Project Structure

```text
.
├── backend/                # Hono API Server
│   ├── data/               # Presets (Subscriptions, Products, Habits)
│   ├── lib/                # Shared utilities & caching logic
│   ├── index.ts            # Main entry point & API routes
│   └── Dockerfile          # Backend container definition
├── frontend/               # React (Vite) Frontend
│   ├── src/                # UI components & logic
│   ├── nginx.conf          # Production web server config
│   └── Dockerfile          # Frontend container definition
├── start_local.bat         # Windows dev launcher
├── stop_local.bat          # Windows process killer
├── package.json            # Monorepo scripts
└── README.md               # Documentation
```

## 📄 Licence

MIT
