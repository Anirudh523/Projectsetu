import { useState } from "react";

export default function UserRegisterPage({ onSignIn }) {
  const [submitted, setSubmitted] = useState(false);

  function handleRegister(e) {
    e.preventDefault();
    // Start account creation and request email verification here, where the
    // form can report errors. If sending fails after creation, offer a resend.
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <section className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-3xl font-bold text-blue-700 mb-2">User Registration</h1>
        <p className="text-gray-600 mb-6">Demo registration for pen pals. Use test details only.</p>
        {submitted ? (
          <p role="status" className="text-gray-700">
            Demo complete. No account was created or verification email sent.
          </p>
        ) : (
          <form onSubmit={handleRegister}>
            <label htmlFor="register-email" className="block mb-1">Email</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              className="w-full border p-3 rounded-lg mb-3"
              required
            />
            <label htmlFor="register-password" className="block mb-1">Password</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              className="w-full border p-3 rounded-lg mb-4"
              required
            />
            <button className="w-full bg-blue-600 text-white p-3 rounded-lg">
              Try Demo Registration
            </button>
          </form>
        )}
        <button type="button" onClick={onSignIn} className="text-blue-700 underline mt-4">
          Back to User Sign In
        </button>
      </section>
    </main>
  );
}
