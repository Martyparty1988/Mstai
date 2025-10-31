import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useI18n } from '../contexts/I18nContext';

const ProjectFinder: React.FC = () => {
    const { t } = useI18n();
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ text: string; chunks: any[] } | null>(null);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (geolocationError) => {
                console.error("Geolocation error:", geolocationError);
                setError(t('location_permission_denied'));
            }
        );
    }, [t]);
    
    const handleSearch = async (e: React.FormEvent) => {
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
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ googleMaps: {} }],
                },
                ...(location && {
                    toolConfig: {
                        retrievalConfig: {
                            latLng: location,
                        },
                    },
                }),
            });

            const text = response.text;
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            
            setResult({ text, chunks });

        } catch (err) {
            console.error("Gemini API call failed:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const renderChunk = (chunk: any, index: number) => {
        if (chunk.maps) {
            return (
                <a
                    key={index}
                    href={chunk.maps.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                >
                    <p className="font-bold text-cyan-400">{chunk.maps.title}</p>
                    {chunk.maps.placeAnswerSources?.reviewSnippets?.map((snippet: any, i: number) => (
                        <blockquote key={i} className="mt-2 pl-4 border-l-2 border-cyan-500 text-sm text-gray-300">
                           "{snippet.text}"
                        </blockquote>
                    ))}
                </a>
            );
        }
        return null;
    };


    return (
        <div>
            <h1 className="text-5xl font-bold text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)] mb-4">{t('project_finder')}</h1>
            <p className="text-lg text-gray-300 mb-8">{t('find_projects_nearby')}</p>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-8">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('search_projects')}
                    className="flex-grow p-4 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
                />
                <button
                    type="submit"
                    disabled={loading || !prompt.trim()}
                    className="px-8 py-4 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? t('looking_for_projects') : t('search')}
                </button>
            </form>

            {error && !loading && (
                <div className="p-4 bg-yellow-900/50 text-yellow-200 border border-yellow-700 rounded-xl">
                    {error}
                </div>
            )}

            {loading && (
                 <div className="flex justify-center items-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
            )}

            {result && (
                <div className="space-y-8">
                    <div className="p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg">
                        <div 
                            className="prose prose-invert max-w-none text-gray-200 text-lg leading-relaxed whitespace-pre-wrap"
                        >
                          {result.text}
                        </div>
                    </div>

                    {result.chunks.length > 0 && (
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-4">{t('sources')}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {result.chunks.map(renderChunk)}
                            </div>
                        </div>
                    )}

                    {!result.text && result.chunks.length === 0 && (
                        <p className="text-center text-gray-300 py-12 text-lg">{t('no_results_found')}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProjectFinder;
