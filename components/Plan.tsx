
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import type { Project, SolarTable, TableAssignment, Worker } from '../types';

// Helper function to derive table type from code
const getTableType = (code: string): 'small' | 'medium' | 'large' | null => {
  const c = code.toLowerCase();
  if (c.startsWith('it28')) return 'small';
  if (c.startsWith('it42')) return 'medium';
  if (c.startsWith('it56')) return 'large';
  return null;
};

// --- Table Management Modal ---
interface TableManagementModalProps {
    table?: SolarTable;
    coords?: { x: number; y: number };
    projectId: number;
    onClose: () => void;
}

const TableManagementModal: React.FC<TableManagementModalProps> = ({ table, coords, projectId, onClose }) => {
    const { t } = useI18n();
    const [tableCode, setTableCode] = useState('');
    const [tableType, setTableType] = useState<'small' | 'medium' | 'large' | null>(null);
    const [status, setStatus] = useState<'pending' | 'completed'>('pending');
    const [workerToAssign, setWorkerToAssign] = useState<number | ''>('');

    const allWorkers = useLiveQuery(() => db.workers.toArray());
    const assignments = useLiveQuery(() => table?.id ? db.tableAssignments.where('tableId').equals(table.id).toArray() : [], [table?.id]);

    const workerMap = useMemo(() => new Map(allWorkers?.map(w => [w.id!, w])), [allWorkers]);

    useEffect(() => {
        if (table) {
            setTableCode(table.tableCode);
            setTableType(table.tableType);
            setStatus(table.status);
        }
    }, [table]);

    useEffect(() => {
        setTableType(getTableType(tableCode));
    }, [tableCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const derivedType = getTableType(tableCode);
        if (!derivedType) {
            alert(t('table_code_invalid'));
            return;
        }

        if (table?.id) {
            await db.solarTables.update(table.id, { tableCode, tableType: derivedType, status });
        } else if (coords) {
            const newTable: Omit<SolarTable, 'id'> = {
                projectId,
                x: coords.x,
                y: coords.y,
                tableCode,
                tableType: derivedType,
                status: 'pending',
            };
            await db.solarTables.add(newTable as SolarTable);
        }
        onClose();
    };

    const handleDelete = async () => {
        if (table?.id && window.confirm(t('confirm_delete'))) {
            await db.transaction('rw', db.solarTables, db.tableAssignments, async () => {
                await db.tableAssignments.where('tableId').equals(table.id!).delete();
                await db.solarTables.delete(table.id!);
            });
            onClose();
        }
    };
    
    const handleAssignWorker = async () => {
        if (table?.id && workerToAssign) {
            const assignment: Omit<TableAssignment, 'id'> = {
                tableId: table.id,
                workerId: Number(workerToAssign),
            };
            await db.tableAssignments.add(assignment as TableAssignment);
            setWorkerToAssign('');
        }
    };

    const handleUnassignWorker = async (assignmentId: number) => {
        await db.tableAssignments.delete(assignmentId);
    };

    const availableWorkers = useMemo(() => {
        if (!allWorkers || !assignments) return [];
        const assignedIds = new Set(assignments.map(a => a.workerId));
        return allWorkers.filter(w => !assignedIds.has(w.id!));
    }, [allWorkers, assignments]);

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-lg p-4">
            <div className="w-full max-w-lg p-8 bg-black/20 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/10 max-h-[90vh] overflow-y-auto">
                <h2 className="text-3xl font-bold mb-6 text-white">{table ? t('edit_table') : t('add_table')}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="tableCode" className="block text-lg font-medium text-gray-300 mb-2">{t('table_code')}</label>
                        <input
                            type="text"
                            id="tableCode"
                            value={tableCode}
                            onChange={(e) => setTableCode(e.target.value)}
                            placeholder={t('table_code_placeholder')}
                            required
                            className="mt-1 block w-full p-4 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
                        />
                        {tableCode && <p className="text-sm text-gray-400 mt-2">{t('table_type')}: <span className="font-bold text-white">{tableType ? t(tableType) : 'N/A'}</span></p>}
                    </div>

                    {table && (
                        <div>
                            <label htmlFor="status" className="block text-lg font-medium text-gray-300 mb-2">{t('status')}</label>
                            <select
                                id="status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as 'pending' | 'completed')}
                                className="mt-1 block w-full p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
                            >
                                <option value="pending">{t('pending')}</option>
                                <option value="completed">{t('completed')}</option>
                            </select>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-4">
                        <div>{table && <button type="button" onClick={handleDelete} className="px-6 py-3 bg-pink-600/80 text-white font-bold rounded-xl hover:bg-pink-600 transition-colors text-lg">{t('delete')}</button>}</div>
                        <div className="flex justify-end space-x-4">
                            <button type="button" onClick={onClose} className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors text-lg">{t('cancel')}</button>
                            <button type="submit" className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-md text-lg">{t('save')}</button>
                        </div>
                    </div>
                </form>

                {table && (
                    <div className="mt-8 border-t border-white/10 pt-6">
                         <h3 className="text-2xl font-bold mb-4 text-white">{t('assigned_workers')}</h3>
                         <div className="space-y-3 mb-4">
                             {assignments?.map(a => (
                                 <div key={a.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                     <span className="text-gray-200 font-medium">{workerMap.get(a.workerId)?.name || '...'}</span>
                                     <button onClick={() => handleUnassignWorker(a.id!)} className="text-xs text-pink-400 hover:underline">{t('unassign')}</button>
                                 </div>
                             ))}
                             {assignments?.length === 0 && <p className="text-gray-400">{t('no_data')}</p>}
                         </div>
                         <div className="flex gap-2">
                             <select value={workerToAssign} onChange={e => setWorkerToAssign(Number(e.target.value))} className="flex-grow p-3 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-base [&>option]:bg-gray-800">
                                 <option value="" disabled>{t('select_worker')}</option>
                                 {availableWorkers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                             </select>
                             <button onClick={handleAssignWorker} disabled={!workerToAssign} className="px-5 py-3 bg-green-600/80 text-white font-bold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 text-base">{t('assign_worker')}</button>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Plan Component ---

const Plan: React.FC = () => {
    const { t } = useI18n();
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [view, setView] = useState<'plan' | 'registry'>('plan');
    const [modalState, setModalState] = useState<{ isOpen: boolean; coords?: { x: number; y: number }; table?: SolarTable; }>({ isOpen: false });
    const containerRef = useRef<HTMLDivElement>(null);
    const [planStatus, setPlanStatus] = useState<'idle' | 'loading' | 'error' | 'loaded'>('idle');

    const projects = useLiveQuery(() => db.projects.toArray());
    const workers = useLiveQuery(() => db.workers.toArray());
    const tables = useLiveQuery(() => selectedProjectId ? db.solarTables.where('projectId').equals(selectedProjectId).toArray() : [], [selectedProjectId]);
    const assignments = useLiveQuery(() => {
        if (!tables || tables.length === 0) return Promise.resolve([]);
        const tableIds = tables.map(t => t.id!);
        return db.tableAssignments.where('tableId').anyOf(tableIds).toArray();
    }, [tables]);

    const workerMap = useMemo(() => new Map(workers?.map(w => [w.id!, w])), [workers]);
    const assignmentsByTableId = useMemo(() => {
        const map = new Map<number, TableAssignment[]>();
        if (!assignments) return map;
        for (const assignment of assignments) {
            if (!map.has(assignment.tableId)) {
                map.set(assignment.tableId, []);
            }
            map.get(assignment.tableId)!.push(assignment);
        }
        return map;
    }, [assignments]);
    
    useEffect(() => {
        if (selectedProjectId) {
            setPlanStatus('loading');
            const img = new Image();
            img.src = `https://picsum.photos/seed/${selectedProjectId}/1200/800`;
            img.onload = () => setPlanStatus('loaded');
            img.onerror = () => setPlanStatus('error');
        } else {
            setPlanStatus('idle');
        }
    }, [selectedProjectId]);

    const handlePlanClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width * 100;
        const y = (e.clientY - rect.top) / rect.height * 100;
        setModalState({ isOpen: true, coords: { x, y } });
    };

    const handleMarkerClick = (e: React.MouseEvent, table: SolarTable) => {
        e.stopPropagation();
        setModalState({ isOpen: true, table });
    };
    
    const handleStatusToggle = async (table: SolarTable) => {
        const newStatus = table.status === 'pending' ? 'completed' : 'pending';
        await db.solarTables.update(table.id!, { status: newStatus });
    };

    const getTableMarkerStyle = (tableType: 'small' | 'medium' | 'large', status: 'pending' | 'completed'): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
            position: 'absolute',
            transform: 'translate(-50%, -50%)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            transition: 'all 0.2s ease-in-out',
            opacity: status === 'completed' ? 0.65 : 1,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        };
    
        switch (tableType) {
            case 'small':
                return {
                    ...baseStyle,
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-chart-2)',
                    border: '2px solid white',
                };
            case 'medium':
                return {
                    ...baseStyle,
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-primary)',
                    border: '2px solid white',
                };
            case 'large':
                return {
                    ...baseStyle,
                    width: '40px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-secondary)',
                    border: '2px solid white',
                };
            default:
                return { ...baseStyle, backgroundColor: '#6b7280' };
        }
    };

    const renderPlanContent = () => {
        if (!selectedProjectId) return <p className="text-center text-gray-400">{t('select_project_to_view_plan')}</p>;
        if (planStatus === 'loading') return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>;
        if (planStatus === 'error') return <p className="text-center text-red-400 font-bold">{t('plan_load_error')}</p>;
        
        return (
            <>
                <img src={`https://picsum.photos/seed/${selectedProjectId}/1200/800`} alt="Project Plan" className="w-full h-full object-contain" />
                {tables?.map(table => {
                    const tableAssignments = assignmentsByTableId.get(table.id!) || [];
                    const markerStyle = getTableMarkerStyle(table.tableType, table.status);
                    
                    return (
                        <div
                            key={table.id}
                            style={{ left: `${table.x}%`, top: `${table.y}%`, ...markerStyle }}
                            onClick={(e) => handleMarkerClick(e, table)}
                            title={`${table.tableCode} (${t(table.status)})`}
                        >
                            <span className="text-[10px] pointer-events-none">
                                {table.tableCode.split(/[-.]/).pop()}
                            </span>
                            {tableAssignments.length > 0 && (
                                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center text-[9px] font-bold border-2 border-white">
                                    {tableAssignments.length}
                                </div>
                            )}
                        </div>
                    );
                })}
            </>
        );
    };

    return (
        <div>
            <h1 className="text-5xl font-bold text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)] mb-8">{t('plan')}</h1>

            <div className="p-6 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg mb-8">
                <div className="flex flex-col md:flex-row gap-4">
                    <select
                        title={t('select_project')}
                        value={selectedProjectId || ''}
                        onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                        className="flex-grow p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
                    >
                        <option value="">{t('select_project')}</option>
                        {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                {selectedProjectId && (
                    <div className="mt-4 flex gap-2">
                        <button onClick={() => setView('plan')} className={`px-5 py-2 font-bold rounded-lg transition ${view === 'plan' ? 'bg-[var(--color-primary)] text-white' : 'bg-white/10 hover:bg-white/20'}`}>{t('plan_view')}</button>
                        <button onClick={() => setView('registry')} className={`px-5 py-2 font-bold rounded-lg transition ${view === 'registry' ? 'bg-[var(--color-primary)] text-white' : 'bg-white/10 hover:bg-white/20'}`}>{t('table_registry')}</button>
                    </div>
                )}
            </div>

            {view === 'plan' && (
                 <div 
                    ref={containerRef}
                    className="relative w-full h-[600px] bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg overflow-hidden flex items-center justify-center"
                    onClick={planStatus === 'loaded' ? handlePlanClick : undefined}
                    title={planStatus === 'loaded' ? t('click_plan_to_add_table') : ''}
                >
                    {renderPlanContent()}
                </div>
            )}
            
            {view === 'registry' && selectedProjectId && (
                <div className="bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/10">
                            <thead className="bg-white/10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('table_code')}</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('table_type')}</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('assigned_workers')}</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('status')}</th>
                                    <th className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {tables?.map(table => {
                                    const tableAssignments = assignmentsByTableId.get(table.id!) || [];
                                    return (
                                        <tr key={table.id} className="hover:bg-white/10 transition-colors">
                                            <td className="px-6 py-5 whitespace-nowrap text-lg font-medium text-white">{table.tableCode}</td>
                                            <td className="px-6 py-5 whitespace-nowrap text-lg text-gray-200">{t(table.tableType)}</td>
                                            <td className="px-6 py-5 text-lg text-gray-200">{tableAssignments.map(a => workerMap.get(a.workerId)?.name).join(', ')}</td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <button onClick={() => handleStatusToggle(table)} className={`px-4 py-1.5 inline-flex text-base leading-5 font-bold rounded-full text-white ${table.status === 'completed' ? 'bg-green-600' : 'bg-gray-600'}`}>
                                                    {t(table.status)}
                                                </button>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-right text-lg font-bold">
                                                <button onClick={() => setModalState({ isOpen: true, table })} className="text-blue-400 hover:underline">{t('edit_table')}</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {(!tables || tables.length === 0) && <p className="text-center py-12 text-gray-300 text-lg">{t('no_tables_defined')}</p>}
                    </div>
                </div>
            )}
            
            {modalState.isOpen && selectedProjectId && (
                <TableManagementModal
                    projectId={selectedProjectId}
                    coords={modalState.coords}
                    table={modalState.table}
                    onClose={() => setModalState({ isOpen: false })}
                />
            )}
        </div>
    );
};

export default Plan;
