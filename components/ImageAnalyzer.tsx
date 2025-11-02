
import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useI18n } from '../contexts/I18nContext';
import ImageIcon from './icons/ImageIcon';

// Helper function to convert a File to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const ImageAnalyzer: React.FC = () => {
    const { t } = useI18n();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isThinkingMode, setIsThinkingMode] = useState(false);

    const handleImageChange = (file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
            // Revoke previous object URL to avoid memory leaks
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
            setImageUrl(URL.createObjectURL(file));
            setResult(null);
            setError(null);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleImageChange(e.target.files?.[0] || null);
    };
    
    const handleAnalyze = async () => {
        if (!imageFile || !prompt.trim()) {
            setError(t('image_analyzer_error_no_input'));
            return;
        }

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
            const base64Data = await fileToBase64(imageFile);

            const imagePart = {
                inlineData: {
                    mimeType: imageFile.type,
                    data: base64Data,
                },
            };
            const textPart = { text: prompt };

            const response = await ai.models.generateContent({
                model: isThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash',
                contents: { parts: [imagePart, textPart] },
                ...(isThinkingMode && {
                    config: {
                        thinkingConfig: { thinkingBudget: 32768 }
                    }
                })
            });
            
            setResult(response.text);

        } catch (err) {
            console.error("Gemini API call failed:", err);
            setError(err instanceof Error ? err.message : t('ai_response_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        handleImageChange(e.dataTransfer.files?.[0] || null);
    }, [imageUrl]);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div>
            <h1 className="text-5xl font-bold text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)] mb-8">{t('image_analyzer')}</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Image Upload & Prompt */}
                <div className="space-y-6">
                    <div 
                        className="relative aspect-video w-full bg-black/20 backdrop-blur-2xl rounded-3xl border-2 border-dashed border-white/20 shadow-lg flex items-center justify-center text-gray-400 cursor-pointer transition-colors hover:border-cyan-400"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => document.getElementById('image-analyzer-upload')?.click()}
                    >
                        {imageUrl ? (
                            <img src={imageUrl} alt="For analysis" className="w-full h-full object-contain rounded-3xl p-2" />
                        ) : (
                            <div className="text-center p-4">
                                <ImageIcon className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                                <p>{t('upload_prompt_analyzer')}</p>
                                <p className="text-sm mt-1">{t('or_take_photo')}</p>
                            </div>
                        )}
                         <input
                            type="file"
                            id="image-analyzer-upload"
                            className="sr-only"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileInputChange}
                        />
                    </div>

                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={t('ask_about_image')}
                        rows={3}
                        className="w-full p-4 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
                    />

                    <label htmlFor="thinking-mode-analyzer" className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-white/5 transition">
                        <div className="relative">
                            <input
                                type="checkbox"
                                id="thinking-mode-analyzer"
                                className="peer sr-only"
                                checked={isThinkingMode}
                                onChange={() => setIsThinkingMode(!isThinkingMode)}
                            />
                            <div className="block bg-gray-600 w-14 h-8 rounded-full peer-checked:bg-[var(--color-primary)] transition"></div>
                            <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-full"></div>
                        </div>
                        <div className="ml-3 text-white">
                            <div className="font-bold">{t('thinking_mode')}</div>
                            <div className="text-sm text-gray-400">{t('thinking_mode_desc')}</div>
                        </div>
                    </label>

                    <button
                        onClick={handleAnalyze}
                        disabled={loading || !imageFile || !prompt.trim()}
                        className="w-full px-8 py-4 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? t('analyzing') : t('analyze_image')}
                    </button>
                </div>

                {/* Results */}
                <div className="bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg p-8 min-h-[50vh] flex flex-col">
                    <h2 className="text-3xl font-bold text-white mb-4 flex-shrink-0">{t('analysis_result')}</h2>
                    <div className="flex-grow overflow-y-auto">
                        {loading && (
                            <div className="flex justify-center items-center h-full">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                            </div>
                        )}
                        {error && (
                            <div className="p-4 bg-red-900/50 text-red-200 border border-red-700 rounded-xl">
                                {error}
                            </div>
                        )}
                        {result && (
                            <div 
                                className="prose prose-invert max-w-none text-gray-200 text-lg leading-relaxed whitespace-pre-wrap"
                                style={{'--tw-prose-bold': 'var(--color-accent)'} as React.CSSProperties}
                            >
                              {result}
                            </div>
                        )}
                        {!loading && !error && !result && (
                            <p className="text-gray-400 text-center pt-16">{t('analysis_will_appear_here')}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageAnalyzer;
