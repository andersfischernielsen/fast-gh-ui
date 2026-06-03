FROM node:26-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:26-alpine

WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev --ignore-scripts

ENV PORT=3333
EXPOSE 3333

USER node
CMD ["node", "build/index.js"]
