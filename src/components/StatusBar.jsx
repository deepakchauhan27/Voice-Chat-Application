const StatusBar = ({ status }) => {
  const color =
    status === "Connected"
      ? "text-green-400"
      : status === "Connecting"
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="text-center mb-2">
      <p className={`font-medium ${color}`}>Status: {status}</p>
    </div>
  );
};

export default StatusBar;
