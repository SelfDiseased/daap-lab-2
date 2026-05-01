"use strict";

const path = require("path");
const grpc = require("@grpc/grpc-js");
const loader = require("@grpc/proto-loader");

const PROTO_PATH =
  process.env.PROTO_PATH ||
  path.resolve(__dirname, "..", "proto", "plane.proto");
const ADDRESS = process.argv[2] || "localhost:50051";

const pkgDef = loader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: Number,
  defaults: true,
  oneofs: true,
});
const { plane: planeProto } = grpc.loadPackageDefinition(pkgDef);
const stub = new planeProto.PlaneService(
  ADDRESS,
  grpc.credentials.createInsecure(),
);

const T = {
  FIGHTER: 0,
  ESCORT: 1,
  INTERCEPTOR: 2,
  RECONNAISSANCE: 3,
  SUPPORT: 4,
};

const PLANES = [
  // --- valid ---
  {
    model: "F-22 Raptor",
    origin: "USA",
    chars: [
      {
        type: T.FIGHTER,
        seats: 1,
        has_ammunition: true,
        ammunition: { missiles: 6 },
        has_radar: true,
      },
    ],
    parameters: { length: 18.92, width: 13.56, height: 5.08 },
    price: 150_000_000,
  },
  {
    model: "Su-27 Flanker",
    origin: "USSR",
    chars: [
      {
        type: T.FIGHTER,
        seats: 1,
        has_ammunition: true,
        ammunition: { missiles: 10 },
        has_radar: true,
      },
      {
        type: T.INTERCEPTOR,
        seats: 1,
        has_ammunition: true,
        ammunition: { missiles: 6 },
        has_radar: true,
      },
    ],
    parameters: { length: 21.94, width: 14.7, height: 5.93 },
    price: 35_000_000,
  },
  {
    model: "U-2 Dragon Lady",
    origin: "USA",
    chars: [
      {
        type: T.RECONNAISSANCE,
        seats: 1,
        has_ammunition: false,
        has_radar: true,
      },
    ],
    parameters: { length: 19.13, width: 31.39, height: 4.88 },
    price: 32_000_000,
  },
  {
    model: "A-10 Thunderbolt II",
    origin: "USA",
    chars: [
      {
        type: T.SUPPORT,
        seats: 1,
        has_ammunition: true,
        ammunition: { missiles: 4 },
        has_radar: false,
      },
    ],
    parameters: { length: 16.26, width: 17.53, height: 4.47 },
    price: 18_800_000,
  },
  {
    model: "F-14 Tomcat",
    origin: "USA",
    chars: [
      {
        type: T.ESCORT,
        seats: 2,
        has_ammunition: true,
        ammunition: { missiles: 8 },
        has_radar: true,
      },
    ],
    parameters: { length: 19.1, width: 19.55, height: 4.88 },
    price: 38_000_000,
  },
  // --- invalid (should be rejected) ---
  {
    model: "",
    origin: "Unknown", // empty model
    chars: [
      {
        type: T.FIGHTER,
        seats: 3, // seats=3 invalid
        has_ammunition: true,
        ammunition: { missiles: 15 },
        has_radar: false,
      },
    ], // missiles>10
    parameters: { length: -1, width: 0, height: 5 }, // negative/zero dimensions
    price: -100,
  },
  {
    model: "Recon-X",
    origin: "Testland",
    chars: [
      {
        type: T.RECONNAISSANCE,
        seats: 1,
        has_ammunition: true,
        ammunition: { missiles: 2 }, // recon + ammo invalid
        has_radar: true,
      },
    ],
    parameters: { length: 15, width: 10, height: 4 },
    price: 10_000_000,
  },
];

function sendPlane(plane) {
  return new Promise((resolve) => {
    stub.AddPlane(plane, (err, response) => {
      const label = (plane.model || "(empty)").padEnd(22);
      if (err) {
        console.log(`[ERR]  ${label} ${err.details}`);
        resolve(false);
      } else if (response.success) {
        console.log(`[OK]   ${label} id=${response.plane_id}`);
        resolve(true);
      } else {
        console.log(`[FAIL] ${label} ${response.message}`);
        resolve(false);
      }
    });
  });
}

async function main() {
  console.log(`Connecting to gRPC server at ${ADDRESS}\n`);
  let ok = 0,
    fail = 0;
  for (const plane of PLANES) {
    const success = await sendPlane(plane);
    success ? ok++ : fail++;
  }
  console.log(`\nResult: ${ok} accepted, ${fail} rejected/errored`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
