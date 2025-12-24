
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { TimeRecord, Worker, Project, SolarTable, PromptTemplate } from '../types';
import { processRecordDescription } from '../services/recordProcessor';
import MicrophoneIcon from './icons/MicrophoneIcon';
import SendIcon from './icons/SendIcon';
import BrainIcon from './icons/BrainIcon';
import UploadIcon from './icons/UploadIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';

// SpeechRecognition setup
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
let recognition: any | null = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'cs-CZ'; 
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
}

const TEMPLATES: PromptTemplate[] = [
    { id: 'daily_summary', title: 'Denní souhrn', text: 'Vytvoř stručný souhrn dnešní aktivity na základě pracovních záznamů a docházky.', icon: '📝' },
    { id: 'cost_calc', title: 'Náklady projektu', text: 'Vypočítej aktuální náklady (hodinové + úkolové) pro projekt [NÁZEV].', icon: '💰' },
    { id: 'missing_logs', title: 'Chybějící záznamy', text: 'Kteří pracovníci jsou přihlášeni v docházce, ale nemají dnes žádný záznam práce?', icon: '🔍' },
    { id: 'progress', title: 'Postup prací', text: 'Jaký je procentuální postup dokončení stolů na všech aktivních projektech?', icon: '📊' },
];

const AICommandBar: React.FC = () => {
    const { t, language } = useI18n();
    const { showToast } = useToast();
    const [prompt, setPrompt] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState<'flash' | 'pro'>('flash');
    const [showTemplates, setShowTemplates] = useState(false);
    const [attachedFile, setAttachedFile] = useState<{ file: File, preview: string } | null>(null);
    const [tokenUsage, setTokenUsage] = useState<number | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const templatesRef = useRef<HTMLDivElement>(null);

    const workers = useLiveQuery(() => db.workers.toArray());
    const projects = useLiveQuery(() => db.projects.toArray());

    useEffect(() => {
        if(recognition) {
            recognition.lang = language === 'cs' ? 'cs-CZ' : 'en-US';
        }
    }, [language]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (templatesRef.current && !templatesRef.current.contains(event.target as Node)) {
                setShowTemplates(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const findWorker = (name: string): Worker => {
        if (!workers) throw new Error("Workers not loaded");
        const lowerCaseName = name.toLowerCase();
        const filtered = workers.filter(w => w.name.toLowerCase().includes(lowerCaseName));
        if (filtered.length === 1) return filtered[0];
        if (filtered.length > 1) throw new Error(t('multiple_workers_found', { name }));
        throw new Error(t('worker_not_found', { name }));
    };

    const findProject = (name: string): Project => {
        if (!projects) throw new Error("Projects not loaded");
        const lowerCaseName = name.toLowerCase();
        const filtered = projects.filter(p => p.name.toLowerCase().includes(lowerCaseName));
        if (filtered.length === 1) return filtered[0];
        if (filtered.length > 1) throw new Error(t('multiple_projects_found', { name }));
        throw new Error(t('project_not_found', { name }));
    };
    
    // Handlers for function calling
    const handlers: { [key: string]: (...args: any[]) => Promise<any> } = {
        createTimeRecord: async ({ workerName, projectName, date, hours, description }: { workerName: string, projectName: string, date: string, hours: number, description: string }) => {
            const worker = findWorker(workerName);
            const project = findProject(projectName);
            const startTime = new Date(date);
            if (hours > 0) startTime.setHours(8, 0, 0, 0); 
            const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
            const newRecord: Omit<TimeRecord, 'id'> = {
                workerId: worker.id!,
                projectId: project.id!,
                startTime,
                endTime,
                description: description || `Work on ${project.name}`,
            };
            const newId = await db.records.add(newRecord as TimeRecord);
            await processRecordDescription({ ...newRecord, id: newId } as TimeRecord);
            return `Záznam vytvořen pro ${worker.name} na ${project.name} (${hours}h).`;
        },
        // ... (Other handlers remain same as before) ...
        clockIn: async ({ workerName }: { workerName: string }) => {
            const worker = findWorker(workerName);
            const existingSession = await db.attendanceSessions.where('workerId').equals(worker.id!).first();
            if (existingSession) return `${worker.name} už je přihlášen.`;
            await db.attendanceSessions.add({ workerId: worker.id!, startTime: new Date() });
            return `${worker.name} byl přihlášen do práce.`;
        },
        clockOut: async ({ workerName, projectName, description }: { workerName: string, projectName: string, description: string }) => {
            const worker = findWorker(workerName);
            const project = findProject(projectName);
            const session = await db.attendanceSessions.where('workerId').equals(worker.id!).first();
            if (!session) return `${worker.name} není přihlášen.`;
            await db.transaction('rw', db.records, db.attendanceSessions, async () => {
                const newRecordData: Omit<TimeRecord, 'id'> = {
                    workerId: session.workerId,
                    projectId: project.id!,
                    startTime: session.startTime,
                    endTime: new Date(),
                    description: description || `Dokončena práce na ${project.name}`,
                };
                const newId = await db.records.add(newRecordData as TimeRecord);
                await processRecordDescription({ ...newRecordData, id: newId } as TimeRecord);
                await db.attendanceSessions.delete(session.id!);
            });
            return `${worker.name} byl odhlášen z ${project.name}.`;
        },
        updateTableStatus: async ({ projectName, tableCode, status, workerName }: { projectName: string, tableCode: string, status: 'pending' | 'completed', workerName?: string }) => {
            const project = findProject(projectName);
            let table = await db.solarTables.where({ projectId: project.id!, tableCode }).first();
            let tableId = table?.id;

            if (table) {
                await db.solarTables.update(table.id!, { status });
            } else {
                const newTable: Omit<SolarTable, 'id'> = {
                    projectId: project.id!,
                    x: 5, y: 5,
                    tableCode: tableCode,
                    tableType: 'small',
                    status: status,
                };
                tableId = await db.solarTables.add(newTable as SolarTable);
            }

            if (workerName && tableId) {
                const worker = findWorker(workerName);
                await db.transaction('rw', db.tableAssignments, db.tableStatusHistory, async () => {
                    const existingAssignment = await db.tableAssignments.where({ tableId: tableId!, workerId: worker.id! }).first();
                    if (!existingAssignment) await db.tableAssignments.add({ tableId: tableId!, workerId: worker.id! });
                    await db.tableStatusHistory.add({ tableId: tableId!, workerId: worker.id!, status: status, timestamp: new Date() });
                });
                return t('table_updated_assigned', { code: tableCode, project: project.name, status, worker: worker.name });
            }
            return t('table_updated', { code: tableCode, project: project.name, status });
        },
        updateProjectStatus: async ({ projectName, status }: { projectName: string, status: 'active' | 'completed' | 'on_hold' }) => {
            const project = findProject(projectName);
            await db.projects.update(project.id!, { status });
            return `Status projektu ${project.name} byl změněn na ${status}.`;
        }
    };

    const tools = [{
        functionDeclarations: [
            {
                name: 'createTimeRecord',
                description: 'Creates a work time record.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        workerName: { type: Type.STRING },
                        projectName: { type: Type.STRING },
                        date: { type: Type.STRING },
                        hours: { type: Type.NUMBER },
                        description: { type: Type.STRING },
                    },
                    required: ['workerName', 'projectName', 'hours'],
                },
            },
            {
                name: 'clockIn',
                description: 'Clocks in a worker.',
                parameters: {
                    type: Type.OBJECT,
                    properties: { workerName: { type: Type.STRING } },
                    required: ['workerName'],
                }
            },
            {
                name: 'clockOut',
                description: 'Clocks out a worker.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        workerName: { type: Type.STRING },
                        projectName: { type: Type.STRING },
                        description: { type: Type.STRING },
                    },
                    required: ['workerName', 'projectName'],
                }
            },
            {
                name: 'updateTableStatus',
                description: 'Updates solar table status.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        projectName: { type: Type.STRING },
                        tableCode: { type: Type.STRING },
                        status: { type: Type.STRING, enum: ['pending', 'completed'] },
                        workerName: { type: Type.STRING }
                    },
                    required: ['projectName', 'tableCode', 'status'],
                }
            },
            {
                name: 'updateProjectStatus',
                description: 'Updates the overall status of a project (active, completed, on_hold).',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        projectName: { type: Type.STRING },
                        status: { type: Type.STRING, enum: ['active', 'completed', 'on_hold'] }
                    },
                    required: ['projectName', 'status'],
                }
            }
        ]
    }];

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const preview = URL.createObjectURL(file);
            setAttachedFile({ file, preview });
        }
    };

    const removeFile = () => {
        if (attachedFile) URL.revokeObjectURL(attachedFile.preview);
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() && !attachedFile) return;

        // Check for connected key
        if (window.aistudio?.hasSelectedApiKey) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          if (!hasKey) {
             showToast("Připojte Gemini API klíč v nastavení.", "error");
             return;
          }
        }

        if (!process.env.API_KEY) {
            showToast("API key is not configured.", "error");
            return;
        }

        setIsLoading(true);
        setTokenUsage(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const today = new Date().toISOString().split('T')[0];
            
            // Build parts
            const parts: any[] = [];
            
            if (attachedFile) {
                const base64Data = await fileToBase64(attachedFile.file);
                parts.push({
                    inlineData: {
                        mimeType: attachedFile.file.type,
                        data: base64Data
                    }
                });
            }

            parts.push({
                text: `Context: Today is ${today}. Workers: ${workers?.map(w => w.name).join(', ')}. Projects: ${projects?.map(p => p.name).join(', ')}. User: "${prompt}"`
            });

            // Model Selection Logic
            // gemini-3-flash-preview: Fast, good for basic commands
            // gemini-3-pro-preview: Smarter, better for reasoning (templates, analytics) or complex tool use
            const modelName = selectedModel === 'pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

            const response = await ai.models.generateContent({
                model: modelName,
                contents: { parts },
                config: { 
                    tools: attachedFile ? undefined : tools, // Disable tools if file attached (Multimodal + Tools complexity)
                    thinkingConfig: selectedModel === 'pro' ? { thinkingBudget: 16000 } : undefined 
                }
            });

            // Estimate tokens (approx) since usageMetadata might be missing in some preview responses
            // Or access it if available
            const usage = response.usageMetadata;
            if (usage) {
                setTokenUsage(usage.totalTokenCount);
            } else {
                setTokenUsage(Math.ceil((prompt.length + (response.text?.length || 0)) / 4));
            }

            const functionCalls = response.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
                let executedCount = 0;
                for(const call of functionCalls) {
                    const { name, args } = call;
                    if (handlers[name]) {
                        if (name === 'createTimeRecord' && !args.date) args.date = today;
                        const result = await handlers[name](args);
                        showToast(result || t('command_executed_successfully'), "success");
                        executedCount++;
                    }
                }
                setPrompt('');
                if (executedCount > 0) removeFile();
            } else {
                // If no function called, it's a chat response or analysis
                if (response.text) {
                    showToast("Odpověď: " + response.text.substring(0, 100) + (response.text.length > 100 ? '...' : ''), "info", 5000);
                    // Could expand to show full response in a modal if needed
                } else {
                    showToast(t('error_executing_command'), "warning");
                }
                setPrompt('');
                removeFile();
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : t('error_executing_command');
            if (msg.includes("Requested entity was not found")) {
                showToast("API klíč nebyl nalezen. Vyberte ho v nastavení.", "error");
            } else {
                console.error(error);
                showToast(msg, "error");
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const toggleListen = () => {
        if (!recognition) return;
        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            recognition.start();
            setIsListening(true);
            showToast(t('listening'), "info", 2000);
            recognition.onresult = (event: any) => {
                setPrompt(event.results[0][0].transcript);
                setIsListening(false);
            };
            recognition.onerror = () => {
                setIsListening(false);
                showToast("Chyba mikrofonu", "error");
            };
        }
    };

    return (
        <div className="fixed bottom-20 md:bottom-0 left-0 right-0 z-40 main-safe-area !p-4 !pt-0 pointer-events-none">
            <div className="max-w-4xl mx-auto space-y-2 pointer-events-auto">
                
                {/* Templates Popup */}
                {showTemplates && (
                    <div ref={templatesRef} className="absolute bottom-full left-0 mb-2 w-64 bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                        <div className="p-3 border-b border-white/10 bg-white/5">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Šablony</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {TEMPLATES.map(tmpl => (
                                <button
                                    key={tmpl.id}
                                    onClick={() => { setPrompt(tmpl.text); setShowTemplates(false); setSelectedModel('pro'); }} // Auto-switch to Pro for analysis
                                    className="w-full text-left p-3 hover:bg-white/10 transition-colors flex items-center gap-3 border-b border-white/5 last:border-0"
                                >
                                    <span className="text-xl">{tmpl.icon}</span>
                                    <div>
                                        <div className="text-sm font-bold text-white">{tmpl.title}</div>
                                        <div className="text-xs text-gray-400 truncate w-40">{tmpl.text}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Attached File Preview */}
                {attachedFile && (
                    <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 animate-fade-in">
                        <img src={attachedFile.preview} alt="Preview" className="w-8 h-8 rounded-lg object-cover" />
                        <span className="text-xs text-white max-w-[100px] truncate">{attachedFile.file.name}</span>
                        <button onClick={removeFile} className="ml-2 text-gray-400 hover:text-white">×</button>
                    </div>
                )}

                {/* Main Bar */}
                <div className="relative p-2 glass-card rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/20 bg-slate-900/80 backdrop-blur-xl">
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        
                        {/* Model Selector */}
                        <div className="relative group/model ml-1">
                            <button
                                type="button"
                                onClick={() => setSelectedModel(m => m === 'flash' ? 'pro' : 'flash')}
                                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all border ${selectedModel === 'pro' ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/10 text-gray-400'}`}
                                title={selectedModel === 'flash' ? 'Fast Model (Flash)' : 'Smart Model (Pro)'}
                            >
                                <BrainIcon className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    {selectedModel === 'pro' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>}
                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${selectedModel === 'pro' ? 'bg-indigo-500' : 'bg-gray-500'}`}></span>
                                </span>
                            </button>
                        </div>

                        <div className="h-8 w-px bg-white/10 mx-1"></div>

                        {/* Tools */}
                        <button 
                            type="button" 
                            onClick={() => setShowTemplates(!showTemplates)}
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                            title="Šablony"
                        >
                            <DocumentTextIcon className="w-6 h-6" />
                        </button>

                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            className={`p-2 transition-colors ${attachedFile ? 'text-[var(--color-accent)]' : 'text-gray-400 hover:text-white'}`}
                            title="Nahrát soubor"
                        >
                            <UploadIcon className="w-6 h-6" />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,.txt,.csv,.pdf" />

                        {/* Input */}
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={t('ai_command_placeholder')}
                            className="flex-grow min-w-0 bg-transparent text-white placeholder-gray-500 border-none focus:ring-0 text-base md:text-lg font-medium px-2"
                            disabled={isLoading}
                        />

                        {/* Actions */}
                        <div className="flex items-center gap-2 pr-1">
                            {recognition && !prompt && (
                                <button 
                                    type="button" 
                                    onClick={toggleListen} 
                                    disabled={isLoading} 
                                    className={`p-3 rounded-full transition-all ${isListening ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white/5 hover:bg-white/10'}`}
                                >
                                    <MicrophoneIcon className="w-5 h-5 text-white"/>
                                </button>
                            )}
                            {(prompt || attachedFile) && (
                                <button 
                                    type="submit" 
                                    disabled={isLoading} 
                                    className="p-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-full hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale shadow-lg"
                                >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <SendIcon className="w-5 h-5 text-white" />
                                )}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
                
                {/* Token Usage Indicator */}
                {tokenUsage !== null && (
                    <div className="absolute -bottom-6 right-6 text-[10px] font-mono text-gray-500 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
                        Tokens: ~{tokenUsage}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AICommandBar;
