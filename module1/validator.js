"use strict";

const RECONNAISSANCE = 3;

function validatePlane(plane) {
  const errors = [];

  if (!plane.model?.trim()) {
    errors.push("Model name cannot be empty");
  }

  if (!plane.origin?.trim()) {
    errors.push("Origin country cannot be empty");
  }

  if (!plane.chars || plane.chars.length === 0) {
    errors.push("At least one characteristic (chars) is required");
  }

  for (let i = 0; i < (plane.chars ?? []).length; i++) {
    const char = plane.chars[i];
    const prefix = `chars[${i}]`;

    if (char.seats !== 1 && char.seats !== 2) {
      errors.push(`${prefix}: seats must be 1 or 2, got ${char.seats}`);
    }

    if (char.type === RECONNAISSANCE && char.has_ammunition) {
      errors.push(`${prefix}: reconnaissance plane cannot carry ammunition`);
    }

    if (char.has_ammunition) {
      const missiles = char.ammunition?.missiles ?? 0;
      if (missiles < 0 || missiles > 10) {
        errors.push(
          `${prefix}: missiles must be in range [0, 10], got ${missiles}`,
        );
      }
    }
  }

  const p = plane.parameters;
  if (!p || p.length <= 0) errors.push("Parameters.length must be positive");
  if (!p || p.width <= 0) errors.push("Parameters.width must be positive");
  if (!p || p.height <= 0) errors.push("Parameters.height must be positive");

  if (plane.price <= 0) {
    errors.push("Price must be positive");
  }

  return errors;
}

module.exports = { validatePlane };
