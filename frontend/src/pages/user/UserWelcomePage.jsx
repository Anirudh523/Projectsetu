import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { signOut } from 'firebase/auth';
import { getAuthService } from '../../lib/firebase';

export default function UserWelcomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  async function handleLogout() {
    try {
      const auth = getAuthService();
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Welcome back!</h2>
        <p className="text-gray-600">Ready to connect with your pen pal?</p>
      </div>

      <div className="grid gap-3 mb-8">
        <button
          onClick={() => navigate('/mailbox')}
          className="w-full border border-blue-600 text-blue-700 p-4 rounded-lg font-medium hover:bg-blue-50"
        >
          📬 View Mailbox
        </button>
        <button
          onClick={() => navigate('/write')}
          className="w-full bg-blue-600 text-white p-4 rounded-lg font-medium hover:bg-blue-700"
        >
          ✍️ Write a Letter
        </button>
      </div>

      <button
        onClick={handleLogout}
        className="w-full text-gray-600 p-3 rounded-lg hover:bg-gray-100"
      >
        Logout
      </button>
    </>
  );
}
