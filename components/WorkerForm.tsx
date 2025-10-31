import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import type { Worker } from '../types';
import { useI18n } from '../contexts/I18nContext';

interface WorkerFormProps {
  worker?: Worker;
  onClose: () => void;
}

const WorkerForm: React.FC<WorkerFormProps> = ({ worker, onClose }) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [hourlyRate, setHourlyRate] = useState('0');

  useEffect(() => {
    if (worker) {
      setName(worker.name);
      setHourlyRate(String(worker.hourlyRate));
    } else {
      setName('');
      setHourlyRate('0');
    }
  }, [worker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const workerData: Omit<Worker, 'id'> = {
      name,
      hourlyRate: Number(hourlyRate) || 0,
      createdAt: worker?.createdAt || new Date(),
    };

    if (worker?.id) {
      await db.workers.update(worker.id, workerData);
    } else {
      await db.workers.add(workerData as Worker);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-lg p-4">
      <div className="w-full max-w-lg p-8 bg-black/20 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/10">
        <h2 className="text-3xl font-bold mb-6 text-white">{worker ? t('edit_worker') : t('add_worker')}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-lg font-medium text-gray-300 mb-2">{t('worker_name')}</label>
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
            <label htmlFor="hourlyRate" className="block text-lg font-medium text-gray-300 mb-2">{t('hourly_rate')}</label>
            <input
              type="number"
              id="hourlyRate"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              required
              step="0.01"
              min="0"
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

export default WorkerForm;