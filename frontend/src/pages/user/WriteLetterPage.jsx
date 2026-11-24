import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { getFirestoreService } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { submitLetter } from '../../lib/api';
import { containsPii } from '../../lib/pii';
import { saveDraft, getDraft, deleteDraft } from '../../lib/draftStore';
import { LIMITS, STRINGS } from '../../lib/strings';

export default function WriteLetterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pairId, setPairId] = useState('');
  const [pairLoading, setPairLoading] = useState(true);
  const [hasPii, setHasPii] = useState(false);

  // Load user's pair ID on mount
  useEffect(() => {
    if (!user) return;

    async function loadPairId() {
      try {
        const db = getFirestoreService();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data()?.pairId) {
          setPairId(userDoc.data().pairId);
        }
      } catch (err) {
        console.error('Error loading pair ID:', err);
        setError('Failed to load your pair information');
      } finally {
        setPairLoading(false);
      }
    }

    loadPairId();
  }, [user]);

  // Load draft on mount or when pairId changes
  useEffect(() => {
    if (pairId) {
      const draft = getDraft(pairId);
      if (draft) {
        setBody(draft.body);
      }
    }
  }, [pairId]);

  // Check for PII as user types
  useEffect(() => {
    setHasPii(containsPii(body));
  }, [body]);

  // Auto-save draft
  useEffect(() => {
    if (pairId && body.trim()) {
      const timer = setTimeout(() => {
        saveDraft(pairId, body);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [body, pairId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!pairId.trim()) {
      setError('You are not paired with anyone yet. Please contact an administrator.');
      return;
    }

    if (!body.trim()) {
      setError('Please write a letter');
      return;
    }

    if (body.trim().length < LIMITS.letterMinChars) {
      setError(STRINGS.letterTooShort);
      return;
    }

    if (body.trim().length > LIMITS.letterMaxChars) {
      setError(STRINGS.letterTooLong);
      return;
    }

    if (hasPii) {
      setError(STRINGS.piiBlocked);
      return;
    }

    setLoading(true);

    try {
      await submitLetter(pairId, body);
      deleteDraft(pairId);
      setBody('');
      navigate('/mailbox');
    } catch (err) {
      const message = err instanceof Error ? err.message : STRINGS.errorSubmitting;
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (pairLoading) {
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
          onClick={() => navigate('/mailbox')}
          className="text-blue-600 hover:underline mb-4"
        >
          ← Back to Mailbox
        </button>
        <h2 className="text-2xl font-bold mb-2">Write a Letter</h2>
        <p className="text-gray-600">Share your thoughts with your pen pal</p>
      </div>

      {error && (
        <div role="alert" className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded">
          {error}
        </div>
      )}

      {!pairId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-6 text-sm text-yellow-700">
          <p className="font-medium mb-1">⚠️ Not Paired Yet</p>
          <p>You need to be paired with a pen pal before you can write letters. Please contact an administrator to set this up.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {pairId && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            <p className="font-medium">📮 Pair ID: <code className="bg-white px-2 py-1 rounded">{pairId}</code></p>
          </div>
        )}

        <div>
          <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-2">
            Letter ({body.length}/{LIMITS.letterMaxChars} characters)
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Dear pen pal, I wanted to share..."
            rows={12}
            className="w-full border border-gray-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-sm"
            disabled={loading || !pairId}
            maxLength={LIMITS.letterMaxChars}
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum {LIMITS.letterMinChars} characters. Contact information (emails, phone numbers, addresses) is not allowed.
          </p>
        </div>

        {hasPii && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
            ⚠️ Your letter contains contact information that must be removed before sending.
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/mailbox')}
            className="flex-1 border border-gray-300 text-gray-700 p-3 rounded-lg font-medium hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !body.trim() || hasPii}
            className="flex-1 bg-blue-600 text-white p-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Submit for Review'}
          </button>
        </div>
      </form>
    </>
  );
}
