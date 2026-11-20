'use client';

import React, { useEffect, useId, useRef, useState, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Crop,
  Check,
  RefreshCw,
  Upload,
  Download,
  Loader2,
  Move,
  Sparkles,
} from 'lucide-react';

interface ViewerModalProps {
  isOpen: boolean;
  imageUrl?: string;
  userName?: string;
  title?: string;
  variant?: 'plum' | 'purple';
  onClose: () => void;
  onEditCurrent: () => void;
  onSelectNewFile: () => void;
}

type DialogClosedByProps = React.DialogHTMLAttributes<HTMLDialogElement> & {
  closedby?: 'any' | 'closerequest' | 'none';
};

const LIGHT_DISMISS_DIALOG_PROPS: DialogClosedByProps = { closedby: 'any' };

export function ProfilePhotoViewerModal({
  isOpen,
  imageUrl,
  userName,
  title = 'Profile Picture',
  variant = 'plum',
  onClose,
  onEditCurrent,
  onSelectNewFile,
}: ViewerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isPurple = variant === 'purple';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && imageUrl) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, imageUrl]);

  // Fallback for browsers without native <dialog closedby="any"> support
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);

    let cleanupFallback: (() => void) | undefined;
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      const handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!isDialogContent) {
          dialog.close();
        }
      };
      dialog.addEventListener('click', handleBackdropClick);
      cleanupFallback = () => dialog.removeEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupFallback?.();
    };
  }, [onClose]);

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${(userName || 'profile').toLowerCase().replace(/\s+/g, '-')}-photo.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...LIGHT_DISMISS_DIALOG_PROPS}
      className="m-auto w-full max-w-lg rounded-3xl bg-white p-0 shadow-2xl border border-slate-200/90 text-slate-900 overflow-hidden focus:outline-none"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 id={titleId} className="text-base font-bold text-slate-900">
            {title}
          </h2>
          {userName && <p className="text-xs text-slate-500">{userName}</p>}
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close photo viewer"
          className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 bg-slate-950/95 flex items-center justify-center min-h-[320px] max-h-[65vh]">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={userName ? `${userName}'s profile photo` : 'Profile photo'}
            className="w-72 h-72 sm:w-80 sm:h-80 rounded-full object-cover ring-4 ring-white/15 shadow-2xl"
          />
        )}
      </div>

      <div className="px-6 py-4 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              dialogRef.current?.close();
              onSelectNewFile();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Change Photo</span>
          </button>

          <button
            type="button"
            autoFocus
            onClick={() => {
              dialogRef.current?.close();
              onEditCurrent();
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors cursor-pointer ${
              isPurple
                ? 'bg-[#6D28D9] hover:bg-[#5b21b6]'
                : 'bg-[#aa5588] hover:bg-[#924472]'
            }`}
          >
            <Crop className="w-4 h-4" />
            <span>Crop & Edit</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}

interface EditorModalProps {
  isOpen: boolean;
  imageSource: string | null;
  saving: boolean;
  title?: string;
  variant?: 'plum' | 'purple';
  onClose: () => void;
  onSave: (croppedFile: File) => Promise<void>;
  onSelectAnotherFile: () => void;
}

const CANVAS_SIZE = 512;

export function ProfilePhotoEditorModal({
  isOpen,
  imageSource,
  saving,
  title = 'Crop & Edit Profile Picture',
  variant = 'plum',
  onClose,
  onSave,
  onSelectAnotherFile,
}: EditorModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const titleId = useId();
  const isPurple = variant === 'purple';

  const [activeTab, setActiveTab] = useState<'crop' | 'adjust'>('crop');
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [errorSrc, setErrorSrc] = useState<string | null>(null);

  const imageLoaded = Boolean(imageSource && loadedSrc === imageSource);
  const loadError =
    imageSource && errorSrc === imageSource
      ? 'Could not load this image for editing due to external host restrictions. Please choose a photo from your device.'
      : null;

  // Transform states
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // degrees
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Filter / Adjustment states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  // Pointer dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const resetEdits = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setPan({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  }, []);

  // Open / close native modal dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && imageSource) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, imageSource]);

  // Fallback for browsers without native <dialog closedby="any"> support
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      if (!saving) onClose();
    };
    dialog.addEventListener('close', handleClose);

    let cleanupFallback: (() => void) | undefined;
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      const handleBackdropClick = (event: MouseEvent) => {
        if (saving || event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!isDialogContent) {
          dialog.close();
        }
      };
      dialog.addEventListener('click', handleBackdropClick);
      cleanupFallback = () => dialog.removeEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupFallback?.();
    };
  }, [onClose, saving]);

  // Load image into memory whenever imageSource changes
  useEffect(() => {
    if (!imageSource || !isOpen) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageRef.current = img;
      resetEdits();
      setActiveTab('crop');
      setErrorSrc(null);
      setLoadedSrc(imageSource);
    };
    img.onerror = () => {
      setErrorSrc(imageSource);
    };
    // Bypass any cached non-CORS <img> response from the browser cache so the CORS header is always returned
    const srcWithCors = /^https?:\/\//i.test(imageSource)
      ? `${imageSource}${imageSource.includes('?') ? '&' : '?'}cors=${Date.now()}`
      : imageSource;
    img.src = srcWithCors;
  }, [imageSource, isOpen, resetEdits]);

  // Draw the transformed image onto a 2D canvas context
  const renderToContext = useCallback(
    (ctx: CanvasRenderingContext2D, size: number, includeCropGuide: boolean) => {
      const img = loadedImageRef.current;
      ctx.clearRect(0, 0, size, size);

      // Fill background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, size, size);

      if (!img) return;

      ctx.save();

      // Apply CSS filter equivalents
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

      // Move origin to center + user pan (scaled to target canvas size)
      const scaleFactor = size / 320;
      ctx.translate(size / 2 + pan.x * scaleFactor, size / 2 + pan.y * scaleFactor);

      // Rotate and flip
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

      // Calculate base "cover" scale so the image fills the square viewport at zoom = 1
      const baseScale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
      const totalScale = baseScale * zoom;

      const drawWidth = img.naturalWidth * totalScale;
      const drawHeight = img.naturalHeight * totalScale;

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      if (includeCropGuide) {
        // Draw darkened overlay outside the circular avatar crop area
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
        ctx.beginPath();
        ctx.rect(0, 0, size, size);
        ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2, true);
        ctx.fill();

        // Subtle rule-of-thirds grid inside circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
        ctx.clip();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        const r = size * 0.44;
        const cx = size / 2;
        const cy = size / 2;
        for (const offset of [-r / 3, r / 3]) {
          ctx.beginPath();
          ctx.moveTo(cx + offset, cy - r);
          ctx.lineTo(cx + offset, cy + r);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(cx - r, cy + offset);
          ctx.lineTo(cx + r, cy + offset);
          ctx.stroke();
        }
        ctx.restore();

        // Crisp circular border ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    },
    [brightness, contrast, saturation, pan, rotation, flipH, flipV, zoom]
  );

  // Re-render preview canvas whenever state changes
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    renderToContext(ctx, CANVAS_SIZE, true);
  }, [imageLoaded, renderToContext]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom((prev) => Math.min(3, Math.max(0.8, Number((prev + delta).toFixed(2)))));
  };

  const applyPreset = (preset: 'original' | 'vibrant' | 'warm' | 'bw') => {
    switch (preset) {
      case 'original':
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        break;
      case 'vibrant':
        setBrightness(104);
        setContrast(112);
        setSaturation(130);
        break;
      case 'warm':
        setBrightness(106);
        setContrast(105);
        setSaturation(118);
        break;
      case 'bw':
        setBrightness(102);
        setContrast(115);
        setSaturation(0);
        break;
    }
  };

  const handleExportAndSave = async () => {
    if (!loadedImageRef.current || saving) return;

    // Create an offscreen export canvas (without the circular overlay guide lines)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = CANVAS_SIZE;
    exportCanvas.height = CANVAS_SIZE;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Render clean cropped square that matches the circular region
    const img = loadedImageRef.current;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.save();
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    // Zoom in slightly (1 / 0.88) so the 0.44 radius circle fills the exported square nicely
    const circleFillBoost = 1 / 0.88;
    const scaleFactor = (CANVAS_SIZE / 320) * circleFillBoost;
    ctx.translate(CANVAS_SIZE / 2 + pan.x * scaleFactor, CANVAS_SIZE / 2 + pan.y * scaleFactor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    const baseScale = Math.max(CANVAS_SIZE / img.naturalWidth, CANVAS_SIZE / img.naturalHeight);
    const totalScale = baseScale * zoom * circleFillBoost;

    ctx.drawImage(
      img,
      (-img.naturalWidth * totalScale) / 2,
      (-img.naturalHeight * totalScale) / 2,
      img.naturalWidth * totalScale,
      img.naturalHeight * totalScale
    );
    ctx.restore();

    exportCanvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const file = new File([blob], `profile-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        await onSave(file);
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...LIGHT_DISMISS_DIALOG_PROPS}
      className="m-auto w-full max-w-xl rounded-3xl bg-white p-0 shadow-2xl border border-slate-200/90 text-slate-900 overflow-hidden focus:outline-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 id={titleId} className="text-base font-bold text-slate-900">
            {title}
          </h2>
          <p className="text-xs text-slate-500">
            Drag to reposition, pinch or scroll to zoom, and fine-tune appearance
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => dialogRef.current?.close()}
          aria-label="Close photo editor"
          className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Editor Body */}
      <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
        {loadError ? (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-center space-y-3">
            <p className="text-sm text-amber-800 font-medium">{loadError}</p>
            <button
              type="button"
              onClick={onSelectAnotherFile}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition-colors cursor-pointer ${
                isPurple
                  ? 'bg-[#6D28D9] hover:bg-[#5b21b6]'
                  : 'bg-[#aa5588] hover:bg-[#924472]'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Choose Photo from Device</span>
            </button>
          </div>
        ) : (
          <>
            {/* Interactive Canvas Viewport */}
            <div className="relative mx-auto w-72 h-72 sm:w-80 sm:h-80 rounded-2xl overflow-hidden bg-slate-900 shadow-inner border border-slate-200 select-none">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
                className={`w-full h-full touch-none ${
                  isDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
              />
              <div className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/75 text-white text-[11px] font-medium backdrop-blur-xs">
                <Move className="w-3 h-3" />
                <span>Drag to reposition</span>
              </div>
            </div>

            {/* Mode Tabs: Crop & Transform vs Adjustments */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="inline-flex p-1 rounded-xl bg-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('crop')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'crop'
                      ? isPurple
                        ? 'bg-white text-[#6D28D9] shadow-2xs'
                        : 'bg-white text-[#aa5588] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Crop className="w-3.5 h-3.5" />
                  <span>Crop & Rotate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('adjust')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'adjust'
                      ? isPurple
                        ? 'bg-white text-[#6D28D9] shadow-2xs'
                        : 'bg-white text-[#aa5588] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Adjust & Filters</span>
                </button>
              </div>

              <button
                type="button"
                onClick={resetEdits}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {activeTab === 'crop' ? (
              <div className="space-y-4">
                {/* Zoom Control */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Zoom</span>
                    <span className="font-semibold text-slate-500 font-tabular">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.1).toFixed(2))))}
                      aria-label="Zoom out"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      min="0.8"
                      max="3"
                      step="0.02"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      aria-label="Zoom level"
                      className={`flex-1 cursor-pointer ${
                        isPurple ? 'accent-[#6D28D9]' : 'accent-[#aa5588]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}
                      aria-label="Zoom in"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Straighten / Fine Rotation Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Rotation</span>
                    <span className="font-semibold text-slate-500 font-tabular">{rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                    aria-label="Rotation angle"
                    className={`w-full cursor-pointer ${
                      isPurple ? 'accent-[#6D28D9]' : 'accent-[#aa5588]'
                    }`}
                  />
                </div>

                {/* Quick Rotate & Flip Buttons */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRotation((r) => ((r - 90 + 180) % 360) - 180)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <RotateCcw
                      className={`w-3.5 h-3.5 ${isPurple ? 'text-[#6D28D9]' : 'text-[#aa5588]'}`}
                    />
                    <span>-90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation((r) => ((r + 90 + 180) % 360) - 180)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <RotateCw
                      className={`w-3.5 h-3.5 ${isPurple ? 'text-[#6D28D9]' : 'text-[#aa5588]'}`}
                    />
                    <span>+90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlipH((f) => !f)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      flipH
                        ? isPurple
                          ? 'bg-[#f5f3ff] border-[#ddd6fe] text-[#6D28D9]'
                          : 'bg-[#fbf5f8] border-[#edd5e3] text-[#aa5588]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                    <span>Flip H</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlipV((f) => !f)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      flipV
                        ? isPurple
                          ? 'bg-[#f5f3ff] border-[#ddd6fe] text-[#6D28D9]'
                          : 'bg-[#fbf5f8] border-[#edd5e3] text-[#aa5588]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FlipVertical className="w-3.5 h-3.5" />
                    <span>Flip V</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Filter Presets */}
                <div>
                  <span className="block text-xs font-bold text-slate-700 mb-2">
                    <Sparkles
                      className={`w-3.5 h-3.5 inline mr-1 ${
                        isPurple ? 'text-[#6D28D9]' : 'text-[#aa5588]'
                      }`}
                    />
                    Quick Presets
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        { id: 'original', label: 'Original' },
                        { id: 'vibrant', label: 'Vibrant' },
                        { id: 'warm', label: 'Warm' },
                        { id: 'bw', label: 'B&W' },
                      ] as const
                    ).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset.id)}
                        className={`py-1.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer ${
                          isPurple
                            ? 'hover:border-[#ddd6fe] hover:bg-[#f5f3ff] hover:text-[#6D28D9]'
                            : 'hover:border-[#edd5e3] hover:bg-[#fbf5f8] hover:text-[#aa5588]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700">Brightness</span>
                    <span className="text-slate-500 font-semibold font-tabular">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                    aria-label="Brightness"
                    className={`w-full cursor-pointer ${
                      isPurple ? 'accent-[#6D28D9]' : 'accent-[#aa5588]'
                    }`}
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700">Contrast</span>
                    <span className="text-slate-500 font-semibold font-tabular">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                    aria-label="Contrast"
                    className={`w-full cursor-pointer ${
                      isPurple ? 'accent-[#6D28D9]' : 'accent-[#aa5588]'
                    }`}
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700">Saturation</span>
                    <span className="text-slate-500 font-semibold font-tabular">{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value, 10))}
                    aria-label="Saturation"
                    className={`w-full cursor-pointer ${
                      isPurple ? 'accent-[#6D28D9]' : 'accent-[#aa5588]'
                    }`}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={onSelectAnotherFile}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Choose Another File</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => dialogRef.current?.close()}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !imageLoaded}
            onClick={handleExportAndSave}
            className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
              isPurple
                ? 'bg-[#6D28D9] hover:bg-[#5b21b6]'
                : 'bg-[#aa5588] hover:bg-[#924472]'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
}
