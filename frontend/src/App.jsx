import { useState } from "react";
import SecurityLoginPage from "./pages/security/SecurityLoginPage.jsx";
import SecurityRegisterPage from "./pages/security/SecurityRegisterPage.jsx";
import Mailbox from "./pages/user/Mailbox.jsx";
import UserLoginPage from "./pages/user/UserLoginPage.jsx";
import UserRegisterPage from "./pages/user/UserRegisterPage.jsx";
import UserWelcomePage from "./pages/user/UserWelcomePage.jsx";
import WriteLetterPage from "./pages/user/WriteLetterPage.jsx";

// When Firebase is configured, import Auth, Firestore, and Functions from one
// shared SDK module (e.g. ./firebase.js) so every screen uses the same project.
function App() {
  // Replace the demo session flag with an Auth listener here so every screen
  // shares session state. Start in a loading state and unsubscribe on unmount.
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState("login");
  const [letter, setLetter] = useState("");
  const [sent, setSent] = useState(false);

  // With Firebase, derive the next screen from the session and account access
  // state below instead of opening Welcome as soon as the form succeeds.
  function handleLogin() {
    setLoggedIn(true);
    setPage("welcome");
  }

  // Call Firebase signOut here so logout ends the session as well as clearing
  // the draft and mailbox state owned by App.
  function handleLogout() {
    setLoggedIn(false);
    setPage("login");
    setLetter("");
    setSent(false);
  }

  // Call the protected submitLetter function here because App owns the draft
  // and navigation. Use the authorized pair and confirmed callable contract.
  // Clear the draft and open the mailbox only after success.
  function handleSend() {
    setSent(true);
    setLetter("");
    setPage("mailbox");
  }

  // Keep account gates here so both sign-in pages lead through the same checks.
  // While loading, wait. For unverified users, show a verification screen that
  // can resend the email and reload the user and token after verification.
  // Then use server-provided approval and role to show Pending Approval or the
  // allowed area. Firestore rules and callable functions enforce access.
  if (!loggedIn) {
    switch (page) {
      case "register":
        return <UserRegisterPage onSignIn={() => setPage("login")} />;
      case "security-login":
        return (
          <SecurityLoginPage
            onRegister={() => setPage("security-register")}
            onUserSignIn={() => setPage("login")}
          />
        );
      case "security-register":
        return <SecurityRegisterPage onSignIn={() => setPage("security-login")} />;
      default:
        return (
          <UserLoginPage
            onLogin={handleLogin}
            onRegister={() => setPage("register")}
            onSecuritySignIn={() => setPage("security-login")}
          />
        );
    }
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
        {page === "welcome" && (
          <UserWelcomePage
            onViewMailbox={() => setPage("mailbox")}
            onWriteLetter={() => setPage("write")}
          />
        )}
        {page === "mailbox" && (
          <Mailbox sent={sent} onBack={() => setPage("welcome")} onWriteLetter={() => setPage("write")} />
        )}
        {page === "write" && (
          <WriteLetterPage
            letter={letter}
            onLetterChange={setLetter}
            onBack={() => setPage("mailbox")}
            onSend={handleSend}
          />
        )}
      </main>
    </div>
  );
}

export default App;
