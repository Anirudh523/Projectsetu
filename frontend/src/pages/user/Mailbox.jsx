import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { getFirestoreService } from '../../lib/firebase';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { STRINGS } from '../../lib/strings';

export default function Mailbox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const db = getFirestoreService();
    let stopLetterListeners = () => {};
    let currentPairId = Symbol('initial');

    function handleError(err) {
      const message = err instanceof Error ? err.message : String(err);
      setLetters([]);
      setError(`Failed to load mailbox: ${message}`);
      setLoading(false);
      console.error('Firestore error loading letters:', err);
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (profile) => {
      const pairId = profile.data()?.pairId;
      if (pairId === currentPairId) return;
      currentPairId = pairId;
      stopLetterListeners();
      setLetters([]);
      setError('');

      if (!pairId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const lettersRef = collection(db, 'letters');
      const queries = [
        query(lettersRef, where('pairId', '==', pairId), where('recipientUid', '==', user.uid),
          where('status', '==', 'approved'), orderBy('submittedAt', 'desc'), limit(50)),
        query(lettersRef, where('pairId', '==', pairId), where('authorUid', '==', user.uid),
          where('status', '==', 'returned'), orderBy('submittedAt', 'desc'), limit(50)),
      ];
      const results = [null, null];
      let failed = false;
      const unsubscribers = queries.map((letterQuery, index) => onSnapshot(
        letterQuery,
        (snapshot) => {
          if (failed) return;
          results[index] = snapshot.docs.map((letter) => ({ id: letter.id, ...letter.data() }));
          if (results.every((result) => result !== null)) {
            setLetters(results.flat().sort((a, b) =>
              (b.submittedAt?.toMillis?.() || 0) - (a.submittedAt?.toMillis?.() || 0)
            ).slice(0, 50));
            setLoading(false);
          }
        },
        (err) => {
          failed = true;
          handleError(err);
        }
      ));
      stopLetterListeners = () => unsubscribers.forEach((stop) => stop());
    }, handleError);

    return () => {
      unsubscribe();
      stopLetterListeners();
    };
  }, [user]);

  function getStatusBadge(status) {
    const badges = {
      approved: 'bg-green-100 text-green-700',
      returned: 'bg-yellow-100 text-yellow-700',
      in_review: 'bg-blue-100 text-blue-700',
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <button
          onClick={() => navigate('/welcome')}
          className="text-blue-600 hover:underline mb-4"
        >
          ← Back to Welcome
        </button>
        <h2 className="text-2xl font-bold mb-2">Your Mailbox</h2>
        <p className="text-gray-600">Messages from your pen pal</p>
      </div>

      {error && (
        <div role="alert" className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded">
          {error}
        </div>
      )}

      {!error && (letters.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center shadow-sm mb-6">
          <p className="text-gray-600 mb-4">No letters yet. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {letters.map((letter) => (
            <div key={letter.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(letter.status)}`}
                  >
                    {STRINGS[letter.status] || letter.status}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(letter.submittedAt?.toDate?.() || letter.submittedAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-gray-800 mb-3 whitespace-pre-wrap">{letter.body}</p>

              {letter.status === 'returned' && letter.returnNote && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                  <p className="font-medium text-yellow-900 mb-1">Officer's Note:</p>
                  <p className="text-yellow-800">{letter.returnNote}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      <button
        onClick={() => navigate('/write')}
        className="w-full bg-blue-600 text-white p-4 rounded-lg font-medium hover:bg-blue-700"
      >
        ✍️ Write a Letter
      </button>
    </>
  );
}
