# ---- build ----
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime ----
# Base image already ships the OS deps + browser binaries matching the
# playwright npm package version below, so `npm ci` skips re-downloading them.
FROM mcr.microsoft.com/playwright:v1.61.1-jammy AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

RUN chown -R pwuser:pwuser /app
USER pwuser

EXPOSE 3651
CMD ["node", "dist/main"]
