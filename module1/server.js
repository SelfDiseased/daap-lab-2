"use strict";

const path = require("path");
const grpc = require("@grpc/grpc-js");
const loader = require("@grpc/proto-loader");
const amqp = require("amqplib");
const { validatePlane } = require("./validator");

const PROTO_PATH =
  process.env.PROTO_PATH ||
  path.resolve(__dirname, "..", "proto", "plane.proto");
const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const GRPC_PORT = process.env.GRPC_PORT || "50051";
const QUEUE_NAME = "planes";

const pkgDef = loader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: Number,
  defaults: true,
  oneofs: true,
});
const { plane: planeProto } = grpc.loadPackageDefinition(pkgDef);

let mqChannel;

async function connectRabbitMQ(retries = 10) {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await amqp.connect(RABBITMQ_URL);
      mqChannel = await conn.createChannel();
      await mqChannel.assertQueue(QUEUE_NAME, { durable: true });
      console.log("[module1] Connected to RabbitMQ");
      return;
    } catch (err) {
      if (i < retries) {
        console.warn(
          `[module1] RabbitMQ not ready (${i}/${retries}): ${err.message}`,
        );
        await new Promise((r) => setTimeout(r, 5000));
      } else {
        throw err;
      }
    }
  }
}

function addPlane(call, callback) {
  const plane = call.request;
  const errors = validatePlane(plane);

  if (errors.length > 0) {
    const details = errors.join("; ");
    console.warn(`[module1] Rejected model='${plane.model}': ${details}`);
    return callback({ code: grpc.status.INVALID_ARGUMENT, details });
  }

  const planeId = crypto.randomUUID();
  const payload = {
    id: planeId,
    model: plane.model,
    origin: plane.origin,
    chars: (plane.chars ?? []).map((c) => ({
      type: c.type,
      seats: c.seats,
      has_ammunition: c.has_ammunition,
      missiles: c.has_ammunition ? (c.ammunition?.missiles ?? 0) : 0,
      has_radar: c.has_radar,
    })),
    parameters: {
      length: plane.parameters.length,
      width: plane.parameters.width,
      height: plane.parameters.height,
    },
    price: plane.price,
  };

  mqChannel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
  });
  console.log(`[module1] Published id=${planeId} model='${plane.model}'`);

  callback(null, {
    success: true,
    message: "Plane queued for storage",
    plane_id: planeId,
  });
}

async function main() {
  await connectRabbitMQ();

  const server = new grpc.Server();
  server.addService(planeProto.PlaneService.service, { AddPlane: addPlane });
  server.bindAsync(
    `0.0.0.0:${GRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    () => console.log(`[module1] gRPC server listening on port ${GRPC_PORT}`),
  );
}

main().catch((err) => {
  console.error("[module1] Fatal:", err);
  process.exit(1);
});
