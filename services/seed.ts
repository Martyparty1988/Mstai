import { db } from './db';
import type { Worker, Project, TimeRecord } from '../types';

export const seedDatabase = async () => {
  try {
    // Clear existing data
    await db.records.clear();
    await db.projects.clear();
    await db.workers.clear();

    // Add Workers
    const workers: Omit<Worker, 'id'>[] = [
      { name: 'Jan Novák', hourlyRate: 25, createdAt: new Date() },
      { name: 'Eva Dvořáková', hourlyRate: 30, createdAt: new Date() },
      { name: 'Petr Svoboda', hourlyRate: 40, createdAt: new Date() },
    ];
    const workerIds = await db.workers.bulkAdd(workers as Worker[], { allKeys: true });

    // Add Projects
    const projects: Omit<Project, 'id'>[] = [
      { name: 'Alpha Installation', status: 'completed' },
      { name: 'Beta Maintenance', status: 'active' },
      { name: 'Gamma Grid Connect', status: 'on-hold' },
       { name: 'Delta Residential', status: 'completed' },
    ];
    const projectIds = await db.projects.bulkAdd(projects as Project[], { allKeys: true });
    
    // Add Time Records
    const records: Omit<TimeRecord, 'id'>[] = [
      // Project 1: Alpha
      { workerId: workerIds[0], projectId: projectIds[0], startTime: new Date('2023-02-01T08:00:00'), endTime: new Date('2023-02-01T16:00:00'), description: 'Panel mounting' }, // 8 hours
      { workerId: workerIds[1], projectId: projectIds[0], startTime: new Date('2023-02-02T09:00:00'), endTime: new Date('2023-02-02T17:00:00'), description: 'Wiring' }, // 8 hours
      { workerId: workerIds[0], projectId: projectIds[0], startTime: new Date('2023-02-03T08:30:00'), endTime: new Date('2023-02-03T12:30:00'), description: 'Final checks' }, // 4 hours
      // Project 2: Beta
      { workerId: workerIds[0], projectId: projectIds[1], startTime: new Date('2023-04-05T08:00:00'), endTime: new Date('2023-04-05T18:00:00'), description: 'System diagnostics' }, // 10 hours
      { workerId: workerIds[2], projectId: projectIds[1], startTime: new Date('2023-04-06T10:00:00'), endTime: new Date('2023-04-06T14:00:00'), description: 'Client meeting' }, // 4 hours
       // Project 4: Delta
      { workerId: workerIds[1], projectId: projectIds[3], startTime: new Date('2023-07-10T08:00:00'), endTime: new Date('2023-07-10T16:30:00'), description: 'Initial wiring' }, // 8.5 hours
      { workerId: workerIds[2], projectId: projectIds[3], startTime: new Date('2023-07-11T09:00:00'), endTime: new Date('2023-07-11T17:00:00'), description: 'Planning and coordination' }, // 8 hours
    ];
    await db.records.bulkAdd(records as TimeRecord[]);
    
    console.log('Database seeded successfully.');
    return true;
  } catch (error) {
    console.error('Failed to seed database:', error);
    return false;
  }
};