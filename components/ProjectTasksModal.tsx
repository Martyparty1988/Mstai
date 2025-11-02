import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import type { Project, ProjectTask, Worker } from '../types';

interface ProjectTasksModalProps {
  project: Project;
  onClose: () => void;
}

const ProjectTasksModal: React.FC<ProjectTasksModalProps> = ({ project, onClose }) => {
  const { t } = useI18n();
  const tasks = useLiveQuery(() => db.projectTasks.where('projectId').equals(project.id!).toArray(), [project.id]);
  const workers = useLiveQuery(() => db.workers.toArray());
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [taskType, setTaskType] = useState<'panels' | 'construction' | 'cables'>('construction');
  const [description, setDescription] = useState('');
  const [panelCount, setPanelCount] = useState('');
  const [pricePerPanel, setPricePerPanel] = useState('');
  const [tableSize, setTableSize] = useState<'small' | 'medium' | 'large'>('small');
  const [price, setPrice] = useState('');
  
  const workerMap = useMemo(() => new Map(workers?.map(w => [w.id!, w.name])), [workers]);

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

  const handleDeleteTask = async (taskId: number) => {
    if (window.confirm(t('confirm_delete'))) {
      await db.projectTasks.delete(taskId);
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-lg p-4">
      <div className="w-full max-w-4xl p-8 bg-black/20 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/10 max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white">{t('tasks')}</h2>
                    <p className="text-lg text-gray-300">{project.name}</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-2">
          {tasks && tasks.length > 0 ? (
            tasks.map(task => (
              <div key={task.id} className={`p-3 bg-white/5 rounded-xl group transition-all ${task.completionDate ? 'bg-green-900/20' : ''}`}>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-grow">
                      <p className={`text-lg ${task.completionDate ? 'text-gray-400 line-through' : 'text-gray-200'}`}>
                        {task.description}
                      </p>
                       {task.completionDate && (
                          <p className="text-xs text-green-400">
                            {t('completed_on', { date: new Date(task.completionDate).toLocaleDateString() })}
                          </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="font-bold text-lg text-white">€{task.price.toFixed(2)}</span>
                      <select
                          value={task.assignedWorkerId || ''}
                          onChange={(e) => handleAssignWorker(task.id!, e.target.value === '' ? '' : Number(e.target.value))}
                          className="p-2 bg-black/20 text-white border border-white/20 rounded-lg text-sm focus:ring-blue-400 focus:border-blue-400 [&>option]:bg-gray-800"
                          title={t('assign_to_worker')}
                      >
                          <option value="">{t('unassigned')}</option>
                          {workers?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                      <button 
                        onClick={() => handleToggleCompletion(task)}
                        className={`px-3 py-2 text-sm font-bold rounded-lg ${task.completionDate ? 'bg-yellow-600/80 hover:bg-yellow-600' : 'bg-green-600/80 hover:bg-green-600'}`}
                        title={task.completionDate ? t('mark_as_incomplete') : t('mark_as_complete')}
                      >
                        {task.completionDate ? '↩' : '✓'}
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id!)}
                        className="p-2 text-gray-500 hover:text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={t('delete')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 py-8">{t('no_tasks_found')}</p>
          )}
        </div>
        
        <div className="flex-shrink-0 mt-6 border-t border-white/10 pt-4">
            {showAddForm ? (
                 <form onSubmit={handleAddTask} className="space-y-4">
                     <div className="flex items-center justify-between">
                         <h3 className="text-xl font-bold text-white">{t('add_task')}</h3>
                         <div className="inline-flex rounded-lg bg-black/20 border border-white/10 p-1">
                             {taskTypeOptions.map(opt => (
                                 <button key={opt.id} type="button" onClick={() => setTaskType(opt.id)} className={`px-3 py-1 text-sm font-bold rounded-md ${taskType === opt.id ? 'bg-[var(--color-primary)]' : 'hover:bg-white/10'}`}>{opt.label}</button>
                             ))}
                         </div>
                     </div>
                    
                     {taskType === 'construction' && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('task_description')} required className="p-3 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400"/>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder={t('flat_rate')} min="0" step="0.01" required className="p-3 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400"/>
                         </div>
                     )}
                     {taskType === 'panels' && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="number" value={panelCount} onChange={e => setPanelCount(e.target.value)} placeholder={t('panel_count')} min="1" step="1" required className="p-3 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400"/>
                            <input type="number" value={pricePerPanel} onChange={e => setPricePerPanel(e.target.value)} placeholder={t('price_per_panel')} min="0" step="0.01" required className="p-3 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400"/>
                         </div>
                     )}
                     {taskType === 'cables' && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <select value={tableSize} onChange={e => setTableSize(e.target.value as any)} className="p-3 bg-black/20 text-white border border-white/20 rounded-xl [&>option]:bg-gray-800">
                                 <option value="small">{t('small')}</option>
                                 <option value="medium">{t('medium')}</option>
                                 <option value="large">{t('large')}</option>
                             </select>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder={t('task_price')} min="0" step="0.01" required className="p-3 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400"/>
                         </div>
                     )}
                     <div className="flex justify-between items-center pt-2">
                        <div className="font-bold text-lg text-white">{t('total_price')}: €{calculatedPrice.toFixed(2)}</div>
                        <div className="flex gap-2">
                            <button type="button" onClick={resetForm} className="px-5 py-2 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20">{t('cancel')}</button>
                            <button type="submit" className="px-5 py-2 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)]">{t('add')}</button>
                        </div>
                     </div>
                </form>
            ) : (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-md text-lg"
                >
                    {t('add_task')}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProjectTasksModal;