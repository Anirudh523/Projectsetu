export default function WriteLetterPage({ letter, onLetterChange, onBack, onSend }) {
  // Keep the draft and submit handler in App. Render submission progress and
  // errors here so the writer can retry without losing the draft.
  return (
    <>
      <button onClick={onBack} className="text-blue-600 mt-6 mb-6">
        ← Back to Mailbox
      </button>
      <h2 className="text-2xl font-bold mb-4">Write a Letter</h2>
      <p className="text-gray-600 mb-4">Demo only. Letters are never sent.</p>
      <textarea
        aria-label="Letter"
        value={letter}
        onChange={(e) => onLetterChange(e.target.value)}
        placeholder="Dear pen pal..."
        rows={10}
        className="w-full bg-white border rounded-xl p-4"
      />
      <button
        disabled={!letter.trim()}
        onClick={onSend}
        className="mt-4 w-full bg-blue-600 text-white p-3 rounded-lg disabled:opacity-50"
      >
        Send for Review
      </button>
    </>
  );
}
