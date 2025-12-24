
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { backupService } from '../services/backupService';
import type { Backup } from '../types';

interface BackupContextType {
  autoBackupEnabled: boolean;
  setAutoBackupEnabled: (enabled: boolean) => void;
  backupInterval: number; // in minutes
  setBackupInterval: (minutes: number) => void;
  backups: Backup[];
  createBackup: (type: 'auto' | 'manual', name?: string) => Promise<void>;
  restoreBackup: (id: number, mode: 'merge' | 'replace') => Promise<void>;
  deleteBackup: (id: number) => Promise<void>;
  importBackup: (file: File, mode: 'merge' | 'replace') => Promise<void>;
  exportBackup: (id: number) => Promise<void>;
}

const BackupContext = createContext<BackupContextType | undefined>(undefined);

export const BackupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [autoBackupEnabled, setAutoBackupEnabledState] = useState(() => {
      return localStorage.getItem('autoBackupEnabled') !== 'false';
  });
  const [backupInterval, setBackupIntervalState] = useState(() => {
      return Number(localStorage.getItem('backupInterval')) || 30;
  });

  const backups = useLiveQuery(() => db.backups.orderBy('timestamp').reverse().toArray()) || [];

  const setAutoBackupEnabled = (enabled: boolean) => {
      localStorage.setItem('autoBackupEnabled', String(enabled));
      setAutoBackupEnabledState(enabled);
  };

  const setBackupInterval = (minutes: number) => {
      localStorage.setItem('backupInterval', String(minutes));
      setBackupIntervalState(minutes);
  };

  const createBackup = useCallback(async (type: 'auto' | 'manual', name?: string) => {
      await backupService.createBackup(type, name);
  }, []);

  const restoreBackup = useCallback(async (id: number, mode: 'merge' | 'replace') => {
      await backupService.restoreBackup(id, mode);
      window.location.reload(); // Reload to ensure all states are fresh
  }, []);

  const deleteBackup = useCallback(async (id: number) => {
      await backupService.deleteBackup(id);
  }, []);

  const importBackup = useCallback(async (file: File, mode: 'merge' | 'replace') => {
      await backupService.importBackupFile(file, mode);
      window.location.reload();
  }, []);

  const exportBackup = useCallback(async (id: number) => {
      await backupService.exportBackupJSON(id);
  }, []);

  // Auto-backup Logic
  useEffect(() => {
      if (!autoBackupEnabled) return;

      const intervalId = setInterval(async () => {
          const lastAuto = await db.backups.where('type').equals('auto').reverse().first();
          const now = new Date().getTime();
          const lastTime = lastAuto ? lastAuto.timestamp.getTime() : 0;
          
          // Check if interval has passed
          if (now - lastTime > backupInterval * 60 * 1000) {
              console.log('Running auto-backup...');
              await createBackup('auto');
          }
      }, 60000); // Check every minute

      return () => clearInterval(intervalId);
  }, [autoBackupEnabled, backupInterval, createBackup]);

  return (
    <BackupContext.Provider value={{
        autoBackupEnabled, setAutoBackupEnabled,
        backupInterval, setBackupInterval,
        backups,
        createBackup, restoreBackup, deleteBackup, importBackup, exportBackup
    }}>
      {children}
    </BackupContext.Provider>
  );
};

export const useBackup = () => {
  const context = useContext(BackupContext);
  if (!context) throw new Error('useBackup must be used within BackupProvider');
  return context;
};
