
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
import ConfirmationModal from './ConfirmationModal';
import MapIcon from './icons/MapIcon';
import PlusIcon from './icons/PlusIcon';
import ClockIcon from './icons/ClockIcon';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';
import SearchIcon from './icons/SearchIcon';
import WorkersIcon from './icons/WorkersIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

const ProjectCard: React.FC<{
    project: Project;
    index: number;
    onEdit: (p: Project) => void;
    onDelete: (p: Project) => void;
    onViewPlan: (p: Project) => void;
    onManageTasks: (p: Project) => void;
}> = ({ project, index, onEdit, onDelete, onViewPlan, onManageTasks }) => {
    const { t } = useI18n();
    
    const tables = useLiveQuery(() => db.solarTables.where('projectId').equals(project.id!).toArray(), [project.id]);
    const completedTablesCount = useMemo(() => tables?.filter(t => t.status === 'completed').length || 0, [tables]);
    const totalTablesCount = useMemo(() => tables?.length || 0, [tables]);
    const tablesProgress = useMemo(() => totalTablesCount > 0 ? Math.round((completedTablesCount / totalTablesCount) * 100) : 0, [completedTablesCount, totalTablesCount]);

    const tasks = useLiveQuery(() => db.projectTasks.where('projectId').equals(project.id!).toArray(), [project.id]);
    const completedTasksCount = useMemo(() => tasks?.filter(t => t.completionDate).length || 0, [tasks]);
    const totalTasksCount = useMemo(() => tasks?.length || 0, [tasks]);
    const tasksProgress = useMemo(() => totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0, [completedTasksCount, totalTasksCount]);

    // Live Activity check
    const lastHistory = useLiveQuery(async () => {
        if (!project.id) return null;
        const tableIds = (await db.solarTables.where('projectId').equals(project.id).toArray()).map(t => t.id);
        if (tableIds.length === 0) return null;
        return db.tableStatusHistory.where('tableId').anyOf(tableIds as number[]).reverse().sortBy('timestamp');
    }, [project.id]);
    
    const lastActivity = lastHistory?.[0];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'completed': return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
            case 'on_hold': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    return (
        <div 
            className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/60 backdrop-blur-3xl shadow-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)] animate-list-item"
            style={{ animationDelay: `${index * 0.05}s` }}
        >
            {/* Ambient Glow */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--color-primary)] opacity-[0.08] blur-[60px] transition-all duration-700 group-hover:opacity-[0.15]"></div>
            
            {/* Card Content */}
            <div className="relative z-10 flex flex-col h-full">
                
                {/* Header Section */}
                <div className="p-6 pb-2 flex justify-between items-start gap-4">
                    <div className="space-y-1 overflow-hidden">
                        <div className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusColor(project.status)}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse"></span>
                            {t(project.status as any)}
                        </div>
                        <h3 className="text-2xl font-black text-white tracking-tight truncate leading-tight group-hover:text-[var(--color-accent)] transition-colors">
                            {project.name}
                        </h3>
                    </div>
                    {/* Utility Actions (Top Right) */}
                    <div className="flex gap-2 shrink-0">
                        <button 
                            onClick={(e) => {e.stopPropagation(); onEdit(project)}} 
                            className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 border border-white/5"
                            title={t('edit_project')}
                        >
                            <PencilIcon className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={(e) => {e.stopPropagation(); onDelete(project)}} 
                            className="p-2.5 rounded-xl bg-rose-500/5 text-rose-400 hover:bg-rose-500/20 transition-all active:scale-95 border border-rose-500/10"
                            title={t('delete')}
                        >
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Description */}
                <div className="px-6 mb-6">
                    <p className="text-sm font-medium text-slate-400 line-clamp-2 min-h-[2.5em] leading-relaxed">
                        {project.description || t('no_data')}
                    </p>
                </div>

                {/* Data Zone (Darker Background) */}
                <div className="px-4 pb-4 mt-auto">
                    <div className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-5">
                        
                        {/* Tables Progress */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-2 text-cyan-300">
                                    <MapIcon className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{t('tables')}</span>
                                </div>
                                <span className="font-mono text-xs font-bold text-white">{completedTablesCount}<span className="text-slate-500">/{totalTablesCount}</span></span>
                            </div>
                            <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000 ease-out" style={{ width: `${tablesProgress}%` }}></div>
                            </div>
                        </div>

                        {/* Tasks Progress */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-2 text-violet-300">
                                    <CheckCircleIcon className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{t('tasks')}</span>
                                </div>
                                <span className="font-mono text-xs font-bold text-white">{completedTasksCount}<span className="text-slate-500">/{totalTasksCount}</span></span>
                            </div>
                            <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-1000 ease-out" style={{ width: `${tasksProgress}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Toolbar */}
                <div className="p-4 pt-0 grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => onManageTasks(project)}
                        className="flex items-center justify-center gap-2 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95 border border-white/10 shadow-lg group/btn"
                    >
                        <ClockIcon className="w-5 h-5 text-indigo-300 group-hover/btn:scale-110 transition-transform" />
                        {t('tasks')}
                    </button>

                    <button 
                        onClick={() => project.planFile ? onViewPlan(project) : null}
                        disabled={!project.planFile}
                        className={`flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 border shadow-lg group/btn ${project.planFile ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 border-blue-500/30' : 'bg-black/20 text-gray-600 border-white/5 cursor-not-allowed'}`}
                    >
                        <MapIcon className={`w-5 h-5 group-hover/btn:scale-110 transition-transform ${project.planFile ? 'text-blue-400' : 'text-gray-600'}`} />
                        {t('plan')}
                    </button>
                </div>
            </div>
            
            {/* Last Activity Strip */}
            {lastActivity && (
                <div className="bg-white/5 border-t border-white/5 px-6 py-2">
                    <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-white/40 truncate">
                        <div className="h-1 w-1 rounded-full bg-green-500"></div>
                        <span>{t('last_activity')}: {new Date(lastActivity.timestamp).toLocaleString()}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const Projects: React.FC = () => {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'on_hold'>('all');
  const [workerFilter, setWorkerFilter] = useState<number | 'all'>('all');
  const [viewingProjectPlan, setViewingProjectPlan] = useState<Project | null>(null);
  const [managingTasksFor, setManagingTasksFor] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const projects = useLiveQuery(() => db.projects.toArray(), []);
  const workers = useLiveQuery(() => db.workers.toArray(), []);
  const allTasks = useLiveQuery(() => db.projectTasks.toArray(), []);
  const allAssignments = useLiveQuery(() => db.tableAssignments.toArray(), []);
  const allTables = useLiveQuery(() => db.solarTables.toArray(), []);

  // Pre-calculate which projects contain the selected worker
  const projectsWithWorker = useMemo(() => {
      if (workerFilter === 'all' || !allTasks || !allAssignments || !allTables) return null;
      
      const projectIds = new Set<number>();
      
      // 1. Projects where worker has a task assigned
      allTasks.forEach(task => {
          if (task.assignedWorkerId === workerFilter) {
              projectIds.add(task.projectId);
          }
      });

      // 2. Projects where worker has a table assigned
      // Create a quick lookup map: tableId -> projectId
      const tableProjectMap = new Map<number, number>();
      allTables.forEach(t => tableProjectMap.set(t.id!, t.projectId));

      allAssignments.forEach(assignment => {
          if (assignment.workerId === workerFilter) {
              const projectId = tableProjectMap.get(assignment.tableId);
              if (projectId) projectIds.add(projectId);
          }
      });

      return projectIds;
  }, [workerFilter, allTasks, allAssignments, allTables]);

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
      })
      .filter(project => {
          if (workerFilter === 'all') return true;
          return projectsWithWorker?.has(project.id!);
      })
      .sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateB - dateA;
      });
  }, [projects, searchTerm, statusFilter, workerFilter, projectsWithWorker]);

  const handleAdd = () => {
    setSelectedProject(undefined);
    setShowForm(true);
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setShowForm(true);
  };

  const confirmDelete = (project: Project) => {
    setProjectToDelete(project);
  };

  const handleDelete = async () => {
    if (projectToDelete?.id) {
      await db.transaction('rw', db.projects, db.projectTasks, db.solarTables, db.tableAssignments, db.tableStatusHistory, async () => {
        await db.projectTasks.where('projectId').equals(projectToDelete.id!).delete();
        await db.solarTables.where('projectId').equals(projectToDelete.id!).delete();
        await db.projects.delete(projectToDelete.id!);
      });
      setProjectToDelete(null);
    }
  };

  const filterOptions: ('all' | 'active' | 'completed' | 'on_hold')[] = ['all', 'active', 'completed', 'on_hold'];

  return (
    <div className="space-y-12 pb-24 md:pb-12">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-[0.8] drop-shadow-2xl">
               {t('projects')}<span className="text-[var(--color-accent)]">.</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 font-bold tracking-tight max-w-2xl border-l-4 border-[var(--color-accent)] pl-6 py-2">
              Strategický přehled montáže a technologického postupu solárních polí.
            </p>
          </div>
          <div className="flex gap-4 w-full lg:w-auto">
             <Link to="/statistics" className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-5 bg-slate-900/50 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all border border-white/10 backdrop-blur-md active:scale-95 shadow-lg">
                <ChartBarIcon className="w-6 h-6 text-[var(--color-accent)]" />
                <span className="hidden sm:inline">{t('statistics')}</span>
             </Link>
             <button onClick={handleAdd} className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-[var(--color-accent)] hover:text-white transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] active:scale-95 group">
                <PlusIcon className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                {t('add_project')}
             </button>
          </div>
      </header>
      
      {/* Search and Filter Bar - iPhone Style */}
      <div className="flex flex-col xl:flex-row gap-6 items-center justify-between p-2 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-2xl shadow-2xl">
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto px-2 md:px-0">
            {/* Search Input */}
            <div className="relative w-full md:w-[350px]">
                <input
                    type="text"
                    placeholder={`${t('search')}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-black/20 text-white placeholder-slate-400 border border-white/5 rounded-[2rem] focus:ring-2 focus:ring-[var(--color-accent)] focus:bg-black/30 transition-all text-lg font-bold shadow-inner"
                />
                <div className="absolute left-5 top-1/2 -translate-y-1/2 p-1.5 bg-white/10 rounded-full">
                    <SearchIcon className="w-5 h-5 text-white" />
                </div>
            </div>

            {/* Worker Filter Dropdown */}
            <div className="relative w-full md:w-[280px] group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-[var(--color-accent)] transition-colors p-1.5 bg-white/10 rounded-full">
                    <WorkersIcon className="w-5 h-5" />
                </div>
                <select
                    value={workerFilter}
                    onChange={(e) => setWorkerFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="w-full pl-16 pr-10 py-5 bg-black/20 text-white border border-white/5 rounded-[2rem] appearance-none focus:ring-2 focus:ring-[var(--color-accent)] focus:bg-black/30 transition-all text-sm font-bold shadow-inner cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
                >
                    <option value="all">{t('all_workers')}</option>
                    {workers?.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 xl:pb-0 w-full xl:w-auto px-2 xl:px-0">
            {filterOptions.map((status) => (
                <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-6 py-4 rounded-[1.8rem] font-bold text-xs transition-all border uppercase tracking-wider whitespace-nowrap backdrop-blur-md flex-shrink-0 ${
                        statusFilter === status
                        ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-105'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10 hover:text-white'
                    }`}
                >
                    {t(status === 'all' ? 'all_statuses' : (status as any))}
                </button>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {filteredProjects.map((project, idx) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            index={idx}
            onEdit={handleEdit}
            onDelete={confirmDelete}
            onViewPlan={setViewingProjectPlan}
            onManageTasks={setManagingTasksFor}
          />
        ))}
        
        {filteredProjects.length === 0 && (
          <div className="col-span-full py-40 text-center flex flex-col items-center justify-center opacity-50">
            <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10 shadow-[0_0_60px_rgba(255,255,255,0.05)]">
                <SearchIcon className="w-12 h-12 text-slate-500" />
            </div>
            <p className="text-slate-400 text-4xl font-black uppercase tracking-widest italic">{t('no_data')}</p>
            <p className="text-slate-600 font-bold mt-4 uppercase tracking-widest">Nebyly nalezeny žádné projekty.</p>
          </div>
        )}
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

      {projectToDelete && (
        <ConfirmationModal
          title={t('confirm_delete')}
          message={`Operace je nevratná. Systém trvale odstraní projekt "${projectToDelete.name}" a veškerou přidruženou historii dat. Potvrdit smazání?`}
          onConfirm={handleDelete}
          onCancel={() => setProjectToDelete(null)}
        />
      )}
    </div>
  );
};

export default Projects;
