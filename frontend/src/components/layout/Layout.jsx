import Sidebar from "./Sidebar";
import NotificationBell from "../notifications/NotificationBell";
import GlobalSearch from "../ui/GlobalSearch";
import ThemeToggle from "../ui/ThemeToggle";
import { useRealtime } from "../../hooks/useRealtime";
import { MdCircle } from "react-icons/md";
export default function Layout({ children }) {
  const { realtimeStats, lastUpdated } = useRealtime(30000);
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/60 dark:bg-black/40 backdrop-blur-sm border-b border-primary-100 dark:border-primary-900 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300">
          <div className="w-10 md:hidden" />
          <div className="hidden md:flex items-center gap-2"><GlobalSearch /></div>
          <div className="flex items-center gap-2 ml-auto">
            {realtimeStats?.forecasts_running > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/50 px-2.5 py-1 rounded-lg">
                <MdCircle className="text-primary-500 text-xs animate-pulse" />{realtimeStats.forecasts_running} running
              </div>
            )}
            {lastUpdated && <div className="hidden lg:block text-xs text-primary-400">Updated {lastUpdated.toLocaleTimeString()}</div>}
            <ThemeToggle />
            <NotificationBell />
            <div className="text-xs text-primary-500 hidden sm:block">{new Date().toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" })}</div>
          </div>
        </header>
        <main className="flex-1 overflow-auto scrollbar-thin">
          <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
