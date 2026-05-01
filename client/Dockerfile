FROM node:20-alpine

WORKDIR /app

COPY client/package*.json ./
RUN npm install --omit=dev

COPY proto/  ./proto/
COPY client/ .

ENV PROTO_PATH=/app/proto/plane.proto

CMD ["node", "client.js", "module1:50051"]
