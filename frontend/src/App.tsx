import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import EmployeeProfilePage from "./pages/EmployeeProfilePage";
import ProtectedRoute from "./routes/ProtectedRoute";
import SetupGuard from "./routes/SetupGuard";
import AdminLayout from "./components/layout/AdminLayout";
import AttendancePage from "./pages/AttendancePage";
import LeaveManagementPage from "./pages/LeaveManagementPage";
import CrmPage from "./pages/CrmPage";
import OrganizationPage from "./pages/OrganizationPage";
import CommercialPage from "./pages/CommercialPage";
import CommercialReviewPage from "./pages/CommercialReviewPage";
import ProjectsPage from "./pages/ProjectsPage";
import TicketsPage from "./pages/TicketsPage";
import TasksPage from "./pages/TasksPage";
import WorkLogsPage from "./pages/WorkLogsPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import FilesPage from "./pages/FilesPage";
import ChatPage from "./pages/ChatPage";
import MeetingsPage from "./pages/MeetingsPage";
import MeetingManagementPage from "./pages/MeetingManagementPage";
import UsersPage from "./pages/UsersPage";
import SetupPage from "./pages/SetupPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/review/:type/:token" element={<CommercialReviewPage />} />

      <Route element={<SetupGuard />}>
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/organization/departments"
            element={<OrganizationPage defaultView="departments" />}
          />
          <Route
            path="/organization/teams"
            element={<OrganizationPage defaultView="teams" />}
          />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/:id" element={<EmployeeProfilePage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/leave-management" element={<LeaveManagementPage />} />
          <Route path="/crm" element={<CrmPage />} />
          <Route path="/commercial" element={<CommercialPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/worklogs" element={<WorkLogsPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/meeting-management" element={<MeetingManagementPage />} />
          <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
