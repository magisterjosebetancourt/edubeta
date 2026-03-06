import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '@/pages/Home';
import LoginPage from '@/pages/Login';
import DashboardPage from '@/pages/Dashboard';
import StudentsPage from '@/pages/dashboard/Students';
import NewStudentFormPage from '@/pages/dashboard/students/NewStudentFormPage';
import EditStudentFormPage from '@/pages/dashboard/students/EditStudentFormPage';
import ImportStudentsPage from '@/pages/dashboard/students/ImportStudentsPage';
import TeachersPage from '@/pages/dashboard/Teachers';
import NewTeacherFormPage from '@/pages/dashboard/teachers/NewTeacherFormPage';
import EditTeacherFormPage from '@/pages/dashboard/teachers/EditTeacherFormPage';
import GradesPage from '@/pages/dashboard/Grades';
import NewGradeFormPage from '@/pages/dashboard/grades/NewGradeFormPage';
import EditGradeFormPage from '@/pages/dashboard/grades/EditGradeFormPage';
import SubjectsPage from '@/pages/dashboard/Subjects';
import NewSubjectFormPage from '@/pages/dashboard/subjects/NewSubjectFormPage';
import EditSubjectFormPage from '@/pages/dashboard/subjects/EditSubjectFormPage';
import AttendancePage from '@/pages/dashboard/Attendance';
import NewAttendanceFormPage from '@/pages/dashboard/attendance/NewAttendanceFormPage';
import TakingAttendancePage from '@/pages/dashboard/attendance/TakingAttendancePage';
import EditAttendanceSessionFormPage from '@/pages/dashboard/attendance/EditAttendanceSessionFormPage';
import AttendanceHistoryPage from '@/pages/dashboard/AttendanceHistory';
import SettingsPage from '@/pages/dashboard/Settings';
import AssignmentsPage from '@/pages/dashboard/Assignments';
import TeacherRegister from '@/pages/TeacherRegister';
import DashboardLayout from '@/components/DashboardLayout';
import MobileMenuPage from '@/pages/dashboard/MobileMenuPage';
import ProfilePage from '@/pages/dashboard/Profile';
import StudentView from '@/pages/dashboard/StudentView';
import InstitutionalInfo from '@/pages/dashboard/InstitutionalInfo';
import NeighborhoodsPage from '@/pages/dashboard/Neighborhoods';
import NewNeighborhoodFormPage from '@/pages/dashboard/neighborhoods/NewNeighborhoodFormPage';
import EditNeighborhoodFormPage from '@/pages/dashboard/neighborhoods/EditNeighborhoodFormPage';
import TodosPage from '@/pages/dashboard/Todos';
import NewTodoFormPage from '@/pages/dashboard/todos/NewTodoFormPage';
import EditTodoFormPage from '@/pages/dashboard/todos/EditTodoFormPage';
import InfractionsPage from '@/pages/dashboard/Infractions';
import InfractionFormPage from '@/pages/dashboard/infractions/InfractionFormPage';
import GroupStudentsListPage from '@/pages/dashboard/GroupStudentsList';
import AssignmentFormPage from '@/pages/dashboard/assignments/AssignmentFormPage';
import SchedulesPage from '@/pages/dashboard/Schedules';
import NewScheduleFormPage from '@/pages/dashboard/schedules/NewScheduleFormPage';
import EditScheduleFormPage from '@/pages/dashboard/schedules/EditScheduleFormPage';
import ObservadorList from '@/pages/dashboard/observations/ObservadorList';
import ObservadorForm from '@/pages/dashboard/observations/ObservadorForm';
import StudentDefenseForm from '@/pages/dashboard/observations/StudentDefenseForm';
import StudentObservationsPage from '@/pages/dashboard/observations/StudentObservationsPage';
import IsaPage from '@/pages/dashboard/IsaPage';
import IsaHistoryPage from '@/pages/dashboard/IsaHistoryPage';
import ListsPage from '@/pages/dashboard/documents/ListsPage';
import ReportsPage from '@/pages/dashboard/documents/ReportsPage';
import { Toaster } from "@/components/ui/sonner";
import { UserProfileProvider } from '@/lib/context/UserProfileContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, // 1 hora
      gcTime: 1000 * 60 * 60 * 24, // 24 horas (ex cacheTime)
      refetchOnWindowFocus: false, // Evita recargas redundantes al cambiar de pestaña
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProfileProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro-docente" element={<TeacherRegister />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/new" element={<NewStudentFormPage />} />
          <Route path="students/:id/edit" element={<EditStudentFormPage />} />
          <Route path="students/import" element={<ImportStudentsPage />} />
          <Route path="students/:id" element={<StudentView />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="teachers/new" element={<NewTeacherFormPage />} />
          <Route path="teachers/:id/edit" element={<EditTeacherFormPage />} />
          <Route path="grades" element={<GradesPage />} />
          <Route path="grades/new" element={<NewGradeFormPage />} />
          <Route path="grades/:id/edit" element={<EditGradeFormPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="subjects/new" element={<NewSubjectFormPage />} />
          <Route path="subjects/:id/edit" element={<EditSubjectFormPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="assignments/new" element={<AssignmentFormPage />} />
          <Route path="assignments/:id/edit" element={<AssignmentFormPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="attendance/new" element={<NewAttendanceFormPage />} />
          <Route path="attendance/taking/:gradeId/:subjectId/:date/:teacherId" element={<TakingAttendancePage />} />
          <Route path="attendance/session/edit" element={<EditAttendanceSessionFormPage />} />
          <Route path="history" element={<AttendanceHistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="institution" element={<InstitutionalInfo />} />
          <Route path="neighborhoods" element={<NeighborhoodsPage />} />
          <Route path="neighborhoods/new" element={<NewNeighborhoodFormPage />} />
          <Route path="neighborhoods/:id/edit" element={<EditNeighborhoodFormPage />} />
          <Route path="menu" element={<MobileMenuPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="todos" element={<TodosPage />} />
          <Route path="todos/new" element={<NewTodoFormPage />} />
          <Route path="todos/:id/edit" element={<EditTodoFormPage />} />
          <Route path="infractions" element={<InfractionsPage />} />
          <Route path="infractions/new" element={<InfractionFormPage />} />
          <Route path="infractions/:id/edit" element={<InfractionFormPage />} />
          <Route path="grades/:gradeId/students" element={<GroupStudentsListPage />} />
          <Route path="schedules" element={<SchedulesPage />} />
          <Route path="schedules/new" element={<NewScheduleFormPage />} />
          <Route path="schedules/:id/edit" element={<EditScheduleFormPage />} />
          <Route path="observations" element={<ObservadorList />} />
          <Route path="observations/new" element={<ObservadorForm />} />
          <Route path="observations/:id" element={<StudentDefenseForm />} />
          <Route path="students/:id/observations" element={<StudentObservationsPage />} />
          <Route path="isa" element={<IsaPage />} />
          <Route path="isa/history" element={<IsaHistoryPage />} />
          <Route path="documents/lists" element={<ListsPage />} />
          <Route path="documents/reports" element={<ReportsPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>        
        <Toaster />
      </Router>
      </UserProfileProvider>
    </QueryClientProvider>
  );
}

export default App;
