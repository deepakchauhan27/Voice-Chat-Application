import { useEffect } from "react";
import { socket } from "../services/socket";

export const useSocket = () => {
  useEffect(() => {
    if (!socket.connected) {
      console.log("🔌 Connecting socket...");
      socket.connect();
    }

    return () => {
      console.log("🔌 Disconnecting socket...");
    };
  }, []);

  return socket;
};
