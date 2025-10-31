

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import type { Project } from '../types';
import ProjectForm from './ProjectForm';
import ChartBarIcon from './icons/ChartBarIcon';
import PlanViewerModal from './PlanViewerModal';
import ProjectTasksModal from './ProjectTasksModal';

const Projects: React.FC = () => {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'on-hold'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Project; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });
  const [viewingProjectPlan, setViewingProjectPlan] = useState<Project | null>(null);
  const [managingTasksFor, setManagingTasksFor] = useState<Project | null>(null);

  const projects = useLiveQuery(() => db.projects.toArray(), []);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    
    return projects
      .filter(project => {
        if (statusFilter === 'all') return true;
        return project.status === statusFilter;
      })
      .filter(project => {
        if (!searchTerm) return true;
        return project.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [projects, searchTerm, statusFilter]);

  const sortedProjects = useMemo(() => {
    if (!filteredProjects) return [];
    let sortableItems = [...filteredProjects];
    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;
            
            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }
    return sortableItems;
  }, [filteredProjects, sortConfig]);

  const requestSort = (key: keyof Project) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof Project) => {
      if (!sortConfig || sortConfig.key !== key) return null;
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const handleAdd = () => {
    setSelectedProject(undefined);
    setShowForm(true);
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('confirm_delete'))) {
      await db.transaction('rw', db.projects, db.projectTasks, async () => {
        await db.projectTasks.where('projectId').equals(id).delete();
        await db.projects.delete(id);
      });
    }
  };
  
  const getStatusBadgeStyle = (status: 'active' | 'completed' | 'on-hold'): React.CSSProperties => {
    switch (status) {
      case 'active':
        return { backgroundColor: 'var(--color-accent)', opacity: 0.8 };
      case 'completed':
        return { backgroundColor: 'var(--color-primary)', opacity: 0.8 };
      case 'on-hold':
        return { backgroundColor: '#f59e0b', opacity: 0.8 }; // Amber-500
      default:
        return {};
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-5xl font-bold text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)]">{t('projects')}</h1>
        <div className="flex flex-wrap gap-4">
          <Link to="/statistics" className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-500 transition-all shadow-lg text-lg">
            <ChartBarIcon className="w-6 h-6" />
            {t('statistics')}
          </Link>
          <button
            onClick={handleAdd}
            className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-lg text-lg"
          >
            {t('add_project')}
          </button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder={`${t('search')}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-auto max-w-md flex-grow p-4 bg-black/20 text-white placeholder-gray-300 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
        />
        <select
            title={t('filter_by_status')}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full md:w-auto p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
        >
            <option value="all">{t('all_statuses')}</option>
            <option value="active">{t('active')}</option>
            <option value="completed">{t('completed')}</option>
            <option value="on-hold">{t('on_hold')}</option>
        </select>
      </div>

      <div className="bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/10">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('name')}>{t('project_name')}{getSortIndicator('name')}</th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('status')}</th>
                <th scope="col" className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sortedProjects.map((project) => (
                <tr key={project.id} className="hover:bg-white/10 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap text-lg font-medium text-white">{project.name}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-lg">
                    <span 
                      className="px-4 py-1.5 inline-flex text-base leading-5 font-bold rounded-full text-white"
                      style={getStatusBadgeStyle(project.status)}
                    >
                      {t(project.status as 'active' | 'completed' | 'on_hold')}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-lg font-bold space-x-4">
                    <button onClick={() => setManagingTasksFor(project)} className="text-purple-400 hover:underline">{t('tasks')}</button>
                     {project.planFile ? (
                      <button onClick={() => setViewingProjectPlan(project)} className="text-cyan-400 hover:underline">{t('view_plan')}</button>
                    ) : (
                      <span className="text-gray-500 italic">{t('no_plan_available')}</span>
                    )}
                    <button onClick={() => handleEdit(project)} className="text-blue-400 hover:underline">{t('edit_project')}</button>
                    <button onClick={() => handleDelete(project.id!)} className="text-pink-500 hover:underline">{t('delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedProjects?.length === 0 && (
            <div className="text-center py-12 text-gray-300 text-lg">
              {t('no_data')}
            </div>
          )}
        </div>
      </div>
      
      {showForm && (
        <ProjectForm
          project={selectedProject}
          onClose={() => setShowForm(false)}
        />
      )}

      {viewingProjectPlan && (
        <PlanViewerModal 
          project={viewingProjectPlan} 
          onClose={() => setViewingProjectPlan(null)}
        />
      )}

      {managingTasksFor && (
        <ProjectTasksModal
          project={managingTasksFor}
          onClose={() => setManagingTasksFor(null)}
        />
      )}
    </div>
  );
};

export default Projects;
