FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json files
COPY package.json .
COPY client/package.json client/
COPY server/package.json server/

# Install dependencies (including root definition)
# We need to install recursively.
# Since we are not using workspaces feature in root package.json (no "workspaces" key),
# we rely on the install:all script or manual installation.
RUN npm install
RUN cd client && npm install
RUN cd server && npm install

# Copy source
COPY . .

# Build Client
WORKDIR /app/client
RUN npm run build
# Output in /app/client/dist

# Build Server
WORKDIR /app/server
RUN npm run build
# Output in /app/server/dist (need to ensure tsconfig outDir)

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/server/dist /app/dist
COPY --from=builder /app/server/package.json /app/package.json
COPY --from=builder /app/server/node_modules /app/node_modules

# Copy Client Build to 'static' folder for Hono to serve
COPY --from=builder /app/client/dist /app/static

EXPOSE 3000

CMD ["node", "dist/index.js"]
