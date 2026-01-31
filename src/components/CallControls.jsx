const CallControls = ({ onEnd }) => {
  return (
    <div className="flex justify-center mt-4">
      <button
        onClick={onEnd}
        className="bg-red-600 hover:bg-red-700 transition px-6 py-3 rounded-lg font-semibold"
      >
        End Call
      </button>
    </div>
  );
};

export default CallControls;
