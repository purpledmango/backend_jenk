FROM node:20-alpine

WORKDIR /app

COPY pakage*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.js"]

