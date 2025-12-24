import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import type { Project, PlanMarker, Worker } from '../types';

// pdf.js is loaded from a script tag in index.html
declare const pdfjsLib: any;

interface PlanViewerModalProps {
  project: Project;
  onClose: () => void;
}

// Utility to get a consistent color for a worker
const getWorkerColor = (workerId: number) => {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', 
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', 
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
  ];
  return colors[workerId % colors.length];
};


const PlanViewerModal: React.FC<PlanViewerModalProps> = ({ project, onClose }) => {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1.5);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | ''>('');
  const draggedMarkerRef = useRef<{ id: number; offsetX: number; offsetY: number; hasDragged: boolean } | null>(null);

  const workers = useLiveQuery(() => db.workers.toArray());
  const markers = useLiveQuery(() => project?.id ? db.planMarkers.where({ projectId: project.id, page: pageNum }).toArray() : [], [project?.id, pageNum]);
  const workerMap = React.useMemo(() => new Map<number, Worker>(workers?.map(w => [w.id!, w]) || []), [workers]);
  
  useEffect(() => {
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
    }
  }, []);

  const renderPage = useCallback(async () => {
    try {
      if (!pdfDoc || !canvasRef.current) return;

      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: zoom });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      
      const task = page.render(renderContext);
      renderTaskRef.current = task;
      
      task.promise.catch((err: any) => {
          if (err.name !== 'RenderingCancelledException') {
              console.error('PDF render failed:', err);
          }
      });
    } catch (error) {
      console.error("Failed to render page:", error);
    }
  }, [pdfDoc, pageNum, zoom]);

  useEffect(() => {
    if (!project.planFile) return;
    
    if (typeof pdfjsLib === 'undefined') {
        alert("PDF library failed to load. Please refresh or check connection.");
        onClose();
        return;
    }

    const loadPdf = async () => {
      try {
        const arrayBuffer = await project.planFile!.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
      } catch (error) {
        console.error("Failed to load PDF:", error);
        alert("Failed to load PDF file. It might be corrupted.");
        onClose();
      }
    };

    loadPdf();

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [project.planFile, onClose]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  const handleCanvasClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedWorkerId) {
      alert(t('select_worker_to_mark'));
      return;
    }

    try {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const newMarker: Omit<PlanMarker, 'id'> = {
        projectId: project.id!,
        workerId: selectedWorkerId,
        x,
        y,
        page: pageNum,
      };
      await db.planMarkers.add(newMarker as PlanMarker);
    } catch (error) {
      console.error("Failed to add marker:", error);
    }
  };
  
  const handleDeleteMarker = useCallback(async (markerId: number) => {
      if(window.confirm(t('confirm_delete'))) {
          try {
            await db.planMarkers.delete(markerId);
          } catch (error) {
            console.error("Failed to delete marker:", error);
          }
      }
  }, [t]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedMarkerRef.current || !canvasRef.current) return;

    if (!draggedMarkerRef.current.hasDragged) {
      draggedMarkerRef.current.hasDragged = true;
    }

    const container = canvasRef.current.parentElement;
    if (!container) return;

    const markerElem = document.getElementById(`marker-${draggedMarkerRef.current.id}`);
    if (!markerElem) return;

    const containerRect = container.getBoundingClientRect();
    const markerWidth = markerElem.offsetWidth;
    const markerHeight = markerElem.offsetHeight;

    // Calculate new top-left position in pixels relative to container
    const newLeftPx = e.clientX - containerRect.left - draggedMarkerRef.current.offsetX;
    const newTopPx = e.clientY - containerRect.top - draggedMarkerRef.current.offsetY;
    
    // Calculate the marker's center based on new top-left
    const markerCenterX = newLeftPx + markerWidth / 2;
    const markerCenterY = newTopPx + markerHeight / 2;
    
    // Convert center position to percentage
    let centerXPercent = (markerCenterX / containerRect.width) * 100;
    let centerYPercent = (markerCenterY / containerRect.height) * 100;

    // Clamp center position to keep the whole marker within bounds
    const halfWidthPercent = (markerWidth / 2 / containerRect.width) * 100;
    const halfHeightPercent = (markerHeight / 2 / containerRect.height) * 100;
    
    centerXPercent = Math.max(halfWidthPercent, Math.min(centerXPercent, 100 - halfWidthPercent));
    centerYPercent = Math.max(halfHeightPercent, Math.min(centerYPercent, 100 - halfHeightPercent));
    
    markerElem.style.left = `${centerXPercent}%`;
    markerElem.style.top = `${centerYPercent}%`;
  }, []);

  const handleMouseUp = useCallback(async () => {
    if (!draggedMarkerRef.current) return;

    try {
      if (draggedMarkerRef.current.hasDragged) {
        const markerElem = document.getElementById(`marker-${draggedMarkerRef.current.id}`);
        if (markerElem) {
          const finalXPercent = parseFloat(markerElem.style.left);
          const finalYPercent = parseFloat(markerElem.style.top);
          
          await db.planMarkers.update(draggedMarkerRef.current.id, {
            x: finalXPercent,
            y: finalYPercent,
          });
        }
      } else {
        handleDeleteMarker(draggedMarkerRef.current.id);
      }
    } catch (error) {
      console.error("Failed to update marker:", error);
    }

    draggedMarkerRef.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleDeleteMarker]);

  const handleMarkerMouseDown = (e: React.MouseEvent, markerId: number) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    
    draggedMarkerRef.current = {
      id: markerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      hasDragged: false,
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  interface MarkerProps {
    marker: PlanMarker;
  }
  const Marker: React.FC<MarkerProps> = ({ marker }) => {
    const color = getWorkerColor(marker.workerId);
    const workerName = workerMap.get(marker.workerId)?.name || '...';
    return (
      <div
        id={`marker-${marker.id!}`}
        className="absolute w-6 h-6 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing group transition-transform hover:scale-110"
        style={{ left: `${marker.x}%`, top: `${marker.y}%`, backgroundColor: color }}
        onMouseDown={(e) => handleMarkerMouseDown(e, marker.id!)}
        title={`${workerName} - ${t('mark_completed_table')}`}
      >
        <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-black/80 backdrop-blur-sm text-white text-xs font-bold rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {workerName}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full h-full max-w-7xl p-6 bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 flex flex-col">
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 flex-shrink-0 gap-4 border-b border-white/10 pb-4">
            <h2 className="text-2xl font-bold text-white tracking-wide truncate max-w-full md:max-w-md">{project.name} - {t('plan_preview')}</h2>
            <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
                {/* Worker Selector */}
                <select
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(Number(e.target.value))}
                    className="p-2.5 bg-black/30 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-sm [&>option]:bg-gray-800 shadow-inner flex-grow md:flex-grow-0"
                >
                    <option value="" disabled>{t('select_worker_to_mark')}</option>
                    {workers?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>

                {/* Page Navigation */}
                { totalPages > 1 && (
                  <div className="flex items-center gap-1 bg-black/30 rounded-xl p-1 border border-white/10">
                      <button onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum <= 1} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-white font-bold disabled:opacity-30 transition-colors">‹</button>
                      <span className="text-white font-mono text-sm px-2">{pageNum} / {totalPages}</span>
                      <button onClick={() => setPageNum(p => Math.min(totalPages, p + 1))} disabled={pageNum >= totalPages} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-white font-bold disabled:opacity-30 transition-colors">›</button>
                  </div>
                )}

                {/* Zoom Controls */}
                 <div className="flex items-center gap-1 bg-black/30 rounded-xl p-1 border border-white/10">
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-white font-bold transition-colors text-sm">-</button>
                    <span className="text-xs text-gray-400 font-mono w-8 text-center">{(zoom * 100).toFixed(0)}%</span>
                    <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-white font-bold transition-colors text-sm">+</button>
                </div>

                <button onClick={onClose} className="px-5 py-2.5 bg-red-600/80 text-white font-bold rounded-xl hover:bg-red-600 transition-colors ml-auto md:ml-2 shadow-lg">
                    {t('close')}
                </button>
            </div>
        </div>

        {/* Viewer */}
        <div className="flex-grow w-full h-full overflow-auto rounded-xl bg-gray-950/50 border border-white/5 flex justify-center items-start p-8 shadow-inner custom-scrollbar">
             <div className="relative w-fit h-fit shadow-2xl" onClick={handleCanvasClick}>
                <canvas ref={canvasRef} className="rounded-lg" />
                {markers?.map(marker => <Marker key={marker.id} marker={marker} />)}
             </div>
        </div>
      </div>
    </div>
  );
};

export default PlanViewerModal;