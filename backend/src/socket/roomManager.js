let users = [];
let roomId = "support-room";

export const addUser = ({ socketId, name, role }) => {
  users.push({ socketId, name, role, roomId });
};

export const removeUser = (socketId) => {
  users = users.filter((u) => u.socketId !== socketId);
};

export const getUser = (socketId) => {
  return users.find((u) => u.socketId === socketId);
};

export const getPairedUsers = () => {
  const customer = users.find((u) => u.role === "Customer");
  const agent = users.find((u) => u.role === "Agent");
  return customer && agent ? { customer, agent } : null;
};

export const getRoomId = () => roomId;
