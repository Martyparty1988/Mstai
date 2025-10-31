

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
// Fix: PlanWorker type is obsolete and removed from types.ts.
// import type { PlanWorker } from '../types';
import { useI18n } from '../contexts/I18nContext';

// Fix: Define a placeholder type for the obsolete PlanWorker.
// This component is obsolete and its logic is now in Plan.tsx's TableManagementModal.
type PlanWorker = {
  id?: number;
  projectId: number;
  workerId: number;
  x: number;
  y: number;
  role: string;
};

interface PlanWorkerFormProps {
  assignment?: PlanWorker;
  coords?: { x: number, y: number };
  projectId: number;
  onClose: () => void;
}

const PlanWorkerForm: React.FC<PlanWorkerFormProps> = ({ assignment, coords, projectId, onClose }) => {
  const { t } = useI18n();
  const [workerId, setWorkerId] = useState<number | ''>('');
  const [role, setRole] = useState('');

  const workers = useLiveQuery(() => db.workers.toArray());

  useEffect(() => {
    if (assignment) {
      setWorkerId(assignment.workerId);
      setRole(assignment.role);
    }
  }, [assignment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workerId) {
      alert(t('worker_required'));
      return;
    }

    if (!role.trim()) {
      alert(t('worker_role_required'));
      return;
    }

    const finalRole = role.trim();

    // Fix: Commented out DB logic as db.planWorkers no longer exists.
    /*
    if (assignment?.id) {
        await db.planWorkers.update(assignment.id, { workerId: Number(workerId), role: finalRole });
    } else if (coords) {
        const workerData: Omit<PlanWorker, 'id'> = {
            projectId,
            workerId: Number(workerId),
            x: coords.x,
            y: coords.y,
            role: finalRole,
        };
        await db.planWorkers.add(workerData as PlanWorker);
    }
    */
    console.warn('Attempted to save an obsolete PlanWorker assignment. This feature has been replaced.');
    onClose();
  };
  
  const handleDelete = async () => {
    // Fix: Commented out DB logic as db.planWorkers no longer exists.
    /*
      if (assignment?.id && window.confirm(t('confirm_delete'))) {
          await db.planWorkers.delete(assignment.id);
          onClose();
      }
    */
    console.warn('Attempted to delete an obsolete PlanWorker assignment. This feature has been replaced.');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-lg p-4">
      <div className="w-full max-w-lg p-8 bg-black/20 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/10">
        <h2 className="text-3xl font-bold mb-6 text-white">{assignment ? t('edit_assignment') : t('assign_worker')}</h2>
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
            <label htmlFor="role" className="block text-lg font-medium text-gray-300 mb-2">{t('worker_role')}</label>
            <input
              type="text"
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="mt-1 block w-full p-4 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
            />
          </div>
          <div className="flex justify-between items-center pt-4">
            <div>
              {assignment && (
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

export default PlanWorkerForm;