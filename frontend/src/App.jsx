import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import Discover from './pages/Discover';
import Notifications from './pages/Notifications';

const Spinner = () => (
  <div className="h-screen w-full flex items-center justify-center bg-black">
    <div className="animate-spin h-10 w-10 border-4 border-yellow-400 border-t-transparent rounded-full" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <Router>
      <ToastContainer
        theme="dark"
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        pauseOnHover
      />
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
        <Route path="/verify-otp" element={<AuthRoute><VerifyOTP /></AuthRoute>} />

        {/* Protected Routes inside Layout */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Feed />} />
          <Route path="profile" element={<Profile />} />
          <Route path="user/:email" element={<UserProfile />} />
          <Route path="discover" element={<Discover />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
