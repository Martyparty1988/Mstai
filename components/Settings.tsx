
import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { useTheme, themesData } from '../contexts/ThemeContext';
import { db } from '../services/db';
import UploadIcon from './icons/UploadIcon';
import TrashIcon from './icons/TrashIcon';
import ConfirmationModal from './ConfirmationModal';
import BrainIcon from './icons/BrainIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

const Settings: React.FC = () => {
  const { t, language, setLanguage } = useI18n();
  const [colorTheme, toggleTheme] = useDarkMode();
  const { theme, setTheme } = useTheme();
  const [isResetting, setIsResetting] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkApiKey();
  }, []);

  const handleConnectAi = async () => {
    if (window.aistudio?.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        // Per guidelines, assume success after triggering openSelectKey
        setHasApiKey(true);
      } catch (error) {
        console.error("Failed to open key selection:", error);
      }
    } else {
      alert("AI Studio key management is not available in this environment.");
    }
  };

  const handleExport = async () => {
    try {
      const allData: any = {};
      const tableNames = [
        'workers', 'projects', 'records', 'planMarkers', 'solarTables', 
        'tableAssignments', 'attendanceSessions', 'dailyLogs', 
        'projectTasks', 'projectComponents', 'planAnnotations', 'tableStatusHistory'
      ];
      
      for (const name of tableNames) {
          const table = (db as any)[name];
          if (table) {
            allData[name] = await table.toArray();
          }
      }
      
      // Clean up sensitive/binary data for backup
      if (allData.projects) {
          allData.projects = allData.projects.map((p: any) => ({ ...p, planFile: null, aiPlanFile: null }));
      }

      const backupData = {
        ...allData,
        exportedAt: new Date().toISOString(),
        version: "2.0"
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mst_full_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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

      if (!window.confirm(t('seed_data_confirm'))) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          const tableNames = Object.keys(data);
          
          await db.transaction('rw', db.tables, async () => {
              for (const name of tableNames) {
                  const table = (db as any)[name];
                  if (table && data[name]) {
                      await table.clear();
                      const items = data[name].map((item: any) => {
                          const newItem = { ...item };
                          ['createdAt', 'startTime', 'endTime', 'timestamp', 'completionDate'].forEach(f => {
                              if (newItem[f]) newItem[f] = new Date(newItem[f]);
                          });
                          return newItem;
                      });
                      await table.bulkAdd(items);
                  }
              }
          });
          alert(t('data_imported'));
          window.location.reload();
        } catch (error) {
          console.error('Import failed:', error);
          alert(t('import_error'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearAll = async () => {
      await db.transaction('rw', db.tables, async () => {
          for (const table of db.tables) await table.clear();
      });
      window.location.reload();
  };

  return (
    <div className="pb-12">
      <h1 className="text-6xl font-black mb-12 text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)] italic uppercase tracking-tighter underline decoration-[var(--color-accent)] decoration-8">
        {t('settings')}
      </h1>
      
      <div className="space-y-8 max-w-5xl">
        {/* AI Configuration Section */}
        <section className="p-8 bg-slate-900/40 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-black mb-4 text-white uppercase tracking-widest flex items-center gap-3">
            <BrainIcon className="w-8 h-8 text-indigo-400" />
            AI Konfigurace
          </h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Pro aktivaci pokročilých funkcí jako je analýza obrázků, vyhledávání projektů na mapě a inteligentní příkazy, připojte svůj Google Gemini API klíč.
            <br />
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline text-sm font-bold">
              Více informací o zpoplatnění naleznete zde.
            </a>
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">Status připojení</h3>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${hasApiKey ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                <span className={`font-black uppercase tracking-tighter ${hasApiKey ? 'text-green-400' : 'text-red-400'}`}>
                  {hasApiKey ? 'Aktivní' : 'Nepřipojeno'}
                </span>
              </div>
            </div>
            <button 
              onClick={handleConnectAi}
              className={`px-8 py-4 font-black rounded-xl transition-all shadow-lg uppercase tracking-tighter flex items-center gap-3 ${hasApiKey ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/50 hover:bg-indigo-600 hover:text-white' : 'bg-indigo-600 text-white hover:bg-indigo-500 scale-105'}`}
            >
              {hasApiKey ? 'Změnit API klíč' : 'Připojit Gemini API'}
            </button>
          </div>
        </section>

        <section className="p-8 bg-slate-900/40 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-black mb-8 text-white uppercase tracking-widest">{t('app_theme')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {themesData.map(themeOption => (
              <button
                key={themeOption.id}
                onClick={() => setTheme(themeOption.id)}
                className={`p-1 rounded-2xl transition-all border-4 ${theme === themeOption.id ? 'border-[var(--color-accent)] scale-105 shadow-xl' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-102'}`}
              >
                <div className="h-20 rounded-xl flex overflow-hidden shadow-inner">
                    <div style={{ backgroundColor: themeOption.colors[0] }} className="w-1/2 h-full"></div>
                    <div style={{ backgroundColor: themeOption.colors[1] }} className="w-1/2 h-full"></div>
                </div>
                <span className="block mt-2 font-bold text-sm text-white truncate">{t(themeOption.nameKey)}</span>
              </button>
            ))}
          </div>
          <div className="mt-10 pt-8 border-t border-white/10 flex items-center justify-between bg-white/5 p-6 rounded-2xl">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">{t('theme')}</h3>
                    <p className="text-gray-400 text-sm">{colorTheme === 'light' ? t('dark_mode_active') : t('light_mode_active')}</p>
                </div>
                <button 
                onClick={toggleTheme} 
                className="px-8 py-3 bg-white/10 text-white font-black rounded-xl hover:bg-white/20 transition-all border border-white/20 uppercase tracking-tighter"
                >
                {colorTheme === 'light' ? t('switch_to_dark') : t('switch_to_light')}
                </button>
          </div>
        </section>

        <section className="p-8 bg-slate-900/40 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-black mb-8 text-white uppercase tracking-widest">{t('language')}</h2>
          <div className="grid grid-cols-2 gap-4">
              {(['cs', 'en'] as const).map(lang => (
                  <button 
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`p-6 rounded-2xl font-black text-2xl transition-all border-4 ${language === lang ? 'bg-indigo-600 border-white text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                  >
                      {lang.toUpperCase()}
                  </button>
              ))}
          </div>
        </section>

        <section className="p-8 bg-slate-900/40 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-black mb-8 text-white uppercase tracking-widest">{t('data_management')}</h2>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={handleExport}
              className="flex-1 min-w-[200px] px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all shadow-lg text-lg uppercase tracking-tighter flex items-center justify-center gap-3"
            >
              <UploadIcon className="w-6 h-6 rotate-180" />
              {t('export_all_data')}
            </button>
            <button 
              onClick={handleImport}
              className="flex-1 min-w-[200px] px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-500 transition-all shadow-lg text-lg uppercase tracking-tighter flex items-center justify-center gap-3"
            >
              <UploadIcon className="w-6 h-6" />
              {t('import_data')}
            </button>
            <button 
              onClick={() => setIsResetting(true)}
              className="flex-1 min-w-[200px] px-8 py-4 bg-red-600/20 text-red-400 border-2 border-red-500/50 font-black rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-lg text-lg uppercase tracking-tighter flex items-center justify-center gap-3"
            >
              <TrashIcon className="w-6 h-6" />
              Reset App
            </button>
          </div>
        </section>
      </div>

      {isResetting && (
          <ConfirmationModal
            title={t('reset_app_title')}
            message={t('reset_app_confirm')}
            confirmLabel="RESET"
            onConfirm={handleClearAll}
            onCancel={() => setIsResetting(false)}
            variant="danger"
          />
      )}
    </div>
  );
};

export default Settings;
