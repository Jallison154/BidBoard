# Debian-based (glibc), not Alpine: Vite 8 (rolldown) and esbuild (via tsx)
# ship platform-specific native bindings as npm optionalDependencies, which
# hits a known npm bug (npm/cli#4828) resolving musl (Alpine) variants.
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY server ./server

ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]
