// Lightweight in-process SSE hub. Maps userId -> set of open response streams.
// A single user may have multiple tabs open, hence a Set per user.

const subscribers = new Map();

const addClient = (userId, res) => {
  let set = subscribers.get(userId);
  if (!set) {
    set = new Set();
    subscribers.set(userId, set);
  }
  set.add(res);
};

const removeClient = (userId, res) => {
  const set = subscribers.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) subscribers.delete(userId);
};

const sendToUser = (userId, event, data) => {
  const set = subscribers.get(userId);
  if (!set || set.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      // stream already closed; cleanup happens on the 'close' handler
    }
  }
};

const sendToUsers = (userIds, event, data) => {
  const unique = new Set((userIds || []).filter(Boolean));
  for (const userId of unique) sendToUser(userId, event, data);
};

module.exports = { addClient, removeClient, sendToUser, sendToUsers };
