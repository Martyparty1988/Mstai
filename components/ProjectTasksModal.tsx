
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import type { Project, ProjectTask } from '../types';

interface ProjectTasksModalProps {
  project: Project;
  onClose: () => void;
}

const ProjectTasksModal: React.FC<ProjectTasksModalProps> = ({ project, onClose }) => {
  const { t } = useI18n();
  const tasks = useLiveQuery(() => db.projectTasks.where('projectId').equals(project.id!).toArray(), [project.id]);
  const [newTaskDesc, setNewTaskDesc] = useState('');

  const handleToggleTask = async (task: ProjectTask) => {
    await db.projectTasks.update(task.id!, { completed: !task.completed });
  };

  const handleDeleteTask = async (taskId: number) => {
    if (window.confirm(t('confirm_delete'))) {
      await db.projectTasks.delete(taskId);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskDesc.trim()) return;
    const newTask: Omit<ProjectTask, 'id'> = {
      projectId: project.id!,
      description: newTaskDesc.trim(),
      completed: false,
    };
    await db.projectTasks.add(newTask as ProjectTask);
    setNewTaskDesc('');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-lg p-4">
      <div className="w-full max-w-2xl p-8 bg-black/20 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/10 max-h-[90vh] flex flex-col">
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

        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
          {tasks && tasks.length > 0 ? (
            tasks.map(task => (
              <div key={task.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl group">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggleTask(task)}
                  className="w-6 h-6 rounded bg-black/20 border-white/30 text-[var(--color-primary)] focus:ring-2 focus:ring-offset-0 focus:ring-offset-transparent focus:ring-[var(--color-primary)] cursor-pointer"
                />
                <span className={`flex-grow text-lg ${task.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                  {task.description}
                </span>
                <button
                  onClick={() => handleDeleteTask(task.id!)}
                  className="p-2 text-gray-500 hover:text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={t('delete')}
                >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 py-8">{t('no_tasks_found')}</p>
          )}
        </div>
        
        <form onSubmit={handleAddTask} className="flex-shrink-0 mt-6 flex gap-2">
            <input
                type="text"
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                placeholder={t('add_task_placeholder')}
                className="flex-grow p-3 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
            />
            <button
                type="submit"
                className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-md text-lg disabled:opacity-50"
                disabled={!newTaskDesc.trim()}
            >
                {t('add')}
            </button>
        </form>
      </div>
    </div>
  );
};

export default ProjectTasksModal;
