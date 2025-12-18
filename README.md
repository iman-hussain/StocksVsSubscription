# Stocks Vs Subscriptions 📉 vs 📈

> *"See what your spending could have become."*

A cinematic, high-performance web application that visualizes the opportunity cost of recurring subscriptions (like Netflix, Spotify) or one-off luxury purchases (like a new iPhone) versus investing that money in the stock market.

🔗 **Live Demo**: [stocksvssubscriptions.imanhussain.com](https://stocksvssubscriptions.imanhussain.com)

![App Screenshot](./client/public/vite.svg) *Add a real screenshot here!*

## ✨ Features

*   **Cinematic "Wizard" UI**: A 4-step immersive flow (Intro -> Choice -> Build -> Reveal).
*   **Real Financial Logic**:
    *   **Pre-IPO Handling**: Holds cash if the start date is before the stock's IPO.
    *   **Market Closures**: "Fill-forward" logic for weekends and holidays.
    *   **Adjusted Close**: Accounts for stock splits and dividends.
*   **Performance**:
    *   **Redis Caching**: Caches stock data for 12 hours to minimize API usage.
    *   **Optimistic UI**: Debounced search and instant transitions using `framer-motion`.
*   **Tech Stack**:
    *   **Frontend**: React (Vite), TailwindCSS v4, Zustand, Recharts, Framer Motion.
    *   **Backend**: Hono (Node.js), Yahoo Finance 2, Redis (ioredis).
    *   **Infra**: Docker, Coolify.

## 🛠️ Tech Stack

*   **Monorepo**: Managed via npm workspaces concept (concurrently).
*   **Client**: `client/` (React + Vite).
*   **Server**: `server/` (Hono).
*   **Database**: Redis (for caching).
*   **Deployment**: Docker.

## 🚀 Getting Started

### Prerequisites
*   Node.js 20+
*   Docker (optional, for production build)

### Local Development

1.  **Clone the repo**
    ```bash
    git clone https://github.com/iman-hussain/StocksVsSubscription.git
    cd StocksVsSubscription
    ```

2.  **Install Dependencies**
    ```bash
    npm run install:all
    ```
    *(Or run `npm install` in root, client, and server)*

3.  **Start Dev Server**
    ```bash
    npm run dev
    ```
    *   **Client**: http://localhost:5173
    *   **Server**: http://localhost:3000

    *Note: Without a local Redis instance running, the server will silently fall back to in-memory caching.*

### Production (Docker)

To run the full stack with Redis:

```bash
docker-compose up --build
```
Access the app at `http://localhost:3000`.

## 📂 Project Structure

```
.
├── client/                 # React Frontend
│   ├── src/lib/financials  # Core investment math logic
│   └── src/components      # Wizard slides
├── server/                 # Hono Backend
│   ├── lib/cache.ts        # Redis wrapper
│   └── index.ts            # API routes
├── docs/                   # Documentation
├── Dockerfile              # Produciton Image
└── docker-compose.yml      # Local/Prod Orchestration
```

## 📄 License
MIT
