import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowRight, Lock } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            navigate('/');
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-4 transition-colors duration-300">
            <div className="w-full max-w-sm bg-[var(--bg-panel)] rounded-2xl shadow-xl border border-[var(--border-main)] overflow-hidden card-shadow">
                {/* Header */}
                <div className="bg-[var(--neutral-bg)] p-8 text-center border-b border-[var(--border-subtle)]">
                    <div className="w-12 h-12 bg-[var(--primary-600)] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[var(--primary-100)] dark:shadow-none mx-auto mb-4">
                        <Globe className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl font-bold text-[var(--text-main)] tracking-tight">Welcome back</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Sign in to Cross-Cloud Orchestrator</p>
                </div>

                {/* Form */}
                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-main)] uppercase tracking-wide mb-1.5">Email Address</label>
                            <input
                                type="email"
                                defaultValue="admin@cross-cloud.io"
                                className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg px-4 py-2.5 text-[var(--text-main)] text-sm focus:ring-2 focus:ring-[var(--primary-600)]/20 focus:border-[var(--primary-600)] outline-none transition-all placeholder-[var(--text-muted)]"
                                placeholder="name@company.com"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-xs font-semibold text-[var(--text-main)] uppercase tracking-wide">Password</label>
                                <a href="#" className="text-xs text-[var(--primary-600)] hover:text-[var(--primary-700)] font-medium">Forgot?</a>
                            </div>
                            <input
                                type="password"
                                defaultValue="password"
                                className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg px-4 py-2.5 text-[var(--text-main)] text-sm focus:ring-2 focus:ring-[var(--primary-600)]/20 focus:border-[var(--primary-600)] outline-none transition-all"
                            />
                        </div>

                        <button
                            disabled={loading}
                            className="w-full bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white font-semibold py-2.5 rounded-lg shadow-md shadow-[var(--primary-100)] dark:shadow-none flex items-center justify-center gap-2 transition-all mt-6"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Sign In <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-center">
                        <p className="text-xs text-[var(--text-muted)]">
                            Don't have an account? <a href="#" className="text-[var(--primary-600)] font-medium hover:underline">Contact Sales</a>
                        </p>
                    </div>
                </div>

                <div className="bg-[var(--bg-panel)] p-3 text-center border-t border-[var(--border-main)]">
                    <p className="text-[10px] text-[var(--text-muted)] flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" /> 256-bit SSL Encrypted Connection
                    </p>
                </div>
            </div>
        </div>
    );
}
