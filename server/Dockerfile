FROM node:24-alpine AS base
WORKDIR /app
COPY package*.json ./

# --- Development: hot reload via nodemon, source is bind-mounted by compose ---
FROM base AS development
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev:docker"]

# --- Production: runtime dependencies only, non-root user ---
FROM base AS production
ENV NODE_ENV=production
RUN npm ci --omit=dev
COPY . .
USER node
EXPOSE 5000
CMD ["node", "src/server.js"]
