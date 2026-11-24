import { useState } from "react";

export default function SecurityLoginPage({ onRegister, onUserSignIn }) {
  const [result, setResult] = useState(null);

  function handleLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // Replace the demo credential check with Firebase signInWithEmailAndPassword
    // here for inline form feedback. App should use the trusted role to decide access.
    const matchesDemo = form.get("email") === "officer@test.com"
      && form.get("password") === "demo-officer";
    setResult(matchesDemo ? "success" : "error");
  }

  return (
    <main className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <section className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-3xl font-bold text-blue-700 mb-2">Safety Officer Sign In</h1>
        <p className="text-gray-600 mb-6">Demo only. Use the test credentials below.</p>

        {result === "success" ? (
          <p role="status" className="text-gray-700">
            Demo sign-in complete. Officer tools are unavailable in this prototype.
          </p>
        ) : (
          <form onSubmit={handleLogin}>
            <label htmlFor="officer-email" className="block mb-1">Email</label>
            <input id="officer-email" name="email" type="email" required
              className="w-full border p-3 rounded-lg mb-3" />
            <label htmlFor="officer-password" className="block mb-1">Password</label>
            <input id="officer-password" name="password" type="password" required
              className="w-full border p-3 rounded-lg mb-4" />
            {result === "error" && (
              <p role="alert" className="text-red-600 mb-3">Use the demo email and password shown below.</p>
            )}
            <button className="w-full bg-blue-600 text-white p-3 rounded-lg">Try Demo Sign In</button>
            <p className="text-xs text-gray-600 mt-4">Demo: officer@test.com / demo-officer</p>
          </form>
        )}

        <div className="flex flex-col items-start gap-2 mt-4">
          <button type="button" onClick={onRegister} className="text-blue-700 underline">
            Safety Officer Registration
          </button>
          <button type="button" onClick={onUserSignIn} className="text-blue-700 underline">
            Back to User Sign In
          </button>
        </div>
      </section>
    </main>
  );
}
