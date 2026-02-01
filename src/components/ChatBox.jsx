import { useState } from "react";

const ChatBox = ({ messages, sendMessage }) => {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(text);
    setText("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";

    // If it's already a formatted time string, return as is
    if (typeof timeString === "string" && timeString.includes(":")) {
      return timeString;
    }

    // If it's a Date object or timestamp
    try {
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch (e) {
      console.warn("Failed to parse time:", timeString);
    }

    return timeString || "";
  };

  return (
    <div className="flex flex-col h-96 bg-gray-900 rounded-lg p-4 mt-4">
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.map((m, i) => (
          <div key={i} className="text-sm">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-semibold text-indigo-400">{m.sender}</span>
              <span className="text-xs text-gray-500">
                ({m.role}) • {formatTime(m.time)}
              </span>
            </div>
            <div className="text-gray-300 ml-1 bg-gray-800 p-2 rounded">
              {m.text}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No messages yet. Start the conversation!
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-indigo-500"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
        />
        <button
          onClick={handleSend}
          className="bg-indigo-600 px-4 rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!text.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
