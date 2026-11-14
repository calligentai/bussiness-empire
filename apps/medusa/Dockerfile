FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN chmod +x docker-entrypoint.sh \
  && DATABASE_URL=postgres://build:build@127.0.0.1:5432/build \
     JWT_SECRET=build \
     COOKIE_SECRET=build \
     npx medusa build \
  && mkdir -p .medusa/server/src/data \
  && cp src/data/catalog.json .medusa/server/src/data/catalog.json
ENV NODE_ENV=production
EXPOSE 9000
ENTRYPOINT ["./docker-entrypoint.sh"]
