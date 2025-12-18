FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json files
COPY package.json .
COPY frontend/package.json frontend/
COPY backend/package.json backend/

# Install dependencies (including root definition)
# We need to install recursively.
# Since we are not using workspaces feature in root package.json (no "workspaces" key),
# we rely on the install:all script or manual installation.
RUN npm install
RUN cd frontend && npm install
RUN cd backend && npm install

# Copy source
COPY . .

# Build Frontend
WORKDIR /app/frontend
RUN npm run build
# Output in /app/frontend/dist

# Build Backend
WORKDIR /app/backend
RUN npm run build
# Output in /app/backend/dist (need to ensure tsconfig outDir)

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/backend/dist /app/dist
COPY --from=builder /app/backend/package.json /app/package.json
COPY --from=builder /app/backend/node_modules /app/node_modules

# Copy Frontend Build to 'static' folder for Hono to serve
COPY --from=builder /app/frontend/dist /app/static

EXPOSE 3000

CMD ["node", "dist/index.js"]
