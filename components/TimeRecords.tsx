import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import type { TimeRecord, Worker, Project } from '../types';
import TimeRecordForm from './TimeRecordForm';

const TimeRecords: React.FC = () => {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TimeRecord | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const records = useLiveQuery(() => db.records.orderBy('startTime').reverse().toArray(), []);
  const workers = useLiveQuery(() => db.workers.toArray(), []);
  const projects = useLiveQuery(() => db.projects.toArray(), []);

  const workerMap = useMemo(() => new Map<number, Worker>(workers?.map(w => [w.id!, w]) || []), [workers]);
  const projectMap = useMemo(() => new Map<number, Project>(projects?.map(p => [p.id!, p]) || []), [projects]);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    return records
      .filter(r => workerFilter === 'all' || r.workerId === Number(workerFilter))
      .filter(r => projectFilter === 'all' || r.projectId === Number(projectFilter))
      .filter(r => {
        if (!searchTerm) return true;
        return r.description.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [records, searchTerm, workerFilter, projectFilter]);

  const handleAdd = () => {
    setSelectedRecord(undefined);
    setShowForm(true);
  };

  const handleEdit = (record: TimeRecord) => {
    setSelectedRecord(record);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('confirm_delete'))) {
      await db.records.delete(id);
    }
  };

  const handleExportDailyReport = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const dailyRecords = await db.records.where('startTime').between(today, tomorrow).toArray();
        
        if (dailyRecords.length === 0) {
            alert(t('no_records_today'));
            return;
        }

        const reportData = {
            date: today.toISOString().split('T')[0],
            records: dailyRecords
        };

        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mst_daily_report_${reportData.date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
         console.error('Daily report export failed:', error);
        alert(t('export_failed'));
    }
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const calculateDuration = (start: Date, end: Date) => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    if (diffMs < 0) return 'Invalid';
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-5xl font-bold text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)]">{t('records')}</h1>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleExportDailyReport}
            className="px-6 py-3 bg-purple-600/80 text-white font-bold rounded-xl hover:bg-purple-600 transition-all shadow-lg text-lg"
          >
            {t('export_daily_reports')}
          </button>
          <button
            onClick={handleAdd}
            className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-lg text-lg"
          >
            {t('add_record')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder={`${t('search')}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="md:col-span-1 p-4 bg-black/20 text-white placeholder-gray-300 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
        />
         <select
            title={t('filter_by_worker')}
            value={workerFilter}
            onChange={(e) => setWorkerFilter(e.target.value)}
            className="p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
        >
            <option value="all">{t('all_workers')}</option>
            {workers?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select
            title={t('filter_by_project')}
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
        >
            <option value="all">{t('all_projects')}</option>
            {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/10">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('worker_name')}</th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('project_name')}</th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('description')}</th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('start_time')}</th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('end_time')}</th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('duration')}</th>
                <th scope="col" className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredRecords?.map((record) => (
                <tr key={record.id} className="hover:bg-white/10 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap text-lg font-medium text-white">{workerMap.get(record.workerId)?.name || 'N/A'}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-lg text-gray-200">{projectMap.get(record.projectId)?.name || 'N/A'}</td>
                  <td className="px-6 py-5 text-lg text-gray-200 max-w-xs whitespace-normal break-words">{record.description}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-lg text-gray-200">{formatDateTime(record.startTime)}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-lg text-gray-200">{formatDateTime(record.endTime)}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-lg font-bold text-white">{calculateDuration(record.startTime, record.endTime)}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-lg font-bold space-x-6">
                    <button onClick={() => handleEdit(record)} className="text-blue-400 hover:underline">{t('edit_record')}</button>
                    <button onClick={() => handleDelete(record.id!)} className="text-pink-500 hover:underline">{t('delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
           {filteredRecords?.length === 0 && (
            <div className="text-center py-12 text-gray-300 text-lg">
              {t('no_data')}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <TimeRecordForm
          record={selectedRecord}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

export default TimeRecords;