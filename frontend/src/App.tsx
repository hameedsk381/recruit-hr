import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DashboardLayout from './layouts/DashboardLayout';


/**
 * talentacquisition.ai - Recruiter Decision Interface
 * 
 * CORE SCREENS:
 * 1. Landing - Public marketing page
 * 2. Auth - Login/Signup
 * 3. Dashboard - The main app (Job Setup, Shortlist, Detail)
 */

function App() {
  return (
    <Router>
      <AppProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected App Routes */}
          <Route path="/app/*" element={<DashboardLayout />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProvider>
    </Router>
  );
}

export default App;
