'use client';


import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId } from '@/lib/db';
import Link from 'next/link';

import { Plus, MapPin, Zap, ChevronRight } from 'lucide-react';

export default function Projects() {
    const projects = useLiveQuery(() => db.projects.toArray());
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ location: '', small: 0, medium: 0, large: 0 });

    const calculatePower = (s, m, l) => {
        // Arbitrary MW values: Small=0.2, Medium=0.5, Large=0.8
        return (s * 0.2 + m * 0.5 + l * 0.8).toFixed(1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const power = calculatePower(formData.small, formData.medium, formData.large);

        const projectId = generateId();

        await db.projects.add({
            id: projectId,
            location: formData.location,
            status: 'Planování',
            date: new Date(), // Keeping date object for local, but sync handles serialization
            power: power,
            counts: {
                small: parseInt(formData.small),
                medium: parseInt(formData.medium),
                large: parseInt(formData.large)
            },
            synced: 0,
            updatedAt: new Date().toISOString()
        });

        // Generate tables for this project
        const tables = [];
        ['small', 'medium', 'large'].forEach((type) => {
            const count = parseInt(formData[type]);
            for (let i = 0; i < count; i++) {
                tables.push({
                    id: generateId(),
                    projectId,
                    type,
                    status: 'pending',
                    x: Math.random() * 800, // Random positions for canvas map
                    y: Math.random() * 600,
                    synced: 0,
                    updatedAt: new Date().toISOString()
                });
            }
        });

        await db.tables.bulkAdd(tables);

        setFormData({ location: '', small: 0, medium: 0, large: 0 });
        setShowForm(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0 }}>Projekty</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    <Plus size={20} />
                </button>
            </header>

            {showForm && (
                <div className="glass glass-panel animate-fade-in">
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Nový Projekt</h2>
                    <form onSubmit={handleSubmit}>
                        <input
                            required
                            className="input"
                            placeholder="Lokace (např. Brno - Pole)"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Malé</label>
                                <input type="number" className="input" value={formData.small} onChange={e => setFormData({ ...formData, small: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Střední</label>
                                <input type="number" className="input" value={formData.medium} onChange={e => setFormData({ ...formData, medium: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Velké</label>
                                <input type="number" className="input" value={formData.large} onChange={e => setFormData({ ...formData, large: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ marginTop: '10px', textAlign: 'right' }}>
                            <span style={{ marginRight: '10px', color: '#60a5fa' }}>
                                Odhad: {calculatePower(formData.small, formData.medium, formData.large)} MW
                            </span>
                            <button type="submit" className="btn btn-primary">Vytvořit</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>
                {projects?.map(project => (
                    <Link href={`/projects/${project.id}`} key={project.id} className="glass" style={{ textDecoration: 'none', color: 'inherit', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <MapPin size={16} color="#60a5fa" />
                                <span style={{ fontWeight: 'bold' }}>{project.location}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#94a3b8' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Zap size={14} /> {project.power} MW
                                </div>
                                <div>{project.status}</div>
                            </div>
                        </div>
                        <ChevronRight color="#475569" />
                    </Link>
                ))}
                {projects?.length === 0 && !showForm && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        Zatím žádné projekty. Klikněte na + pro vytvoření.
                    </div>
                )}
            </div>
        </div>
    );
}
