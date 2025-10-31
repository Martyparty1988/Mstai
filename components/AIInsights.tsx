


import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { GoogleGenAI } from '@google/genai';
import { useI18n } from '../contexts/I18nContext';
import { db } from '../services/db';

const AIInsights: React.FC = () => {
    const { t } = useI18n();
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);

    // Fetch all necessary data for the AI context
    const workers = useLiveQuery(() => db.workers.toArray());
    const projects = useLiveQuery(() => db.projects.toArray());
    const records = useLiveQuery(() => db.records.toArray());
    const solarTables = useLiveQuery(() => db.solarTables.toArray());
    const tableAssignments = useLiveQuery(() => db.tableAssignments.toArray());
    
    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        if (!process.env.API_KEY) {
            setError("API key is not configured.");
            setLoading(false);
            return;
        }
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Sanitize project data (remove file blobs)
            const projectsForAI = projects?.map(({planFile, ...rest}) => rest);

            // Create a map for quick worker name lookup
            const workerMap = new Map(workers?.map(w => [w.id!, w.name]));

            // Resolve worker names in assignments for better AI context
            const assignmentsWithNames = tableAssignments?.map(a => ({
                tableId: a.tableId,
                workerId: a.workerId,
                workerName: workerMap.get(a.workerId) || 'Unknown Worker'
            }));

            const dataContext = JSON.stringify({
                workers,
                projects: projectsForAI,
                records,
                solarTables,
                tableAssignments: assignmentsWithNames,
            }, null, 2);

            const fullPrompt = `
                Based on the following JSON data from a solar project management application, please answer the user's question.
                The data includes workers, projects, time records, a list of all solar tables with their status (pending/completed), and which workers are assigned to which tables.
                Provide a concise and clear answer. You can use markdown for formatting if it helps clarity (e.g., lists, bold text).

                DATA CONTEXT:
                ${dataContext}

                USER'S QUESTION:
                "${prompt}"
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: fullPrompt,
            });

            setResult(response.text);

        } catch (err) {
            console.error("Gemini API call failed:", err);
            setError(t('ai_response_error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="bg-black/20 rounded-2xl border border-white/10">
                 <form onSubmit={handleGenerate} className="flex flex-col md:flex-row gap-4 p-4">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={t('ask_ai_placeholder')}
                        className="flex-grow p-4 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] text-lg"
                    />
                    <button
                        type="submit"
                        disabled={loading || !prompt.trim()}
                        className="px-8 py-4 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? t('generating') : t('generate_insight')}
                    </button>
                </form>
            </div>

            {loading && (
                 <div className="flex justify-center items-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
            )}

            {error && (
                <div className="p-4 mt-6 bg-red-900/50 text-red-200 border border-red-700 rounded-xl">
                    {error}
                </div>
            )}

            {result && (
                 <div className="p-6 mt-6 bg-black/20 rounded-2xl border border-white/10">
                    <div 
                        className="prose prose-invert max-w-none text-gray-200 text-lg leading-relaxed whitespace-pre-wrap"
                        style={{'--tw-prose-bold': 'var(--color-accent)'} as React.CSSProperties}
                    >
                      {result}
                    </div>
                </div>
            )}

        </div>
    );
};

export default AIInsights;