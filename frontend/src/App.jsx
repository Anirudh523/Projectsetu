
import { useState } from "react";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState("home");
  const [letter, setLetter] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function handleLogin(e) {
    e.preventDefault();

    if (email === "student@test.com" && password === "password123") {
      setLoggedIn(true);
      setError("");
    } else {
      setError("Invalid email or password");
    }
  }

  function handleLogout() {
    setLoggedIn(false);
    setEmail("");
    setPassword("");
    setPage("home");
    setLetter("");
    setSent(false);
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin}
          className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
          <h1 className="text-3xl font-bold text-blue-700 mb-2">Setu</h1>
          <p className="text-gray-500 mb-6">Connecting students through letters</p>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-3 rounded-lg mb-3"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-3 rounded-lg mb-4"
            required
          />

          {error && <p className="text-red-500 mb-3">{error}</p>}

          <button className="w-full bg-blue-600 text-white p-3 rounded-lg">
            Sign In
          </button>

          <p className="text-xs text-gray-400 mt-4">
            Demo: student@test.com / password123
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-700">Setu</h1>
        <button onClick={handleLogout} className="text-gray-600 hover:text-red-500">
          Logout
        </button>
      </header>

      <main className="max-w-xl mx-auto p-6">
        {page === "home" ? (
          <>
            <h2 className="text-3xl font-bold mt-8 mb-2">
              Welcome back!
            </h2>
            <p className="text-gray-600 mb-8">
              Ready to connect with your pen pal?
            </p>

            <div className="bg-white rounded-xl p-6 shadow-sm mb-5">
              <h3 className="text-xl font-semibold mb-2">Your Mailbox</h3>
              <p className="text-gray-500">
                {sent
                  ? "Your letter is in review!"
                  : "No letters yet. Start by writing your first letter!"}
              </p>
            </div>

            <button
              onClick={() => setPage("write")}
              className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium"
            >
              Write a Letter
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setPage("home")}
              className="text-blue-600 mt-6 mb-6"
            >
              ← Back to Mailbox
            </button>

            <h2 className="text-2xl font-bold mb-4">Write a Letter</h2>

            <textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              placeholder="Dear pen pal..."
              rows={10}
              className="w-full bg-white border rounded-xl p-4"
            />

            <button
              disabled={!letter.trim()}
              onClick={() => {
                setSent(true);
                setLetter("");
                setPage("home");
              }}
              className="mt-4 w-full bg-blue-600 text-white p-3 rounded-lg disabled:opacity-50"
            >
              Send for Review
            </button>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
