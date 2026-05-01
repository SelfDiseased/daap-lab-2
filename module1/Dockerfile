FROM node:20-alpine

WORKDIR /app

COPY module1/package*.json ./
RUN npm install --omit=dev

COPY proto/  ./proto/
COPY module1/ .

ENV PROTO_PATH=/app/proto/plane.proto

CMD ["node", "server.js"]
