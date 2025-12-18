# Deploying StocksVsSubscriptions to Coolify 🚀

This guide will walk you through deploying the **StocksVsSubscriptions** monorepo to your self-hosted Coolify instance.

## Prerequisites

*   A [Coolify](https://coolify.io/) instance set up and running.
*   A GitHub repository containing this project code.

---

## Step 1: Create a Project in Coolify

1.  Log in to your Coolify dashboard.
2.  Click **"+ New"** or select a Project.
3.  Choose **"Project"** -> **"Production"** (or your preferred environment).
4.  Click **"+ New Resource"**.

## Step 2: Connect Your Repository

1.  Select **"Git Repository"** (Public or Private depending on your repo).
2.  Choose your Git Source (e.g., GitHub App or Private Key).
3.  Select the **StocksVsSubscriptions** repository.
4.  Branch: `main` (or your deployment branch).

## Step 3: Configuration (Crucial!)

Coolify needs to know how to build our Dockerfile.

1.  **Build Pack**: Select **Docker Compose** (Recommended) or **Dockerfile**.
    *   *Since we included a `docker-compose.yml`, Coolify can parse it automatically.*
    *   If you choose **Dockerfile**, ensure the **Dockerfile Path** is set to `/Dockerfile`.

2.  **Environment Variables**:
    Go to the **"Environment Variables"** tab (or "Secrets") and add the following:

    ```env
    NODE_ENV=production
    REDIS_URL=redis://redis:6379
    # Add any other secrets here (e.g., if you switch to a private API key)
    ```

    *Note: If using Docker Compose, the `redis` service is defined there, so `redis://redis:6379` will resolve internally.*

3.  **Ports**:
    *   Ensure Port **3000** is exposed.
    *   Coolify usually detects `EXPOSE 3000` from the Dockerfile.

## Step 4: Deploy

1.  Click **"Deploy"** in the top right corner.
2.  Watch the build logs.
    *   It will install dependencies for root, client, and server.
    *   It will build the React client `dist`.
    *   It will build the Hono server `dist`.
    *   It will copy them to the final lightweight image.

## Step 5: Post-Deployment Verification

1.  Once the status is **"Healthy"**, click the generated URL (e.g., `http://xxx.coolify.instance`).
2.  **Test the App**:
    *   Does the homepage load? (Client works)
    *   Try searching for a stock (e.g., "AAPL"). (Server + API works)
    *   Check logs to see "Redis Connected" (Redis service works).

## Troubleshooting

*   **Build Fails?**
    *   Check if `package.json` lockfiles are conflicting.
    *   Ensure the `Dockerfile` paths `COPY client/package.json` are correct relative to root.
*   **Redis Error?**
    *   Ensure you used `docker-compose` mode or manually added a Redis resource in Coolify and linked it.
    *   If using the `Dockerfile` only deployment, you must add a separate Redis Database in Coolify and update `REDIS_URL` to point to it (e.g., `redis://<coolify_redis_host>:6379`).

---

**Enjoy your self-hosted cinematic fintech app!** 📈
