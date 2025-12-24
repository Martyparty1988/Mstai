
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import type { Worker } from '../types';
import WorkerForm from './WorkerForm';
import { useAuth } from '../contexts/AuthContext';
import ConfirmationModal from './ConfirmationModal';
import PlusIcon from './icons/PlusIcon';

const WorkerCard: React.FC<{
    worker: Worker;
    index: number;
    isAdmin: boolean;
    onEdit: (w: Worker) => void;
    onDelete: (w: Worker) => void;
}> = ({ worker, index, isAdmin, onEdit, onDelete }) => {
    const { t } = useI18n();
    
    return (
        <div 
            className="group glass-card rounded-3xl p-6 border border-white/10 hover:border-[var(--color-accent)]/30 transition-all flex items-center justify-between animate-list-item"
            style={{ animationDelay: `${index * 0.05}s` }}
        >
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg group-hover:rotate-3 transition-transform">
                    {worker.name.charAt(0)}
                </div>
                <div>
                    <h3 className="text-xl font-black text-white italic tracking-tight">{worker.name}</h3>
                    {isAdmin && (
                        <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest mt-1">
                            {t('hourly_rate')}: <span className="text-[var(--color-accent)]">€{Number(worker.hourlyRate).toFixed(2)}</span>
                        </p>
                    )}
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => onEdit(worker)} className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => onDelete(worker)} className="p-3 text-gray-400 hover:text-pink-500 hover:bg-pink-500/5 rounded-2xl transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        </div>
    );
};

const Workers: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);
  const [editingWorker, setEditingWorker] = useState<Worker | undefined>(undefined);

  const workers = useLiveQuery(() => db.workers.toArray(), []);

  const filteredWorkers = useMemo(() => {
    if (!workers) return [];
    return workers
        .filter(worker => worker.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [workers, searchTerm]);

  const handleAdd = () => {
    setEditingWorker(undefined);
    setShowForm(true);
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setShowForm(true);
  };

  const confirmDelete = (worker: Worker) => {
    setWorkerToDelete(worker);
  };

  const handleDelete = async () => {
    if (workerToDelete?.id) {
      await db.workers.delete(workerToDelete.id);
      setWorkerToDelete(null);
    }
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-[0.8]">
               {t('workers')}
            </h1>
            <p className="text-xl text-gray-400 font-bold tracking-tight">
              Správa týmu pracovníků a jejich finančních ohodnocení.
            </p>
          </div>
          <button onClick={handleAdd} className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-[var(--color-accent)] hover:text-white transition-all shadow-[0_10px_30px_rgba(255,255,255,0.2)]">
            <PlusIcon className="w-5 h-5" />
            {t('add_worker')}
          </button>
      </header>

      <div className="p-4 glass-card rounded-[2rem] border-white/5">
        <div className="relative w-full max-w-xl mx-auto md:mx-0">
            <input
                type="text"
                placeholder={`${t('search')}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-black/40 text-white placeholder-gray-500 border-none rounded-2xl focus:ring-2 focus:ring-[var(--color-accent)] text-sm font-bold uppercase tracking-widest"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkers.map((worker, idx) => (
            <WorkerCard 
                key={worker.id} 
                worker={worker} 
                index={idx}
                isAdmin={user?.role === 'admin'} 
                onEdit={handleEdit}
                onDelete={confirmDelete}
            />
        ))}
        
        {filteredWorkers.length === 0 && (
          <div className="col-span-full py-32 text-center glass-card rounded-[3rem]">
            <p className="text-gray-500 text-2xl font-black uppercase tracking-widest italic opacity-50">{t('no_data')}</p>
          </div>
        )}
      </div>

      {showForm && (
        <WorkerForm
          worker={editingWorker}
          onClose={() => setShowForm(false)}
        />
      )}

      {workerToDelete && (
        <ConfirmationModal
          title={t('delete_worker_title')}
          message={t('delete_worker_confirm_name', { name: workerToDelete.name })}
          onConfirm={handleDelete}
          onCancel={() => setWorkerToDelete(null)}
        />
      )}
    </div>
  );
};

export default Workers;
