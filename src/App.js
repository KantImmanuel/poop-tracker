import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import BottomNav from './components/BottomNav';
import OfflineIndicator from './components/OfflineIndicator';
import Home from './pages/Home';
import Landing from './pages/Landing';
import LogMeal from './pages/LogMeal';
import History from './pages/History';
import Insights from './pages/Insights';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { initDB } from './services/offlineStorage';
import { setupOnlineListener } from './services/syncService';
import './App.css';

function HomeOrLanding() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return (
    <>
      <Home />
      <BottomNav />
    </>
  );
}

function App() {
  useEffect(() => {
    // Initialize offline database and listeners
    initDB().catch(console.error);
    setupOnlineListener();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <OfflineIndicator />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={<HomeOrLanding />}
          />
          <Route
            path="/log-meal"
            element={
              <ProtectedRoute>
                <LogMeal />
                <BottomNav />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
                <BottomNav />
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <Insights />
                <BottomNav />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
