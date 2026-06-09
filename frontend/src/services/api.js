import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => api.post("/api/auth/register", data),
  login: (data) => api.post("/api/auth/login", data),
  me: () => api.get("/api/auth/me"),
  permissions: () => api.get("/api/auth/me/permissions"),
  updateMe: (data) => api.patch("/api/auth/me", data),
  changePassword: (data) => api.post("/api/auth/change-password", data),
};

export const datasetsAPI = {
  list: (params) => api.get("/api/datasets/", { params }),
  get: (id) => api.get(`/api/datasets/${id}`),
  preview: (id) => api.get(`/api/datasets/${id}/preview`),
  upload: (formData) => api.post("/api/datasets/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  delete: (id) => api.delete(`/api/datasets/${id}`),
};

export const forecastsAPI = {
  list: (params) => api.get("/api/forecasts/", { params }),
  get: (id) => api.get(`/api/forecasts/${id}`),
  create: (data) => api.post("/api/forecasts/", data),
  delete: (id) => api.delete(`/api/forecasts/${id}`),
  getModels: () => api.get("/api/forecasts/models"),
  compare: (params) => api.post("/api/forecasts/compare", null, { params }),
  retrain: (id) => api.post(`/api/forecasts/${id}/retrain`),
};

export const dashboardAPI = {
  stats: (params) => api.get("/api/dashboard/stats", { params }),
  activity: (params) => api.get("/api/dashboard/activity", { params }),
  realtime: () => api.get("/api/dashboard/realtime"),
};

export const reportsAPI = {
  downloadExcel: (id) => api.get(`/api/reports/${id}/excel`, { responseType: "blob" }),
  downloadPDF: (id) => api.get(`/api/reports/${id}/pdf`, { responseType: "blob" }),
  getInsights: (id) => api.get(`/api/reports/${id}/insights`),
};

export const notificationsAPI = {
  list: (params) => api.get("/api/notifications/", { params }),
  unreadCount: () => api.get("/api/notifications/unread-count"),
  markRead: (id) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch("/api/notifications/mark-all-read"),
  delete: (id) => api.delete(`/api/notifications/${id}`),
};

export const adminAPI = {
  stats: () => api.get("/api/admin/stats"),
  users: (params) => api.get("/api/admin/users", { params }),
  toggleActive: (id) => api.patch(`/api/admin/users/${id}/toggle-active`),
  toggleAdmin: (id) => api.patch(`/api/admin/users/${id}/toggle-admin`),
  updateRole: (id, role) => api.patch(`/api/admin/users/${id}/role`, null, { params: { role } }),
  deleteUser: (id) => api.delete(`/api/admin/users/${id}`),
  getRoles: () => api.get("/api/admin/roles"),
  datasets: (params) => api.get("/api/admin/datasets", { params }),
  forecasts: (params) => api.get("/api/admin/forecasts", { params }),
};

export const analyticsAPI = {
  regionWise: (params) => api.get("/api/analytics/region-wise", { params }),
  categoryWise: (params) => api.get("/api/analytics/category-wise", { params }),
  revenuePrediction: (params) => api.get("/api/analytics/revenue-prediction", { params }),
  inventoryRisk: (params) => api.get("/api/analytics/inventory-risk", { params }),
  globalSearch: (q) => api.get("/api/analytics/global-search", { params: { q } }),
};

export const monitoringAPI = {
  activityLogs: (params) => api.get("/api/monitoring/activity-logs", { params }),
  userActivity: (userId, params) => api.get(`/api/monitoring/user-activity/${userId}`, { params }),
  performance: (params) => api.get("/api/monitoring/performance", { params }),
  forecastHistory: (params) => api.get("/api/monitoring/forecast-history", { params }),
};

export const anomalyAPI = {
  detect: (data) => api.post("/api/anomalies/detect", data),
  list: () => api.get("/api/anomalies/"),
  get: (id) => api.get(`/api/anomalies/${id}`),
};

export const scheduleAPI = {
  list: () => api.get("/api/schedules/"),
  get: (id) => api.get(`/api/schedules/${id}`),
  create: (data) => api.post("/api/schedules/", data),
  toggle: (id) => api.patch(`/api/schedules/${id}/toggle`),
  runNow: (id) => api.post(`/api/schedules/${id}/run-now`),
  delete: (id) => api.delete(`/api/schedules/${id}`),
};

export const alertsAPI = {
  listConfigs: () => api.get("/api/alerts/configs"),
  createConfig: (data) => api.post("/api/alerts/configs", data),
  toggleConfig: (id) => api.patch(`/api/alerts/configs/${id}/toggle`),
  deleteConfig: (id) => api.delete(`/api/alerts/configs/${id}`),
  checkAlert: (id) => api.post(`/api/alerts/configs/${id}/check`),
  getLogs: () => api.get("/api/alerts/logs"),
  markLogRead: (id) => api.patch(`/api/alerts/logs/${id}/read`),
};

export const integrationsAPI = {
  list: () => api.get("/api/integrations/"),
  get: (id) => api.get(`/api/integrations/${id}`),
  create: (data) => api.post("/api/integrations/", data),
  toggle: (id) => api.patch(`/api/integrations/${id}/toggle`),
  test: (id) => api.post(`/api/integrations/${id}/test`),
  getLogs: (id) => api.get(`/api/integrations/${id}/logs`),
  delete: (id) => api.delete(`/api/integrations/${id}`),
};

export const aiAPI = {
  recommendations: (params) => api.get("/api/ai/recommendations", { params }),
  buyingBehavior: (params) => api.get("/api/ai/buying-behavior", { params }),
  demandSpikes: (params) => api.get("/api/ai/demand-spikes", { params }),
  lowStock: (params) => api.get("/api/ai/low-stock", { params }),
  inventoryOptimization: (params) => api.get("/api/ai/inventory-optimization", { params }),
};

export const widgetsAPI = {
  list: () => api.get("/api/widgets/"),
  create: (data) => api.post("/api/widgets/", data),
  update: (id, data) => api.patch(`/api/widgets/${id}`, data),
  delete: (id) => api.delete(`/api/widgets/${id}`),
  reset: () => api.post("/api/widgets/reset"),
  getTypes: () => api.get("/api/widgets/types"),
};

export default api;

export const projectsAPI = {
  list: (params) => api.get("/api/projects/", { params }),
  get: (id) => api.get(`/api/projects/${id}`),
  create: (data) => api.post("/api/projects/", data),
  update: (id, data) => api.patch(`/api/projects/${id}`, data),
  delete: (id) => api.delete(`/api/projects/${id}`),
  archive: (id) => api.patch(`/api/projects/${id}/archive`),
  activity: (id) => api.get(`/api/projects/${id}/activity`),
};

export const scenariosAPI = {
  list: () => api.get("/api/scenarios/"),
  get: (id) => api.get(`/api/scenarios/${id}`),
  create: (data) => api.post("/api/scenarios/", data),
  update: (id, data) => api.patch(`/api/scenarios/${id}`, data),
  delete: (id) => api.delete(`/api/scenarios/${id}`),
  compare: (ids) => api.post("/api/scenarios/compare", ids),
};

export const collaborationAPI = {
  getComments: (forecastId) => api.get(`/api/collaboration/forecasts/${forecastId}/comments`),
  addComment: (forecastId, data) => api.post(`/api/collaboration/forecasts/${forecastId}/comments`, data),
  updateComment: (commentId, data) => api.patch(`/api/collaboration/comments/${commentId}`, data),
  deleteComment: (commentId) => api.delete(`/api/collaboration/comments/${commentId}`),
  getRevisions: (forecastId) => api.get(`/api/collaboration/forecasts/${forecastId}/revisions`),
  shareReport: (forecastId, days) => api.post(`/api/collaboration/forecasts/${forecastId}/share`, null, { params: { expires_days: days } }),
  getShares: (forecastId) => api.get(`/api/collaboration/forecasts/${forecastId}/shares`),
  getSharedReport: (token) => api.get(`/api/collaboration/shared/${token}`),
};

export const intelligenceAPI = {
  executiveDashboard: (period) => api.get("/api/intelligence/executive-dashboard", { params: { period } }),
  aiInsights: (datasetId) => api.get("/api/intelligence/ai-insights", { params: { dataset_id: datasetId } }),
  accuracyCenter: () => api.get("/api/intelligence/accuracy-center"),
  generateReport: (params) => api.post("/api/intelligence/executive-reports", null, { params }),
  listReports: () => api.get("/api/intelligence/executive-reports"),
  getReport: (id) => api.get(`/api/intelligence/executive-reports/${id}`),
  datasetVersions: (id) => api.get(`/api/intelligence/datasets/${id}/versions`),
};
