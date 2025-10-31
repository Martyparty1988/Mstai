

import React, { useState, useEffect } from 'react';
// Fix: db import removed as planTasks table is obsolete.
// import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';

// Fix: Define a placeholder type for the obsolete PlanTask, as it's removed from types.ts.
// This component is obsolete and its logic is now in Plan.tsx's TableManagementModal.
type PlanTask = { 
  id?: number; 
  description: string;
  projectId: number;
  x: number;
  y: number;
};

interface PlanTaskFormProps {
  task?: PlanTask;
  coords?: { x: number, y: number };
  projectId: number;
  onClose: () => void;
}

const PlanTaskForm: React.FC<PlanTaskFormProps> = ({ task, coords, projectId, onClose }) => {
  const { t } = useI18n();
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (task) {
      setDescription(task.description);
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;
    
    // Fix: Commented out DB logic as db.planTasks no longer exists.
    /*
    if (task?.id) {
        await db.planTasks.update(task.id, { description });
    } else if (coords) {
        const taskData: Omit<PlanTask, 'id'> = {
            projectId,
            x: coords.x,
            y: coords.y,
            description,
        };
        await db.planTasks.add(taskData as PlanTask);
    }
    */
    console.warn('Attempted to save an obsolete PlanTask. This feature has been replaced.');
    onClose();
  };
  
  const handleDelete = async () => {
      // Fix: Commented out DB logic as db.planTasks no longer exists.
      /*
      if (task?.id && window.confirm(t('confirm_delete'))) {
          await db.planTasks.delete(task.id);
          onClose();
      }
      */
      console.warn('Attempted to delete an obsolete PlanTask. This feature has been replaced.');
      onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-lg p-4">
      <div className="w-full max-w-lg p-8 bg-black/20 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/10">
        <h2 className="text-3xl font-bold mb-6 text-white">{task ? t('edit_task') : t('add_task')}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="description" className="block text-lg font-medium text-gray-300 mb-2">{t('task_description')}</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
              className="mt-1 block w-full p-4 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
            />
          </div>
          <div className="flex justify-between items-center pt-4">
            <div>
              {task && (
                <button
                    type="button"
                    onClick={handleDelete}
                    className="px-6 py-3 bg-pink-600/80 text-white font-bold rounded-xl hover:bg-pink-600 transition-colors text-lg"
                >
                    {t('delete')}
                </button>
              )}
            </div>
            <div className="flex justify-end space-x-4">
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
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanTaskForm;