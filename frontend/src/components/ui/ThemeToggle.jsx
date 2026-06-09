import { useTheme } from "../../hooks/useTheme";
import { MdLightMode, MdDarkMode } from "react-icons/md";
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="p-2 rounded-xl transition-all hover:bg-primary-100 dark:hover:bg-primary-900" title={theme === "light" ? "Dark mode" : "Light mode"}>
      {theme === "light" ? <MdDarkMode className="text-xl text-primary-600" /> : <MdLightMode className="text-xl text-yellow-400" />}
    </button>
  );
}
