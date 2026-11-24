import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getAuthService } from '../../lib/firebase';

export default function UserLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const auth = getAuthService();
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/welcome');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm"
      >
        <h1 className="text-3xl font-bold text-blue-700 mb-2">Student/Pal Sign In</h1>
        <p className="text-gray-500 mb-6">Connect with your pen pal on Setu</p>

        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            required
            disabled={loading}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            required
            disabled={loading}
          />
        </div>

        {error && (
          <div role="alert" className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div className="mt-6 space-y-2">
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-medium">
              Register as Student
            </Link>
          </p>
          <p className="text-center text-sm text-gray-600">
            <Link to="/register" className="text-blue-600 hover:underline font-medium">
              Register as Pen Pal
            </Link>
          </p>
          <p className="text-center text-sm text-gray-600">
            <Link to="/security/login" className="text-green-600 hover:underline font-medium">
              Safety Officer Sign In
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
