# Stocks Vs Subscriptions 📉 vs 📈

> *"See what your spending could have become."*

A cinematic, high-performance web application that visualizes the opportunity cost of recurring subscriptions (like Netflix, Spotify) or one-off luxury purchases (like a new iPhone) versus investing that money in the stock market.

🔗 **Live Demo**: [stocksvssubscriptions.imanhussain.com](https://stocksvssubscriptions.imanhussain.com)

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
* Docker (optional, for production build)

### Local Development

1. **Clone the repo**

   ```bash
   git clone https://github.com/iman-hussain/StocksVsSubscription.git
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
   cp .env.example .env
   
   # Frontend configuration
   cp frontend/.env.example frontend/.env
   ```

   **Backend (`.env`):**
   * `NODE_ENV`: Set to `development` for local, `production` for deployed environments
   * `PORT`: Backend server port (default: 3000)
   * `REDIS_URL`: Redis connection URL (optional, recommended for production)
     * Local: `redis://localhost:6379`
     * Production: Your Redis host URL

   **Frontend (`frontend/.env`):**
   * `VITE_API_URL`: Backend API URL
     * Local development: `http://localhost:3000`
     * Production: `https://api.svs.imanhussain.com`

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

### Production (Docker)

To run the full stack with Redis locally:

```bash
docker-compose up --build
```

Access the app at [http://localhost:3000](http://localhost:3000).

To build for production deployment with a custom API URL:

```bash
# Set the API URL for the build
export VITE_API_URL=https://api.svs.imanhussain.com  # Linux/Mac
# or
set VITE_API_URL=https://api.svs.imanhussain.com     # Windows CMD
# or
$env:VITE_API_URL="https://api.svs.imanhussain.com"  # Windows PowerShell

# Build the Docker image
docker-compose build
```

## 🌐 Deployment

For detailed deployment instructions to production environments like Coolify, see [docs/coolify-setup.md](docs/coolify-setup.md).

**Production URLs:**

* **Frontend**: [svs.imanhussain.com](https://svs.imanhussain.com)
* **Backend API**: [api.svs.imanhussain.com](https://api.svs.imanhussain.com)

**Environment Variables for Production:**

1. **Backend** (`.env`):

   ```env
   NODE_ENV=production
   PORT=3000
   REDIS_URL=redis://your-redis-host:6379
   ```

2. **Frontend** (`frontend/.env` or build-time variables):

   ```env
   VITE_API_URL=https://api.svs.imanhussain.com
   ```

   *Note: Vite environment variables are baked into the frontend build at build-time, not runtime.*

## 📂 Project Structure

```text
.
├── frontend/               # React Frontend
│   ├── src/lib/
│   │   ├── financials.ts   # Core investment math logic
│   │   ├── tickerMap.ts    # Subscription & product database with fuzzy matching
│   │   └── useCountUp.ts   # Animation hook for percentage counter
│   └── src/components/     # Wizard slide components
│       ├── IntroSlide.tsx  # Welcome screen
│       ├── ForkSlide.tsx   # Mode selection (recurring vs one-off)
│       ├── BuilderSlide.tsx # Item addition with presets
│       └── RevealSlide.tsx # Results & chart visualisation
├── backend/                # Hono Backend
│   ├── lib/cache.ts        # Redis wrapper
│   └── index.ts            # API routes (/api/stock, /api/search)
├── start_local.bat         # Windows dev launcher
├── stop_local.bat          # Windows process killer
├── docs/                   # Documentation
├── Dockerfile              # Production image
└── docker-compose.yml      # Local/Prod orchestration

## 📄 License
MIT
