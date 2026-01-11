import React, { useRef, useState } from 'react';
import { MousePointer2, Check, Play, Scan, MapPin, X, Move, CornerBottomRight } from 'lucide-react';
import { Point, Settings, Annotation, Region } from '../types';

interface ImageAnnotatorProps {
  imageSrc: string;
  annotations: Annotation[];
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationRemove: (index: number, annotation: Annotation) => void;
  onAnnotationUpdate: (index: number, annotation: Annotation) => void;
  onAnalyze: () => void;
  settings: Settings;
  mode?: 'initial' | 'add';
}

const ImageAnnotator: React.FC<ImageAnnotatorProps> = ({ 
  imageSrc, 
  annotations, 
  onAnnotationAdd,
  onAnnotationRemove,
  onAnnotationUpdate,
  onAnalyze,
  settings,
  mode = 'initial'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<'point' | 'region'>('region');
  
  // Interaction State
  const [interactionState, setInteractionState] = useState<'none' | 'drawing' | 'dragging' | 'resizing'>('none');
  const [dragStart, setDragStart] = useState<Point | null>(null);
  
  // For Drawing New Region
  const [currentDrawRegion, setCurrentDrawRegion] = useState<Region | null>(null);
  
  // For Dragging/Resizing Existing Region
  const [activeAnnotationIndex, setActiveAnnotationIndex] = useState<number | null>(null);
  const [initialDragRegion, setInitialDragRegion] = useState<Region | null>(null);

  // Helper to get normalized coordinates
  const getCoords = (e: React.PointerEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interactionState !== 'none') return;
    e.preventDefault(); 
    const { x, y } = getCoords(e);
    setDragStart({ x, y });
    setInteractionState('drawing');

    if (tool === 'region') {
      setCurrentDrawRegion({ x, y, width: 0, height: 0 });
    }
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interactionState === 'none' || !dragStart) return;
    
    const { x, y } = getCoords(e);

    if (interactionState === 'drawing') {
      if (tool === 'region') {
        const width = Math.abs(x - dragStart.x);
        const height = Math.abs(y - dragStart.y);
        const startX = Math.min(x, dragStart.x);
        const startY = Math.min(y, dragStart.y);
        setCurrentDrawRegion({ x: startX, y: startY, width, height });
      }
    } else if (interactionState === 'dragging' && activeAnnotationIndex !== null && initialDragRegion) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      const newRegion = {
        ...initialDragRegion,
        x: Math.max(0, Math.min(1 - initialDragRegion.width, initialDragRegion.x + dx)),
        y: Math.max(0, Math.min(1 - initialDragRegion.height, initialDragRegion.y + dy))
      };
      const originalAnn = annotations[activeAnnotationIndex];
      onAnnotationUpdate(activeAnnotationIndex, { ...originalAnn, region: newRegion });
    } else if (interactionState === 'resizing' && activeAnnotationIndex !== null && initialDragRegion) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      const newWidth = Math.max(0.05, Math.min(1 - initialDragRegion.x, initialDragRegion.width + dx));
      const newHeight = Math.max(0.05, Math.min(1 - initialDragRegion.y, initialDragRegion.height + dy));
      const newRegion = { ...initialDragRegion, width: newWidth, height: newHeight };
      const originalAnn = annotations[activeAnnotationIndex];
      onAnnotationUpdate(activeAnnotationIndex, { ...originalAnn, region: newRegion });
    }
  };

  const handleContainerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interactionState === 'none' || !dragStart) return;
    const { x, y } = getCoords(e);
    const dist = Math.sqrt(Math.pow(x - dragStart.x, 2) + Math.pow(y - dragStart.y, 2));

    if (interactionState === 'drawing') {
       if (tool === 'point') {
         if (dist < 0.01) {
           onAnnotationAdd({ type: 'point', point: { x, y } });
         }
       } else if (tool === 'region') {
         if (currentDrawRegion && currentDrawRegion.width > 0.02 && currentDrawRegion.height > 0.02) {
           onAnnotationAdd({ type: 'region', region: currentDrawRegion });
         }
       }
    }

    setInteractionState('none');
    setDragStart(null);
    setCurrentDrawRegion(null);
    setActiveAnnotationIndex(null);
    setInitialDragRegion(null);
  };

  const handleRegionPointerDown = (e: React.PointerEvent, index: number, region: Region) => {
    e.stopPropagation();
    e.preventDefault();
    const { x, y } = getCoords(e);
    setDragStart({ x, y });
    setInitialDragRegion({ ...region });
    setActiveAnnotationIndex(index);
    setInteractionState('dragging');
  };

  const handleResizePointerDown = (e: React.PointerEvent, index: number, region: Region) => {
    e.stopPropagation();
    e.preventDefault();
    const { x, y } = getCoords(e);
    setDragStart({ x, y });
    setInitialDragRegion({ ...region });
    setActiveAnnotationIndex(index);
    setInteractionState('resizing');
  };

  const handleRemoveAnnotation = (e: React.MouseEvent | React.PointerEvent, index: number, ann: Annotation) => {
    e.stopPropagation();
    e.preventDefault();
    onAnnotationRemove(index, ann);
  };

  const t = {
    hint: settings.language === 'zh' ? '标记物品' : 'Mark items',
    analyze: settings.language === 'zh' ? '开始提取' : 'Extract',
    analyzeAll: settings.language === 'zh' ? '提取全部' : 'Extract All',
    confirm: settings.language === 'zh' ? '确认添加' : 'Confirm Add',
    pointMode: settings.language === 'zh' ? '打点' : 'Point',
    regionMode: settings.language === 'zh' ? '框选' : 'Region'
  };

  const newAnnotationsCount = annotations.filter(a => !a.itemId).length;
  const hasAnyAnnotations = annotations.length > 0;

  return (
    <div className="flex flex-col h-full bg-black text-white select-none touch-none">
      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        <div 
          ref={containerRef}
          className="relative max-h-full max-w-full cursor-crosshair touch-none"
          onPointerDown={handleContainerPointerDown}
          onPointerMove={handleContainerPointerMove}
          onPointerUp={handleContainerPointerUp}
          onPointerLeave={handleContainerPointerUp}
        >
          <img 
            src={imageSrc} 
            alt="Annotate" 
            className="max-h-[75vh] w-auto object-contain pointer-events-none" 
          />
          
          {/* Render Existing Annotations */}
          {annotations.map((ann, i) => {
            const isExisting = !!ann.itemId;
            const styleClass = isExisting
              ? 'border-mint-500 bg-mint-500/30'
              : 'border-red-500 bg-red-500/30';

            if (ann.type === 'point' && ann.point) {
              return (
                <div
                  key={i}
                  className={`absolute w-8 h-8 -ml-4 -mt-4 border-2 rounded-full flex items-center justify-center shadow-sm cursor-pointer z-10 ${styleClass}`}
                  style={{ left: `${ann.point.x * 100}%`, top: `${ann.point.y * 100}%` }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => handleRemoveAnnotation(e, i, ann)}
                >
                  <Check size={16} className="text-white drop-shadow-md" />
                </div>
              );
            } else if (ann.type === 'region' && ann.region) {
              return (
                <div
                  key={i}
                  className={`absolute border-2 group ${styleClass} cursor-move z-10`}
                  style={{ 
                    left: `${ann.region.x * 100}%`, 
                    top: `${ann.region.y * 100}%`,
                    width: `${ann.region.width * 100}%`,
                    height: `${ann.region.height * 100}%`
                  }}
                  onPointerDown={(e) => handleRegionPointerDown(e, i, ann.region!)}
                >
                  {/* Remove Button - Positioned at corner */}
                  <div 
                    className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-red-600 transition-colors z-30"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => handleRemoveAnnotation(e, i, ann)}
                  >
                    <X size={14} className="text-white" />
                  </div>

                  {/* Resize Handle - Bottom Right Corner */}
                  <div 
                    className="absolute -bottom-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md cursor-nwse-resize z-20 border-2 border-mint-500"
                    onPointerDown={(e) => handleResizePointerDown(e, i, ann.region!)}
                  >
                    <div className="w-1.5 h-1.5 bg-mint-600 rounded-full"></div>
                  </div>
                  
                  {/* Tag Indicator */}
                   <div className={`absolute top-0 right-0 p-1 ${isExisting ? 'bg-mint-500' : 'bg-red-500'} rounded-bl z-20`}>
                     <Check size={10} className="text-white" />
                   </div>
                </div>
              );
            }
            return null;
          })}

          {/* Render Active Draw Region */}
          {interactionState === 'drawing' && currentDrawRegion && (
            <div 
              className="absolute border-2 border-red-500 bg-red-500/20 z-10"
              style={{
                left: `${currentDrawRegion.x * 100}%`,
                top: `${currentDrawRegion.y * 100}%`,
                width: `${currentDrawRegion.width * 100}%`,
                height: `${currentDrawRegion.height * 100}%`
              }}
            />
          )}
        </div>
      </div>

      {/* Bottom Control Panel */}
      <div className="bg-gray-900 pb-10 pt-4 rounded-t-3xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-20">
        <div className="flex justify-center mb-6">
           <div className="bg-white/10 p-1 rounded-2xl flex items-center border border-white/5 shadow-inner">
              <button
                onClick={() => setTool('point')}
                className={`px-8 py-3 rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${
                  tool === 'point' ? 'bg-mint-500 text-white shadow-lg scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <MapPin size={18} />
                {t.pointMode}
              </button>
              <div className="w-px h-6 bg-white/10 mx-1"></div>
              <button
                onClick={() => setTool('region')}
                className={`px-8 py-3 rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${
                  tool === 'region' ? 'bg-mint-500 text-white shadow-lg scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Scan size={18} />
                {t.regionMode}
              </button>
           </div>
        </div>

        <div className="px-6 flex justify-center">
          <button
            onClick={onAnalyze}
            disabled={mode === 'add' && newAnnotationsCount === 0}
            className={`w-full max-w-sm py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
               mode === 'add' && newAnnotationsCount === 0 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5' 
                  : 'bg-white text-black hover:bg-gray-100 shadow-white/10'
            }`}
          >
            <Play fill="currentColor" size={20} className={mode === 'add' && newAnnotationsCount === 0 ? "opacity-50" : "text-mint-600"} />
            {mode === 'add' 
              ? `${t.confirm} (${newAnnotationsCount})` 
              : (hasAnyAnnotations ? `${t.analyze} (${annotations.length})` : t.analyzeAll)
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageAnnotator;