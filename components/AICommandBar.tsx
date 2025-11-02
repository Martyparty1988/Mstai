
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
// FIX: Cast window to `any` to access experimental SpeechRecognition APIs without TypeScript errors.
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
// FIX: Use `any` for the recognition object's type because TypeScript doesn't have built-in types for the experimental Web Speech API, and the variable `SpeechRecognition` cannot be used as a type.
let recognition: any | null = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'cs-CZ'; // Default to Czech
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
    const sessions = useLiveQuery(() => db.attendanceSessions.toArray());

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
    
    // API Function Handlers
    const handlers: { [key: string]: (...args: any[]) => Promise<any> } = {
        createTimeRecord: async ({ workerName, projectName, date, hours, description }: { workerName: string, projectName: string, date: string, hours: number, description: string }) => {
            const worker = findWorker(workerName);
            const project = findProject(projectName);
            
            const startTime = new Date(date);
            startTime.setHours(8, 0, 0, 0); // Assume work starts at 8 AM for simplicity
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
            return `Time record created for ${worker.name} on ${project.name} for ${hours} hours.`;
        },
        clockIn: async ({ workerName }: { workerName: string }) => {
            const worker = findWorker(workerName);
            const existingSession = await db.attendanceSessions.where('workerId').equals(worker.id!).first();
            if (existingSession) return `${worker.name} is already clocked in.`;
            
            await db.attendanceSessions.add({ workerId: worker.id!, startTime: new Date() });
            return `${worker.name} has been clocked in.`;
        },
        clockOut: async ({ workerName, projectName, description }: { workerName: string, projectName: string, description: string }) => {
            const worker = findWorker(workerName);
            const project = findProject(projectName);

            const session = await db.attendanceSessions.where('workerId').equals(worker.id!).first();
            if (!session) return `${worker.name} is not clocked in.`;
            
            await db.transaction('rw', db.records, db.attendanceSessions, async () => {
                const newRecordData: Omit<TimeRecord, 'id'> = {
                    workerId: session.workerId,
                    projectId: project.id!,
                    startTime: session.startTime,
                    endTime: new Date(),
                    description: description || `Completed work on ${project.name}`,
                };
                const newId = await db.records.add(newRecordData as TimeRecord);
                await processRecordDescription({ ...newRecordData, id: newId } as TimeRecord);
                await db.attendanceSessions.delete(session.id!);
            });
            return `${worker.name} has been clocked out from ${project.name}.`;
        },
        updateTableStatus: async ({ projectName, tableCode, status }: { projectName: string, tableCode: string, status: 'pending' | 'completed' }) => {
            const project = findProject(projectName);
            const table = await db.solarTables.where({ projectId: project.id!, tableCode }).first();

            if (table) {
                await db.solarTables.update(table.id!, { status });
                return t('table_updated', { code: tableCode, project: project.name, status });
            } else {
                // Table not found, create it with default values.
                const getTableTypeFromCode = (code: string): 'small' | 'medium' | 'large' => {
                    const c = code.toLowerCase();
                    if (c.startsWith('it28')) return 'small';
                    if (c.startsWith('it42')) return 'medium';
                    if (c.startsWith('it56')) return 'large';
                    return 'small'; // Default to 'small' if type cannot be determined
                };

                const newTable: Omit<SolarTable, 'id'> = {
                    projectId: project.id!,
                    x: 5, // Default position at top-left, user can move it on the plan.
                    y: 5,
                    tableCode: tableCode,
                    tableType: getTableTypeFromCode(tableCode),
                    status: status,
                };
                await db.solarTables.add(newTable as SolarTable);
                return t('table_not_found_and_created', { code: tableCode, project: project.name, status });
            }
        }
    };

    const tools: { functionDeclarations: FunctionDeclaration[] }[] = [{
        functionDeclarations: [
            {
                name: 'createTimeRecord',
                description: 'Creates a work time record for a worker on a specific project.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        workerName: { type: Type.STRING, description: 'The name of the worker.' },
                        projectName: { type: Type.STRING, description: 'The name of the project.' },
                        date: { type: Type.STRING, description: 'The date of the work in YYYY-MM-DD format. If not specified, assume today.' },
                        hours: { type: Type.NUMBER, description: 'The duration of the work in hours.' },
                        description: { type: Type.STRING, description: 'A brief description of the work done.' },
                    },
                    required: ['workerName', 'projectName', 'date', 'hours', 'description'],
                },
            },
            {
                name: 'clockIn',
                description: 'Clocks in a worker, starting their attendance session.',
                parameters: {
                    type: Type.OBJECT,
                    properties: { workerName: { type: Type.STRING, description: 'The name of the worker to clock in.' } },
                    required: ['workerName'],
                }
            },
            {
                name: 'clockOut',
                description: 'Clocks out a worker, ending their session and creating a time record.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        workerName: { type: Type.STRING, description: 'The name of the worker to clock out.' },
                        projectName: { type: Type.STRING, description: 'The project they were working on.' },
                        description: { type: Type.STRING, description: 'A brief description of the work done.' },
                    },
                    required: ['workerName', 'projectName', 'description'],
                }
            },
            {
                name: 'updateTableStatus',
                description: 'Updates the status of a solar table on a project plan.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        projectName: { type: Type.STRING, description: 'The name of the project.' },
                        tableCode: { type: Type.STRING, description: 'The code of the table, e.g., "iT28-1.1" or "28.1".' },
                        status: { type: Type.STRING, enum: ['pending', 'completed'], description: 'The new status of the table.' }
                    },
                    required: ['projectName', 'tableCode', 'status'],
                }
            }
        ]
    }];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || !process.env.API_KEY) return;

        setIsLoading(true);
        setStatusMessage(t('processing'));

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const today = new Date().toISOString().split('T')[0];

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: `Context: Today's date is ${today}. The available workers are: ${workers?.map(w => w.name).join(', ')}. The available projects are: ${projects?.map(p => p.name).join(', ')}. User command: "${prompt}"`,
                config: {
                    tools,
                    thinkingConfig: { thinkingBudget: 32768 },
                }
            });

            const functionCalls = response.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
                for(const call of functionCalls) {
                    const { name, args } = call;
                    if (handlers[name]) {
                        // Fill in today's date if missing for time records
                        if (name === 'createTimeRecord' && !args.date) {
                            args.date = today;
                        }
                        const result = await handlers[name](args);
                        showStatus(result || t('command_executed_successfully'));
                    }
                }
                setPrompt('');
            } else {
                showStatus(response.text || t('error_executing_command'));
            }

        } catch (error) {
            console.error("AI Command Bar Error:", error);
            showStatus(error instanceof Error ? error.message : t('error_executing_command'));
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
                const speechResult = event.results[0][0].transcript;
                setPrompt(speechResult);
                setIsListening(false);
                setStatusMessage('');
            };
            recognition.onspeechend = () => {
                recognition.stop();
                setIsListening(false);
                setStatusMessage('');
            };
            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                setStatusMessage(`Error: ${event.error}`);
            };
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-20 main-safe-area !pt-0 !pb-4">
            <div className="relative p-2 bg-black/20 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl max-w-4xl mx-auto">
                {statusMessage && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-auto mb-2 px-4 py-2 bg-black/50 rounded-lg text-white text-sm whitespace-nowrap">
                        {statusMessage}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <BrainIcon className="w-6 h-6 text-[var(--color-accent)] flex-shrink-0 ml-2" />
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={t('ai_command_placeholder')}
                        className="flex-grow w-full bg-transparent text-white placeholder-gray-400 border-none focus:ring-0 text-base"
                        disabled={isLoading}
                    />
                    {recognition && (
                        <button type="button" onClick={toggleListen} disabled={isLoading} className={`p-2 rounded-full transition-colors ${isListening ? 'bg-[var(--color-primary)] animate-pulse' : 'hover:bg-white/10'}`}>
                            <MicrophoneIcon className="w-6 h-6 text-white"/>
                        </button>
                    )}
                    <button type="submit" disabled={isLoading || !prompt.trim()} className="p-2 bg-[var(--color-primary)] rounded-full hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                       <SendIcon className="w-6 h-6 text-white" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AICommandBar;