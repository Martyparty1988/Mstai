

import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import type { Project, ProjectTask } from '../types';
import { useI18n } from '../contexts/I18nContext';
import { GoogleGenAI, Modality } from '@google/genai';

declare const pdfjsLib: any;

// Simple markdown parser for task lists
const parseTaskList = (text: string): string[] => {
  return text.split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- [ ]') || line.startsWith('* [ ]'))
    .map(line => line.replace(/(-|\*)\s?\[\s?\]\s?/, '').trim());
};

// Helper to convert base64 to Blob
const base64ToBlob = (base64: string, contentType = '', sliceSize = 512) => {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, {type: contentType});
}

interface ProjectFormProps {
  project?: Project;
  onClose: () => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ project, onClose }) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'on-hold'>('active');
  const [planFile, setPlanFile] = useState<File | undefined>(undefined);
  const [aiPlanFile, setAiPlanFile] = useState<File | undefined>(undefined);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Omit<ProjectTask, 'id' | 'projectId'>[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRedrawing, setIsRedrawing] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setStatus(project.status);
      setPlanFile(project.planFile);
      setAiPlanFile(project.aiPlanFile);
      setExistingFileName(project.planFile ? project.planFile.name : null);
    }
  }, [project]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
        setPlanFile(file);
        setAiPlanFile(undefined); // Reset AI plan if original changes
        setExistingFileName(file.name);
    } else {
        alert("Please select a valid PDF file.");
    }
  };

  const handleRedrawPlan = async () => {
    if (!planFile) return;
    setIsRedrawing(true);

    try {
        if (!process.env.API_KEY) throw new Error("API key not set");

        const arrayBuffer = await planFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        
        await page.render({ canvasContext: context, viewport }).promise;
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        const base64Data = imageDataUrl.split(',')[1];

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
                    { text: "Redraw this architectural site plan. Trace only the main structural lines, boundaries, and table layouts. Keep the background white and use simple black lines. Remove all text, dimensions, and annotations to create a clean, simplified diagram." }
                ],
            },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.[0];
        if (imagePart?.inlineData) {
            const newBase64 = imagePart.inlineData.data;
            const mimeType = imagePart.inlineData.mimeType;
            const blob = base64ToBlob(newBase64, mimeType);
            const newFile = new File([blob], `ai_${planFile.name.replace('.pdf', '.jpg')}`, { type: mimeType });
            setAiPlanFile(newFile);
        } else {
            throw new Error("AI did not return an image.");
        }

    } catch (err) {
        console.error(err);
        alert(t('ai_response_error'));
    } finally {
        setIsRedrawing(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const projectData: Omit<Project, 'id'> = {
      name,
      description,
      status,
      planFile,
      aiPlanFile,
    };

    try {
        if (project?.id) {
          await db.projects.update(project.id, projectData);
          if (tasks.length > 0) {
            await db.projectTasks.where('projectId').equals(project.id).delete();
            const newTasks = tasks.map(t => ({ ...t, projectId: project.id! }));
            await db.projectTasks.bulkAdd(newTasks as ProjectTask[]);
          }
        } else {
          const newProjectId = await db.projects.add(projectData as Project);
          if (tasks.length > 0) {
            const newTasks = tasks.map(t => ({ ...t, projectId: newProjectId }));
            await db.projectTasks.bulkAdd(newTasks as ProjectTask[]);
          }
        }
        onClose();
    } catch (error) {
        console.error("Failed to save project:", error);
        alert("Failed to save project.");
    }
  };

  const handleGenerateTasks = async () => {
    if (!description.trim()) return;
    setIsGenerating(true);
    try {
      if (!process.env.API_KEY) throw new Error("API key not set");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Based on the following solar project description, generate a checklist of typical tasks. Format each task as a markdown checklist item (e.g., "- [ ] Task description"). Project: ${name}. Description: ${description}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
      });

      const generatedTasks = parseTaskList(response.text);
      setTasks(generatedTasks.map(desc => ({ description: desc, completed: false })));

    } catch (err) {
      console.error(err);
      alert(t('ai_response_error'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-lg p-4">
      <div className="w-full max-w-lg p-8 bg-black/20 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/10 max-h-[90vh] overflow-y-auto">
        <h2 className="text-3xl font-bold mb-6 text-white">{project ? t('edit_project') : t('add_project')}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-lg font-medium text-gray-300 mb-2">{t('project_name')}</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full p-4 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
            />
          </div>
           <div>
            <label htmlFor="description" className="block text-lg font-medium text-gray-300 mb-2">{t('project_description')}</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t('task_generation_placeholder')}
              className="mt-1 block w-full p-4 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={handleGenerateTasks}
              disabled={isGenerating || !description.trim()}
              className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-purple-600/80 text-white font-bold rounded-xl hover:bg-purple-600 transition-all shadow-md text-lg disabled:opacity-50"
            >
              {isGenerating ? t('generating') : t('generate_tasks')}
            </button>
             {tasks.length > 0 && (
              <div className="mt-4 space-y-2 p-4 bg-black/20 rounded-lg">
                  <h4 className="font-bold text-gray-200">Generated Tasks:</h4>
                  <ul className="list-disc list-inside text-gray-300">
                      {tasks.map((task, index) => <li key={index}>{task.description}</li>)}
                  </ul>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="status" className="block text-lg font-medium text-gray-300 mb-2">{t('status')}</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'completed' | 'on-hold')}
              required
              className="mt-1 block w-full p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
            >
              <option value="active">{t('active')}</option>
              <option value="completed">{t('completed')}</option>
              <option value="on-hold">{t('on_hold')}</option>
            </select>
          </div>
          <div>
            <label className="block text-lg font-medium text-gray-300 mb-2">{t('upload_plan')}</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-white/30 rounded-xl">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-400">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-black/20 rounded-md font-medium text-cyan-400 hover:text-cyan-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-cyan-500 px-1">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="application/pdf" onChange={handleFileChange} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PDF up to 10MB</p>
                {existingFileName && <p className="text-sm text-green-400 pt-2">{existingFileName}</p>}
              </div>
            </div>
             {planFile && (
                <div className="mt-4">
                    <button
                        type="button"
                        onClick={handleRedrawPlan}
                        disabled={isRedrawing}
                        className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-cyan-600/80 text-white font-bold rounded-xl hover:bg-cyan-600 transition-all shadow-md text-lg disabled:opacity-50"
                    >
                        {isRedrawing ? t('processing_plan') : t('redraw_plan_with_ai')}
                    </button>
                    {aiPlanFile && <p className="text-sm text-green-400 pt-2 text-center">AI plan generated: {aiPlanFile.name}</p>}
                    <p className="text-xs text-gray-400 mt-2 text-center">{t('redraw_plan_desc')}</p>
                </div>
            )}
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors text-lg"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-md text-lg"
            >
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm;