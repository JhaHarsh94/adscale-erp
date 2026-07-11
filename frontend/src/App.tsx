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
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import HrmsPage from "./pages/HrmsPage";
import PayrollPage from "./pages/PayrollPage";
import UsersPage from "./pages/UsersPage";
import RecruitmentPage from "./pages/RecruitmentPage";
import SetupPage from "./pages/SetupPage";
import ClientLoginPage from "./pages/ClientLoginPage";
import ClientDashboardPage from "./pages/ClientDashboardPage";
import ClientProjectsPage from "./pages/ClientProjectsPage";
import ClientTicketsPage from "./pages/ClientTicketsPage";
import ClientFilesPage from "./pages/ClientFilesPage";
import ClientApprovalsPage from "./pages/ClientApprovalsPage";
import ClientMeetingNotesPage from "./pages/ClientMeetingNotesPage";
import ClientProtectedRoute from "./routes/ClientProtectedRoute";
import ClientLayout from "./components/layout/ClientLayout";
import ClientUsersPage from "./pages/ClientUsersPage";
import SeoPage from "./pages/SeoPage";
import SocialMediaPage from "./pages/SocialMediaPage";
import LeadStudioPage from "./pages/LeadStudioPage";
import GoogleAdsPage from "./pages/GoogleAdsPage";
import MetaAdsPage from "./pages/MetaAdsPage";
import AnalyticsPage from "./pages/AnalyticsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/client/login" element={<ClientLoginPage />} />
      <Route path="/review/:type/:token" element={<CommercialReviewPage />} />

      <Route element={<ClientProtectedRoute />}>
        <Route element={<ClientLayout />}>
          <Route path="/client/dashboard" element={<ClientDashboardPage />} />
          <Route path="/client/projects" element={<ClientProjectsPage />} />
          <Route path="/client/tickets" element={<ClientTicketsPage />} />
          <Route path="/client/files" element={<ClientFilesPage />} />
          <Route path="/client/approvals" element={<ClientApprovalsPage />} />
          <Route path="/client/meetings" element={<ClientMeetingNotesPage />} />
        </Route>
      </Route>

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
          <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="/hrms" element={<HrmsPage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/recruitment" element={<RecruitmentPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/client-users" element={<ClientUsersPage />} />
          <Route path="/seo" element={<SeoPage />} />
          <Route path="/social-media" element={<SocialMediaPage />} />
          <Route path="/lead-studio" element={<LeadStudioPage />} />
          <Route path="/google-ads" element={<GoogleAdsPage />} />
          <Route path="/meta-ads" element={<MetaAdsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
