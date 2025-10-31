
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useI18n } from '../contexts/I18nContext';
import ImageIcon from './icons/ImageIcon';

const ImageGenerator: React.FC = () => {
    const { t } = useI18n();
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }

        setLoading(true);
        setError(null);
        setGeneratedImageUrl(null);

        if (!process.env.API_KEY) {
            setError("API key is not configured.");
            setLoading(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: aspectRatio,
                },
            });
            
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
            setGeneratedImageUrl(imageUrl);

        } catch (err) {
            console.error("Gemini API call failed:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred while generating the image.");
        } finally {
            setLoading(false);
        }
    };

    const aspectRatios: { value: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'; label: string }[] = [
        { value: '1:1', label: 'Square (1:1)' },
        { value: '16:9', label: 'Widescreen (16:9)' },
        { value: '9:16', label: 'Portrait (9:16)' },
        { value: '4:3', label: 'Landscape (4:3)' },
        { value: '3:4', label: 'Tall (3:4)' },
    ];

    return (
        <div>
            <h1 className="text-5xl font-bold text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)] mb-8">{t('image_generator')}</h1>

            <div className="p-6 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg mb-8 space-y-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('prompt_placeholder_generator')}
                    rows={3}
                    className="w-full p-4 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
                />
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-grow">
                        <label htmlFor="aspect-ratio" className="sr-only">{t('aspect_ratio')}</label>
                        <select
                            id="aspect-ratio"
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value as any)}
                            className="w-full p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
                        >
                            {aspectRatios.map(ar => <option key={ar.value} value={ar.value}>{ar.label}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !prompt.trim()}
                        className="px-8 py-4 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? t('generating_image') : t('generate_image')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 mb-8 bg-red-900/50 text-red-200 border border-red-700 rounded-xl">
                    {error}
                </div>
            )}
            
            <div className="w-full bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg flex items-center justify-center p-4 min-h-[50vh]">
                {loading ? (
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
                ) : generatedImageUrl ? (
                    <img src={generatedImageUrl} alt="Generated" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
                ) : (
                    <div className="text-center text-gray-400">
                        <ImageIcon className="w-24 h-24 mx-auto text-gray-600 mb-4" />
                        <p className="text-xl">{t('image_will_appear_here')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageGenerator;
