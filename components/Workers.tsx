import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import type { Worker } from '../types';
import WorkerForm from './WorkerForm';

const Workers: React.FC = () => {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  const workers = useLiveQuery(() => db.workers.toArray(), []);

  const filteredWorkers = useMemo(() => {
    if (!workers) return [];
    if (!searchTerm) return workers;
    return workers.filter(worker =>
      worker.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [workers, searchTerm]);

  const handleAdd = () => {
    setSelectedWorker(undefined);
    setShowForm(true);
  };

  const handleEdit = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('confirm_delete'))) {
      await db.workers.delete(id);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-5xl font-bold text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)]">{t('workers')}</h1>
        <button
          onClick={handleAdd}
          className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-lg text-lg"
        >
          {t('add_worker')}
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder={`${t('search')}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md p-4 bg-black/20 text-white placeholder-gray-300 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
        />
      </div>

      <div className="bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/10">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('worker_name')}</th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('hourly_rate')}</th>
                <th scope="col" className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredWorkers?.map((worker) => (
                <tr key={worker.id} className="hover:bg-white/10 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap text-lg font-medium text-white">{worker.id}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-lg text-gray-200">{worker.name}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-lg text-gray-200">{worker.hourlyRate}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-lg font-bold space-x-6">
                    <button onClick={() => handleEdit(worker)} className="text-blue-400 hover:underline">{t('edit_worker')}</button>
                    <button onClick={() => handleDelete(worker.id!)} className="text-pink-500 hover:underline">{t('delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
           {filteredWorkers?.length === 0 && (
            <div className="text-center py-12 text-gray-300 text-lg">
              {t('no_data')}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <WorkerForm
          worker={selectedWorker}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

export default Workers;