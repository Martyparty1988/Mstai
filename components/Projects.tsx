
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { googleSheetsService } from '../services/googleSheetsService';
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
import ShareIcon from './icons/ShareIcon'; // Using ShareIcon for sync

const ProjectCard: React.FC<{
    project: Project;
    index: number;
    isAdmin: boolean;
    onEdit: (p: Project) => void;
    onDelete: (p: Project) => void;
    onViewPlan: (p: Project) => void;
    onManageTasks: (p: Project) => void;
    onSync: (p: Project) => void;
}> = ({ project, index, isAdmin, onEdit, onDelete, onViewPlan, onManageTasks, onSync }) => {
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
            case 'active': return 'bg-emerald-400';
            case 'completed': return 'bg-indigo-400';
            case 'on_hold': return 'bg-amber-400';
            default: return 'bg-slate-400';
        }
    };

    return (
        <div 
            className="group relative flex flex-col overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border border-white/10 bg-gray-900/40 backdrop-blur-3xl shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] animate-list-item"
            style={{ animationDelay: `${index * 0.05}s` }}
        >
            {/* iOS-style blurry gradient blob in background */}
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--color-primary)] opacity-10 blur-[80px] transition-all duration-700 group-hover:opacity-20 group-hover:scale-110"></div>
            
            {/* Card Content */}
            <div className="relative z-10 flex flex-col h-full p-6 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className={`px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md flex items-center gap-2 shadow-inner`}>
                        <div className={`h-2 w-2 rounded-full shadow-[0_0_10px_currentColor] ${getStatusColor(project.status)} animate-pulse`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/90">{t(project.status as any)}</span>
                    </div>
                    
                    {isAdmin && (
                        <div className="flex gap-2">
                            <button 
                                onClick={(e) => {e.stopPropagation(); onSync(project)}} 
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10 text-green-400 hover:bg-green-500/30 backdrop-blur-md transition-all active:scale-95 border border-green-500/10"
                                title={t('sync_to_sheets')}
                            >
                                <ShareIcon className="h-3.5 w-3.5" />
                            </button>
                            <button 
                                onClick={(e) => {e.stopPropagation(); onEdit(project)}} 
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/20 backdrop-blur-md transition-all active:scale-95 border border-white/5"
                                title={t('edit_project')}
                            >
                                <PencilIcon className="h-3.5 w-3.5" />
                            </button>
                            <button 
                                onClick={(e) => {e.stopPropagation(); onDelete(project)}} 
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/10 text-rose-300 hover:bg-rose-500/30 backdrop-blur-md transition-all active:scale-95 border border-rose-500/10"
                                title={t('delete')}
                            >
                                <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Title & Desc */}
                <div className="mb-8">
                    <h3 className="mb-3 text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-sm group-hover:text-[var(--color-accent)] transition-colors line-clamp-1">{project.name}</h3>
                    <p className="line-clamp-2 text-xs md:text-sm font-medium leading-relaxed text-blue-100/60 min-h-[2.5em]">
                        {project.description || t('no_data')}
                    </p>
                </div>

                {/* Progress Sliders - iOS Control Center Style */}
                <div className="mt-auto space-y-6">
                    {/* Tables Slider */}
                    <div>
                        <div className="mb-2 flex items-end justify-between px-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200/50">{t('tables')}</span>
                            <span className="font-mono text-xs font-bold text-blue-200">{completedTablesCount}<span className="opacity-50">/{totalTablesCount}</span></span>
                        </div>
                        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-black/30 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] border border-white/5">
                            <div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_15px_rgba(56,189,248,0.4)] transition-all duration-1000" style={{ width: `${tablesProgress}%` }}></div>
                        </div>
                    </div>
                    
                    {/* Tasks Slider */}
                    <div>
                        <div className="mb-2 flex items-end justify-between px-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200/50">{t('tasks')}</span>
                            <span className="font-mono text-xs font-bold text-blue-200">{completedTasksCount}<span className="opacity-50">/{totalTasksCount}</span></span>
                        </div>
                        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-black/30 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] border border-white/5">
                            <div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-[0_0_15px_rgba(192,132,252,0.4)] transition-all duration-1000" style={{ width: `${tasksProgress}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Action Grid - Glass Tiles */}
                <div className="mt-8 grid grid-cols-2 gap-3 md:gap-4">
                    <button 
                        onClick={() => onManageTasks(project)}
                        className="group/btn relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white/5 py-4 backdrop-blur-md transition-all hover:bg-white/10 active:scale-95 border border-white/5 shadow-lg"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                        <ClockIcon className="h-5 w-5 text-indigo-300 transition-transform duration-300 group-hover/btn:scale-110 group-hover/btn:text-white" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/70">{t('tasks')}</span>
                    </button>

                    <button 
                        onClick={() => project.planFile ? onViewPlan(project) : null}
                        disabled={!project.planFile}
                        className={`group/btn relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 backdrop-blur-md transition-all border border-white/5 shadow-lg ${project.planFile ? 'bg-blue-600/10 hover:bg-blue-600/20 active:scale-95' : 'bg-black/20 opacity-40 cursor-not-allowed'}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                        <MapIcon className={`h-5 w-5 transition-transform duration-300 ${project.planFile ? 'text-blue-300 group-hover/btn:scale-110 group-hover/btn:text-white' : 'text-gray-500'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/70">{t('plan')}</span>
                    </button>
                </div>
            </div>
            
            {/* Last Activity Footer */}
            {lastActivity && (
                <div className="bg-black/20 px-6 py-2 backdrop-blur-sm border-t border-white/5">
                    <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-white/30">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="truncate">{t('last_activity')}: {new Date(lastActivity.timestamp).toLocaleDateString()}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const Projects: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'on_hold'>('all');
  const [workerFilter, setWorkerFilter] = useState<number | 'all'>('all');
  const [viewingProjectPlan, setViewingProjectPlan] = useState<Project | null>(null);
  const [managingTasksFor, setManagingTasksFor] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [syncing, setSyncing] = useState(false);

  const projects = useLiveQuery(() => db.projects.toArray(), []);
  const workers = useLiveQuery(() => db.workers.toArray(), []);
  const allTasks = useLiveQuery(() => db.projectTasks.toArray(), []);
  const allAssignments = useLiveQuery(() => db.tableAssignments.toArray(), []);
  const allTables = useLiveQuery(() => db.solarTables.toArray(), []);

  const projectsWithWorker = useMemo(() => {
      if (workerFilter === 'all' || !allTasks || !allAssignments || !allTables) return null;
      const projectIds = new Set<number>();
      allTasks.forEach(task => { if (task.assignedWorkerId === workerFilter) projectIds.add(task.projectId); });
      const tableProjectMap = new Map<number, number>();
      allTables.forEach(t => tableProjectMap.set(t.id!, t.projectId));
      allAssignments.forEach(assignment => {
          const projectId = tableProjectMap.get(assignment.tableId);
          if (assignment.workerId === workerFilter && projectId) projectIds.add(projectId);
      });
      return projectIds;
  }, [workerFilter, allTasks, allAssignments, allTables]);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects
      .filter(project => statusFilter === 'all' ? true : project.status === statusFilter)
      .filter(project => !searchTerm ? true : project.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(project => workerFilter === 'all' ? true : projectsWithWorker?.has(project.id!))
      .sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0);
      });
  }, [projects, searchTerm, statusFilter, workerFilter, projectsWithWorker]);

  const handleAdd = () => { setSelectedProject(undefined); setShowForm(true); };
  const handleEdit = (project: Project) => { setSelectedProject(project); setShowForm(true); };
  const confirmDelete = (project: Project) => { setProjectToDelete(project); };

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

  const handleSync = async (project: Project) => {
      setSyncing(true);
      showToast('Connecting to Google Sheets...', 'info');
      
      try {
          await googleSheetsService.init();
          if (!googleSheetsService.isLoggedIn) {
              await googleSheetsService.signIn();
          }

          let spreadsheetId = project.googleSpreadsheetId;
          
          if (!spreadsheetId) {
              spreadsheetId = await googleSheetsService.createSpreadsheet(`MST - ${project.name}`);
              await db.projects.update(project.id!, { googleSpreadsheetId: spreadsheetId });
          }

          // Gather ALL data for this project
          const pTables = await db.solarTables.where('projectId').equals(project.id!).toArray();
          const pTasks = await db.projectTasks.where('projectId').equals(project.id!).toArray();
          const pRecords = await db.records.where('projectId').equals(project.id!).toArray();
          const pWorkers = await db.workers.toArray();

          const dataPayload = {
              project,
              tables: pTables,
              tasks: pTasks,
              records: pRecords,
              workers: pWorkers
          };

          await googleSheetsService.syncProjectData(spreadsheetId, dataPayload);
          
          await db.projects.update(project.id!, { lastSync: new Date() });
          showToast('Project synced successfully!', 'success');
          // Optionally open the sheet
          window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');

      } catch (e) {
          console.error(e);
          showToast('Sync failed. Check console or API Key.', 'error');
      } finally {
          setSyncing(false);
      }
  };

  const filterOptions: ('all' | 'active' | 'completed' | 'on_hold')[] = ['all', 'active', 'completed', 'on_hold'];

  return (
    <div className="space-y-8 md:space-y-12 pb-24 md:pb-12">
      {syncing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="bg-slate-900 p-8 rounded-3xl border border-white/20 flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)]"></div>
                  <p className="text-white font-bold animate-pulse">Synchronizing with Google Sheets...</p>
              </div>
          </div>
      )}

      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 md:gap-10">
          <div className="space-y-2 md:space-y-4">
            <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-[0.8] drop-shadow-2xl">
               {t('projects')}<span className="text-[var(--color-accent)]">.</span>
            </h1>
            <p className="text-sm md:text-2xl text-slate-300 font-bold tracking-tight max-w-2xl border-l-4 border-[var(--color-accent)] pl-4 md:pl-6 py-2">
              Strategický přehled montáže a technologického postupu solárních polí.
            </p>
          </div>
          <div className="flex gap-3 w-full lg:w-auto">
             {user?.role === 'admin' && (
                 <Link to="/statistics" className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 py-4 bg-slate-900/50 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all border border-white/10 backdrop-blur-md active:scale-95 shadow-lg text-xs md:text-sm">
                    <ChartBarIcon className="w-5 h-5 text-[var(--color-accent)]" />
                    <span className="hidden sm:inline">{t('statistics')}</span>
                 </Link>
             )}
             {user?.role === 'admin' && (
                 <button onClick={handleAdd} className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-[var(--color-accent)] hover:text-white transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] active:scale-95 group text-xs md:text-sm">
                    <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    {t('add_project')}
                 </button>
             )}
          </div>
      </header>
      
      {/* Optimized Search and Filter Bar */}
      <div className="flex flex-col xl:flex-row gap-4 p-4 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-2xl shadow-2xl">
        {/* Input Group: Stacks on mobile, Grid on MD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full xl:w-auto xl:flex-1">
            <div className="relative w-full">
                <input
                    type="text"
                    placeholder={`${t('search')}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-black/20 text-white placeholder-slate-400 border border-white/5 rounded-2xl focus:ring-2 focus:ring-[var(--color-accent)] focus:bg-black/30 transition-all text-base font-bold shadow-inner"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-white/10 rounded-full">
                    <SearchIcon className="w-4 h-4 text-white" />
                </div>
            </div>

            <div className="relative w-full group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-[var(--color-accent)] transition-colors p-1 bg-white/10 rounded-full">
                    <WorkersIcon className="w-4 h-4" />
                </div>
                <select
                    value={workerFilter}
                    onChange={(e) => setWorkerFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="w-full pl-14 pr-10 py-3.5 bg-black/20 text-white border border-white/5 rounded-2xl appearance-none focus:ring-2 focus:ring-[var(--color-accent)] focus:bg-black/30 transition-all text-sm font-bold shadow-inner cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
                >
                    <option value="all">{t('all_workers')}</option>
                    {workers?.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
        </div>

        {/* Status Pills: Scrollable on mobile, flexible on desktop */}
        <div className="w-full xl:w-auto overflow-x-auto pb-1 min-w-0">
            <div className="flex gap-2 min-w-max">
                {filterOptions.map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-5 py-3.5 rounded-2xl font-bold text-xs transition-all border uppercase tracking-wider whitespace-nowrap backdrop-blur-md ${
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
        {filteredProjects.map((project, idx) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            index={idx}
            isAdmin={user?.role === 'admin'}
            onEdit={handleEdit}
            onDelete={confirmDelete}
            onViewPlan={setViewingProjectPlan}
            onManageTasks={setManagingTasksFor}
            onSync={handleSync}
          />
        ))}
        
        {filteredProjects.length === 0 && (
          <div className="col-span-full py-40 text-center flex flex-col items-center justify-center opacity-50">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_60px_rgba(255,255,255,0.05)]">
                <SearchIcon className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-slate-400 text-2xl font-black uppercase tracking-widest italic">{t('no_data')}</p>
            <p className="text-slate-600 font-bold mt-2 uppercase tracking-widest text-sm">Nebyly nalezeny žádné projekty.</p>
          </div>
        )}
      </div>
      
      {showForm && <ProjectForm project={selectedProject} onClose={() => setShowForm(false)} />}
      {viewingProjectPlan && <PlanViewerModal project={viewingProjectPlan} onClose={() => setViewingProjectPlan(null)} />}
      {managingTasksFor && <ProjectTasksModal project={managingTasksFor} onClose={() => setManagingTasksFor(null)} />}
      {projectToDelete && (
        <ConfirmationModal
          title={t('confirm_delete')}
          message={`Operace je nevratná. Systém trvale odstraní projekt "${projectToDelete.name}". Potvrdit smazání?`}
          onConfirm={handleDelete}
          onCancel={() => setProjectToDelete(null)}
        />
      )}
    </div>
  );
};

export default Projects;
