



import React from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { useTheme, themesData } from '../contexts/ThemeContext';
import { db } from '../services/db';

const Settings: React.FC = () => {
  const { t, language, setLanguage } = useI18n();
  const [colorTheme, toggleTheme] = useDarkMode();
  const { theme, setTheme } = useTheme();

  const handleExport = async () => {
    try {
      const workersData = await db.workers.toArray();
      const projectsData = await db.projects.toArray();
      const recordsData = await db.records.toArray();
      const planMarkersData = await db.planMarkers.toArray();
      const solarTablesData = await db.solarTables.toArray();
      const tableAssignmentsData = await db.tableAssignments.toArray();
      const attendanceSessionsData = await db.attendanceSessions.toArray();
      const dailyLogsData = await db.dailyLogs.toArray();

      const backupData = {
        workers: workersData,
        projects: projectsData.map(p => ({...p, planFile: null})), // Don't export file content
        records: recordsData,
        planMarkers: planMarkersData,
        solarTables: solarTablesData,
        tableAssignments: tableAssignmentsData,
        attendanceSessions: attendanceSessionsData,
        dailyLogs: dailyLogsData,
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mst_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert(t('data_exported'));
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Backup failed!');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (!window.confirm(t('seed_data_confirm'))) {
          return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const backupData = JSON.parse(event.target?.result as string);
          if (backupData.workers && backupData.projects && backupData.records) {
            await db.transaction('rw', [db.workers, db.projects, db.records, db.planMarkers, db.solarTables, db.tableAssignments, db.attendanceSessions, db.dailyLogs], async () => {
              await db.workers.clear();
              await db.projects.clear();
              await db.records.clear();
              await db.planMarkers.clear();
              await db.solarTables.clear();
              await db.tableAssignments.clear();
              await db.attendanceSessions.clear();
              await db.dailyLogs.clear();
              
              const parseDates = (data: any[], dateFields: string[]) => {
                return data.map(item => {
                  const newItem = { ...item };
                  dateFields.forEach(field => {
                    if (newItem[field]) {
                      newItem[field] = new Date(newItem[field]);
                    }
                  });
                  delete newItem.id;
                  return newItem;
                });
              };

              await db.workers.bulkAdd(parseDates(backupData.workers, ['createdAt']));
              await db.projects.bulkAdd(parseDates(backupData.projects, []));
              await db.records.bulkAdd(parseDates(backupData.records, ['startTime', 'endTime']));
              if(backupData.planMarkers) await db.planMarkers.bulkAdd(backupData.planMarkers.map((item: any) => { delete item.id; return item; }));
              if(backupData.solarTables) await db.solarTables.bulkAdd(backupData.solarTables.map((item: any) => { delete item.id; return item; }));
              if(backupData.tableAssignments) await db.tableAssignments.bulkAdd(backupData.tableAssignments.map((item: any) => { delete item.id; return item; }));
              if(backupData.attendanceSessions) await db.attendanceSessions.bulkAdd(parseDates(backupData.attendanceSessions, ['startTime']));
              if(backupData.dailyLogs) await db.dailyLogs.bulkAdd(backupData.dailyLogs.map((item: any) => { delete item.id; return item; }));
            });
            alert(t('data_imported'));
          } else {
            throw new Error('Invalid backup file format');
          }
        } catch (error) {
          console.error('Import failed:', error);
          alert(t('import_error'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div>
      <h1 className="text-5xl font-bold mb-8 text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)]">{t('settings')}</h1>
      <div className="space-y-8 max-w-4xl">
        <div className="p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg">
          <h2 className="text-3xl font-bold mb-4 text-white">{t('app_theme')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {themesData.map(themeOption => (
              <button
                key={themeOption.id}
                onClick={() => setTheme(themeOption.id)}
                className={`p-4 rounded-xl transition-all border-2 ${theme === themeOption.id ? 'border-white' : 'border-transparent'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 rounded-md flex overflow-hidden ring-1 ring-white/20">
                    <div style={{ backgroundColor: themeOption.colors[0] }} className="w-1/2 h-full"></div>
                    <div style={{ backgroundColor: themeOption.colors[1] }} className="w-1/2 h-full"></div>
                  </div>
                  <span className="font-bold text-lg text-white">{t(themeOption.nameKey)}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-white/10">
            <h3 className="text-2xl font-bold mb-4 text-white">{t('theme')}</h3>
            <div className="flex items-center justify-between">
                <span className="text-gray-200 text-lg">{colorTheme === 'light' ? t('dark_mode_active') : t('light_mode_active')}</span>
                <button 
                onClick={toggleTheme} 
                className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors text-lg"
                >
                {colorTheme === 'light' ? t('switch_to_dark') : t('switch_to_light')}
                </button>
            </div>
          </div>
        </div>

        <div className="p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg">
          <h2 className="text-3xl font-bold mb-4 text-white">{t('data_management')}</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleExport}
              className="px-6 py-3 bg-blue-600/80 text-white font-bold rounded-xl hover:bg-blue-600 transition shadow-md text-lg w-full"
            >
              {t('export_all_data')}
            </button>
            <button 
              onClick={handleImport}
              className="px-6 py-3 bg-green-600/80 text-white font-bold rounded-xl hover:bg-green-600 transition shadow-md text-lg w-full"
            >
              {t('import_data')}
            </button>
          </div>
        </div>
        
        <div className="p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg">
          <h2 className="text-3xl font-bold mb-4 text-white">{t('language')}</h2>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'cs')}
            className="w-full p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
          >
            <option value="cs">Čeština</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default Settings;