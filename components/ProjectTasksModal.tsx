
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import type { Project, ProjectTask, Worker } from '../types';
import ConfirmationModal from './ConfirmationModal';

interface ProjectTasksModalProps {
  project: Project;
  onClose: () => void;
}

const ProjectTasksModal: React.FC<ProjectTasksModalProps> = ({ project, onClose }) => {
  const { t } = useI18n();
  const tasks = useLiveQuery(() => db.projectTasks.where('projectId').equals(project.id!).toArray(), [project.id]);
  const workers = useLiveQuery(() => db.workers.toArray());
  
  // Fetch all incomplete tasks to calculate global workload for each worker
  const allActiveTasks = useLiveQuery(() => db.projectTasks.filter(t => !t.completionDate).toArray());
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [taskType, setTaskType] = useState<'panels' | 'construction' | 'cables'>('construction');
  const [description, setDescription] = useState('');
  const [panelCount, setPanelCount] = useState('');
  const [pricePerPanel, setPricePerPanel] = useState('');
  const [tableSize, setTableSize] = useState<'small' | 'medium' | 'large'>('small');
  const [price, setPrice] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  
  const workerMap = useMemo(() => new Map(workers?.map(w => [w.id!, w.name])), [workers]);

  // Calculate workload map: workerId -> count of active tasks
  const workerLoad = useMemo(() => {
      const load: Record<number, number> = {};
      allActiveTasks?.forEach(t => {
          if (t.assignedWorkerId) {
              load[t.assignedWorkerId] = (load[t.assignedWorkerId] || 0) + 1;
          }
      });
      return load;
  }, [allActiveTasks]);

  const resetForm = () => {
      setShowAddForm(false);
      setTaskType('construction');
      setDescription('');
      setPanelCount('');
      setPricePerPanel('');
      setTableSize('small');
      setPrice('');
  }

  const handleToggleCompletion = async (task: ProjectTask) => {
    await db.projectTasks.update(task.id!, { 
      completionDate: task.completionDate ? undefined : new Date() 
    });
  };

  const handleAssignWorker = async (taskId: number, workerId: number | '') => {
      await db.projectTasks.update(taskId, { assignedWorkerId: workerId === '' ? undefined : Number(workerId) });
  };

  const handleDeleteTask = async () => {
    if (taskToDelete !== null) {
      await db.projectTasks.delete(taskToDelete);
      setTaskToDelete(null);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let taskData: Omit<ProjectTask, 'id'>;

    switch(taskType) {
        case 'panels':
            const count = Number(panelCount);
            const perPanel = Number(pricePerPanel);
            if (count <= 0 || perPanel <= 0) return;
            taskData = {
                projectId: project.id!,
                taskType: 'panels',
                description: t('panels_task_desc', { count }),
                panelCount: count,
                pricePerPanel: perPanel,
                price: count * perPanel,
                tableSize: undefined
            };
            break;
        case 'cables':
            if (Number(price) <= 0) return;
            taskData = {
                projectId: project.id!,
                taskType: 'cables',
                description: t('cables_task_desc', { size: t(tableSize) }),
                tableSize: tableSize,
                price: Number(price),
                panelCount: undefined,
                pricePerPanel: undefined
            };
            break;
        case 'construction':
        default:
             if (!description.trim() || Number(price) <= 0) return;
            taskData = {
                projectId: project.id!,
                taskType: 'construction',
                description: description.trim(),
                price: Number(price),
                panelCount: undefined,
                pricePerPanel: undefined,
                tableSize: undefined
            };
            break;
    }

    await db.projectTasks.add(taskData as ProjectTask);
    resetForm();
  };

  const calculatedPrice = useMemo(() => {
      if (taskType === 'panels') {
          const count = Number(panelCount);
          const perPanel = Number(pricePerPanel);
          return (count * perPanel) || 0;
      }
      return Number(price) || 0;
  }, [taskType, panelCount, pricePerPanel, price]);
  
  const taskTypeOptions: { id: 'construction' | 'panels' | 'cables'; label: string }[] = [
      { id: 'construction', label: t('construction') },
      { id: 'panels', label: t('panels') },
      { id: 'cables', label: t('cables') }
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-lg p-4 animate-fade-in">
      <div className="w-full max-w-5xl p-8 bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl border border-white/10 max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tight uppercase italic">{t('tasks')}</h2>
                    <p className="text-lg text-blue-200/60 font-bold">{project.name}</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-3 custom-scrollbar">
          {tasks && tasks.length > 0 ? (
            tasks.map(task => (
              <div key={task.id} className={`p-5 rounded-3xl group transition-all border border-white/5 ${task.completionDate ? 'bg-emerald-900/10 border-emerald-500/10' : 'bg-white/5 hover:bg-white/10'}`}>
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-1">
                          <span className={`text-xs font-black uppercase tracking-wider px-2 py-1 rounded-lg ${task.completionDate ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>
                              {task.taskType}
                          </span>
                          {task.completionDate && (
                              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                  {new Date(task.completionDate).toLocaleDateString()}
                              </span>
                          )}
                      </div>
                      <p className={`text-lg font-bold leading-tight ${task.completionDate ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {task.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-shrink-0 flex-wrap md:flex-nowrap">
                      <div className="px-4 py-2 rounded-xl bg-black/20 border border-white/5">
                          <span className="font-mono font-bold text-white">€{task.price.toFixed(2)}</span>
                      </div>
                      
                      {/* Enhanced Worker Selector */}
                      <div className="relative group/select">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                          </div>
                          <select
                              value={task.assignedWorkerId || ''}
                              onChange={(e) => handleAssignWorker(task.id!, e.target.value === '' ? '' : Number(e.target.value))}
                              className={`pl-9 pr-8 py-2.5 appearance-none rounded-xl text-sm font-bold border focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer ${
                                  task.assignedWorkerId 
                                  ? 'bg-blue-600/20 text-blue-200 border-blue-500/30 hover:bg-blue-600/30' 
                                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                              } [&>option]:bg-slate-900 [&>option]:text-white`}
                              disabled={!!task.completionDate}
                          >
                              <option value="">{t('assign_worker')}...</option>
                              {workers?.map(w => {
                                  const load = workerLoad[w.id!] || 0;
                                  return (
                                    <option key={w.id} value={w.id}>
                                        {w.name} {load > 0 ? `(${load} active)` : '• Available'}
                                    </option>
                                  );
                              })}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                      </div>

                      <button 
                        onClick={() => handleToggleCompletion(task)}
                        className={`p-2.5 rounded-xl transition-all shadow-lg active:scale-95 ${
                            task.completionDate 
                            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-black' 
                            : 'bg-emerald-500 text-black hover:bg-emerald-400'
                        }`}
                        title={task.completionDate ? t('mark_as_incomplete') : t('mark_as_complete')}
                      >
                        {task.completionDate ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        )}
                      </button>
                      
                      <button
                        onClick={() => setTaskToDelete(task.id!)}
                        className="p-2.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        aria-label={t('delete')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 flex flex-col items-center justify-center opacity-50">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                </div>
                <p className="text-xl font-bold text-gray-400">{t('no_tasks_found')}</p>
            </div>
          )}
        </div>
        
        <div className="flex-shrink-0 mt-6 pt-6 border-t border-white/10">
            {showAddForm ? (
                 <form onSubmit={handleAddTask} className="space-y-4 animate-fade-in bg-white/5 p-6 rounded-3xl border border-white/10">
                     <div className="flex items-center justify-between mb-2">
                         <h3 className="text-xl font-black text-white uppercase tracking-wide">{t('add_task')}</h3>
                         <div className="inline-flex rounded-xl bg-black/40 p-1 border border-white/10">
                             {taskTypeOptions.map(opt => (
                                 <button key={opt.id} type="button" onClick={() => setTaskType(opt.id)} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${taskType === opt.id ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>{opt.label}</button>
                             ))}
                         </div>
                     </div>
                    
                     {taskType === 'construction' && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('task_description')} required className="p-4 bg-black/30 text-white placeholder-gray-500 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none font-bold"/>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder={t('flat_rate')} min="0" step="0.01" required className="p-4 bg-black/30 text-white placeholder-gray-500 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none font-bold"/>
                         </div>
                     )}
                     {taskType === 'panels' && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="number" value={panelCount} onChange={e => setPanelCount(e.target.value)} placeholder={t('panel_count')} min="1" step="1" required className="p-4 bg-black/30 text-white placeholder-gray-500 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none font-bold"/>
                            <input type="number" value={pricePerPanel} onChange={e => setPricePerPanel(e.target.value)} placeholder={t('price_per_panel')} min="0" step="0.01" required className="p-4 bg-black/30 text-white placeholder-gray-500 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none font-bold"/>
                         </div>
                     )}
                     {taskType === 'cables' && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <select value={tableSize} onChange={e => setTableSize(e.target.value as any)} className="p-4 bg-black/30 text-white border border-white/10 rounded-2xl font-bold [&>option]:bg-gray-900">
                                 <option value="small">{t('small')}</option>
                                 <option value="medium">{t('medium')}</option>
                                 <option value="large">{t('large')}</option>
                             </select>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder={t('task_price')} min="0" step="0.01" required className="p-4 bg-black/30 text-white placeholder-gray-500 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none font-bold"/>
                         </div>
                     )}
                     <div className="flex justify-between items-center pt-2">
                        <div className="text-xl font-black text-white tracking-tight">€{calculatedPrice.toFixed(2)}</div>
                        <div className="flex gap-3">
                            <button type="button" onClick={resetForm} className="px-6 py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-colors uppercase tracking-wider text-xs">{t('cancel')}</button>
                            <button type="submit" className="px-8 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] shadow-lg transition-all active:scale-95 uppercase tracking-wider text-xs">{t('add')}</button>
                        </div>
                     </div>
                </form>
            ) : (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full py-5 bg-white/5 border-2 border-dashed border-white/10 text-gray-400 font-bold rounded-3xl hover:bg-white/10 hover:text-white hover:border-white/30 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 group"
                >
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white text-black transition-colors">+</span>
                    {t('add_task')}
                </button>
            )}
        </div>
      </div>

      {taskToDelete !== null && (
          <ConfirmationModal
            title={t('delete_task_title')}
            message={t('confirm_delete')}
            onConfirm={handleDeleteTask}
            onCancel={() => setTaskToDelete(null)}
            variant="danger"
          />
      )}
    </div>
  );
};

export default ProjectTasksModal;
