# Frontend Dockerfile - Builds and serves the React app via Nginx
FROM node:20-alpine AS builder

WORKDIR /app

# Build argument for API URL (required at build time)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Production stage - serve with Nginx
FROM nginx:alpine AS runner

# Install curl for healthcheck
RUN apk add --no-cache curl

# Security: Configure Nginx to run as a non-root user
# 1. Update permissions for Nginx-related directories
# 2. Touch the PID file so nginx user can write to it
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

# Copy custom nginx config (already points to port 8080)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets and ensure ownership
COPY --from=builder /app/dist /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html

# Switch to non-root user
USER nginx

EXPOSE 8080

# Health check (updated to 8080)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD curl -f http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
