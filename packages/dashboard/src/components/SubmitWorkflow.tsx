import { useState, useMemo, useEffect } from 'react';
import { useSubmitWorkflow, useDefinitions, useSaveDefinition, useDeleteDefinition } from '../hooks/useWorkflows';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Play, Code2, Database, Loader2, Sparkles, Save, Trash2, Plus, FileJson,
    ChevronRight, Search, AlertCircle, Check, Copy, Wand2, X
} from 'lucide-react';
import type { WorkflowDefinition } from '../api/client';
import toast, { Toaster } from 'react-hot-toast';

const DEFAULT_WORKFLOW = {
    id: "new-workflow",
    startAt: "step-1",
    steps: [
        {
            id: "step-1",
            type: "TASK",
            provider: "AWS",
            functionId: "hello-world"
        }
    ]
};

const DEFAULT_INPUT = {
    key: "value"
};

const STORAGE_KEY = 'cc-orch-workflow-draft';

export default function SubmitWorkflow() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // State
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [name, setName] = useState("New Workflow");
    const [workflow, setWorkflow] = useState(JSON.stringify(DEFAULT_WORKFLOW, null, 2));
    const [input, setInput] = useState(JSON.stringify(DEFAULT_INPUT, null, 2));
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [workflowError, setWorkflowError] = useState<string | null>(null);
    const [inputError, setInputError] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [hasDraft, setHasDraft] = useState(false);

    // Hooks
    const { data: definitions, isLoading: isLoadingDefs } = useDefinitions();
    const saveMutation = useSaveDefinition();
    const deleteMutation = useDeleteDefinition();
    const submitMutation = useSubmitWorkflow();

    const isSubmitting = submitMutation.isPending;
    const isSaving = saveMutation.isPending;

    // Derived State
    const filteredDefinitions = useMemo(() => {
        if (!definitions) return [];
        return definitions
            .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.id.includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }, [definitions, searchQuery]);

    // Load Draft on Mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const draft = JSON.parse(saved);
                if (confirm("Found an unsaved draft. Restore it?")) {
                    setName(draft.name);
                    setWorkflow(draft.workflow);
                    setInput(draft.input);
                    setSelectedId(draft.selectedId);
                    setIsDirty(true);
                    setHasDraft(true);
                    toast.success("Draft restored");
                } else {
                    localStorage.removeItem(STORAGE_KEY);
                    setHasDraft(false);
                }
            } catch (e) {
                console.error("Failed to parse draft", e);
            }
        }
    }, []);

    // Load from URL query param (?load=id)
    useEffect(() => {
        const loadId = searchParams.get('load');
        if (loadId && definitions) {
            const def = definitions.find((d: WorkflowDefinition) => d.id === loadId);
            if (def) {
                setSelectedId(def.id);
                setName(def.name);
                setWorkflow(JSON.stringify(def.definition, null, 2));
                setIsDirty(false);
                setSearchParams({}); // Clear the URL param after loading
                toast.success(`Loaded "${def.name}"`);
            }
        }
    }, [searchParams, definitions, setSearchParams]);

    // Save Draft on Change
    useEffect(() => {
        if (isDirty) {
            const draft = { name, workflow, input, selectedId, timestamp: Date.now() };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
            setHasDraft(true);
        } else if (hasDraft) {
            localStorage.removeItem(STORAGE_KEY);
            setHasDraft(false);
        }
    }, [name, workflow, input, selectedId, isDirty, hasDraft]);

    // Handlers
    const handleNew = () => {
        if (isDirty && !confirm("You have unsaved changes. Discard them?")) return;
        setSelectedId(null);
        setName("New Workflow");
        setWorkflow(JSON.stringify(DEFAULT_WORKFLOW, null, 2));
        setInput(JSON.stringify(DEFAULT_INPUT, null, 2));
        setIsDirty(false);
        setWorkflowError(null);
        setInputError(null);
        toast.success("Started new workflow draft");
    };

    const handleLoad = (def: WorkflowDefinition) => {
        if (isDirty && selectedId !== def.id && !confirm("You have unsaved changes. Discard them?")) return;
        setSelectedId(def.id);
        setName(def.name);
        setWorkflow(JSON.stringify(def.definition, null, 2));
        // Keep input or reset, sticking to reset for clarity unless stored in future
        if (!input) setInput(JSON.stringify(DEFAULT_INPUT, null, 2));
        setIsDirty(false);
        setWorkflowError(null);
        setInputError(null);
    };

    const validateJSON = (text: string, setError: (msg: string | null) => void) => {
        try {
            JSON.parse(text);
            setError(null);
            return true;
        } catch (e: any) {
            setError(e.message);
            return false;
        }
    };

    const handleWorkflowChange = (val: string) => {
        setWorkflow(val);
        setIsDirty(true);
        validateJSON(val, setWorkflowError);
    };

    const handleInputChange = (val: string) => {
        setInput(val);
        validateJSON(val, setInputError);
    };

    const handlePrettify = () => {
        let valid = true;
        if (validateJSON(workflow, setWorkflowError)) {
            setWorkflow(JSON.stringify(JSON.parse(workflow), null, 2));
        } else valid = false;

        if (validateJSON(input, setInputError)) {
            setInput(JSON.stringify(JSON.parse(input), null, 2));
        } else valid = false;

        if (valid) toast.success("Code formatted");
        else toast.error("Fix JSON errors before formatting");
    };

    const handleDuplicate = (e: React.MouseEvent, def: WorkflowDefinition) => {
        e.stopPropagation();
        handleLoad(def);
        setSelectedId(null);
        setName(`${def.name} (Copy)`);
        setIsDirty(true);
        toast("Workflow duplicated. Click Save to persist.", { icon: '📋' });
    };

    const handleSave = async () => {
        if (workflowError) {
            toast.error("Cannot save: Invalid Workflow JSON");
            return;
        }

        try {
            const flowObj = JSON.parse(workflow);
            let idToSave = selectedId;

            // If strictly new or user is trying to overwrite a different ID manually (which we don't fully support yet editing ID in UI, assuming generated or definitions match)
            if (!idToSave) {
                idToSave = flowObj.id || `wf-${Date.now()}`;
            }

            // Enforce ID consistency
            flowObj.id = idToSave;
            setWorkflow(JSON.stringify(flowObj, null, 2));

            await saveMutation.mutateAsync({
                id: idToSave,
                name: name,
                definition: flowObj,
                description: "Created via Workflow Studio"
            });

            setSelectedId(idToSave);
            setIsDirty(false);
            localStorage.removeItem(STORAGE_KEY); // Clear draft on save
            setHasDraft(false);
            toast.success("Workflow saved successfully!");
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to save: " + err.message);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this workflow?")) return;

        await deleteMutation.mutateAsync(id);
        toast.success("Workflow deleted");
        if (selectedId === id) {
            handleNew();
        }
    };

    const handleLaunch = async () => {
        if (workflowError || inputError) {
            toast.error("Fix JSON errors before launching");
            return;
        }

        try {
            // Auto-save if it's an existing one? Maybe just warn.
            // For now, straightforward launch.
            const { executionId } = await submitMutation.mutateAsync({
                workflow: JSON.parse(workflow),
                input: JSON.parse(input)
            });
            toast.success("Workflow launched! Redirecting...");
            setTimeout(() => navigate(`/execution/${executionId}`), 500);
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message;
            toast.error("Launch failed: " + msg);
        }
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)]">
            <Toaster position="top-right" toastOptions={{
                style: { background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }
            }} />

            {/* Sidebar */}
            <div className={`
                ${isSidebarOpen ? 'w-72' : 'w-0'}
                bg-[var(--bg-panel)] border-r border-[var(--border-main)] transition-all duration-300 flex flex-col relative z-20
            `}>
                <div className="p-4 border-b border-[var(--border-subtle)] space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm tracking-wide uppercase text-[var(--text-muted)]">Library</h3>
                        <button onClick={handleNew} className="p-1.5 hover:bg-[var(--primary-600)/10] hover:text-[var(--primary-600)] rounded-md transition-colors" title="New Workflow">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="relative group">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary-600)] transition-colors" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search workflows..."
                            className="w-full bg-[var(--neutral-bg)] border border-[var(--border-subtle)] rounded-md pl-9 pr-3 py-1.5 text-sm outline-none focus:border-[var(--primary-600)] transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                    {isLoadingDefs ? (
                        <div className="flex flex-col items-center justify-center p-8 gap-2 text-[var(--text-muted)]">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-xs">Loading library...</span>
                        </div>
                    ) : filteredDefinitions.length === 0 ? (
                        <div className="text-sm text-[var(--text-muted)] text-center p-8 flex flex-col items-center gap-2">
                            <Sparkles className="w-8 h-8 opacity-20" />
                            {searchQuery ? 'No matches found' : 'No saved workflows yet'}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredDefinitions.map(def => (
                                <div
                                    key={def.id}
                                    onClick={() => handleLoad(def)}
                                    className={`
                                        group flex flex-col gap-1 p-3 rounded-lg cursor-pointer border transition-all
                                        ${selectedId === def.id
                                            ? 'bg-[var(--primary-600)/10] border-[var(--primary-600)/30]'
                                            : 'border-transparent hover:bg-[var(--neutral-bg)] hover:border-[var(--border-subtle)]'}
                                    `}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileJson className={`w-4 h-4 shrink-0 ${selectedId === def.id ? 'text-[var(--primary-600)]' : 'text-[var(--text-muted)]'}`} />
                                            <span className={`truncate font-medium text-sm ${selectedId === def.id ? 'text-[var(--primary-600)]' : 'text-[var(--text-main)]'}`}>{def.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleDuplicate(e, def)}
                                                className="p-1.5 rounded hover:bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                                                title="Duplicate"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, def.id)}
                                                className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] px-6">
                                        <span>{new Date(def.updatedAt).toLocaleDateString()}</span>
                                        <span>{def.id.slice(0, 8)}...</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-main)]">
                {/* Toolbar */}
                <div className="h-16 border-b border-[var(--border-main)] bg-[var(--bg-panel)] px-6 flex items-center gap-4 shadow-sm z-10">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--neutral-bg)] rounded-lg transition-colors">
                        <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <div className="flex-1 flex items-center justify-between">
                        <div className="flex flex-col">
                            <input
                                value={name}
                                onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                                className="bg-transparent text-lg font-bold text-[var(--text-main)] outline-none placeholder-[var(--text-muted)] w-full"
                                placeholder="Workflow Name"
                            />
                            <div className="flex items-center gap-2 text-xs">
                                <span className={`flex items-center gap-1 ${selectedId ? 'text-[var(--primary-600)]' : 'text-[var(--text-muted)]'}`}>
                                    {selectedId ? <Database className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                                    {selectedId ? 'Existing Record' : 'Draft'}
                                </span>
                                {isDirty && (
                                    <span className="flex items-center gap-1 text-amber-500 font-medium animate-pulse">
                                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                        Unsaved Changes
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handlePrettify}
                                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--neutral-bg)] rounded-lg transition-colors"
                                title="Format JSON"
                            >
                                <Wand2 className="w-4 h-4" />
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 bg-[var(--neutral-bg)] text-[var(--text-main)] border border-[var(--border-main)] hover:bg-[var(--border-subtle)] hover:shadow-md transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save
                            </button>

                            <div className="h-6 w-px bg-[var(--border-main)] mx-1" />

                            <button
                                onClick={handleLaunch}
                                disabled={isSubmitting || !!workflowError || !!inputError}
                                className={`
                                    px-6 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:pointer-events-none
                                    ${isSubmitting
                                        ? 'bg-[var(--neutral-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'
                                        : 'bg-gradient-to-r from-[var(--primary-600)] to-[var(--primary-500)] hover:brightness-110 text-white shadow-[var(--primary-600)/20]'
                                    }
                                `}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4 fill-current" />
                                )}
                                {isSubmitting ? 'Deploying...' : 'Launch'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Editors Grid */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-px bg-[var(--border-main)] min-h-0">
                    {/* Definition Editor */}
                    <div className="bg-[var(--bg-panel)] flex flex-col min-h-0 relative group">
                        <div className="bg-[var(--neutral-bg)] px-4 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between select-none">
                            <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-2 uppercase tracking-wide">
                                <Code2 className="w-4 h-4 text-blue-500" />
                                Workflow Definition
                            </span>
                            {workflowError ? (
                                <span className="text-xs text-red-500 flex items-center gap-1 font-medium bg-red-500/10 px-2 py-0.5 rounded">
                                    <AlertCircle className="w-3 h-3" /> Syntax Error
                                </span>
                            ) : (
                                <span className="text-xs text-green-500 flex items-center gap-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Check className="w-3 h-3" /> Valid JSON
                                </span>
                            )}
                        </div>

                        <div className="relative flex-1 min-h-0">
                            <textarea
                                className={`
                                    absolute inset-0 w-full h-full p-6 font-mono text-sm bg-[var(--bg-panel)] resize-none outline-none leading-relaxed transition-colors
                                    ${workflowError ? 'text-red-500/80 bg-red-500/5' : 'text-[var(--text-main)]'}
                                `}
                                value={workflow}
                                onChange={(e) => handleWorkflowChange(e.target.value)}
                                spellCheck={false}
                                placeholder='{ "id": "...", "steps": [...] }'
                            />
                        </div>
                        {workflowError && (
                            <div className="absolute bottom-0 inset-x-0 bg-red-500/10 border-t border-red-500/20 p-2 text-xs text-red-500 truncate backdrop-blur-sm">
                                {workflowError}
                            </div>
                        )}
                    </div>

                    {/* Input Editor */}
                    <div className="bg-[var(--bg-panel)] flex flex-col min-h-0 relative group">
                        <div className="bg-[var(--neutral-bg)] px-4 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between select-none">
                            <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-2 uppercase tracking-wide">
                                <Database className="w-4 h-4 text-amber-500" />
                                Runtime Inputs
                            </span>
                            {inputError ? (
                                <span className="text-xs text-red-500 flex items-center gap-1 font-medium bg-red-500/10 px-2 py-0.5 rounded">
                                    <AlertCircle className="w-3 h-3" /> Syntax Error
                                </span>
                            ) : (
                                <span className="text-xs text-green-500 flex items-center gap-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Check className="w-3 h-3" /> Valid JSON
                                </span>
                            )}
                        </div>
                        <div className="relative flex-1 min-h-0">
                            <textarea
                                className={`
                                    absolute inset-0 w-full h-full p-6 font-mono text-sm bg-[var(--bg-panel)] resize-none outline-none leading-relaxed transition-colors
                                    ${inputError ? 'text-red-500/80 bg-red-500/5' : 'text-[var(--text-main)]'}
                                `}
                                value={input}
                                onChange={(e) => handleInputChange(e.target.value)}
                                spellCheck={false}
                                placeholder='{ "key": "value" }'
                            />
                        </div>
                        {inputError && (
                            <div className="absolute bottom-0 inset-x-0 bg-red-500/10 border-t border-red-500/20 p-2 text-xs text-red-500 truncate backdrop-blur-sm">
                                {inputError}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
