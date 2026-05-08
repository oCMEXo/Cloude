# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# install all deps (including dev) for compiling TS
COPY package*.json ./
RUN npm ci

# copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# prune dev deps so we can copy node_modules to the runtime stage
RUN npm prune --omit=dev

# ---- runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# non-root user for safety
RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --chown=app:app package.json ./

USER app
EXPOSE 3001

# simple healthcheck against /health
HEALTHCHECK --interval=15s --timeout=3s --retries=3 --start-period=10s \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
