let users = [];
const ROOM_ID = "support-room";

export const addUser = ({ socketId, name, role }) => {
  users.push({
    socketId,
    name,
    role: role.toLowerCase(), // 🔥 FIX
    roomId: ROOM_ID
  });
};

export const removeUser = (socketId) => {
  users = users.filter((u) => u.socketId !== socketId);
};

export const getUser = (socketId) => {
  return users.find((u) => u.socketId === socketId);
};

export const getPairedUsers = () => {
  const customer = users.find((u) => u.role === "customer");
  const agent = users.find((u) => u.role === "agent");

  return customer && agent ? { customer, agent } : null;
};

export const getRoomId = () => ROOM_ID;

export const getUserCount = () => users.length;
