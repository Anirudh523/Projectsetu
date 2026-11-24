import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initFirebase } from './lib/firebase';
import { AuthProvider, useAuth } from './lib/AuthContext';

// Pages
import UserLoginPage from './pages/user/UserLoginPage';
import UserRegisterPage from './pages/user/UserRegisterPage';
import UserWelcomePage from './pages/user/UserWelcomePage';
import Mailbox from './pages/user/Mailbox';
import WriteLetterPage from './pages/user/WriteLetterPage';
import SecurityLoginPage from './pages/security/SecurityLoginPage';
import SecurityRegisterPage from './pages/security/SecurityRegisterPage';
import OfficerQueuePage from './pages/security/OfficerQueuePage';

// Loading component
function LoadingPage() {
  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Protected route component
function ProtectedRoute({ children, role: requiredRole }) {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) return <LoadingPage />;

  if (!isAuthenticated) {
    return <Navigate to={requiredRole === 'officer' ? '/security/login' : '/login'} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <MainLayout><p role="alert">This page is available only to safety officers.</p></MainLayout>;
  }

  return <>{children}</>;
}

// Main app layout
function MainLayout({ children }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-700">Setu</h1>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
          </div>
        )}
      </header>
      <main className="max-w-2xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) return <LoadingPage />;

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<UserLoginPage />} />
      <Route path="/register" element={<UserRegisterPage />} />
      <Route path="/security/login" element={<SecurityLoginPage />} />
      <Route path="/security/register" element={<SecurityRegisterPage />} />

      {/* Protected Routes */}
      <Route
        path="/officer/queue"
        element={
          <ProtectedRoute role="officer">
            <MainLayout>
              <OfficerQueuePage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/welcome"
        element={
          <ProtectedRoute>
            {role === 'officer' ? <Navigate to="/officer/queue" replace /> : (
              <MainLayout>
                <UserWelcomePage />
              </MainLayout>
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/mailbox"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Mailbox />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/write"
        element={
          <ProtectedRoute>
            <MainLayout>
              <WriteLetterPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to={isAuthenticated ? '/welcome' : '/login'} replace />} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    initFirebase().then(() => setFirebaseReady(true));
  }, []);

  if (!firebaseReady) {
    return <LoadingPage />;
  }

  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
