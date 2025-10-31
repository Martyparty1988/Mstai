import { db } from './db';
import type { Worker, Project, TimeRecord, SolarTable, TableAssignment, PlanMarker } from '../types';

// The new seed data provided by the user.
const seedData = {
  "workers": [
    { "name": "Martin Muller", "hourlyRate": 18, "createdAt": "2024-10-27T10:00:00.000Z" },
    { "name": "Roman", "hourlyRate": 20, "createdAt": "2024-10-27T10:00:00.000Z" },
    { "name": "Jan Rychlík", "hourlyRate": 20, "createdAt": "2024-10-27T10:00:00.000Z" },
    { "name": "Pavel Komender", "hourlyRate": 20, "createdAt": "2024-10-27T10:00:00.000Z" },
    { "name": "Kamila Komenderova", "hourlyRate": 20, "createdAt": "2024-10-27T10:00:00.000Z" },
    { "name": "Patrik Halška", "hourlyRate": 20, "createdAt": "2024-10-27T10:00:00.000Z" },
    { "name": "Filip Kněžinek", "hourlyRate": 20, "createdAt": "2024-10-27T10:00:00.000Z" },
    { "name": "Kuba Jeřábek", "hourlyRate": 20, "createdAt": "2024-10-27T10:00:00.000Z" },
    { "name": "Kuba Soldat", "hourlyRate": 20, "createdAt": "2024-10-27T10:00:00.000Z" }
  ],
  "projects": [
    { "name": "Krekenava", "status": "active" },
    { "name": "Zarasai", "status": "active" }
  ],
  "records": [
    { "workerId": 2, "projectId": 1, "startTime": "2025-10-07T08:00:00.000Z", "endTime": "2025-10-07T16:00:00.000Z", "description": "Completed tables: 28" },
    { "workerId": 3, "projectId": 1, "startTime": "2025-10-07T08:00:00.000Z", "endTime": "2025-10-07T16:00:00.000Z", "description": "Completed tables: 28" },
    { "workerId": 4, "projectId": 1, "startTime": "2025-10-07T08:00:00.000Z", "endTime": "2025-10-07T16:00:00.000Z", "description": "Completed tables: 27" },
    { "workerId": 5, "projectId": 1, "startTime": "2025-10-07T08:00:00.000Z", "endTime": "2025-10-07T16:00:00.000Z", "description": "Completed tables: 27" },
    { "workerId": 2, "projectId": 1, "startTime": "2025-10-08T08:00:00.000Z", "endTime": "2025-10-08T16:00:00.000Z", "description": "Completed tables: 29.1, 28.1, 29, 30, 31.1" },
    { "workerId": 3, "projectId": 1, "startTime": "2025-10-08T08:00:00.000Z", "endTime": "2025-10-08T16:00:00.000Z", "description": "Completed tables: 29.1, 28.1, 29, 30, 31.1" },
    { "workerId": 4, "projectId": 1, "startTime": "2025-10-08T08:00:00.000Z", "endTime": "2025-10-08T16:00:00.000Z", "description": "Completed tables: 37.1, 37, 38.1" },
    { "workerId": 5, "projectId": 1, "startTime": "2025-10-08T08:00:00.000Z", "endTime": "2025-10-08T16:00:00.000Z", "description": "Completed tables: 37.1, 37, 38.1" },
    { "workerId": 2, "projectId": 1, "startTime": "2025-10-09T08:00:00.000Z", "endTime": "2025-10-09T16:00:00.000Z", "description": "Completed tables: 39.1, 31, 39, 40, 106.1" },
    { "workerId": 4, "projectId": 1, "startTime": "2025-10-09T08:00:00.000Z", "endTime": "2025-10-09T16:00:00.000Z", "description": "Completed tables: 38, 41, 42.1, 42" },
    { "workerId": 5, "projectId": 1, "startTime": "2025-10-09T08:00:00.000Z", "endTime": "2025-10-09T16:00:00.000Z", "description": "Completed tables: 38, 41, 42.1, 42" },
    { "workerId": 1, "projectId": 1, "startTime": "2025-10-10T08:00:00.000Z", "endTime": "2025-10-10T16:00:00.000Z", "description": "Completed tables: TR 36, TR 105.1" },
    { "workerId": 4, "projectId": 1, "startTime": "2025-10-10T08:00:00.000Z", "endTime": "2025-10-10T16:00:00.000Z", "description": "Completed tables: 46, 43, 43.1, 44" },
    { "workerId": 5, "projectId": 1, "startTime": "2025-10-10T08:00:00.000Z", "endTime": "2025-10-10T16:00:00.000Z", "description": "Completed tables: 46, 43, 43.1, 44" },
    { "workerId": 1, "projectId": 1, "startTime": "2025-10-11T08:00:00.000Z", "endTime": "2025-10-11T16:00:00.000Z", "description": "Completed tables: 109.1, 110.1, 111.1" },
    { "workerId": 4, "projectId": 1, "startTime": "2025-10-11T08:00:00.000Z", "endTime": "2025-10-11T16:00:00.000Z", "description": "Completed tables: 47.1, 47, 73, 75.1, 118.1" },
    { "workerId": 5, "projectId": 1, "startTime": "2025-10-11T08:00:00.000Z", "endTime": "2025-10-11T16:00:00.000Z", "description": "Completed tables: 47.1, 47, 73, 75.1, 118.1" },
    { "workerId": 1, "projectId": 1, "startTime": "2025-10-13T08:00:00.000Z", "endTime": "2025-10-13T16:00:00.000Z", "description": "Completed tables: 112, 128.1, 127, 112.1" },
    { "workerId": 1, "projectId": 1, "startTime": "2025-10-14T08:00:00.000Z", "endTime": "2025-10-14T16:00:00.000Z", "description": "Completed tables: 129.1, 128, 126, 127.1, 126.1, 139.1, 40.1" },
    { "workerId": 1, "projectId": 2, "startTime": "2025-07-07T08:00:00.000Z", "endTime": "2025-07-07T16:00:00.000Z", "description": "Completed tables: 28.1" },
    { "workerId": 1, "projectId": 2, "startTime": "2025-10-20T08:00:00.000Z", "endTime": "2025-10-20T16:00:00.000Z", "description": "Completed tables: 30, 29, 50.1, 55" },
    { "workerId": 6, "projectId": 2, "startTime": "2025-10-20T08:00:00.000Z", "endTime": "2025-10-20T16:00:00.000Z", "description": "Completed tables: 1.1, 4, 5, 6, 9.1, 9, 10.1, 10, 13.1, 71, 71.1, 18, 18.1, 19.1, 19, 22.1, 22, 24, 25, 26.1, 26, 27, 17.1, 75, 74, 73, 73.1, 21.1, 80.1, 82.1, 80, 90, 93, 96.1, 95, 92, 100.1, 101, 98.1, 101.1, 102.1, 102, 104.1, 103.1, 105.1, 114.1, 235.1, 122.1, 122, 123, 124, 234, 223.1, 222.1, 233, 224.1, 221, 208.1, 243, 243.1, 242, 145, 145.1, 148, 148.1, 242.1, 241, 241.1, 240, 16.1, 76, 76.1, 117.1, 116, 31, 31.1, 28, 49" },
    { "workerId": 7, "projectId": 2, "startTime": "2025-10-20T08:00:00.000Z", "endTime": "2025-10-20T16:00:00.000Z", "description": "Completed tables: 1.1, 4, 5, 6, 9.1, 9, 10.1, 10, 13.1, 71, 71.1, 18, 18.1, 19.1, 19, 22.1, 22, 24, 25, 26.1, 26, 27, 17.1, 75, 74, 73, 73.1, 21.1, 80.1, 82.1, 80, 90, 93, 96.1, 95, 92, 100.1, 101, 98.1, 101.1, 102.1, 102, 104.1, 103.1, 105.1, 114.1, 235.1, 122.1, 122, 123, 124, 234, 223.1, 222.1, 233, 224.1, 221, 208.1, 243, 243.1, 242, 145, 145.1, 148, 148.1, 242.1, 241, 241.1, 240, 106.1, 107.1, 109.1, 110.1, 110, 112.1, 217, 217.1, 213.1" },
    { "workerId": 8, "projectId": 2, "startTime": "2025-10-20T08:00:00.000Z", "endTime": "2025-10-20T16:00:00.000Z", "description": "Completed tables: 1, 3, 5.1, 6.1, 7.1, 7, 8.1, 11.1, 72, 72.1, 70, 70.1, 78.1, 78, 79.1, 79, 77, 77.1, 88.1, 88, 27.1, 11, 13, 20, 14.1, 12, 21, 82, 93.1, 92.1, 95.1, 96, 99.1, 97, 97.1, 98, 100, 104, 99, 75.1, 14, 105, 106, 109, 108, 108.1, 107, 113.1, 112, 118.1, 218, 219.1, 219, 226.1, 225, 113, 234.1, 223, 221.1, 220.1, 220, 193.1, 89, 91" },
    { "workerId": 9, "projectId": 2, "startTime": "2025-10-20T08:00:00.000Z", "endTime": "2025-10-20T16:00:00.000Z", "description": "Completed tables: 1, 3, 5.1, 6.1, 7.1, 7, 8.1, 11.1, 72, 72.1, 70, 70.1, 78.1, 78, 79.1, 79, 77, 77.1, 88.1, 88, 27.1, 11, 13, 20, 14.1, 12, 21, 82, 93.1, 92.1, 95.1, 96, 99.1, 97, 97.1, 98, 100, 104, 99, 75.1, 14, 105, 106, 109, 108, 108.1, 107, 113.1, 112, 118.1, 218, 219.1, 219, 226.1, 225, 113, 234.1, 223, 221.1, 220.1, 220, 16, 20.1, 111.1, 111, 211.1" }
  ],
  "solarTables": [
    { "projectId": 1, "tableCode": "28", "tableType": "small", "status": "completed", "x": 67.2, "y": 53.1 },
    { "projectId": 1, "tableCode": "29.1", "tableType": "small", "status": "completed", "x": 45.3, "y": 88.4 },
    { "projectId": 1, "tableCode": "28.1", "tableType": "small", "status": "completed", "x": 34.5, "y": 23.6 },
    { "projectId": 2, "tableCode": "28.1", "tableType": "small", "status": "completed", "x": 78.9, "y": 45.1 },
    { "projectId": 1, "tableCode": "29", "tableType": "small", "status": "completed", "x": 12.3, "y": 67.8 },
    { "projectId": 2, "tableCode": "29", "tableType": "small", "status": "completed", "x": 56.4, "y": 34.9 },
    { "projectId": 1, "tableCode": "30", "tableType": "small", "status": "completed", "x": 89.1, "y": 11.2 },
    { "projectId": 2, "tableCode": "30", "tableType": "small", "status": "completed", "x": 23.5, "y": 78.3 },
    { "projectId": 1, "tableCode": "31.1", "tableType": "small", "status": "completed", "x": 47.8, "y": 55.6 },
    { "projectId": 2, "tableCode": "31.1", "tableType": "small", "status": "completed", "x": 66.3, "y": 22.1 },
    { "projectId": 1, "tableCode": "39.1", "tableType": "small", "status": "completed", "x": 19.4, "y": 82.7 },
    { "projectId": 1, "tableCode": "31", "tableType": "small", "status": "completed", "x": 71.2, "y": 40.5 },
    { "projectId": 2, "tableCode": "31", "tableType": "small", "status": "completed", "x": 51.8, "y": 64.9 },
    { "projectId": 1, "tableCode": "39", "tableType": "small", "status": "completed", "x": 33.7, "y": 15.8 },
    { "projectId": 1, "tableCode": "40", "tableType": "small", "status": "completed", "x": 62.1, "y": 73.4 },
    { "projectId": 1, "tableCode": "106.1", "tableType": "small", "status": "completed", "x": 84.6, "y": 29.3 },
    { "projectId": 2, "tableCode": "106.1", "tableType": "small", "status": "completed", "x": 28.7, "y": 88.8 }
  ],
  "tableAssignments": [],
  "planMarkers": []
};


export const seedDatabase = async () => {
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
    // Get the new auto-incremented IDs to map relationships correctly.
    const newWorkerIds = await db.workers.bulkAdd(workersToSeed as Worker[], { allKeys: true });

    // --- Add Projects ---
    const projectsToSeed = seedData.projects;
    const newProjectIds = await db.projects.bulkAdd(projectsToSeed as Project[], { allKeys: true });
    
    // --- Add Time Records ---
    // The seed data uses 1-based indexes for relationships. We map these to the new Dexie IDs.
    const recordsToSeed = seedData.records.map(r => ({
      ...r,
      workerId: newWorkerIds[r.workerId - 1], 
      projectId: newProjectIds[r.projectId - 1],
      startTime: new Date(r.startTime),
      endTime: new Date(r.endTime),
    }));
    await db.records.bulkAdd(recordsToSeed as TimeRecord[]);
    
    // --- Add Solar Tables ---
    const solarTablesToSeed = seedData.solarTables.map(t => ({
        ...t,
        projectId: newProjectIds[t.projectId - 1],
    }));
    await db.solarTables.bulkAdd(solarTablesToSeed as SolarTable[]);

    // --- Add Table Assignments & Plan Markers (if any) ---
    // The provided data has empty arrays, but this makes the function robust.
    if (seedData.tableAssignments.length > 0) {
        // This would require mapping tableIds and workerIds if it had data
        await db.tableAssignments.bulkAdd(seedData.tableAssignments as TableAssignment[]);
    }
    if (seedData.planMarkers.length > 0) {
        // This would require mapping projectId and workerId if it had data
        await db.planMarkers.bulkAdd(seedData.planMarkers as PlanMarker[]);
    }

    console.log('Database seeded successfully with new data.');
    return true;
  } catch (error) {
    console.error('Failed to seed database:', error);
    return false;
  }
};
