export default function RoleBadge({ role }) {
  const config = { super_admin: { label: "Super Admin", className: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300" }, analyst: { label: "Analyst", className: "badge-info" }, viewer: { label: "Viewer", className: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" } };
  const { label, className } = config[role] || config["viewer"];
  return <span className={`badge ${className}`}>{label}</span>;
}
