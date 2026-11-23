import { useState } from "react";
import SecurityLoginPage from "./pages/security/SecurityLoginPage.jsx";
import SecurityRegisterPage from "./pages/security/SecurityRegisterPage.jsx";
import Mailbox from "./pages/user/Mailbox.jsx";
import UserLoginPage from "./pages/user/UserLoginPage.jsx";
import UserRegisterPage from "./pages/user/UserRegisterPage.jsx";
import UserWelcomePage from "./pages/user/UserWelcomePage.jsx";
import WriteLetterPage from "./pages/user/WriteLetterPage.jsx";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState("login");
  const [letter, setLetter] = useState("");
  const [sent, setSent] = useState(false);

  function handleLogin() {
    setLoggedIn(true);
    setPage("welcome");
  }

  function handleLogout() {
    setLoggedIn(false);
    setPage("login");
    setLetter("");
    setSent(false);
  }

  function handleSend() {
    setSent(true);
    setLetter("");
    setPage("mailbox");
  }

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
