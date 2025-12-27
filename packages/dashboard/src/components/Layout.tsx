import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Play, Activity, LogOut, Moon, Sun, Globe, Cloud } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useTheme } from '../context/ThemeContext';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Play, label: 'Workflows', path: '/submit' },
        { icon: Activity, label: 'System Health', path: '/health' },
        { icon: Globe, label: 'Global Network', path: '/network' },
    ];

    return (
        <div className="min-h-screen flex bg-[var(--bg-app)] text-[var(--text-main)] font-sans transition-colors duration-300">
            {/* Sidebar */}
            <aside className="w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-main)] flex flex-col fixed inset-y-0 z-20 shadow-sm transition-colors duration-300">
                {/* Logo Area */}
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <Cloud className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="font-bold text-lg tracking-tight text-[var(--text-main)] block leading-tight">
                                Cross-Cloud<span className="text-[var(--primary-600)]">.Orch</span>
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-medium tracking-wider uppercase">Beta v1.0</span>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={clsx(
                                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm font-medium",
                                    isActive
                                        ? "bg-[var(--primary-50)] text-[var(--primary-700)]"
                                        : "text-[var(--text-muted)] hover:bg-[var(--neutral-bg)] hover:text-[var(--text-main)]"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className={clsx("w-4 h-4", isActive ? "text-[var(--primary-600)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-main)]")} />
                                    <span>{item.label}</span>
                                </div>
                                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary-600)]" />}
                            </button>
                        );
                    })}
                </nav>

                {/* User Footer */}
                <div className="p-4 border-t border-[var(--border-main)] space-y-4">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--neutral-bg)] text-xs font-medium text-[var(--text-muted)] transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            <span>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
                        </div>
                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${theme === 'dark' ? 'bg-[var(--primary-600)]' : 'bg-slate-300'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </button>

                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--neutral-bg)] transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] font-bold text-xs">
                            AD
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-main)] truncate">Admin User</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">admin</p>
                        </div>
                        <LogOut className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--error-text)] transition-colors" />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen bg-[var(--bg-app)]">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        {children}
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
