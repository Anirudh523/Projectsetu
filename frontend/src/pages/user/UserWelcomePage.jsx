export default function UserWelcomePage({ onViewMailbox, onWriteLetter }) {
  return (
    <>
      <h2 className="text-3xl font-bold mt-8 mb-2">Welcome back!</h2>
      <p className="text-gray-600 mb-8">Ready to connect with your pen pal?</p>
      <div className="grid gap-3">
        <button onClick={onViewMailbox}
          className="w-full border border-blue-600 text-blue-700 p-3 rounded-lg font-medium">
          View Mailbox
        </button>
        <button onClick={onWriteLetter}
          className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium">
          Write a Letter
        </button>
      </div>
    </>
  );
}
