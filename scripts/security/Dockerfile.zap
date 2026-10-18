FROM node:24-bookworm-slim
RUN apt-get update
RUN apt-get install -y --no-install-recommends python3 make g++
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
RUN npm_config_build_from_source=true npm rebuild sqlite3
RUN node -e "require('sqlite3')"
COPY backend/config ./config
COPY backend/database ./database
COPY backend/middleware ./middleware
COPY backend/routes ./routes
COPY backend/security ./security
COPY backend/seeds ./seeds
COPY backend/services ./services
COPY backend/utils ./utils
COPY backend/scripts/lib ./scripts/lib
COPY backend/server.js ./server.js
COPY scripts/security/zap-stand.cjs /app/scripts/security/zap-stand.cjs
USER node
CMD ["node", "/app/scripts/security/zap-stand.cjs"]
