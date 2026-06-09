import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import Layout from "./components/layout/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import DatasetPage from "./pages/DatasetPage";
import ForecastPage from "./pages/ForecastPage";
import ReportsPage from "./pages/ReportsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import MonitoringPage from "./pages/MonitoringPage";
import AnomalyPage from "./pages/AnomalyPage";
import SchedulePage from "./pages/SchedulePage";
import AlertsPage from "./pages/AlertsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import AIFeaturesPage from "./pages/AIFeaturesPage";
import ProjectsPage from "./pages/ProjectsPage";
import ScenarioPage from "./pages/ScenarioPage";
import CollaborationPage from "./pages/CollaborationPage";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import AIInsightsPage from "./pages/AIInsightsPage";
import AccuracyCenterPage from "./pages/AccuracyCenterPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:"var(--bg)" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-primary-600 font-medium text-sm">Loading…</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user?.is_admin && user?.role !== "super_admin") return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{
            style: { background:"#f0fdf4", border:"1px solid #bbf7d0", color:"#166534", fontFamily:"'DM Sans',sans-serif", fontSize:"14px" },
            success: { iconTheme: { primary:"#22c55e", secondary:"#f0fdf4" } },
            error: { style: { borderColor:"#fecaca", color:"#b91c1c", background:"#fef2f2" } },
          }} />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/executive" element={<ExecutiveDashboard />} />
                    <Route path="/datasets" element={<DatasetPage />} />
                    <Route path="/forecast" element={<ForecastPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/anomalies" element={<AnomalyPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/ai-features" element={<AIFeaturesPage />} />
                    <Route path="/ai-insights" element={<AIInsightsPage />} />
                    <Route path="/accuracy" element={<AccuracyCenterPage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/scenarios" element={<ScenarioPage />} />
                    <Route path="/collaboration" element={<CollaborationPage />} />
                    <Route path="/schedules" element={<SchedulePage />} />
                    <Route path="/alerts" element={<AlertsPage />} />
                    <Route path="/integrations" element={<IntegrationsPage />} />
                    <Route path="/monitoring" element={<MonitoringPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
