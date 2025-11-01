

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { GoogleGenAI } from '@google/genai';
import { db } from '../services/db';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { Worker, Project } from '../types';
import type { Table } from 'dexie';

declare const pdfjsLib: any;

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const DESTINATION_SCHEMAS = {
  workers: {
    name: { type: 'string', required: true },
    hourlyRate: { type: 'number', required: true },
  },
  projects: {
    name: { type: 'string', required: true },
    description: { type: 'string', required: false },
    status: { type: "'active' | 'completed' | 'on-hold'", required: true },
  },
};

type DestinationType = keyof typeof DESTINATION_SCHEMAS;

const DataImporter: React.FC = () => {
    const { t } = useI18n();
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [rawData, setRawData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [destination, setDestination] = useState<DestinationType>('workers');
    const [mappings, setMappings] = useState<{ [key: string]: string }>({});
    const [duplicateHandling, setDuplicateHandling] = useState<'merge' | 'skip'>('skip');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [importResult, setImportResult] = useState<{ new: number, updated: number, skipped: number, warnings: string[] } | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const destinationFields = Object.keys(DESTINATION_SCHEMAS[destination]);

    const resetState = () => {
        setStep(1);
        setFile(null);
        setRawData([]);
        setHeaders([]);
        setMappings({});
        setIsLoading(false);
        setLoadingMessage('');
        setImportResult(null);
    };
    
    // --- Step 1: File Upload and Parsing ---
    const handleFile = async (selectedFile: File) => {
        setFile(selectedFile);
        setIsLoading(true);
        const fileType = selectedFile.type;
        const extension = selectedFile.name.split('.').pop()?.toLowerCase();

        try {
            if (['csv', 'txt'].includes(extension!)) {
                setLoadingMessage('Parsing CSV...');
                Papa.parse(selectedFile, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        setRawData(results.data);
                        setHeaders(results.meta.fields || []);
                        setStep(2);
                    },
                });
            } else if (['xls', 'xlsx'].includes(extension!)) {
                setLoadingMessage('Parsing Excel file...');
                const reader = new FileReader();
                reader.onload = (e) => {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    const [headerRow, ...dataRows] = json as any[][];
                    setHeaders(headerRow);
                    setRawData(dataRows.map(row => headerRow.reduce((obj, h, i) => ({...obj, [h]: row[i]}), {})));
                    setStep(2);
                };
                reader.readAsArrayBuffer(selectedFile);
            } else if (fileType === 'application/json' || extension === 'json') {
                 setLoadingMessage('Parsing JSON...');
                const text = await selectedFile.text();
                const data = JSON.parse(text);
                if (Array.isArray(data) && data.length > 0) {
                    setRawData(data);
                    setHeaders(Object.keys(data[0]));
                    setStep(2);
                } else { throw new Error("JSON must be an array of objects."); }
            } else if (['image/jpeg', 'image/png', 'application/pdf'].includes(fileType)) {
                setLoadingMessage(t('ai_extraction_in_progress'));
                 if (!process.env.API_KEY) throw new Error("API key not set");
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                const base64Data = await fileToBase64(selectedFile);
                const filePart = { inlineData: { data: base64Data, mimeType: selectedFile.type } };

                const prompt = `You are an expert data extraction tool. Analyze this document/image, which contains tabular data about ${destination}. 
                Extract all data rows. Your output MUST be a valid JSON array of objects.
                Each object must have keys corresponding to the fields: ${destinationFields.join(', ')}.
                Translate all extracted text values into Czech.`;
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-pro',
                    contents: { parts: [filePart, { text: prompt }] },
                });

                const resultJson = JSON.parse(response.text.replace(/```json|```/g, ''));
                if (Array.isArray(resultJson) && resultJson.length > 0) {
                    setRawData(resultJson);
                    setHeaders(Object.keys(resultJson[0]));
                    setStep(2);
                } else { throw new Error("AI could not extract structured data."); }

            } else {
                throw new Error("Unsupported file type.");
            }
        } catch (error) {
            alert(`Error: ${error instanceof Error ? error.message : 'Could not process file.'}`);
            resetState();
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- Step 2: Field Mapping ---
    useEffect(() => {
        if (step === 2 && headers.length > 0) {
            const autoMap = async () => {
                setIsLoading(true);
                setLoadingMessage(t('auto_mapping_in_progress'));
                try {
                    if (!process.env.API_KEY) throw new Error("API key not set");
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const schema = DESTINATION_SCHEMAS[destination];
                    const prompt = `Map the source columns to the destination fields. Source: [${headers.join(', ')}]. Destination schema: ${JSON.stringify(schema)}. Respond ONLY with a valid JSON object where keys are the source columns and values are the corresponding destination fields. If a column doesn't map, use null as the value.`;
                    
                    const response = await ai.models.generateContent({
                      model: 'gemini-2.5-flash',
                      contents: prompt,
                    });
                    
                    const suggestedMappings = JSON.parse(response.text.replace(/```json|```/g, ''));
                    const validMappings: { [key: string]: string } = {};
                    for(const header of headers) {
                        const destField = suggestedMappings[header];
                        if (destField && destinationFields.includes(destField)) {
                            validMappings[header] = destField;
                        }
                    }
                    setMappings(validMappings);
                } catch(error) {
                    console.error("Auto-mapping failed", error);
                } finally {
                    setIsLoading(false);
                }
            };
            autoMap();
        }
    }, [step, headers, destination]);

    // --- Step 3: Preview ---
    const previewData = useMemo(() => {
        if (step !== 3) return [];
        return rawData.slice(0, 5).map(row => {
            const newRow: { [key: string]: any } = {};
            for(const destField of destinationFields) {
                const sourceHeader = Object.keys(mappings).find(h => mappings[h] === destField);
                newRow[destField] = sourceHeader ? row[sourceHeader] : null;
            }
            return newRow;
        });
    }, [step, rawData, mappings, destination, destinationFields]);
    
    // --- Step 4: Import ---
    const handleImport = async () => {
        setStep(4);
        setIsLoading(true);
        
        let newCount = 0, updatedCount = 0, skippedCount = 0;
        const warnings: string[] = [];

        const unmappedHeaders = headers.filter(h => !Object.keys(mappings).includes(h) || !mappings[h]);
        if (unmappedHeaders.length > 0) {
            warnings.push(t('unmapped_columns_were_ignored', {count: unmappedHeaders.length}));
        }

        const table = db[destination];

        for (const row of rawData) {
            const newRecord: { [key: string]: any } = {};
            let uniqueIdentifier: string | null = null;
            
            for (const header in mappings) {
                if (mappings[header]) {
                    newRecord[mappings[header]] = row[header];
                    if (mappings[header] === 'name') {
                        uniqueIdentifier = row[header];
                    }
                }
            }

            if(destination === 'workers') {
                newRecord.createdAt = new Date();
            }

            if (!uniqueIdentifier) {
                if (destination === 'workers') {
                    await (table as Table<Worker>).add(newRecord as Worker);
                } else if (destination === 'projects') {
                    await (table as Table<Project>).add(newRecord as Project);
                }
                newCount++;
                continue;
            }

            const existing = await table.where('name').equalsIgnoreCase(uniqueIdentifier).first();
            
            if (existing) {
                if (duplicateHandling === 'skip') {
                    skippedCount++;
                    continue;
                } else if (duplicateHandling === 'merge') {
                    await table.update(existing.id, newRecord);
                    updatedCount++;
                }
            } else {
                if (destination === 'workers') {
                    await (table as Table<Worker>).add(newRecord as Worker);
                } else if (destination === 'projects') {
                    await (table as Table<Project>).add(newRecord as Project);
                }
                newCount++;
            }
        }
        
        setImportResult({ new: newCount, updated: updatedCount, skipped: skippedCount, warnings });
        setIsLoading(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragOver(true);
        } else if (e.type === 'dragleave') {
            setIsDragOver(false);
        }
    };

    // --- RENDER LOGIC ---
    return (
        <div>
            <h1 className="text-5xl font-bold text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)] mb-8">{t('import_data_title')}</h1>

            <div className="p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg min-h-[60vh]">
                {isLoading && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div><p className="mt-4 text-white">{loadingMessage}</p></div>}
                
                {/* --- Step 1: Upload --- */}
                {step === 1 && (
                    <div>
                        <h2 className="text-3xl font-bold mb-6 text-white">{t('step_1_upload_title')}</h2>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="destination" className="block text-lg font-medium text-gray-300 mb-2">{t('select_import_type')}</label>
                                <select id="destination" value={destination} onChange={e => setDestination(e.target.value as DestinationType)} className="w-full max-w-sm p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800">
                                    <option value="workers">{t('workers')}</option>
                                    <option value="projects">{t('projects')}</option>
                                </select>
                            </div>
                            <div 
                                onDrop={handleDrop} onDragEnter={handleDragEvents} onDragLeave={handleDragEvents} onDragOver={handleDragEvents}
                                className={`mt-1 flex justify-center px-6 pt-10 pb-12 border-2 ${isDragOver ? 'border-cyan-400' : 'border-dashed border-white/30'} rounded-xl cursor-pointer transition-colors`}
                                onClick={() => document.getElementById('file-upload-importer')?.click()}
                            >
                                <div className="space-y-1 text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    <div className="flex text-sm text-gray-400"><p className="pl-1">{t('upload_file_area')}</p></div>
                                    <p className="text-xs text-gray-500">{t('supported_formats')}</p>
                                    <input id="file-upload-importer" type="file" className="sr-only" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* --- Step 2: Mapping --- */}
                {step === 2 && (
                    <div>
                        <h2 className="text-3xl font-bold mb-6 text-white">{t('step_2_map_title')}</h2>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {headers.map(header => (
                                <div key={header} className="grid grid-cols-2 gap-4 items-center p-3 bg-white/5 rounded-lg">
                                    <span className="font-bold text-gray-200 truncate" title={header}>{header}</span>
                                    <select value={mappings[header] || ''} onChange={e => setMappings({...mappings, [header]: e.target.value})} className="p-2 bg-black/20 text-white border border-white/20 rounded-lg focus:ring-blue-400 focus:border-blue-400 [&>option]:bg-gray-800">
                                        <option value="">{t('unmapped')}</option>
                                        {destinationFields.map(field => <option key={field} value={field}>{field}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-8">
                            <button onClick={() => resetState()} className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20">{t('back_step')}</button>
                            <button onClick={() => setStep(3)} className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)]">{t('next_step')}</button>
                        </div>
                    </div>
                )}
                
                {/* --- Step 3: Preview --- */}
                {step === 3 && (
                     <div>
                        <h2 className="text-3xl font-bold mb-2 text-white">{t('step_3_preview_title')}</h2>
                        <p className="text-gray-400 mb-6">{t('preview_data')}</p>
                        <div className="overflow-x-auto bg-black/20 rounded-lg border border-white/10 mb-6">
                            <table className="min-w-full">
                                <thead className="bg-white/10"><tr className="text-left">{destinationFields.map(field => <th key={field} className="p-3 font-bold">{field}</th>)}</tr></thead>
                                <tbody>{previewData.map((row, i) => <tr key={i} className="border-t border-white/10">{destinationFields.map(field => <td key={field} className="p-3 truncate max-w-xs">{String(row[field])}</td>)}</tr>)}</tbody>
                            </table>
                        </div>
                         <div className="p-4 bg-black/20 rounded-lg">
                            <label className="block text-lg font-medium text-gray-300 mb-2">{t('duplicates_handling')}</label>
                            <select value={duplicateHandling} onChange={e => setDuplicateHandling(e.target.value as 'merge' | 'skip')} className="w-full max-w-sm p-3 bg-black/30 text-white border border-white/20 rounded-lg focus:ring-blue-400 focus:border-blue-400 [&>option]:bg-gray-800">
                                <option value="skip">{t('skip_duplicates')}</option>
                                <option value="merge">{t('merge_on_name')}</option>
                            </select>
                         </div>
                        <div className="flex justify-between mt-8">
                            <button onClick={() => setStep(2)} className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20">{t('back_step')}</button>
                            <button onClick={handleImport} className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)]">{t('start_import')}</button>
                        </div>
                    </div>
                )}

                {/* --- Step 4: Results --- */}
                {step === 4 && importResult && (
                    <div className="text-center">
                        <h2 className="text-3xl font-bold mb-6 text-white">{t('import_summary')}</h2>
                        <div className="space-y-3 text-lg text-gray-200">
                            <p className="text-green-400">{t('new_records_imported', {count: importResult.new})}</p>
                            <p className="text-blue-400">{t('records_updated', {count: importResult.updated})}</p>
                            <p className="text-gray-400">{t('records_skipped', {count: importResult.skipped})}</p>
                            {importResult.warnings.length > 0 && <div className="pt-4 mt-4 border-t border-white/10"><h3 className="font-bold text-yellow-400">{t('import_warnings')}</h3><p>{importResult.warnings.join(', ')}</p></div>}
                        </div>
                        <button onClick={resetState} className="mt-8 px-8 py-4 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)]">{t('import_another_file')}</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataImporter;