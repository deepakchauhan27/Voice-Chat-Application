import { useState } from "react";

const UserForm = ({ onJoin }) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Customer");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="w-full max-w-md bg-gray-900 rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Join Voice Call
        </h1>

        <input
          className="w-full p-3 mb-4 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Your Name"
          onChange={(e) => setName(e.target.value)}
        />

        <select
          className="w-full p-3 mb-6 rounded bg-gray-800 border border-gray-700"
          onChange={(e) => setRole(e.target.value)}
        >
          <option>Customer</option>
          <option>Agent</option>
        </select>

        <button
          onClick={() => onJoin(name, role)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 transition py-3 rounded font-semibold"
        >
          Join Call
        </button>
      </div>
    </div>
  );
};

export default UserForm;
