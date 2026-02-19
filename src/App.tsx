import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/Home';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import StudentsPage from './pages/dashboard/Students';
import TeachersPage from './pages/dashboard/Teachers';
import GradesPage from './pages/dashboard/Grades';
import SubjectsPage from './pages/dashboard/Subjects';
import AttendancePage from './pages/dashboard/Attendance';
import SettingsPage from './pages/dashboard/Settings';
import AssignmentsPage from './pages/dashboard/Assignments';
import TeacherRegister from './pages/TeacherRegister';
import DashboardLayout from './components/DashboardLayout';
import MobileMenuPage from './pages/dashboard/MobileMenuPage';
import ProfilePage from './pages/dashboard/Profile';
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro-docente" element={<TeacherRegister />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="grades" element={<GradesPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="menu" element={<MobileMenuPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
