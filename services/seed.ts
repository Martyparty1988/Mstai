import { db } from './db';
import type { Worker, Project, TimeRecord, SolarTable, TableAssignment, PlanMarker } from '../types';

type SeedWorker = Omit<Worker, 'id'> & { createdAt: Date | string };
type SeedRecord = Omit<TimeRecord, 'id'> & { startTime: Date | string; endTime: Date | string };

interface SeedData {
  workers: SeedWorker[];
  projects: Array<Omit<Project, 'id'>>;
  records: SeedRecord[];
  solarTables: Array<Omit<SolarTable, 'id'>>;
  tableAssignments: Array<Omit<TableAssignment, 'id'>>;
  planMarkers: Array<Omit<PlanMarker, 'id'>>;
}

// Provide an empty template so the application ships without demo data.
export const defaultSeedData: SeedData = {
  workers: [],
  projects: [],
  records: [],
  solarTables: [],
  tableAssignments: [],
  planMarkers: [],
};


export const seedDatabase = async (seedData: SeedData = defaultSeedData) => {
  try {
    // Clear all existing data to ensure a clean slate.
    // This is safer than clearing tables by name, as it adapts to schema changes.
    await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
            await table.clear();
        }
    });

    // --- Add Workers ---
    const workersToSeed = seedData.workers.map(w => ({
        ...w,
        createdAt: new Date(w.createdAt),
    }));
    const newWorkerIds = workersToSeed.length > 0
        ? await db.workers.bulkAdd(workersToSeed as Worker[], { allKeys: true })
        : [];

    // --- Add Projects ---
    const projectsToSeed = seedData.projects.map(({ planFile, aiPlanFile, ...project }) => project);
    const newProjectIds = projectsToSeed.length > 0
        ? await db.projects.bulkAdd(projectsToSeed as Project[], { allKeys: true })
        : [];

    // --- Add Time Records ---
    // The seed data may reference workers and projects by their 1-based order.
    const recordsToSeed = seedData.records.map(r => {
      const workerIndex = typeof r.workerId === 'number' ? r.workerId - 1 : NaN;
      const projectIndex = typeof r.projectId === 'number' ? r.projectId - 1 : NaN;
      const mappedWorkerId = Number.isInteger(workerIndex) && workerIndex >= 0 ? newWorkerIds[workerIndex] ?? r.workerId : r.workerId;
      const mappedProjectId = Number.isInteger(projectIndex) && projectIndex >= 0 ? newProjectIds[projectIndex] ?? r.projectId : r.projectId;

      return {
        ...r,
        workerId: mappedWorkerId,
        projectId: mappedProjectId,
        startTime: new Date(r.startTime),
        endTime: new Date(r.endTime),
      };
    });
    if (recordsToSeed.length > 0) {
        await db.records.bulkAdd(recordsToSeed as TimeRecord[]);
    }

    // --- Add Solar Tables ---
    const solarTablesToSeed = seedData.solarTables.map(t => {
        const projectIndex = typeof t.projectId === 'number' ? t.projectId - 1 : NaN;
        const mappedProjectId = Number.isInteger(projectIndex) && projectIndex >= 0 ? newProjectIds[projectIndex] ?? t.projectId : t.projectId;
        return {
            ...t,
            projectId: mappedProjectId,
        };
    });
    const newSolarTableIds = solarTablesToSeed.length > 0
        ? await db.solarTables.bulkAdd(solarTablesToSeed as SolarTable[], { allKeys: true })
        : [];

    // --- Add Table Assignments & Plan Markers (if any) ---
    const assignmentsToSeed = seedData.tableAssignments.map(assignment => {
        const tableIndex = typeof assignment.tableId === 'number' ? assignment.tableId - 1 : NaN;
        const workerIndex = typeof assignment.workerId === 'number' ? assignment.workerId - 1 : NaN;
        return {
            ...assignment,
            tableId: Number.isInteger(tableIndex) && tableIndex >= 0 ? newSolarTableIds[tableIndex] ?? assignment.tableId : assignment.tableId,
            workerId: Number.isInteger(workerIndex) && workerIndex >= 0 ? newWorkerIds[workerIndex] ?? assignment.workerId : assignment.workerId,
        };
    });
    if (assignmentsToSeed.length > 0) {
        await db.tableAssignments.bulkAdd(assignmentsToSeed as TableAssignment[]);
    }

    const planMarkersToSeed = seedData.planMarkers.map(marker => {
        const projectIndex = typeof marker.projectId === 'number' ? marker.projectId - 1 : NaN;
        const workerIndex = typeof marker.workerId === 'number' ? marker.workerId - 1 : NaN;
        return {
            ...marker,
            projectId: Number.isInteger(projectIndex) && projectIndex >= 0 ? newProjectIds[projectIndex] ?? marker.projectId : marker.projectId,
            workerId: Number.isInteger(workerIndex) && workerIndex >= 0 ? newWorkerIds[workerIndex] ?? marker.workerId : marker.workerId,
        };
    });
    if (planMarkersToSeed.length > 0) {
        await db.planMarkers.bulkAdd(planMarkersToSeed as PlanMarker[]);
    }

    console.log('Database seeded successfully with new data.');
    return true;
  } catch (error) {
    console.error('Failed to seed database:', error);
    return false;
  }
};
