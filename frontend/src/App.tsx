import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import EmployeeProfilePage from "./pages/EmployeeProfilePage";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminLayout from "./components/layout/AdminLayout";
import AttendancePage from "./pages/AttendancePage";
import LeaveManagementPage from "./pages/LeaveManagementPage";
import CrmPage from "./pages/CrmPage";
import OrganizationPage from "./pages/OrganizationPage";
import CommercialPage from "./pages/CommercialPage";
import CommercialReviewPage from "./pages/CommercialReviewPage";
import ProjectsPage from "./pages/ProjectsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/review/:type/:token" element={<CommercialReviewPage />} />

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
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
