import { useState } from "react";

export default function UserLoginPage({ onLogin, onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleLogin(e) {
    e.preventDefault();

    if (email === "student@test.com" && password === "password123") {
      onLogin();
    } else {
      setError("Invalid email or password");
    }
  }

  return (
    <main className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <form onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-3xl font-bold text-blue-700 mb-2">User Sign In</h1>
        <p className="text-gray-500 mb-6">Connect with your pen pal on Setu</p>
        <input
          type="email"
          aria-label="Email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-3 rounded-lg mb-3"
          required
        />
        <input
          type="password"
          aria-label="Password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-3 rounded-lg mb-4"
          required
        />
        {error && <p role="alert" className="text-red-600 mb-3">{error}</p>}
        <button className="w-full bg-blue-600 text-white p-3 rounded-lg">
          Sign In
        </button>
        <p className="text-xs text-gray-600 mt-4">
          Demo: student@test.com / password123
        </p>
        <button type="button" onClick={onRegister} className="text-blue-700 underline mt-4">
          Register as a pen pal
        </button>
      </form>
    </main>
  );
}
