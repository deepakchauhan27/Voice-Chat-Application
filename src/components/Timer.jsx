import { useEffect, useState } from "react";

const Timer = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <p className="text-center text-sm text-gray-400">
      Call Duration: {seconds}s
    </p>
  );
};

export default Timer;
