# ---- build ----
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# 네이버 스포츠 API는 브라우저가 아닌 클라이언트에 응답하지 않아 헤드리스 Chromium으로
# 호출한다 (src/modules/scrape/infrastructure/scrapers/naver-browser.client.ts).
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium \
  && rm -rf /var/lib/apt/lists/*
ENV CHROMIUM_PATH=/usr/bin/chromium

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

RUN chown -R node:node /app
USER node

EXPOSE 3651
CMD ["node", "dist/main"]
