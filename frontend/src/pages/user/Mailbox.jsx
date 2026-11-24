export default function Mailbox({ sent, onBack, onWriteLetter }) {
  // Load or subscribe to authorized letter data here once the approved account
  // and pair are available. The mailbox owns loading, empty, and error states.
  // Replace the demo status with the stored status and clean up any listener.
  return (
    <>
      <button onClick={onBack} className="text-blue-600 mt-6 mb-6">
        ← Back to Welcome
      </button>
      <div className="bg-white rounded-xl p-6 shadow-sm mb-5">
        <h2 className="text-xl font-semibold mb-2">Your Mailbox</h2>
        <p className="text-gray-600">
          {sent
            ? "Demo status: In review"
            : "No letters yet. Start by writing your first letter!"}
        </p>
      </div>
      <button onClick={onWriteLetter}
        className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium">
        Write a Letter
      </button>
    </>
  );
}
