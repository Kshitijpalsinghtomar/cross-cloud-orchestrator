import { useState } from 'react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { Play, Code2, Database, Loader2, Sparkles } from 'lucide-react';

const DEFAULT_WORKFLOW = {
    id: "production-payment-flow",
    startAt: "validate",
    steps: [
        {
            id: "validate",
            type: "TASK",
            provider: "AWS",
            functionId: "validate-payment",
            fallbackProvider: "GCP"
        }
    ]
};

const DEFAULT_INPUT = {
    transactionId: "tx_998877",
    amount: 450.00,
    currency: "USD"
};

export default function SubmitWorkflow() {
    const navigate = useNavigate();
    const [workflow, setWorkflow] = useState(JSON.stringify(DEFAULT_WORKFLOW, null, 2));
    const [input, setInput] = useState(JSON.stringify(DEFAULT_INPUT, null, 2));
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Simulate "Compiling" delay for effect
            await new Promise(r => setTimeout(r, 800));

            const { executionId } = await api.submitWorkflow(JSON.parse(workflow), JSON.parse(input));
            navigate(`/execution/${executionId}`);
        } catch (err) {
            alert("Failed to submit: " + err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-3">
                        <Sparkles className="text-[var(--primary-600)] w-6 h-6" /> Workflow Studio
                    </h2>
                    <p className="text-[var(--text-muted)] text-sm mt-1">Design, validate, and deploy cross-cloud logic.</p>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`
                px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all shadow-sm
                ${isSubmitting
                            ? 'bg-[var(--neutral-bg)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-main)]'
                            : 'bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white shadow-[var(--primary-100)] hover:shadow-[var(--primary-200)]'
                        }
            `}
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Play className="w-4 h-4 fill-current" />
                    )}
                    {isSubmitting ? 'Deploying...' : 'Launch Workflow'}
                </button>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                {/* Editor 1 */}
                <div className="bg-[var(--bg-panel)] rounded-xl flex flex-col overflow-hidden border border-[var(--border-main)] shadow-sm focus-within:ring-2 focus-within:ring-[var(--primary-600)]/20 focus-within:border-[var(--primary-600)] transition-all">
                    <div className="bg-[var(--neutral-bg)] px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-2 uppercase tracking-wide">
                            <Code2 className="w-4 h-4" />
                            Definition
                        </span>
                        <span className="text-[10px] bg-[var(--border-main)] text-[var(--text-muted)] px-2 py-0.5 rounded font-mono">JSON</span>
                    </div>
                    <textarea
                        className="flex-1 p-6 font-mono text-sm text-[var(--text-main)] bg-[var(--bg-panel)] resize-none outline-none leading-relaxed"
                        value={workflow}
                        onChange={(e) => setWorkflow(e.target.value)}
                        spellCheck={false}
                    />
                </div>

                {/* Editor 2 */}
                <div className="bg-[var(--bg-panel)] rounded-xl flex flex-col overflow-hidden border border-[var(--border-main)] shadow-sm focus-within:ring-2 focus-within:ring-[var(--primary-600)]/20 focus-within:border-[var(--primary-600)] transition-all">
                    <div className="bg-[var(--neutral-bg)] px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-2 uppercase tracking-wide">
                            <Database className="w-4 h-4" />
                            Input Variables
                        </span>
                        <span className="text-[10px] bg-[var(--border-main)] text-[var(--text-muted)] px-2 py-0.5 rounded font-mono">JSON</span>
                    </div>
                    <textarea
                        className="flex-1 p-6 font-mono text-sm text-[var(--text-main)] bg-[var(--bg-panel)] resize-none outline-none leading-relaxed"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        spellCheck={false}
                    />
                </div>
            </div>
        </div>
    );
}
