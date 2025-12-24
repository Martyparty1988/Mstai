
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { useI18n } from '../contexts/I18nContext';
import { db } from '../services/db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { TimeRecord, Worker, Project, SolarTable } from '../types';
import { processRecordDescription } from '../services/recordProcessor';
import MicrophoneIcon from './icons/MicrophoneIcon';
import SendIcon from './icons/SendIcon';
import BrainIcon from './icons/BrainIcon';

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

const AICommandBar: React.FC = () => {
    const { t, language } = useI18n();
    const [prompt, setPrompt] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const workers = useLiveQuery(() => db.workers.toArray());
    const projects = useLiveQuery(() => db.projects.toArray());

    const suggestions = [
        "Zapiš 8 hodin pro Martin na Zarasai",
        "Dokončen stůl 28.1 na projektu Zidikai",
        "Nastav projekt Zarasai jako dokončený",
        "Přihlas Kuba Soldat do práce",
        "Kolik máme hotovo na Zarasai?"
    ];

    useEffect(() => {
        if(recognition) {
            recognition.lang = language === 'cs' ? 'cs-CZ' : 'en-US';
        }
    }, [language]);

    const showStatus = (message: string, duration = 4000) => {
        setStatusMessage(message);
        setTimeout(() => setStatusMessage(''), duration);
    };

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
    
    const handlers: { [key: string]: (...args: any[]) => Promise<any> } = {
        createTimeRecord: async ({ workerName, projectName, date, hours, description }: { workerName: string, projectName: string, date: string, hours: number, description: string }) => {
            const worker = findWorker(workerName);
            const project = findProject(projectName);
            const startTime = new Date(date);
            startTime.setHours(8, 0, 0, 0); 
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        // Check for connected key
        if (window.aistudio?.hasSelectedApiKey) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          if (!hasKey) {
             showStatus("Připojte Gemini API klíč v nastavení.");
             return;
          }
        }

        if (!process.env.API_KEY) {
            showStatus("API key is not configured.");
            return;
        }

        setIsLoading(true);
        setStatusMessage(t('processing'));

        try {
            // New instance per guidelines
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const today = new Date().toISOString().split('T')[0];

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `Context: Today is ${today}. Workers: ${workers?.map(w => w.name).join(', ')}. Projects: ${projects?.map(p => p.name).join(', ')}. User: "${prompt}"`,
                config: { tools, thinkingConfig: { thinkingBudget: 32768 } }
            });

            const functionCalls = response.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
                for(const call of functionCalls) {
                    const { name, args } = call;
                    if (handlers[name]) {
                        if (name === 'createTimeRecord' && !args.date) args.date = today;
                        const result = await handlers[name](args);
                        showStatus(result || t('command_executed_successfully'));
                    }
                }
                setPrompt('');
            } else {
                showStatus(response.text || t('error_executing_command'));
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : t('error_executing_command');
            if (msg.includes("Requested entity was not found")) {
                showStatus("API klíč nebyl nalezen. Vyberte ho v nastavení.");
            } else {
                showStatus(msg);
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
            setStatusMessage(t('listening'));
            recognition.onresult = (event: any) => {
                setPrompt(event.results[0][0].transcript);
                setIsListening(false);
                setStatusMessage('');
            };
            recognition.onerror = () => {
                setIsListening(false);
                setStatusMessage('Chyba mikrofonu');
            };
        }
    };

    return (
        <div className="fixed bottom-20 md:bottom-0 left-0 right-0 z-40 main-safe-area !p-4 !pt-0">
            <div className="max-w-4xl mx-auto space-y-2">
                {/* Suggestion Chips */}
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 px-1">
                    {suggestions.map((s, idx) => (
                        <button
                            key={idx}
                            onClick={() => setPrompt(s)}
                            className="whitespace-nowrap px-4 py-1.5 glass-card rounded-full text-xs font-bold text-gray-300 hover:text-white hover:border-[var(--color-accent)] transition-all uppercase tracking-tighter"
                        >
                            {s}
                        </button>
                    ))}
                </div>

                <div className="relative p-2 glass-card rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/20">
                    {statusMessage && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-auto mb-4 px-6 py-2 bg-indigo-600 text-white text-sm font-black rounded-full shadow-2xl animate-bounce whitespace-nowrap">
                            {statusMessage}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/20 rounded-full ml-1">
                            <BrainIcon className="w-6 h-6 text-indigo-400" />
                        </div>
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={t('ai_command_placeholder')}
                            className="flex-grow w-full bg-transparent text-white placeholder-gray-500 border-none focus:ring-0 text-lg font-medium"
                            disabled={isLoading}
                        />
                        <div className="flex items-center gap-2 pr-1">
                            {recognition && (
                                <button 
                                    type="button" 
                                    onClick={toggleListen} 
                                    disabled={isLoading} 
                                    className={`p-3 rounded-full transition-all ${isListening ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white/5 hover:bg-white/10'}`}
                                >
                                    <MicrophoneIcon className="w-6 h-6 text-white"/>
                                </button>
                            )}
                            <button 
                                type="submit" 
                                disabled={isLoading || !prompt.trim()} 
                                className="p-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-full hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale shadow-lg"
                            >
                               <SendIcon className="w-6 h-6 text-white" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AICommandBar;
