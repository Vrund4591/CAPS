import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CreateGroup from './pages/CreateGroup';
import MyGroup from './pages/MyGroup';
import './App.css';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get user data
      fetchUserData(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (token) => {
    try {
      const response = await fetch('http://localhost:5001/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
    }
    setLoading(false);
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#FFFFF4'}}>
        <div className="bg-white p-8 rounded-2xl shadow-lg border-4 border-black">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 font-bold text-gray-800">Loading CAPS...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ToastProvider>
        <NotificationProvider>
          <div className="min-h-screen" style={{backgroundColor: '#FFFFF4'}}>
            <Routes>
              <Route 
                path="/" 
                element={
                  user ? (
                    <Navigate to={`/${user.role.toLowerCase()}-dashboard`} replace />
                  ) : (
                    <LandingPage onLogin={handleLogin} />
                  )
                } 
              />
              
              <Route 
                path="/student-dashboard" 
                element={
                  user && user.role === 'STUDENT' ? (
                    <StudentDashboard user={user} onLogout={handleLogout} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                } 
              />
              
              <Route 
                path="/faculty-dashboard" 
                element={
                  user && user.role === 'FACULTY' ? (
                    <FacultyDashboard user={user} onLogout={handleLogout} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                } 
              />
              
              <Route 
                path="/admin-dashboard" 
                element={
                  user && user.role === 'ADMIN' ? (
                    <AdminDashboard user={user} onLogout={handleLogout} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                } 
              />

              <Route 
                path="/create-group" 
                element={
                  user && user.role === 'STUDENT' ? (
                    <CreateGroup user={user} onLogout={handleLogout} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                } 
              />

              <Route 
                path="/my-group" 
                element={
                  user && user.role === 'STUDENT' ? (
                    <MyGroup user={user} onLogout={handleLogout} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                } 
              />
            </Routes>
          </div>
        </NotificationProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;