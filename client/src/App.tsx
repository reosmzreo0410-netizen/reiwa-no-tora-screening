import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ApplyPage from './pages/ApplyPage';
import QuestionsPage from './pages/QuestionsPage';
import CompletePage from './pages/CompletePage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminApplicantsPage from './pages/AdminApplicantsPage';
import AdminApplicantDetailPage from './pages/AdminApplicantDetailPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Navigate to="/apply" replace />} />
          <Route path="/apply" element={<ApplyPage />} />
          <Route path="/apply/questions" element={<QuestionsPage />} />
          <Route path="/apply/complete" element={<CompletePage />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/applicants" element={<AdminApplicantsPage />} />
          <Route path="/admin/applicants/:id" element={<AdminApplicantDetailPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
