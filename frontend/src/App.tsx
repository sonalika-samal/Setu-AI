import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Workers from './pages/Workers';
import Departments from './pages/Departments';
import Owners from './pages/Owners';
import WebhookLogs from './pages/WebhookLogs';
import MessageLogs from './pages/MessageLogs';
import ErrorLogs from './pages/ErrorLogs';
import Analytics from './pages/Analytics';
import AIChat from './pages/AIChat';
import SecurityLogs from './pages/SecurityLogs';
import Credentials from './pages/Credentials';
import Settings from './pages/Settings';
import DepartmentDetails from './pages/DepartmentDetails';
import ProofGallery from './pages/ProofGallery';
import SuperAdmin from './pages/SuperAdmin';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Protected Route Wrapper
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication */}
          <Route path="/login" element={<Login />} />

          {/* Protected Control Panel Pages */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/superadmin" element={<SuperAdmin />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/departments/:id" element={<DepartmentDetails />} />
            <Route path="/proof-gallery" element={<ProofGallery />} />
            <Route path="/owners" element={<Owners />} />
            <Route path="/webhook-logs" element={<WebhookLogs />} />
            <Route path="/message-logs" element={<MessageLogs />} />
            <Route path="/error-logs" element={<ErrorLogs />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ai-chat" element={<AIChat />} />
            <Route path="/security-logs" element={<SecurityLogs />} />
            <Route path="/credentials" element={<Credentials />} />
            <Route path="/settings" element={<Settings />} />
          </Route>


          {/* Fallback routing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer position="top-right" autoClose={3500} theme="colored" />
    </AuthProvider>
  );
};
export default App;
