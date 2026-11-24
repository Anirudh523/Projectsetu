import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { reviewLetter } from '../../lib/api';
import { getAuthService, getFirestoreService } from '../../lib/firebase';

export default function OfficerQueuePage() {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const letters = collection(getFirestoreService(), 'letters');
    const queue = query(letters, where('status', '==', 'in_review'),
      orderBy('submittedAt', 'asc'), limit(50));
    return onSnapshot(queue, (snapshot) => {
      setLetters(snapshot.docs.map((letter) => ({ id: letter.id, ...letter.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Failed to load review queue:', err);
      setError(`Failed to load review queue: ${err.message}`);
      setLoading(false);
    });
  }, []);

  async function approve(letterId) {
    setError('');
    setApprovingId(letterId);
    try {
      await reviewLetter(letterId, 'approve');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve letter.');
    } finally {
      setApprovingId(null);
    }
  }

  async function logout() {
    try {
      await signOut(getAuthService());
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Failed to sign out.');
    }
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Letter Review Queue</h2>
        <p className="text-gray-600">Review each letter before approving it for delivery.</p>
      </div>
      {error && <div role="alert" className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded">{error}</div>}
      {loading ? (
        <p>Loading letters...</p>
      ) : letters.length === 0 && !error ? (
        <p className="bg-white rounded-lg p-6 shadow-sm">No letters awaiting review.</p>
      ) : (
        <div className="space-y-4">
          {letters.map((letter) => (
            <article key={letter.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500 mb-3">
                Pair: {letter.pairId} · Submitted: {letter.submittedAt?.toDate?.().toLocaleDateString() || 'Pending'}
              </p>
              <p className="text-gray-800 mb-4 whitespace-pre-wrap">{letter.body}</p>
              <button
                type="button"
                onClick={() => approve(letter.id)}
                disabled={approvingId !== null}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {approvingId === letter.id ? 'Approving...' : 'Approve letter'}
              </button>
            </article>
          ))}
        </div>
      )}
      <button type="button" onClick={logout} className="mt-6 text-gray-600 p-3 rounded-lg hover:bg-gray-100">
        Logout
      </button>
    </>
  );
}
