import { db } from './db';
import { GOOGLE_SCRIPT_URL } from './config';

/**
 * Main Sync Function
 * 1. Pushes local changes to Google Sheets
 * 2. Pulls fresh data from Google Sheets
 * 3. Updates local database
 */
export const syncData = async () => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('INSERT_YOUR')) {
        console.warn('Sync skipped: API URL not configured.');
        return { success: false, message: 'API URL not configured' };
    }

    try {
        console.log('Starting sync...');

        // 1. PUSH Changes
        const changes = await gatherLocalChanges();
        if (hasChanges(changes)) {
            console.log('Pushing changes:', changes);
            await pushChangesToRemote(changes);
            await markAsSynced(changes);
        }

        // 2. PULL Data
        console.log('Fetching remote data...');
        const remoteData = await fetchRemoteData();
        if (remoteData) {
            await updateLocalDatabase(remoteData);
        }

        return { success: true };
    } catch (error) {
        console.error('Sync failed:', error);
        return { success: false, message: error.message };
    }
};

// --- Helpers ---

const TABLE_NAMES = ['projects', 'tables', 'workers', 'attendance'];

async function gatherLocalChanges() {
    const changes = {};
    for (const tableName of TABLE_NAMES) {
        // Find records where synced is 0 (false)
        changes[tableName] = await db.table(tableName).where('synced').equals(0).toArray();
    }
    return changes;
}

function hasChanges(changes) {
    return Object.values(changes).some(arr => arr.length > 0);
}

async function pushChangesToRemote(changes) {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes })
    });

    const result = await response.json();
    if (result.status !== 'success') {
        throw new Error(result.message || 'Unknown error during push');
    }
}

async function markAsSynced(changes) {
    const timestamp = new Date().toISOString();

    await db.transaction('rw', ...TABLE_NAMES, async () => {
        for (const tableName of TABLE_NAMES) {
            const records = changes[tableName];
            for (const record of records) {
                // Update synced=1 and ensure matches remote state
                await db.table(tableName).update(record.id, { synced: 1 });
            }
        }
    });
}

async function fetchRemoteData() {
    const response = await fetch(GOOGLE_SCRIPT_URL);
    const result = await response.json();

    if (result.status === 'success') {
        return result.data;
    } else {
        throw new Error(result.message || 'Unknown error during fetch');
    }
}

async function updateLocalDatabase(remoteData) {
    await db.transaction('rw', ...TABLE_NAMES, async () => {
        for (const tableName of TABLE_NAMES) {
            const remoteRecords = remoteData[tableName] || [];
            if (remoteRecords.length === 0) continue;

            const table = db.table(tableName);

            // Upsert remote records
            // We consciously overwrite local state with server state to ensure consistency
            // In a more complex app, we might check timestamps to avoid overwriting newer local unsynced changes
            // But for this simple sync model, server wins on pull, but we only pull stable state.

            // However, we must NOT overwrite 'synced=0' records if they are newer specific edits.
            // Simplified strategy: Upsert all. IF we just pushed, our local is same as server.
            // If someone else edited, we accept their change.
            // To be safe: We keep our 'synced=0' status if we have pending changes that we haven't pushed yet?
            // Actually, simplest is: Bulk Put.

            // We need to map 'synced=1' to these incoming records
            const recordsToPut = remoteRecords.map(r => ({ ...r, synced: 1 }));
            await table.bulkPut(recordsToPut);
        }
    });
}
