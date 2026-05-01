"use strict";

const { Pool } = require("pg");

const PLANE_TYPE_NAMES = {
  0: "FIGHTER",
  1: "ESCORT",
  2: "INTERCEPTOR",
  3: "RECONNAISSANCE",
  4: "SUPPORT",
};

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/planes_db",
});

async function waitForDB(retries = 10) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query("SELECT 1");
      console.log("[module2] Connected to PostgreSQL");
      return;
    } catch (err) {
      if (i < retries) {
        console.warn(
          `[module2] DB not ready (${i}/${retries}): ${err.message}`,
        );
        await new Promise((r) => setTimeout(r, 5000));
      } else {
        throw err;
      }
    }
  }
}

async function initDB() {
  await waitForDB();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS planes (
      id         VARCHAR(36)  PRIMARY KEY,
      model      VARCHAR(255) NOT NULL,
      origin     VARCHAR(255) NOT NULL,
      length_m   FLOAT        NOT NULL,
      width_m    FLOAT        NOT NULL,
      height_m   FLOAT        NOT NULL,
      price      FLOAT        NOT NULL,
      created_at TIMESTAMPTZ  DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plane_chars (
      id             SERIAL      PRIMARY KEY,
      plane_id       VARCHAR(36) REFERENCES planes(id) ON DELETE CASCADE,
      type           VARCHAR(50),
      seats          INTEGER,
      has_ammunition BOOLEAN,
      missiles       INTEGER     DEFAULT 0,
      has_radar      BOOLEAN
    )
  `);
  console.log("[module2] Database tables ready");
}

async function savePlane(data) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO planes (id, model, origin, length_m, width_m, height_m, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.id,
        data.model,
        data.origin,
        data.parameters.length,
        data.parameters.width,
        data.parameters.height,
        data.price,
      ],
    );

    for (const char of data.chars ?? []) {
      await client.query(
        `INSERT INTO plane_chars (plane_id, type, seats, has_ammunition, missiles, has_radar)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          data.id,
          PLANE_TYPE_NAMES[char.type] ?? "UNKNOWN",
          char.seats,
          char.has_ammunition,
          char.missiles ?? 0,
          char.has_radar,
        ],
      );
    }

    await client.query("COMMIT");
    console.log(
      `[module2] Saved id=${data.id} model='${data.model}' (${data.chars?.length ?? 0} chars)`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { initDB, savePlane };
