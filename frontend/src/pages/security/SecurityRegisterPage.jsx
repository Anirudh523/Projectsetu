import { useState } from "react";

export default function SecurityRegisterPage({ onSignIn }) {
  const [submitted, setSubmitted] = useState(false);

  function handleRegister(e) {
    e.preventDefault();
    // Start the backend-approved officer onboarding flow here so the form can
    // report errors. Verification confirms email ownership. Officer access
    // requires a trusted admin to grant the role.
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <section className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-3xl font-bold text-blue-700 mb-2">Safety Officer Registration</h1>
        <p className="text-gray-600 mb-6">Demo registration for safety officers. Use test details only.</p>
        {submitted ? (
          <p role="status" className="text-gray-700">
            Demo complete. No account was created or verification email sent.
          </p>
        ) : (
          <form onSubmit={handleRegister}>
            <label htmlFor="officer-register-email" className="block mb-1">Email</label>
            <input
              id="officer-register-email"
              type="email"
              autoComplete="email"
              className="w-full border p-3 rounded-lg mb-3"
              required
            />
            <label htmlFor="officer-register-password" className="block mb-1">Password</label>
            <input
              id="officer-register-password"
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
          Back to Safety Officer Sign In
        </button>
      </section>
    </main>
  );
}
