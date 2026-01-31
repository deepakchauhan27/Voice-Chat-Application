import { useState } from "react";

const ChatBox = ({ messages, sendMessage }) => {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(text);
    setText("");
  };

  return (
    <div className="flex flex-col h-96 bg-gray-900 rounded-lg p-4 mt-4">
      <div className="flex-1 overflow-y-auto space-y-2 mb-3">
        {messages.map((m, i) => (
          <div key={i} className="text-sm">
            <span className="font-semibold text-indigo-400">
              {m.sender} ({m.role})
            </span>
            <span className="text-gray-300">: {m.text}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
        />
        <button
          onClick={handleSend}
          className="bg-indigo-600 px-4 rounded hover:bg-indigo-700"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
