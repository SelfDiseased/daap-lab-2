"use strict";

const amqp = require("amqplib");
const { initDB, savePlane } = require("./database");

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const QUEUE_NAME = "planes";

async function connectRabbitMQ(retries = 10) {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await amqp.connect(RABBITMQ_URL);
      console.log("[module2] Connected to RabbitMQ");
      return conn;
    } catch (err) {
      if (i < retries) {
        console.warn(
          `[module2] RabbitMQ not ready (${i}/${retries}): ${err.message}`,
        );
        await new Promise((r) => setTimeout(r, 5000));
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  await initDB();

  const conn = await connectRabbitMQ();
  const channel = await conn.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  channel.prefetch(1);

  console.log(`[module2] Waiting for messages on queue '${QUEUE_NAME}'...`);

  channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());
      console.log(`[module2] Received id=${data.id} model='${data.model}'`);
      await savePlane(data);
      channel.ack(msg);
    } catch (err) {
      console.error("[module2] Failed to process message:", err.message);
      channel.nack(msg, false, false);
    }
  });
}

main().catch((err) => {
  console.error("[module2] Fatal:", err);
  process.exit(1);
});
