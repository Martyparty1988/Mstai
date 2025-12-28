import Dexie from 'dexie';

export const db = new Dexie('MST_Database');

// UUID helper
export const generateId = () => {
    // Basic UUID v4 generator if crypto.randomUUID is not available (though it should be)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

db.version(2).stores({
    // Changed from ++id to id (UUID)
    // Added synced (0=false, 1=true) for indexing
    projects: 'id, location, status, date, synced, updatedAt',
    tables: 'id, projectId, type, status, x, y, synced, updatedAt',
    workers: 'id, name, email, role, rate, synced, updatedAt',
    attendance: 'id, workerId, checkIn, checkOut, type, date, synced, updatedAt',
    settings: 'key, value'
});

// Helper to seed data if needed
export const seedDatabase = async () => {
    const count = await db.workers.count();
    if (count === 0) {
        await db.workers.add({
            id: generateId(),
            name: 'Pepa Montér',
            email: 'pepa@mst.cz',
            role: 'Montér',
            rate: 250,
            synced: 0,
            updatedAt: new Date().toISOString()
        });
    }
};
