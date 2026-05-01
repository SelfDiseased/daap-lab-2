FROM node:20-alpine

WORKDIR /app

COPY module2/package*.json ./
RUN npm install --omit=dev

COPY module2/ .

CMD ["node", "consumer.js"]
