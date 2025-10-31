
import Dexie, { type Table } from 'dexie';
import type { Worker, Project, TimeRecord, PlanMarker, SolarTable, TableAssignment, AttendanceSession, DailyLog, ProjectTask } from '../types';

export class MSTDatabase extends Dexie {
  workers!: Table<Worker>;
  projects!: Table<Project>;
  records!: Table<TimeRecord>;
  planMarkers!: Table<PlanMarker>;
  solarTables!: Table<SolarTable>;
  tableAssignments!: Table<TableAssignment>;
  attendanceSessions!: Table<AttendanceSession>;
  dailyLogs!: Table<DailyLog>;
  projectTasks!: Table<ProjectTask>;

  constructor() {
    super('MSTDatabase');
    // Fix: Cast `this` to `Dexie` to resolve a TypeScript error where the `version` method was not being found on the subclass type.
    const dbInstance = this as Dexie;

    dbInstance.version(1).stores({
      workers: '++id, name, position',
      projects: '++id, name, client, status',
      records: '++id, workerId, projectId, startTime',
    });
    
    // Bump version to handle the new optional `planFile` property on Project.
    // No data migration is needed as it's a new, unindexed property.
    dbInstance.version(2).stores({
        projects: '++id, name, client, status', // Schema for indexed fields remains the same
    });
    
    dbInstance.version(3).stores({
      planTasks: '++id, projectId',
      planWorkers: '++id, projectId, workerId',
    });

    // Bump version to remove the 'position' property from Worker.
    // Data migration will remove the 'position' property from existing workers.
    dbInstance.version(4).stores({
        workers: '++id, name', // remove position index
    }).upgrade(tx => {
        return tx.table('workers').toCollection().modify(worker => {
            delete (worker as any).position;
        });
    });

    // Bump version to remove client, startDate, and endDate from Project.
    dbInstance.version(5).stores({
        projects: '++id, name, status', // remove client index
    }).upgrade(tx => {
        return tx.table('projects').toCollection().modify(project => {
            delete (project as any).client;
            delete (project as any).startDate;
            delete (project as any).endDate;
        });
    });

    // Bump version to add planMarkers table.
    dbInstance.version(6).stores({
        planMarkers: '++id, projectId, workerId, page',
    });

    // Version 7: Replaces planTasks/planWorkers with a more structured solar table system.
    dbInstance.version(7).stores({
        workers: '++id, name',
        projects: '++id, name, status',
        records: '++id, workerId, projectId, startTime',
        planMarkers: '++id, projectId, workerId, page',
        solarTables: '++id, projectId, tableCode',
        tableAssignments: '++id, &[tableId+workerId], tableId',
    });
    
    // Version 8: Adds tables for attendance tracking.
    dbInstance.version(8).stores({
        attendanceSessions: '++id, workerId', // For active clock-ins
        dailyLogs: '++id, &[date+workerId], date', // For daily attendance status and notes
    });

    // Version 9: Adds table for project-specific tasks.
    dbInstance.version(9).stores({
      projectTasks: '++id, projectId',
    });
  }
}

// Fix: The MSTDatabase subclass doesn't correctly inherit Dexie's method types.
// This cast ensures that the exported `db` object has the correct type,
// including methods like `transaction`, resolving downstream type errors.
export const db = new MSTDatabase() as MSTDatabase & Dexie;
