import { useState } from "react";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // need to connect to firebase auth in backend; mock credentials for now
  function handleLogin(e) {
  e.preventDefault();

  if (email === "student@test.com" && password === "password123") {
    alert("Login successful!");
  } else {
    alert("Invalid credentials");
  }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-md w-80">
        <h1 className="text-2xl font-bold mb-6">Project Setu</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-3 rounded mb-3"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-3 rounded mb-4"
          required
        />

        <button className="w-full bg-blue-600 text-white p-3 rounded">
          Sign In
        </button>
      </form>
    </div>
  );
}

export default App;