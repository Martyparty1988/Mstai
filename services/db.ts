
import Dexie, { type Table } from 'dexie';
import type { Worker, Project, TimeRecord, PlanMarker, SolarTable, TableAssignment, AttendanceSession, DailyLog, ProjectTask, ProjectComponent, PlanAnnotation, TableStatusHistory, Backup } from '../types';

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
  projectComponents!: Table<ProjectComponent>;
  planAnnotations!: Table<PlanAnnotation>;
  tableStatusHistory!: Table<TableStatusHistory>;
  backups!: Table<Backup>;

  constructor() {
    super('MSTDatabase');
    const dbInstance = this as Dexie;

    dbInstance.version(1).stores({
      workers: '++id, name, position',
      projects: '++id, name, client, status',
      records: '++id, workerId, projectId, startTime',
    });
    
    dbInstance.version(2).stores({
        projects: '++id, name, client, status',
    });
    
    dbInstance.version(3).stores({
      planTasks: '++id, projectId',
      planWorkers: '++id, projectId, workerId',
    });

    dbInstance.version(4).stores({
        workers: '++id, name',
    }).upgrade(tx => {
        return tx.table('workers').toCollection().modify(worker => {
            delete (worker as any).position;
        });
    });

    dbInstance.version(5).stores({
        projects: '++id, name, status',
    }).upgrade(tx => {
        return tx.table('projects').toCollection().modify(project => {
            delete (project as any).client;
            delete (project as any).startDate;
            delete (project as any).endDate;
        });
    });

    dbInstance.version(6).stores({
        planMarkers: '++id, projectId, workerId, page',
    });

    dbInstance.version(7).stores({
        workers: '++id, name',
        projects: '++id, name, status',
        records: '++id, workerId, projectId, startTime',
        planMarkers: '++id, projectId, workerId, page',
        solarTables: '++id, projectId, tableCode',
        tableAssignments: '++id, &[tableId+workerId], tableId',
    });
    
    dbInstance.version(8).stores({
        attendanceSessions: '++id, workerId',
        dailyLogs: '++id, &[date+workerId], date',
    });

    dbInstance.version(9).stores({
      projectTasks: '++id, projectId',
    });

    dbInstance.version(10).stores({
        projects: '++id, name, status',
    });

    dbInstance.version(11).stores({
      projectComponents: '++id, projectId',
    });

    dbInstance.version(12).stores({
      planAnnotations: '++id, &[projectId+page]',
    });

    dbInstance.version(13).stores({
      tableStatusHistory: '++id, tableId, timestamp',
    });

    dbInstance.version(14).stores({
      projectTasks: '++id, projectId, assignedWorkerId',
    }).upgrade(tx => {
        return tx.table('projectTasks').toCollection().modify(task => {
            task.completionDate = (task as any).completed ? new Date() : undefined;
            task.price = 0;
            task.assignedWorkerId = undefined;
            delete (task as any).completed;
        });
    });

    dbInstance.version(15).stores({
      projectTasks: '++id, projectId, assignedWorkerId',
    }).upgrade(tx => {
        return tx.table('projectTasks').toCollection().modify(task => {
            task.taskType = 'construction';
            task.panelCount = undefined;
            task.pricePerPanel = undefined;
            task.tableSize = undefined;
        });
    });

    dbInstance.version(16).stores({
        solarTables: '++id, projectId, tableCode, status, [projectId+tableCode], [projectId+status]',
        tableStatusHistory: '++id, tableId, workerId, status, timestamp',
        projectTasks: '++id, projectId, assignedWorkerId, completionDate',
    });

    dbInstance.version(17).stores({
        backups: '++id, type, timestamp',
    });

    dbInstance.version(18).stores({
        workers: '++id, name, username',
    });

    // Version 19: Add googleSpreadsheetId to projects
    dbInstance.version(19).stores({
        projects: '++id, name, status, googleSpreadsheetId',
    });
  }
}

export const db = new MSTDatabase() as MSTDatabase & Dexie;
