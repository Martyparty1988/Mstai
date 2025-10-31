
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { TimeRecord } from '../types';
import { useI18n } from '../contexts/I18nContext';
import { GoogleGenAI } from '@google/genai';
import BrainIcon from './icons/BrainIcon';

interface TimeRecordFormProps {
  record?: TimeRecord;
  onClose: () => void;
}

const toInputDateTime = (date?: Date): string => {
  if (!date) return '';
  const d = new Date(date);
  // Adjust for timezone offset before converting to ISO string
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
};


const TimeRecordForm: React.FC<TimeRecordFormProps> = ({ record, onClose }) => {
  const { t } = useI18n();
  const [workerId, setWorkerId] = useState<number | ''>('');
  const [projectId, setProjectId] = useState<number | ''>('');
  const [startTime, setStartTime] = useState(toInputDateTime(new Date()));
  const [endTime, setEndTime] = useState(toInputDateTime(new Date()));
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const workers = useLiveQuery(() => db.workers.toArray(), []);
  const projects = useLiveQuery(() => db.projects.toArray(), []);

  const worker = useLiveQuery(() => workerId ? db.workers.get(Number(workerId)) : undefined, [workerId]);
  const project = useLiveQuery(() => projectId ? db.projects.get(Number(projectId)) : undefined, [projectId]);

  useEffect(() => {
    if (record) {
      setWorkerId(record.workerId);
      setProjectId(record.projectId);
      setStartTime(toInputDateTime(record.startTime));
      setEndTime(toInputDateTime(record.endTime));
      setDescription(record.description);
    }
  }, [record]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId || !projectId || !startTime || !endTime) {
      alert("Please fill all required fields.");
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      alert(t('end_time_error'));
      return;
    }

    const recordData: Omit<TimeRecord, 'id'> = {
      workerId: Number(workerId),
      projectId: Number(projectId),
      startTime: start,
      endTime: end,
      description,
    };

    try {
      if (record?.id) {
        await db.records.update(record.id, recordData);
      } else {
        await db.records.add(recordData);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save time record:", error);
      alert("Failed to save time record.");
    }
  };

  const handleSuggestDescription = async () => {
    if (!worker || !project || !startTime || !endTime) return;
    setIsGenerating(true);
    try {
      if (!process.env.API_KEY) throw new Error("API key not set");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime();
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const durationStr = `${hours} hours and ${minutes} minutes`;

      const prompt = `Generate a short, professional work log description. Worker: ${worker.name}. Project: ${project.name}. Duration: ${durationStr}. The description should be a plausible task for a solar panel installation project.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setDescription(response.text.trim());

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
        <h2 className="text-3xl font-bold mb-6 text-white">{record ? t('edit_record') : t('add_record')}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="workerId" className="block text-lg font-medium text-gray-300 mb-2">{t('worker_name')}</label>
            <select
              id="workerId"
              value={workerId}
              onChange={(e) => setWorkerId(Number(e.target.value))}
              required
              className="mt-1 block w-full p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
            >
              <option value="" disabled>{t('select_worker')}</option>
              {workers?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="projectId" className="block text-lg font-medium text-gray-300 mb-2">{t('project_name')}</label>
            <select
              id="projectId"
              value={projectId}
              onChange={(e) => setProjectId(Number(e.target.value))}
              required
              className="mt-1 block w-full p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
            >
              <option value="" disabled>{t('select_project')}</option>
              {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="startTime" className="block text-lg font-medium text-gray-300 mb-2">{t('start_time')}</label>
            <input
              type="datetime-local"
              id="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="mt-1 block w-full p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
            />
          </div>
          <div>
            <label htmlFor="endTime" className="block text-lg font-medium text-gray-300 mb-2">{t('end_time')}</label>
            <input
              type="datetime-local"
              id="endTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="mt-1 block w-full p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="description" className="block text-lg font-medium text-gray-300">{t('description')}</label>
              <button 
                type="button"
                onClick={handleSuggestDescription}
                disabled={!workerId || !projectId || !startTime || !endTime || isGenerating}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-600/80 text-white font-bold rounded-lg hover:bg-purple-600 transition-all shadow-sm disabled:opacity-50"
                title={t('suggest_description')}
              >
                <BrainIcon className="w-4 h-4" />
                {isGenerating ? t('generating') : t('suggest_description')}
              </button>
            </div>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
              className="mt-1 block w-full p-4 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
            />
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

export default TimeRecordForm;
