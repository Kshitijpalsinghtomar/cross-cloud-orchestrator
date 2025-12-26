FROM node:20-slim

WORKDIR /app

COPY package*.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/core/package.json ./packages/core/
COPY packages/adapters/package.json ./packages/adapters/
COPY packages/database/package.json ./packages/database/
# Copy other packages if needed, but for now just enough to install deps

# We need to copy everything to build because of monorepo structure
COPY . .

RUN npm install
RUN npm run build

EXPOSE 3000

CMD ["node", "packages/api/dist/server.js"]
