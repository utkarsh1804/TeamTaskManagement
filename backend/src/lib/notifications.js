const lastReadAtByUser = new Map();

const getLastReadAt = (userId) => lastReadAtByUser.get(userId) || new Date(0);

const markRead = (userId) => {
  lastReadAtByUser.set(userId, new Date());
  return lastReadAtByUser.get(userId);
};

module.exports = {
  getLastReadAt,
  markRead,
};
