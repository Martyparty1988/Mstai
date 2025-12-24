
import React, { useState, useRef } from 'react';
import { useBackup } from '../contexts/BackupContext';
import { useI18n } from '../contexts/I18nContext';
import UploadIcon from './icons/UploadIcon';
import TrashIcon from './icons/TrashIcon';
import ConfirmationModal from './ConfirmationModal';

// Icons needed for UI
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const DatabaseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const RestoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>;

const BackupManager: React.FC = () => {
    const { t } = useI18n();
    const { 
        backups, createBackup, deleteBackup, restoreBackup, importBackup, exportBackup,
        autoBackupEnabled, setAutoBackupEnabled, backupInterval, setBackupInterval 
    } = useBackup();
    
    const [importMode, setImportMode] = useState<'merge' | 'replace'>('replace');
    const [backupToRestore, setBackupToRestore] = useState<number | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            if (window.confirm(t('restore_confirm_message'))) {
                await importBackup(file, importMode);
            }
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
             if (window.confirm(t('restore_confirm_message'))) {
                await importBackup(file, importMode);
            }
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <ClockIcon /> {t('auto_backup')}
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-300 font-medium">{t('status')}</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={autoBackupEnabled} onChange={e => setAutoBackupEnabled(e.target.checked)} />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-300 font-medium">{t('backup_interval')}</span>
                            <select 
                                value={backupInterval} 
                                onChange={e => setBackupInterval(Number(e.target.value))}
                                className="bg-black/30 border border-white/10 rounded-lg text-white text-sm p-2 focus:ring-[var(--color-accent)] [&>option]:bg-gray-900"
                            >
                                <option value="5">5 {t('minutes')}</option>
                                <option value="15">15 {t('minutes')}</option>
                                <option value="30">30 {t('minutes')}</option>
                                <option value="60">60 {t('minutes')}</option>
                            </select>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {t('backup_retention')}: 10 {t('items')}
                        </p>
                    </div>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg flex flex-col justify-center items-center text-center gap-4">
                    <div className="flex items-center gap-2 text-gray-400 font-medium">
                        <DatabaseIcon />
                        {t('storage_used')}
                    </div>
                    <div className="text-4xl font-black text-white tracking-tight">
                        {formatBytes(backups.reduce((acc, b) => acc + (b.metadata?.dataSize || 0), 0))}
                    </div>
                    <div className="text-sm text-gray-500 font-bold uppercase tracking-widest">
                        {backups.length} {t('backups_count')}
                    </div>
                </div>
            </div>

            {/* Actions Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Create & Import */}
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/5 space-y-4">
                    <button 
                        onClick={() => createBackup('manual')}
                        className="w-full py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-black rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                        <UploadIcon className="w-5 h-5" /> {t('create_backup')}
                    </button>
                    
                    <div 
                        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragOver ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}`}
                    >
                        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileSelect} />
                        <p className="text-gray-400 font-bold mb-2">{t('upload_backup')}</p>
                        <p className="text-xs text-gray-600">{t('drop_backup_here')}</p>
                    </div>
                    
                    <div className="flex justify-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="importMode" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} className="text-[var(--color-accent)] focus:ring-[var(--color-accent)] bg-gray-800 border-gray-600" />
                            <span className="text-sm text-gray-300 font-bold">{t('replace')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="importMode" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} className="text-[var(--color-accent)] focus:ring-[var(--color-accent)] bg-gray-800 border-gray-600" />
                            <span className="text-sm text-gray-300 font-bold">{t('merge')}</span>
                        </label>
                    </div>
                </div>

                {/* Backup List */}
                <div className="bg-black/20 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden flex flex-col h-[400px]">
                    <div className="p-4 border-b border-white/5 bg-white/5">
                        <h4 className="font-bold text-white uppercase tracking-widest text-sm">{t('backup_manager')}</h4>
                    </div>
                    <div className="overflow-y-auto p-4 space-y-3 flex-1 custom-scrollbar">
                        {backups.map(backup => (
                            <div key={backup.id} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${backup.type === 'auto' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                                            <span className="font-bold text-white text-sm">{backup.name || t('backup')}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 ml-4">{new Date(backup.timestamp).toLocaleString()}</p>
                                    </div>
                                    <span className="text-xs font-mono text-gray-400 bg-black/30 px-2 py-1 rounded-lg">{formatBytes(backup.metadata?.dataSize || 0)}</span>
                                </div>
                                
                                <div className="flex gap-2 pl-4 mt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => setBackupToRestore(backup.id!)}
                                        className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                        title={t('restore_backup')}
                                    >
                                        <RestoreIcon />
                                    </button>
                                    <button 
                                        onClick={() => exportBackup(backup.id!)}
                                        className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                                        title={t('download_backup')}
                                    >
                                        <DownloadIcon />
                                    </button>
                                    <button 
                                        onClick={() => deleteBackup(backup.id!)}
                                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors ml-auto"
                                        title={t('delete')}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {backups.length === 0 && (
                            <p className="text-center text-gray-500 py-10 italic">{t('no_data')}</p>
                        )}
                    </div>
                </div>
            </div>

            {backupToRestore && (
                <ConfirmationModal 
                    title={t('restore_confirm_title')}
                    message={t('restore_confirm_message')}
                    confirmLabel={t('restore_backup')}
                    onConfirm={() => { restoreBackup(backupToRestore, 'replace'); setBackupToRestore(null); }}
                    onCancel={() => setBackupToRestore(null)}
                    variant="warning"
                />
            )}
        </div>
    );
};

export default BackupManager;
