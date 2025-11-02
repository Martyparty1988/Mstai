import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import type { Project, SolarTable, TableAssignment, Worker, AnnotationPath, PlanAnnotation } from '../types';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ClockIcon from './icons/ClockIcon';
import PencilSwooshIcon from './icons/PencilSwooshIcon';
import EraserIcon from './icons/EraserIcon';
import UndoIcon from './icons/UndoIcon';
import RedoIcon from './icons/RedoIcon';
import TrashIcon from './icons/TrashIcon';
import ColorSwatchIcon from './icons/ColorSwatchIcon';

declare const pdfjsLib: any;

// Helper to get a consistent color for a worker
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
    const [tableType, setTableType] = useState<'small' | 'medium' | 'large'>('small');
    const [status, setStatus] = useState<'pending' | 'completed'>('pending');
    const [workerToAssign, setWorkerToAssign] = useState<number | ''>('');

    const workers = useLiveQuery(() => db.workers.toArray());
    const assignments = useLiveQuery(() => table ? db.tableAssignments.where('tableId').equals(table.id!).toArray() : [], [table]);
    const workerMap = useMemo(() => new Map(workers?.map(w => [w.id!, w])), [workers]);
    
    useEffect(() => {
        if (table) {
            setTableCode(table.tableCode);
            setTableType(table.tableType);
            setStatus(table.status);
        }
    }, [table]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const getTableTypeFromCode = (code: string): 'small' | 'medium' | 'large' => {
            const c = code.toLowerCase();
            if (c.startsWith('it28')) return 'small';
            if (c.startsWith('it42')) return 'medium';
            if (c.startsWith('it56')) return 'large';
            return tableType; // Keep existing type if not determinable
        };

        if (table?.id) {
            await db.solarTables.update(table.id, { 
                tableCode, 
                tableType: getTableTypeFromCode(tableCode),
                status 
            });
        } else if (coords) {
            const tableData: Omit<SolarTable, 'id'> = {
                projectId,
                x: coords.x,
                y: coords.y,
                tableCode,
                tableType: getTableTypeFromCode(tableCode),
                status,
            };
            await db.solarTables.add(tableData as SolarTable);
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
        if (!table || !workerToAssign) return;
        const assignment = { tableId: table.id!, workerId: Number(workerToAssign) };
        const existing = await db.tableAssignments.where(assignment).first();
        if(!existing) {
             await db.tableAssignments.add(assignment);
        }
        setWorkerToAssign('');
    };
    
    const handleUnassignWorker = async (assignmentId: number) => {
        await db.tableAssignments.delete(assignmentId);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-lg p-4">
            <div className="w-full max-w-lg p-8 bg-black/20 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/10 max-h-[90vh] overflow-y-auto">
                <h2 className="text-3xl font-bold mb-6 text-white">{table ? t('edit_table') : t('add_table')}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="table-code" className="block text-lg font-medium text-gray-300 mb-2">{t('table_code')}</label>
                        <input
                            type="text"
                            id="table-code"
                            value={tableCode}
                            onChange={e => setTableCode(e.target.value)}
                            required
                            className="mt-1 block w-full p-4 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
                            placeholder={t('table_code_placeholder')}
                        />
                    </div>

                    <div>
                        <label htmlFor="table-type" className="block text-lg font-medium text-gray-300 mb-2">{t('table_type')}</label>
                        <select
                            id="table-type"
                            value={tableType}
                            onChange={e => setTableType(e.target.value as 'small' | 'medium' | 'large')}
                            className="mt-1 block w-full p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
                        >
                            <option value="small">{t('small')}</option>
                            <option value="medium">{t('medium')}</option>
                            <option value="large">{t('large')}</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="table-status" className="block text-lg font-medium text-gray-300 mb-2">{t('status')}</label>
                        <select
                            id="table-status"
                            value={status}
                            onChange={e => setStatus(e.target.value as 'pending' | 'completed')}
                            className="mt-1 block w-full p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
                        >
                            <option value="pending">{t('pending')}</option>
                            <option value="completed">{t('completed')}</option>
                        </select>
                    </div>

                    {table && (
                        <div>
                            <label className="block text-lg font-medium text-gray-300 mb-2">{t('assigned_workers')}</label>
                            <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                                {assignments?.map(a => (
                                    <div key={a.id} className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                                        <span className="text-gray-200">{workerMap.get(a.workerId)?.name || '...'}</span>
                                        <button type="button" onClick={() => handleUnassignWorker(a.id!)} className="text-pink-400 hover:underline text-sm font-bold">{t('unassign')}</button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <select value={workerToAssign} onChange={e => setWorkerToAssign(Number(e.target.value))} className="flex-grow p-3 bg-black/20 text-white border border-white/20 rounded-xl [&>option]:bg-gray-800">
                                    <option value="" disabled>{t('select_worker')}</option>
                                    {workers?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                                <button type="button" onClick={handleAssignWorker} className="px-4 bg-[var(--color-primary)] text-white font-bold rounded-xl">{t('add')}</button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-4">
                        <div>
                           {table && <button type="button" onClick={handleDelete} className="px-6 py-3 bg-pink-600/80 text-white font-bold rounded-xl hover:bg-pink-600 transition-colors">{t('delete')}</button>}
                        </div>
                        <div className="flex justify-end space-x-4">
                            <button type="button" onClick={onClose} className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors">{t('cancel')}</button>
                            <button type="submit" className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)]">{t('save')}</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Plan View ---
interface PlanViewProps {
    project: Project;
    solarTables: SolarTable[];
    assignments: TableAssignment[];
    workers: Worker[];
    annotations: PlanAnnotation | undefined;
}
const PlanView: React.FC<PlanViewProps> = ({ project, solarTables, assignments, workers, annotations }) => {
    const { t } = useI18n();
    const planContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingCanvasRef = useRef<HTMLCanvasElement>(null);

    const [planImage, setPlanImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTable, setSelectedTable] = useState<SolarTable | null>(null);
    const [modalCoords, setModalCoords] = useState<{x: number, y: number} | null>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingMode, setDrawingMode] = useState(false);
    const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
    const [color, setColor] = useState('#ef4444');
    const [strokeWidth, setStrokeWidth] = useState(5);
    const [history, setHistory] = useState<AnnotationPath[]>([]);
    const [redoStack, setRedoStack] = useState<AnnotationPath[]>([]);
    
    const workerMap = useMemo(() => new Map(workers.map(w => [w.id!, w])), [workers]);
    const assignmentsMap = useMemo(() => {
        const map = new Map<number, number[]>();
        assignments.forEach(a => {
            const workerIds = map.get(a.tableId) || [];
            workerIds.push(a.workerId);
            map.set(a.tableId, workerIds);
        });
        return map;
    }, [assignments]);
    
    // PDF to Image rendering
    useEffect(() => {
        const fileToRender = project.aiPlanFile || project.planFile;
        if (!fileToRender) {
            setIsLoading(false);
            setError(t('no_plan_available'));
            return;
        }

        const renderPdfToImage = async () => {
            try {
                const arrayBuffer = await fileToRender.arrayBuffer();
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 2.0 });
                
                const canvas = canvasRef.current;
                if (!canvas) return;
                
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                const context = canvas.getContext('2d');
                if(!context) return;
                
                await page.render({ canvasContext: context, viewport }).promise;
                setPlanImage(canvas.toDataURL());
            } catch (err) {
                console.error('Failed to render plan', err);
                setError(t('plan_load_error'));
            } finally {
                setIsLoading(false);
            }
        };

        const renderImage = () => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPlanImage(e.target?.result as string);
                setIsLoading(false);
            };
            reader.onerror = () => {
                setError(t('plan_load_error'));
                setIsLoading(false);
            };
            reader.readAsDataURL(fileToRender);
        };
        
        setIsLoading(true);
        setError(null);
        if (fileToRender.type === 'application/pdf') {
            renderPdfToImage();
        } else if (fileToRender.type.startsWith('image/')) {
            renderImage();
        } else {
             setError('Unsupported file type.');
             setIsLoading(false);
        }

    }, [project.planFile, project.aiPlanFile, t]);

    // Drawing Canvas Setup
    const drawCanvas = useCallback(() => {
        const canvas = drawingCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        history.forEach(path => {
            ctx.beginPath();
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
            
            path.points.forEach((point, i) => {
                if (i === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        });
        ctx.globalCompositeOperation = 'source-over'; // Reset
    }, [history]);
    
    useEffect(() => {
        if(annotations?.paths) {
            setHistory(annotations.paths);
        } else {
            setHistory([]);
        }
        setRedoStack([]);
    }, [annotations]);
    
    useEffect(() => {
        const canvas = drawingCanvasRef.current;
        const planDiv = planContainerRef.current;
        if (canvas && planDiv && planImage) {
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                drawCanvas();
            };
            img.src = planImage;
        }
    }, [planImage, drawCanvas]);

    const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!drawingMode) return;
        const canvas = drawingCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        
        const getCoords = (event: React.MouseEvent | React.TouchEvent) => {
            if ('touches' in event) {
                return {
                    x: event.touches[0].clientX - rect.left,
                    y: event.touches[0].clientY - rect.top,
                };
            }
            return {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            };
        };

        const { x, y } = getCoords(e);
        
        setIsDrawing(true);
        setHistory(prev => [...prev, { color, strokeWidth, points: [{x, y}], tool }]);
        setRedoStack([]);
    }, [drawingMode, color, strokeWidth, tool]);
    
    const continueDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !drawingMode) return;
        const canvas = drawingCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
         
        const getCoords = (event: React.MouseEvent | React.TouchEvent) => {
            if ('touches' in event) {
                return {
                    x: event.touches[0].clientX - rect.left,
                    y: event.touches[0].clientY - rect.top,
                };
            }
            return {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            };
        };

        const { x, y } = getCoords(e);

        setHistory(prev => {
            const newHistory = [...prev];
            const currentPath = newHistory[newHistory.length - 1];
            currentPath.points.push({x, y});
            return newHistory;
        });
        requestAnimationFrame(drawCanvas);
    }, [isDrawing, drawingMode, drawCanvas]);

    const stopDrawing = useCallback(async () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        
        // Save to DB
        if (annotations) {
            await db.planAnnotations.update(annotations.id!, { paths: history });
        } else if (history.length > 0) {
            await db.planAnnotations.add({ projectId: project.id!, page: 1, paths: history });
        }
    }, [isDrawing, history, annotations, project.id]);
    
    const handleUndo = () => {
        if (history.length === 0) return;
        const lastPath = history[history.length - 1];
        setHistory(history.slice(0, -1));
        setRedoStack(prev => [lastPath, ...prev]);
        requestAnimationFrame(drawCanvas);
        stopDrawing(); // Save changes after undo
    };
    
    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const nextPath = redoStack[0];
        setHistory(prev => [...prev, nextPath]);
        setRedoStack(redoStack.slice(1));
        requestAnimationFrame(drawCanvas);
        stopDrawing(); // Save changes after redo
    };
    
    const handleClear = () => {
        if (window.confirm(t('confirm_clear_drawing'))) {
            setHistory([]);
            setRedoStack([]);
            requestAnimationFrame(drawCanvas);
            stopDrawing(); // Save changes after clear
        }
    };
    
    const handlePlanClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (drawingMode) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setModalCoords({ x, y });
    };

    // Fix: Refactored SolarTableMarker to be a standard React.FC component with an explicit props interface.
    interface SolarTableMarkerProps {
        table: SolarTable;
    }
    const SolarTableMarker: React.FC<SolarTableMarkerProps> = ({ table }) => {
        const onSelectTable = (tbl: SolarTable) => setSelectedTable(tbl);

        const tableSize = useMemo(() => {
            switch(table.tableType) {
                case 'small': return { width: '20px', height: '20px' };
                case 'medium': return { width: '30px', height: '20px' };
                case 'large': return { width: '40px', height: '20px' };
                default: return { width: '20px', height: '20px' };
            }
        }, [table.tableType]);
        
        const assignedWorkerColors = useMemo(() => {
            const workerIds = assignmentsMap.get(table.id!) || [];
            return workerIds.map(id => getWorkerColor(id));
        }, [table.id]);

        return (
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{ left: `${table.x}%`, top: `${table.y}%`, width: tableSize.width, height: tableSize.height }}
              onClick={(e) => { e.stopPropagation(); onSelectTable(table); }}
            >
              <div className={`w-full h-full rounded-sm border-2 ${table.status === 'completed' ? 'border-green-600 bg-green-900/70 filter saturate-50' : 'border-yellow-400 bg-yellow-900/50'} flex items-center justify-center transition-all group-hover:scale-110`}>
                <span className="text-white font-bold text-xs truncate px-1">{table.tableCode}</span>
              </div>
              {assignedWorkerColors.length > 0 && (
                  <div className="absolute -bottom-1 -right-1 flex -space-x-1" title={t('assigned_workers')}>
                      {assignedWorkerColors.slice(0, 3).map((color, i) => (
                          <div key={i} style={{ backgroundColor: color }} className="w-3 h-3 rounded-full border-2 border-gray-800"></div>
                      ))}
                  </div>
              )}
               {table.status === 'completed' && (
                <div className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full p-0.5 border-2 border-gray-800 shadow-lg" title={t('completed')}>
                  <CheckCircleIcon className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
        );
    };

    if (isLoading) return <div className="text-center p-12">{t('loading_plan')}</div>;
    if (error) return <div className="text-center p-12 bg-red-900/50 rounded-lg text-red-200">{error}</div>;

    return (
        <div className="relative">
            {drawingMode && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 p-2 bg-black/50 backdrop-blur-md rounded-b-xl flex items-center gap-4">
                    <button onClick={() => setTool('pencil')} className={`p-2 rounded-full ${tool === 'pencil' ? 'bg-[var(--color-primary)]' : 'hover:bg-white/10'}`} title={t('pencil')}><PencilSwooshIcon className="w-6 h-6"/></button>
                    <button onClick={() => setTool('eraser')} className={`p-2 rounded-full ${tool === 'eraser' ? 'bg-[var(--color-primary)]' : 'hover:bg-white/10'}`} title={t('eraser')}><EraserIcon className="w-6 h-6"/></button>
                    <div className="flex items-center gap-2">
                        <ColorSwatchIcon className="w-6 h-6"/>
                        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 bg-transparent border-none cursor-pointer"/>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="stroke-width" className="text-sm font-bold">{t('stroke_width')}</label>
                        <input type="range" id="stroke-width" min="1" max="50" value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))} />
                    </div>
                    <button onClick={handleUndo} className="p-2 rounded-full hover:bg-white/10" title={t('undo')}><UndoIcon className="w-6 h-6"/></button>
                    <button onClick={handleRedo} className="p-2 rounded-full hover:bg-white/10" title={t('redo')}><RedoIcon className="w-6 h-6"/></button>
                    <button onClick={handleClear} className="p-2 rounded-full hover:bg-white/10" title={t('clear_drawing')}><TrashIcon className="w-6 h-6"/></button>
                </div>
            )}
            <div
                ref={planContainerRef}
                className="relative w-full h-auto overflow-auto bg-gray-800/30 rounded-lg"
                onClick={handlePlanClick}
                onMouseDown={startDrawing}
                onMouseMove={continueDrawing}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={continueDrawing}
                onTouchEnd={stopDrawing}
            >
                <img src={planImage!} alt="Project Plan" className="max-w-full h-auto block" style={{ opacity: drawingMode ? 0.7 : 1 }} />
                <canvas ref={drawingCanvasRef} className="absolute top-0 left-0" style={{ pointerEvents: 'none' }} />
                <canvas ref={canvasRef} className="hidden" />
                {!drawingMode && solarTables.map(table => <SolarTableMarker key={table.id} table={table} />)}
            </div>
             <button
                onClick={() => setDrawingMode(d => !d)}
                className={`absolute top-4 right-4 z-10 p-3 rounded-full shadow-lg transition-colors ${drawingMode ? 'bg-[var(--color-primary)]' : 'bg-black/50 hover:bg-black/80'}`}
                title={t('drawing_mode')}
            >
                <PencilSwooshIcon className="w-7 h-7" />
            </button>
            {(selectedTable || modalCoords) && (
                <TableManagementModal
                    table={selectedTable!}
                    coords={modalCoords!}
                    projectId={project.id!}
                    onClose={() => { setSelectedTable(null); setModalCoords(null); }}
                />
            )}
        </div>
    );
};


// --- Registry View ---
const RegistryView = ({ tables, assignments, workers }: { tables: SolarTable[], assignments: TableAssignment[], workers: Worker[]}) => {
    const { t } = useI18n();
    const workerMap = useMemo(() => new Map(workers.map(w => [w.id!, w])), [workers]);
    
    const assignmentsMap = useMemo(() => {
        const map = new Map<number, Worker[]>();
        assignments.forEach(a => {
            const tableWorkers = map.get(a.tableId) || [];
            const worker = workerMap.get(a.workerId);
            if (worker) tableWorkers.push(worker);
            map.set(a.tableId, tableWorkers);
        });
        return map;
    }, [assignments, workerMap]);

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-white/10">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('table_code')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('table_type')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('status')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('assigned_workers')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                    {tables.map(table => (
                        <tr key={table.id} className="hover:bg-white/5">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{table.tableCode}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{t(table.tableType)}</td>
                             <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-bold rounded-full ${table.status === 'completed' ? 'bg-green-600/30 text-green-300' : 'bg-yellow-600/30 text-yellow-300'}`}>
                                    {table.status === 'completed' ? <CheckCircleIcon className="w-5 h-5" /> : <ClockIcon className="w-5 h-5" />}
                                    <span className="hidden sm:inline">{t(table.status)}</span>
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {assignmentsMap.get(table.id!)?.map(w => w.name).join(', ') || '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- Legend ---
const PlanLegend = ({ workers, assignments }: { workers: Worker[], assignments: TableAssignment[]}) => {
    const { t } = useI18n();
    const assignedWorkerIds = useMemo(() => new Set(assignments.map(a => a.workerId)), [assignments]);
    const activeWorkers = useMemo(() => workers.filter(w => assignedWorkerIds.has(w.id!)), [workers, assignedWorkerIds]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                <h4 className="font-bold mb-2 text-white">{t('table_type_legend')}</h4>
                <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-sm border-2 border-yellow-400"></div><span>{t('small_table')}</span></div>
                    <div className="flex items-center gap-2"><div style={{width: 30, height: 20}} className="rounded-sm border-2 border-yellow-400"></div><span>{t('medium_table')}</span></div>
                    <div className="flex items-center gap-2"><div style={{width: 40, height: 20}} className="rounded-sm border-2 border-yellow-400"></div><span>{t('large_table')}</span></div>
                    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-sm border-2 border-green-600 filter saturate-50"></div><span>{t('completed')}</span></div>
                </div>
            </div>
             <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                <h4 className="font-bold mb-2 text-white">{t('assigned_workers_legend')}</h4>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                    {activeWorkers.map(worker => (
                        <div key={worker.id} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: getWorkerColor(worker.id!) }}></div>
                            <span>{worker.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- Main Component ---
const Plan: React.FC = () => {
    const { t } = useI18n();
    const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
    const [viewMode, setViewMode] = useState<'plan' | 'registry'>('plan');
    
    const projects = useLiveQuery(() => db.projects.toArray());
    const workers = useLiveQuery(() => db.workers.toArray());
    const solarTables = useLiveQuery(() => selectedProjectId ? db.solarTables.where('projectId').equals(selectedProjectId).toArray() : [], [selectedProjectId]);
    const tableAssignments = useLiveQuery(() => selectedProjectId ? db.tableAssignments.toArray() : [], [selectedProjectId]);
    const annotations = useLiveQuery(() => selectedProjectId ? db.planAnnotations.where({ projectId: selectedProjectId, page: 1 }).first() : undefined, [selectedProjectId]);

    const selectedProject = useMemo(() => {
        if (!selectedProjectId || !projects) return null;
        return projects.find(p => p.id === selectedProjectId);
    }, [selectedProjectId, projects]);

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-5xl font-bold text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)]">{t('plan')}</h1>
                 <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                    className="w-full md:w-auto max-w-sm p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
                >
                    <option value="" disabled>{t('select_project')}</option>
                    {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
            
            {selectedProject ? (
                <div className="p-6 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg">
                    <div className="flex justify-end mb-4">
                        <div className="inline-flex rounded-lg bg-black/20 border border-white/10 p-1">
                            <button onClick={() => setViewMode('plan')} className={`px-4 py-2 text-sm font-bold rounded-md ${viewMode === 'plan' ? 'bg-[var(--color-primary)]' : 'hover:bg-white/10'}`}>{t('plan_view')}</button>
                            <button onClick={() => setViewMode('registry')} className={`px-4 py-2 text-sm font-bold rounded-md ${viewMode === 'registry' ? 'bg-[var(--color-primary)]' : 'hover:bg-white/10'}`}>{t('table_registry')}</button>
                        </div>
                    </div>
                    
                    {viewMode === 'plan' && solarTables && workers && tableAssignments && (
                        <>
                            <PlanView 
                                project={selectedProject} 
                                solarTables={solarTables}
                                assignments={tableAssignments}
                                workers={workers}
                                annotations={annotations}
                            />
                            <PlanLegend workers={workers} assignments={tableAssignments} />
                        </>
                    )}
                    
                    {viewMode === 'registry' && solarTables && workers && tableAssignments && (
                        solarTables.length > 0 ? (
                             <RegistryView tables={solarTables} assignments={tableAssignments} workers={workers} />
                        ) : (
                            <p className="text-center text-gray-400 py-12">{t('no_tables_defined')}</p>
                        )
                    )}

                </div>
            ) : (
                <div className="text-center p-12 bg-black/20 rounded-xl">
                    <p className="text-lg">{t('select_project_to_view_plan')}</p>
                </div>
            )}
        </div>
    );
};

export default Plan;
