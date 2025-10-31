
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import type { Project, SolarTable, TableAssignment, Worker } from '../types';

declare const pdfjsLib: any;

// Helper function to derive table type from code
const getTableType = (code: string): 'small' | 'medium' | 'large' | null => {
  const c = code.toLowerCase();
  if (c.startsWith('it28')) return 'small';
  if (c.startsWith('it42')) return 'medium';
  if (c.startsWith('it56')) return 'large';
  return null;
};

// Utility to get a consistent color for a worker
const getWorkerColor = (workerId: number) => {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', 
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', 
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
  ];
  return colors[workerId % colors.length];
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

    const assignments = useLiveQuery(() => table ? db.tableAssignments.where('tableId').equals(table.id!).toArray() : undefined, [table?.id]);
    const allWorkers = useLiveQuery(() => db.workers.toArray());

    const assignedWorkerIds = useMemo(() => assignments?.map(a => a.workerId) || [], [assignments]);
    const unassignedWorkers = useMemo(() => allWorkers?.filter(w => !assignedWorkerIds.includes(w.id!)), [allWorkers, assignedWorkerIds]);
    const assignedWorkers = useMemo(() => allWorkers?.filter(w => assignedWorkerIds.includes(w.id!)), [allWorkers, assignedWorkerIds]);
    
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

    const handleAssignWorker = async () => {
        if (!table?.id || !workerToAssign) return;
        await db.tableAssignments.add({ tableId: table.id, workerId: Number(workerToAssign) });
        setWorkerToAssign('');
    };

    const handleUnassignWorker = async (workerId: number) => {
        if (!table?.id) return;
        const assignment = await db.tableAssignments.where({ tableId: table.id, workerId }).first();
        if (assignment) {
            await db.tableAssignments.delete(assignment.id!);
        }
    };

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
                        <>
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

                             <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-xl font-bold text-white">{t('assigned_workers')}</h3>
                                {assignedWorkers && assignedWorkers.length > 0 ? (
                                    <ul className="space-y-2">
                                        {assignedWorkers.map(worker => (
                                            <li key={worker.id} className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                                                <span className="text-gray-200">{worker.name}</span>
                                                <button type="button" onClick={() => handleUnassignWorker(worker.id!)} className="text-pink-500 hover:underline text-sm font-bold">{t('unassign')}</button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="text-gray-400">{t('no_data')}</p>}

                                {unassignedWorkers && unassignedWorkers.length > 0 && (
                                    <div className="flex gap-2">
                                        <select value={workerToAssign} onChange={e => setWorkerToAssign(Number(e.target.value))} className="flex-grow p-2 bg-black/20 text-white border border-white/20 rounded-lg focus:ring-blue-400 focus:border-blue-400 [&>option]:bg-gray-800">
                                            <option value="" disabled>{t('select_worker')}</option>
                                            {unassignedWorkers.map(w => <option key={w.id} value={w.id!}>{w.name}</option>)}
                                        </select>
                                        <button type="button" onClick={handleAssignWorker} disabled={!workerToAssign} className="px-4 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-500 disabled:opacity-50">{t('assign_worker')}</button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    
                    <div className="flex justify-between items-center pt-4">
                        <div>{table && <button type="button" onClick={handleDelete} className="px-6 py-3 bg-pink-600/80 text-white font-bold rounded-xl hover:bg-pink-600 transition-colors text-lg">{t('delete')}</button>}</div>
                        <div className="flex justify-end space-x-4">
                            <button type="button" onClick={onClose} className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors text-lg">{t('cancel')}</button>
                            <button type="submit" className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-md text-lg">{t('save')}</button>
                        </div>
                    </div>
                </form>
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
    const planContentRef = useRef<HTMLDivElement>(null);
    const [planStatus, setPlanStatus] = useState<'idle' | 'loading' | 'error' | 'loaded' | 'no-plan'>('idle');
    const [zoom, setZoom] = useState(1);
    const draggedMarkerRef = useRef<{ id: number; table: SolarTable; offsetX: number; offsetY: number; hasDragged: boolean } | null>(null);
    const [aiPlanUrl, setAiPlanUrl] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<any>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [pageNum, setPageNum] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    const projects = useLiveQuery(() => db.projects.toArray());
    const selectedProject = useLiveQuery(() => selectedProjectId ? db.projects.get(selectedProjectId) : undefined, [selectedProjectId]);
    const tables = useLiveQuery(() => selectedProjectId ? db.solarTables.where('projectId').equals(selectedProjectId).toArray() : [], [selectedProjectId]);
    
    const tableIds = useMemo(() => tables?.map(t => t.id!) || [], [tables]);
    const assignments = useLiveQuery(() => tableIds.length > 0 ? db.tableAssignments.where('tableId').anyOf(tableIds).toArray() : [], [tableIds]);
    
    const assignmentCountMap = useMemo(() => {
        const map = new Map<number, number>();
        if (!assignments) return map;
        for (const assignment of assignments) {
            map.set(assignment.tableId, (map.get(assignment.tableId) || 0) + 1);
        }
        return map;
    }, [assignments]);
    
    const tableIdToFirstWorkerIdMap = useMemo(() => {
        const map = new Map<number, number>();
        if (!assignments) return map;

        // Sort assignments to be deterministic if order changes
        const sortedAssignments = [...assignments].sort((a, b) => a.id! - b.id!);

        for (const assignment of sortedAssignments) {
            if (!map.has(assignment.tableId)) {
                map.set(assignment.tableId, assignment.workerId);
            }
        }
        return map;
    }, [assignments]);

    // Calculate workload per worker
    const workerWorkload = useMemo(() => {
        const workload = new Map<number, number>();
        if (!assignments) return workload;

        for (const assignment of assignments) {
            workload.set(assignment.workerId, (workload.get(assignment.workerId) || 0) + 1);
        }
        return workload;
    }, [assignments]);

    useEffect(() => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
    }, []);

    const renderPage = useCallback(async (pdf: any, pageNumber: number) => {
        if (!canvasRef.current) return;
    
        try {
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: zoom });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
    
            const renderContext = { canvasContext: context, viewport };
            const task = page.render(renderContext);
            renderTaskRef.current = task;
            
            await task.promise;
        } catch (err: any) {
            if (err.name !== 'RenderingCancelledException') {
                console.error('PDF render failed:', err);
                setPlanStatus('error');
            }
        }
    }, [zoom]);

    useEffect(() => {
        // Cleanup previous state when project changes
        setAiPlanUrl(null);
        setPdfDoc(null);
        setPlanStatus(selectedProjectId ? 'loading' : 'idle');
    
        if (!selectedProject) return;

        // Prioritize AI-redrawn plan
        if (selectedProject.aiPlanFile) {
            const url = URL.createObjectURL(selectedProject.aiPlanFile);
            setAiPlanUrl(url);
            setPlanStatus('loaded');
            return () => URL.revokeObjectURL(url);
        }
    
        // Fallback to original PDF
        if (selectedProject.planFile) {
            const loadPdf = async () => {
                const arrayBuffer = await selectedProject.planFile!.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                try {
                    const pdf = await loadingTask.promise;
                    setPdfDoc(pdf);
                    setTotalPages(pdf.numPages);
                    setPageNum(1);
                    setPlanStatus('loaded');
                } catch (error) {
                    console.error("Failed to load PDF:", error);
                    setPlanStatus('error');
                }
            };
            loadPdf();
        } else {
            setPlanStatus('no-plan');
        }
    
        return () => {
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
        };
    }, [selectedProject, selectedProjectId]);
    
    useEffect(() => {
        if (planStatus === 'loaded' && pdfDoc && !aiPlanUrl) {
            renderPage(pdfDoc, pageNum);
        }
    }, [planStatus, pdfDoc, pageNum, renderPage, aiPlanUrl]);

    const handlePlanClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('[id^="marker-"]')) return;
        if (!planContentRef.current) return;
        const rect = planContentRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width * 100;
        const y = (e.clientY - rect.top) / rect.height * 100;
        setModalState({ isOpen: true, coords: { x, y } });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!draggedMarkerRef.current || !planContentRef.current) return;
        draggedMarkerRef.current.hasDragged = true;
        
        const markerElem = document.getElementById(`marker-${draggedMarkerRef.current.id}`);
        const container = planContentRef.current;
        if (!markerElem || !container) return;
        
        const containerRect = container.getBoundingClientRect();
        
        const newLeftPx = e.clientX - containerRect.left - draggedMarkerRef.current.offsetX;
        const newTopPx = e.clientY - containerRect.top - draggedMarkerRef.current.offsetY;
        
        const markerWidth = markerElem.offsetWidth;
        const markerHeight = markerElem.offsetHeight;
        
        const markerCenterX = newLeftPx + markerWidth / 2;
        const markerCenterY = newTopPx + markerHeight / 2;
    
        let centerXPercent = (markerCenterX / containerRect.width) * 100;
        let centerYPercent = (markerCenterY / containerRect.height) * 100;
    
        const halfWidthPercent = (markerWidth / 2 / containerRect.width) * 100;
        const halfHeightPercent = (markerHeight / 2 / containerRect.height) * 100;
        centerXPercent = Math.max(halfWidthPercent, Math.min(centerXPercent, 100 - halfWidthPercent));
        centerYPercent = Math.max(halfHeightPercent, Math.min(centerYPercent, 100 - halfHeightPercent));
    
        markerElem.style.left = `${centerXPercent}%`;
        markerElem.style.top = `${centerYPercent}%`;
    }, []);

    const handleMouseUp = useCallback(async () => {
        if (!draggedMarkerRef.current) return;
    
        if (draggedMarkerRef.current.hasDragged) {
            const markerElem = document.getElementById(`marker-${draggedMarkerRef.current.id}`);
            if (markerElem) {
                const finalX = parseFloat(markerElem.style.left);
                const finalY = parseFloat(markerElem.style.top);
                await db.solarTables.update(draggedMarkerRef.current.id, { x: finalX, y: finalY });
            }
        } else {
            setModalState({ isOpen: true, table: draggedMarkerRef.current.table });
        }
    
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        draggedMarkerRef.current = null;
    }, [handleMouseMove, setModalState]);

    const handleMarkerMouseDown = useCallback((e: React.MouseEvent, table: SolarTable) => {
        e.preventDefault();
        e.stopPropagation();
        
        const target = e.currentTarget as HTMLDivElement;
        const rect = target.getBoundingClientRect();
        
        draggedMarkerRef.current = {
            id: table.id!,
            table: table,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            hasDragged: false
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove, handleMouseUp]);
    
    const handleStatusToggle = async (table: SolarTable) => {
        const newStatus = table.status === 'pending' ? 'completed' : 'pending';
        await db.solarTables.update(table.id!, { status: newStatus });
    };

    const getTableMarkerStyle = (table: SolarTable): React.CSSProperties => {
        const firstWorkerId = tableIdToFirstWorkerIdMap.get(table.id!);
        const workload = firstWorkerId ? workerWorkload.get(firstWorkerId) || 1 : 1;
        
        // Base size and more pronounced scale factor for workload visualization
        const baseSize = 28;
        const scale = 1 + Math.log1p(workload) * 0.4;
        const scaledSize = baseSize * scale;

        let backgroundColor = '#6b7280'; // Gray for unassigned
        if (firstWorkerId) {
            backgroundColor = getWorkerColor(firstWorkerId);
        }

        const baseStyle: React.CSSProperties = {
            position: 'absolute',
            transform: 'translate(-50%, -50%)',
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            transition: 'all 0.2s ease-in-out',
            opacity: table.status === 'completed' ? 0.65 : 1,
            // More intense shadow/glow to show workload intensity
            boxShadow: `0 2px 10px rgba(0, 0, 0, 0.6), 0 0 ${Math.min(workload * 3, 35)}px ${backgroundColor}`,
            border: '2px solid white',
            width: `${scaledSize}px`,
            height: `${scaledSize}px`,
        };
        
        switch (table.tableType) {
            case 'small':
                return { ...baseStyle, borderRadius: '50%', backgroundColor };
            case 'medium':
                return { ...baseStyle, borderRadius: '6px', backgroundColor };
            case 'large':
                 // Large tables are rectangular and bigger
                return { ...baseStyle, width: `${scaledSize * 1.4}px`, height: `${scaledSize * 0.85}px`, borderRadius: '6px', backgroundColor };
            default:
                return { ...baseStyle, backgroundColor: '#6b7280' };
        }
    };

    const renderPlanContent = () => {
        if (!selectedProjectId) return <p className="text-center text-gray-400">{t('select_project_to_view_plan')}</p>;
        if (planStatus === 'loading') return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>;
        if (planStatus === 'error') return <p className="text-center text-red-400 font-bold">{t('plan_load_error')}</p>;
        if (planStatus === 'no-plan') return <p className="text-center text-gray-400 font-bold">{t('no_plan_available')}</p>;
        
        const markers = tables?.map(table => {
            const assignmentCount = assignmentCountMap.get(table.id!) || 0;
            return (
                <div
                    key={table.id}
                    id={`marker-${table.id!}`}
                    style={{ left: `${table.x}%`, top: `${table.y}%`, ...getTableMarkerStyle(table) }}
                    onMouseDown={(e) => handleMarkerMouseDown(e, table)}
                    title={`${table.tableCode} (${t(table.status)})`}
                    className="active:cursor-grabbing"
                >
                    <span className="text-[10px] pointer-events-none">
                        {table.tableCode.split(/[-.]/).pop()}
                    </span>
                        {assignmentCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center border-2 border-white shadow-md">
                            {assignmentCount}
                        </span>
                    )}
                </div>
            );
        });

        if (aiPlanUrl) {
            return (
                <>
                    <img src={aiPlanUrl} alt={t('plan_preview')} className="max-w-full max-h-full object-contain" />
                    {markers}
                </>
            );
        }

        return (
            <>
                <canvas ref={canvasRef} className="rounded-md shadow-lg" />
                {markers}
            </>
        );
    };

    return (
        <div>
            <h1 className="text-5xl font-bold text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)] mb-8">{t('plan')}</h1>

            <div className="p-6 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg mb-8">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <select
                        title={t('select_project')}
                        value={selectedProjectId || ''}
                        onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                        className="flex-grow w-full md:w-auto p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
                    >
                        <option value="">{t('select_project')}</option>
                        {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {selectedProjectId && view === 'plan' && planStatus === 'loaded' && (
                        <div className="flex items-center gap-4 flex-wrap">
                             {totalPages > 1 && !aiPlanUrl && (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum <= 1} className="px-3 py-2 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 disabled:opacity-50 transition-colors">‹</button>
                                    <span className="text-white font-bold">{t('page')} {pageNum} / {totalPages}</span>
                                    <button onClick={() => setPageNum(p => Math.min(totalPages, p + 1))} disabled={pageNum >= totalPages} className="px-3 py-2 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 disabled:opacity-50 transition-colors">›</button>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="px-4 py-2 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors text-xl">{t('zoom_out')}</button>
                                <span className="text-white font-semibold w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
                                <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="px-4 py-2 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors text-xl">{t('zoom_in')}</button>
                            </div>
                        </div>
                    )}
                </div>
                {selectedProjectId && (
                    <div className="mt-4 flex gap-2">
                        <button onClick={() => setView('plan')} className={`px-5 py-2 font-bold rounded-lg transition ${view === 'plan' ? 'bg-[var(--color-primary)] text-white' : 'bg-white/10 hover:bg-white/20'}`}>{t('plan_view')}</button>
                        <button onClick={() => setView('registry')} className={`px-5 py-2 font-bold rounded-lg transition ${view === 'registry' ? 'bg-[var(--color-primary)] text-white' : 'bg-white/10 hover:bg-white/20'}`}>{t('table_registry')}</button>
                    </div>
                )}
            </div>

            {view === 'plan' && (
                 <div className="w-full h-[600px] bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg overflow-auto flex justify-center items-start p-2">
                    <div 
                        ref={planContentRef}
                        className="relative w-fit h-fit transition-transform duration-200"
                        style={{ cursor: planStatus === 'loaded' ? 'copy' : 'default', transform: `scale(${zoom})` }}
                        onClick={planStatus === 'loaded' ? handlePlanClick : undefined}
                        title={planStatus === 'loaded' ? t('click_plan_to_add_table') : ''}
                    >
                        {renderPlanContent()}
                    </div>
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
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('status')}</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('assigned_workers')}</th>
                                    <th className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {tables?.map(table => (
                                    <RegistryRow key={table.id} table={table} onStatusToggle={handleStatusToggle} onEditRequest={(t) => setModalState({isOpen: true, table: t})} />
                                ))}
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

interface RegistryRowProps {
    table: SolarTable;
    onStatusToggle: (table: SolarTable) => void;
    onEditRequest: (table: SolarTable) => void;
}

const RegistryRow: React.FC<RegistryRowProps> = ({ table, onStatusToggle, onEditRequest }) => {
    const { t } = useI18n();
    const assignments = useLiveQuery(() => db.tableAssignments.where('tableId').equals(table.id!).toArray(), [table.id]);
    const workers = useLiveQuery(() => assignments ? db.workers.where('id').anyOf(assignments.map(a => a.workerId)).toArray() : [], [assignments]);
    
    const assignedWorkersDisplay = useMemo(() => {
        const count = assignments?.length || 0;
        if (count === 0) {
            return <span className="text-gray-500">0</span>;
        }
        const names = workers?.map(w => w.name).join(', ');
        return (
            <div className="flex items-center gap-3">
                 <span className="inline-flex items-center justify-center w-7 h-7 text-sm font-bold text-white bg-[var(--color-secondary)] rounded-full flex-shrink-0">{count}</span>
                 <span className="truncate max-w-xs" title={names}>{names}</span>
            </div>
        );
    }, [assignments, workers]);

    return (
        <tr className="hover:bg-white/10 transition-colors">
            <td className="px-6 py-5 whitespace-nowrap text-lg font-medium text-white">{table.tableCode}</td>
            <td className="px-6 py-5 whitespace-nowrap text-lg text-gray-200">{t(table.tableType)}</td>
            <td className="px-6 py-5 whitespace-nowrap">
                <span
                    onClick={() => onStatusToggle(table)}
                    className={`cursor-pointer px-4 py-1.5 inline-flex text-base leading-5 font-bold rounded-full text-white transition-opacity hover:opacity-90 ${
                        table.status === 'completed' ? 'bg-green-600' : 'bg-yellow-500'
                    }`}
                >
                    {t(table.status)}
                </span>
            </td>
            <td className="px-6 py-5 whitespace-nowrap text-lg text-gray-200">{assignedWorkersDisplay}</td>
            <td className="px-6 py-5 whitespace-nowrap text-right text-lg font-bold">
                <button onClick={() => onEditRequest(table)} className="text-blue-400 hover:underline">{t('edit_table')}</button>
            </td>
        </tr>
    );
};

export default Plan;