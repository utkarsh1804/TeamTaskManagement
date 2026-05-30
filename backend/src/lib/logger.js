// Lightweight structured (JSON-line) logger. A drop-in seam for pino/Sentry:
// swap the `emit` implementation to forward to a real sink later.

const emit = (level, msg, meta = {}) => {
  const entry = { level, time: new Date().toISOString(), msg, ...meta };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

const info = (msg, meta) => emit("info", msg, meta);
const warn = (msg, meta) => emit("warn", msg, meta);
const error = (msg, meta) => emit("error", msg, meta);

module.exports = { info, warn, error };
