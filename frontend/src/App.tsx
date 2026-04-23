import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Security from './pages/Security';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CandidatePortal from './pages/CandidatePortal';
import DashboardLayout from './layouts/DashboardLayout';
import PublicCareerPortal from './pages/PublicCareerPortal';
import JobApplicationFlow from './pages/JobApplicationFlow';
import CandidateStatusTracker from './pages/CandidateStatusTracker';
import CandidateAssessment from './pages/CandidateAssessment';
import HMPortal from './pages/HMPortal';
import PublicApply from './pages/PublicApply';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AppProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/security" element={<Security />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/portal/:id" element={<CandidatePortal />} />
            <Route path="/jobs/:tenantId" element={<PublicCareerPortal />} />
            <Route path="/jobs/:tenantId/:jobId/apply" element={<JobApplicationFlow />} />
            <Route path="/apply/:slug" element={<PublicApply />} />
            <Route path="/status/:token" element={<CandidateStatusTracker />} />
            <Route path="/assessment/:token" element={<CandidateAssessment />} />
            <Route path="/hm/:batchId" element={<HMPortal />} />
            <Route path="/app/*" element={<DashboardLayout />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
