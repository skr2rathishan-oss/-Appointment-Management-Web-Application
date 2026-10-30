FROM node:24-alpine AS base
WORKDIR /app
COPY package*.json ./

# --- Development: Vite dev server with HMR, source is bind-mounted by compose ---
FROM base AS development
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# --- Build static assets ---
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# --- Production: nginx serves the SPA and proxies /api to the server ---
FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
