import { useEffect } from "react";
import { socket } from "../services/socket";

export const useSocket = () => {
  useEffect(() => {
    if (!socket.connected) {
      console.log("🔌 Connecting socket...");
      socket.connect();
    }

    return () => {
      // ❌ DO NOT disconnect here
      // socket.disconnect();
    };
  }, []);

  return socket;
};
