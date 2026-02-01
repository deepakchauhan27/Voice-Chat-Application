import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import CallRoom from "./pages/CallRoom";
import { useSocket } from "./hooks/useSocket";
import { useState } from "react";

function App() {
  const socket = useSocket();
  const [user, setUser] = useState(null);

  const joinCall = (name, role) => {
    // ❌ DO NOT EMIT JOIN HERE
    setUser({ name, role });
  };

  return (
    <Routes>
      <Route path="/" element={<Home onJoin={joinCall} />} />

      <Route
        path="/call"
        element={
          user ? <CallRoom socket={socket} user={user} /> : <Navigate to="/" />
        }
      />
    </Routes>
  );
}

export default App;
