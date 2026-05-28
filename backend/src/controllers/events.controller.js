const jwt = require("jsonwebtoken");
const events = require("../lib/events");

const HEARTBEAT_MS = 25000;

// EventSource cannot set an Authorization header, so the access token is
// accepted from the query string here (falling back to header/cookie).
const stream = (req, res) => {
  let token = req.query.token || null;
  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token || !process.env.JWT_SECRET) {
    return res
      .status(401)
      .json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res
      .status(401)
      .json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const userId = payload.id;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    // no-transform stops the global compression middleware from buffering SSE
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  events.addClient(userId, res);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      // ignore; close handler will clean up
    }
  }, HEARTBEAT_MS);

  req.on("close", () => {
    clearInterval(heartbeat);
    events.removeClient(userId, res);
  });
};

module.exports = { stream };
