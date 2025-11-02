import { db } from './db';
import type { TimeRecord } from '../types';

/**
 * Parses a time record's description to find solar table codes and updates their status.
 * Also assigns the worker from the record to the completed tables.
 * @param record The time record to process.
 */
export const processRecordDescription = async (record: TimeRecord): Promise<void> => {
  if (!record.description) return;

  // Regex to find table codes like: "28", "29.1", "TR 36", "105.1"
  const tableCodeRegex = /(?:TR\s*)?(\d+(?:\.\d)?)/g;
  const matches = record.description.matchAll(tableCodeRegex);
  // Using a Set to avoid processing duplicate codes from the same description
  const tableCodes = new Set(Array.from(matches, m => m[1]));

  if (tableCodes.size === 0) return;

  try {
    await db.transaction('rw', db.solarTables, db.tableAssignments, db.tableStatusHistory, async () => {
      for (const code of tableCodes) {
        // Find the table in the current project
        const table = await db.solarTables
          .where({ projectId: record.projectId, tableCode: code })
          .first();

        if (table && table.id) {
          // 1. Update table status to completed and log history if it changed
          if (table.status !== 'completed') {
            await db.solarTables.update(table.id, { status: 'completed' });
            // Log the change to history
            await db.tableStatusHistory.add({
                tableId: table.id,
                workerId: record.workerId,
                status: 'completed',
                timestamp: new Date(),
            });
          }

          // 2. Assign the worker to the table if not already assigned
          const existingAssignment = await db.tableAssignments
            .where({ tableId: table.id, workerId: record.workerId })
            .first();
            
          if (!existingAssignment) {
            await db.tableAssignments.add({ tableId: table.id, workerId: record.workerId });
          }
        } else {
          console.warn(`Table with code "${code}" not found for project ID ${record.projectId}.`);
        }
      }
    });
  } catch (error) {
    console.error('Failed to process record description and update tables:', error);
  }
};
