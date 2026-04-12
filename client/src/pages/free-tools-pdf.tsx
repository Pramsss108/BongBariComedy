import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SEOHead } from '@/components/SEOHead';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure Web Worker for PDF.js - Next Gen approach for Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// ── Font map: display name → pdf-lib StandardFonts key ──
const FONT_MAP: Record<string, string> = {
  'Helvetica': 'Helvetica',
  'Helvetica Bold': 'HelveticaBold',
  'Courier': 'Courier',
  'Courier Bold': 'CourierBold',
  'Times Roman': 'TimesRoman',
  'Times Bold': 'TimesRomanBold',
};
const FONT_FAMILIES = Object.keys(FONT_MAP);

const FONT_WEIGHTS = ['Normal', 'Bold'] as const;

// ── Shape types ──
type ShapeKind = 'rect' | 'circle' | 'line' | 'arrow';

export default function FreeToolsPdfStudio() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  
  // Viewer State
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // Mobile & Sidebar State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null);
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState(false);

  // PHRASE 2: Command palette / search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // PHRASE 2: Settings & Notification modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // PHRASE 2: Highlight mode
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState('#facc15');

  // PHRASE 2.5: Edit Text Mode — detect every text item from pdf.js
  const [isEditTextMode, setIsEditTextMode] = useState(false);
  interface DetectedText {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    pageNumber: number;
  }
  const [detectedTexts, setDetectedTexts] = useState<DetectedText[]>([]);

  // Overlay System State
  interface OverlayElement {
    id: string;
    type: 'text' | 'image' | 'drawing' | 'highlight' | 'shape';
    text?: string;
    src?: string; // Base64 for images
    svgPath?: string; // Path string for ink
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize?: number;
    fontFamily?: string;   // PHRASE 2: font family
    fontWeight?: string;   // PHRASE 2: weight
    opacity?: number;      // PHRASE 2: opacity 0-100
    color?: string;
    pageNumber: number;
    isWhiteout?: boolean;
    thickness?: number; // Brush width
    shapeKind?: ShapeKind; // PHRASE 2: shape type
  }
  const [overlayElements, setOverlayElements] = useState<OverlayElement[]>([]);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const activeElement = overlayElements.find(el => el.id === activeElementId);

  // PHRASE 2: Undo/Redo history
  const historyRef = useRef<OverlayElement[][]>([]);
  const historyIndexRef = useRef(-1);
  const pushHistory = useCallback((snapshot: OverlayElement[]) => {
    const h = historyRef.current;
    const idx = historyIndexRef.current;
    historyRef.current = [...h.slice(0, idx + 1), JSON.parse(JSON.stringify(snapshot))];
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      setOverlayElements(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      setOverlayElements(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, []);

  // Push initial snapshot
  useEffect(() => {
    if (historyRef.current.length === 0) {
      pushHistory(overlayElements);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // PHRASE 2: keyboard shortcuts (Ctrl+Z, Ctrl+Y, Delete)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Delete' && activeElementId) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'textarea' || tag === 'input') return;
        e.preventDefault();
        setOverlayElements(prev => { const n = prev.filter(o => o.id !== activeElementId); pushHistory(n); return n; });
        setActiveElementId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeElementId, undo, redo, pushHistory]);

  // Drawing Engine State
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#1d4ed8'); // PHRASE 2: customizable ink color
  const [currentPath, setCurrentPath] = useState<string>('');
  const isDrawingRef = useRef(false);

  // ── PHRASE 2.5: Extract ALL text items from pdf.js for each page ──
  useEffect(() => {
    if (!pdfBytes) { setDetectedTexts([]); return; }
    let cancelled = false;
    const extract = async () => {
      try {
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBytes) });
        const doc = await loadingTask.promise;
        const page = await doc.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1 });
        const scale = 700 / viewport.width; // 700 = our render width

        const textContent = await page.getTextContent();
        if (cancelled) return;

        const items: DetectedText[] = (textContent.items as any[])
          .filter((item) => item.str && item.str.trim())
          .map((item) => {
            // transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
            const fontSize = Math.abs(item.transform[3]) * scale;
            const tx = item.transform[4] * scale;
            // PDF Y is from bottom; flip to screen coords
            const ty = (viewport.height - item.transform[5]) * scale - fontSize;
            const w = (item.width ?? 0) * scale;
            const h = fontSize * 1.3;
            return {
              text: item.str,
              x: tx,
              y: ty,
              width: Math.max(w, 20),
              height: Math.max(h, 14),
              fontSize,
              pageNumber: currentPage,
            };
          });
        setDetectedTexts(items);
      } catch (e) {
        console.warn('Text extraction failed:', e);
      }
    };
    extract();
    return () => { cancelled = true; };
  }, [pdfBytes, currentPage]);

  // PHRASE 2: Font-family dropdown open state
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [isWeightDropdownOpen, setIsWeightDropdownOpen] = useState(false);

  // --- DROPZONE SETUP ---
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setPdfFile(file);
    const buffer = await file.arrayBuffer();
    setPdfBytes(buffer);
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    noClick: false // Allow click on the dropzone button to open file dialog
  });

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const handlePdfDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // .react-pdf__Page__textContent span elements contain the invisible, selectable PDF text
    if (target.tagName.toLowerCase() === 'span' && target.closest('.react-pdf__Page__textContent')) {
      const rect = target.getBoundingClientRect();
      const parentPage = target.closest('.react-pdf__Page');
      if (!parentPage) return;
      const parentRect = parentPage.getBoundingClientRect();

      // De-scale coordinates based on zoomLevel since Overlay space handles its own scale mapping
      const relX = (rect.left - parentRect.left) / zoomLevel;
      const relY = (rect.top - parentRect.top) / zoomLevel;
      const relWidth = rect.width / zoomLevel;
      const relHeight = rect.height / zoomLevel;

      const computedStyle = window.getComputedStyle(target);
      const extractedFontSize = parseFloat(computedStyle.fontSize) / zoomLevel;
      const finalFontSize = isNaN(extractedFontSize) ? 16 : extractedFontSize;

      const id = `WHITEOUT_${Math.floor(Math.random() * 100000)}`;

      // Hide the original PDF text span so it doesn't show through
      target.style.opacity = '0';
      target.setAttribute('data-whiteout-hidden', 'true');
      
      // Make the box wide enough for paragraph editing and tall enough for multi-line
      const paraWidth = Math.max(relWidth + 60, 320);
      const paraHeight = Math.max(relHeight * 2.5, finalFontSize * 4);
      
      setOverlayElements(prev => {
        const next = [
          ...prev,
          {
            id,
            type: 'text' as const,
            text: target.textContent || '',
            x: relX,
            y: relY,
            width: paraWidth,
            height: paraHeight, 
            fontSize: finalFontSize,
            fontFamily: 'Helvetica',
            fontWeight: 'Normal',
            opacity: 100,
            color: '#000000',
            pageNumber: currentPage,
            isWhiteout: true
          }
        ];
        pushHistory(next);
        return next;
      });
      setActiveElementId(id);
    }
  }, [zoomLevel, currentPage, pushHistory]);

  const handleAddImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png, image/jpeg';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(250 / img.width, 1.0);
          const w = img.width * scale;
          const h = img.height * scale;
          
          const id = `IMG_${Math.floor(Math.random() * 100000)}`;
          setOverlayElements(prev => {
            const next = [
              ...prev,
              {
                id,
                type: 'image' as const,
                src: result,
                x: 100, 
                y: 100,
                width: w,
                height: h,
                opacity: 100,
                pageNumber: currentPage
              }
            ];
            pushHistory(next);
            return next;
          });
          setActiveElementId(id);
          if (window.innerWidth < 768) setIsMobileMenuOpen(false);
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isDrawingMode) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    isDrawingRef.current = true;
    setCurrentPath(`M ${x} ${y}`);
  }, [isDrawingMode, zoomLevel]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingMode || !isDrawingRef.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    setCurrentPath(prev => `${prev} L ${x} ${y}`);
  }, [isDrawingMode, zoomLevel]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawingMode || !isDrawingRef.current) return;
    isDrawingRef.current = false;
    
    if (currentPath.trim() !== '') {
      const id = `DRAW_${Math.floor(Math.random() * 100000)}`;
      
      const points = currentPath.match(/-?\d+(\.\d+)?/g);
      if(points) {
         const coords = points.map(Number);
         const xs = coords.filter((_, i) => i % 2 === 0);
         const ys = coords.filter((_, i) => i % 2 !== 0);
         const minX = Math.min(...xs);
         const maxX = Math.max(...xs);
         const minY = Math.min(...ys);
         const maxY = Math.max(...ys);

         // Normalize the path string to fit exactly inside its own bounding box at (0,0)
         const normalizedPath = currentPath.replace(/([ML])\s*(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)/g, (match, cmd, px, _, py) => {
             return `${cmd} ${Number(px) - minX} ${Number(py) - minY}`;
         });

         setOverlayElements(prev => { const next = [...prev, {
            id, type: 'drawing' as const, svgPath: normalizedPath,
            x: minX, y: minY,
            width: Math.max(20, maxX - minX), height: Math.max(20, maxY - minY),
            color: drawingColor, thickness: 3, pageNumber: currentPage, opacity: 100
         }]; pushHistory(next); return next; });
      }
    }
    setCurrentPath('');
    setIsDrawingMode(false);
  }, [isDrawingMode, currentPath, currentPage, drawingColor, pushHistory]);

  // PHRASE 2: Add shape helper
  const addShape = useCallback((kind: ShapeKind) => {
    const id = `SHAPE_${Math.floor(Math.random() * 100000)}`;
    const dims = kind === 'line' || kind === 'arrow' ? { width: 200, height: 4 } : kind === 'circle' ? { width: 120, height: 120 } : { width: 160, height: 100 };
    setOverlayElements(prev => {
      const next = [...prev, {
        id, type: 'shape' as const, shapeKind: kind,
        x: 150, y: 200, ...dims,
        color: '#00f0ff', opacity: 100, pageNumber: currentPage
      }];
      pushHistory(next);
      return next;
    });
    setActiveElementId(id);
    if (window.innerWidth < 768) setIsMobileMenuOpen(false);
  }, [currentPage, pushHistory]);

  // PHRASE 2: Highlight click handler for PDF
  const handleHighlightClick = useCallback((e: React.MouseEvent) => {
    if (!isHighlightMode) return;
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'span' && target.closest('.react-pdf__Page__textContent')) {
      const rect = target.getBoundingClientRect();
      const parentPage = target.closest('.react-pdf__Page');
      if (!parentPage) return;
      const parentRect = parentPage.getBoundingClientRect();
      const relX = (rect.left - parentRect.left) / zoomLevel;
      const relY = (rect.top - parentRect.top) / zoomLevel;
      const relWidth = rect.width / zoomLevel;
      const relHeight = rect.height / zoomLevel;
      const id = `HL_${Math.floor(Math.random() * 100000)}`;
      setOverlayElements(prev => {
        const next = [...prev, {
          id, type: 'highlight' as const,
          x: relX, y: relY, width: relWidth + 8, height: relHeight + 4,
          color: highlightColor, opacity: 40, pageNumber: currentPage
        }];
        pushHistory(next);
        return next;
      });
      setActiveElementId(id);
      setIsHighlightMode(false);
    }
  }, [isHighlightMode, highlightColor, zoomLevel, currentPage, pushHistory]);

  const handleExport = async () => {
    if (!pdfBytes) {
      alert("No PDF loaded!");
      return;
    }

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // PHRASE 2: Embed all standard fonts we support
      const fontCache: Record<string, any> = {};
      const getFont = async (familyName: string) => {
        const pdfLibKey = FONT_MAP[familyName] || 'Helvetica';
        if (!fontCache[pdfLibKey]) {
          fontCache[pdfLibKey] = await pdfDoc.embedFont((StandardFonts as any)[pdfLibKey] || StandardFonts.Helvetica);
        }
        return fontCache[pdfLibKey];
      };
      
      const pages = pdfDoc.getPages();

      for (const el of overlayElements) {
        const pageIndex = el.pageNumber - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) continue;
        
        const page = pages[pageIndex];
        const { width, height } = page.getSize();
        
        const scaleX = width / 700;
        const scaleY = scaleX;
        const opacityVal = (el.opacity ?? 100) / 100;

        const pdfX = el.x * scaleX;
        const pdfY = height - (el.y * scaleY) - (el.height * scaleY);
        const pdfWidth = el.width * scaleX;
        const pdfHeight = el.height * scaleY;

        if (el.isWhiteout) {
          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
            color: rgb(1, 1, 1),
            opacity: 1,
          });
        }
        
        // PHRASE 2: Highlight type → semi-transparent colored rect
        if (el.type === 'highlight') {
          const hexToRgb = (hex: string) => {
            let c = hex.replace('#', '');
            if (c.length === 3) c = c.split('').map(x => x + x).join('');
            return {
              r: parseInt(c.slice(0, 2), 16) / 255 || 0,
              g: parseInt(c.slice(2, 4), 16) / 255 || 0,
              b: parseInt(c.slice(4, 6), 16) / 255 || 0
            };
          };
          const hc = hexToRgb(el.color || '#facc15');
          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
            color: rgb(hc.r, hc.g, hc.b),
            opacity: opacityVal * 0.35,
          });
        } else if (el.type === 'shape') {
          // PHRASE 2: shape export
          const hexToRgb = (hex: string) => {
            let c = hex.replace('#', '');
            if (c.length === 3) c = c.split('').map(x => x + x).join('');
            return {
              r: parseInt(c.slice(0, 2), 16) / 255 || 0,
              g: parseInt(c.slice(2, 4), 16) / 255 || 0,
              b: parseInt(c.slice(4, 6), 16) / 255 || 0
            };
          };
          const sc = hexToRgb(el.color || '#00f0ff');
          if (el.shapeKind === 'rect') {
            page.drawRectangle({
              x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight,
              borderColor: rgb(sc.r, sc.g, sc.b),
              borderWidth: 2 * scaleX,
              opacity: opacityVal,
            });
          } else if (el.shapeKind === 'circle') {
            const cx = pdfX + pdfWidth / 2;
            const cy = pdfY + pdfHeight / 2;
            const rx = pdfWidth / 2;
            page.drawEllipse({
              x: cx, y: cy, xScale: rx, yScale: pdfHeight / 2,
              borderColor: rgb(sc.r, sc.g, sc.b),
              borderWidth: 2 * scaleX,
              opacity: opacityVal,
            });
          } else if (el.shapeKind === 'line' || el.shapeKind === 'arrow') {
            page.drawLine({
              start: { x: pdfX, y: pdfY + pdfHeight },
              end: { x: pdfX + pdfWidth, y: pdfY },
              color: rgb(sc.r, sc.g, sc.b),
              thickness: 2 * scaleX,
              opacity: opacityVal,
            });
          }
        } else if (el.type === 'text') {
          const hexToRgb = (hex: string) => {
            let c = hex.replace('#', '');
            if (c.length === 3) c = c.split('').map(x => x + x).join('');
            return {
              r: parseInt(c.slice(0, 2), 16) / 255 || 0,
              g: parseInt(c.slice(2, 4), 16) / 255 || 0,
              b: parseInt(c.slice(4, 6), 16) / 255 || 0
            };
          };

          const textColor = hexToRgb(el.color || '#000000');
          const lines = (el.text || '').split('\n');
          const pdfFontSize = (el.fontSize || 16) * scaleX;
          const font = await getFont(el.fontFamily || 'Helvetica');

          lines.forEach((line, idx) => {
             page.drawText(line, {
                 x: pdfX + (12 * scaleX),
                 y: pdfY + pdfHeight - (pdfFontSize) - (idx * pdfFontSize * 1.2) - (8 * scaleY), 
                 size: pdfFontSize,
                 font,
                 color: rgb(textColor.r, textColor.g, textColor.b),
                 opacity: opacityVal,
             });
          });
        } else if (el.type === 'image' && el.src) {
           let embeddedImg;
           if (el.src.startsWith('data:image/png')) {
               embeddedImg = await pdfDoc.embedPng(el.src);
           } else if (el.src.startsWith('data:image/jpeg') || el.src.startsWith('data:image/jpg')) {
               embeddedImg = await pdfDoc.embedJpg(el.src);
           }
           
           if (embeddedImg) {
               page.drawImage(embeddedImg, {
                   x: pdfX,
                   y: pdfY,
                   width: pdfWidth,
                   height: pdfHeight,
                   opacity: opacityVal,
               });
           }
        } else if (el.type === 'drawing' && el.svgPath) {
           const hexToRgb = (hex: string) => {
              let c = hex.replace('#', '');
              if (c.length === 3) c = c.split('').map(x => x + x).join('');
              return {
                r: parseInt(c.slice(0, 2), 16) / 255 || 0,
                g: parseInt(c.slice(2, 4), 16) / 255 || 0,
                b: parseInt(c.slice(4, 6), 16) / 255 || 0
              };
           };
           const clr = hexToRgb(el.color || '#000000');
           page.drawSvgPath(el.svgPath, {
               x: pdfX,
               y: pdfY + pdfHeight,
               scale: scaleX,
               borderColor: rgb(clr.r, clr.g, clr.b),
               borderWidth: (el.thickness || 3) * scaleX,
               opacity: opacityVal,
           });
        }
      }

      const modifiedPdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(modifiedPdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const tempLink = document.createElement('a');
      tempLink.href = url;
      tempLink.download = pdfFile?.name ? `Edited_${pdfFile.name}` : 'Edited_BongBari_Document.pdf';
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(url);
      
    } catch (e) {
      console.error("Export Failed", e);
      alert("Export compilation failed. Check console.");
    }
  };

  return (
    <>
      <SEOHead 
        title="Bong Bari PDF Studio - Advanced Command Center"
        description="Orchestrate your documents with pixel-perfect precision."
        url="/tools/pdf-ninja"
      />
      
      {/* Dynamic Font & Variable Injections based on Stitch HTML requirements */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
        }
        .filled-icon {
          font-variation-settings: 'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24 !important;
        }
        .headline { font-family: 'Space Grotesk', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        
        .glass-panel {
          background: rgba(12, 19, 36, 0.6);
          backdrop-filter: blur(20px);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .neon-glow {
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.15);
        }
        /* Force react-pdf text layer BELOW our overlay so whiteout actually covers text */
        .react-pdf__Page__textContent {
          z-index: 10 !important;
        }
        .react-pdf__Page__canvas {
          z-index: 5 !important;
        }
        /* Hide original PDF text that has been whiteout-replaced */
        .react-pdf__Page__textContent span[data-whiteout-hidden="true"] {
          opacity: 0 !important;
          pointer-events: none !important;
        }
        .active-rail-indicator {
          box-shadow: inset -10px 0 20px rgba(182, 0, 248, 0.1);
        }
        .drag-zone-gradient {
          background-image: radial-gradient(circle at center, rgba(0, 240, 255, 0.05) 0%, transparent 70%);
        }
      `}</style>
      
      <div className="bg-surface text-on-surface h-screen w-screen overflow-hidden select-none font-body flex flex-col fixed inset-0 z-[100]">
        
        {/* TopAppBar */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/60 backdrop-blur-xl shadow-[0_0_15px_rgba(0,240,255,0.1)] flex justify-between items-center w-full px-4 md:px-6 h-16">
          <div className="flex items-center gap-4 md:gap-8">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-1.5 text-cyan-400 hover:bg-slate-800/50 rounded-lg transition-colors">
               <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-200 to-cyan-500 bg-clip-text text-transparent font-['Space_Grotesk'] tracking-tight cursor-pointer" onClick={() => window.location.href='/tools'}>
              Bong Bari PDF
            </span>
            <nav className="hidden md:flex items-center gap-6 h-16">
              <a className="text-cyan-400 font-bold border-b-2 border-cyan-400 font-['Space_Grotesk'] tracking-tight h-full flex items-center" href="#">Workspace</a>
              <button onClick={() => alert('Cloud Assets: Coming in Phase 3. Your files will sync to Oracle Cloud storage.')} className="text-slate-400 hover:text-cyan-200 transition-colors py-1 font-['Space_Grotesk'] tracking-tight h-full flex items-center">Cloud Assets</button>
              <button onClick={() => alert('Templates: Coming in Phase 3. Pre-built PDF layouts and forms.')} className="text-slate-400 hover:text-cyan-200 transition-colors py-1 font-['Space_Grotesk'] tracking-tight h-full flex items-center">Templates</button>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative flex items-center bg-slate-900/50 rounded-xl px-3 py-1.5 border border-outline-variant/15">
              <span className="material-symbols-outlined text-cyan-400 text-lg mr-2">search</span>
              <input 
                className="bg-transparent border-none focus:ring-0 text-sm w-48 text-on-surface-variant placeholder:text-slate-600 outline-none" 
                placeholder="Search commands..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
              />
              {isSearchOpen && searchQuery.trim() !== '' && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[200] overflow-hidden">
                  {[
                    { icon: 'title', label: 'Add Text', action: () => { const id = `TXT_${Math.floor(Math.random()*1000)}`; setOverlayElements(prev => { const next = [...prev, { id, type: 'text' as const, text: 'New Text', x: 100, y: 100, width: 250, height: 40, fontSize: 20, color: '#000000', pageNumber: currentPage, fontFamily: 'Helvetica', fontWeight: 'Normal', opacity: 100 }]; pushHistory(next); return next; }); setActiveElementId(id); } },
                    { icon: 'image', label: 'Add Image', action: handleAddImage },
                    { icon: 'edit', label: 'Freehand Pencil', action: () => setIsDrawingMode(true) },
                    { icon: 'ink_highlighter', label: 'Highlight', action: () => setIsHighlightMode(true) },
                    { icon: 'category', label: 'Add Rectangle', action: () => addShape('rect') },
                    { icon: 'circle', label: 'Add Circle', action: () => addShape('circle') },
                    { icon: 'ios_share', label: 'Export PDF', action: handleExport },
                    { icon: 'undo', label: 'Undo (Ctrl+Z)', action: undo },
                    { icon: 'redo', label: 'Redo (Ctrl+Y)', action: redo },
                  ]
                    .filter(c => c.label.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((cmd, i) => (
                    <button key={i} onMouseDown={(e) => { e.preventDefault(); cmd.action(); setSearchQuery(''); setIsSearchOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors text-sm text-left">
                      <span className="material-symbols-outlined text-base">{cmd.icon}</span>
                      {cmd.label}
                    </button>
                  ))}
                  {[
                    { icon: 'title', label: 'Add Text' },
                    { icon: 'image', label: 'Add Image' },
                    { icon: 'edit', label: 'Freehand Pencil' },
                    { icon: 'ink_highlighter', label: 'Highlight' },
                    { icon: 'category', label: 'Add Rectangle' },
                    { icon: 'circle', label: 'Add Circle' },
                    { icon: 'ios_share', label: 'Export PDF' },
                    { icon: 'undo', label: 'Undo (Ctrl+Z)' },
                    { icon: 'redo', label: 'Redo (Ctrl+Y)' },
                  ].filter(c => c.label.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && <p className="px-4 py-3 text-xs text-slate-500">No matching commands</p>}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              {pdfUrl && (
                 <button onClick={() => setIsThumbnailsOpen(!isThumbnailsOpen)} className={`p-2 rounded-lg transition-all active:scale-95 duration-150 ${isThumbnailsOpen ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'text-slate-400 hover:bg-slate-800/50'}`}>
                   <span className="material-symbols-outlined">grid_view</span>
                 </button>
              )}
              <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-2 hover:bg-slate-800/50 rounded-lg text-slate-400 transition-all active:scale-95 duration-150 relative hidden md:block">
                <span className="material-symbols-outlined">notifications</span>
                {pdfUrl && <span className="absolute top-2 right-2 w-2 h-2 bg-secondary-container rounded-full"></span>}
              </button>
              <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="p-2 hover:bg-slate-800/50 rounded-lg text-slate-400 transition-all active:scale-95 duration-150 hidden md:block">
                <span className="material-symbols-outlined">settings</span>
              </button>
            </div>
            
            {!pdfUrl ? (
              <div className="h-8 w-8 rounded-full overflow-hidden border border-primary-container/30 ml-2">
                <img alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLm1Rgdq49kQGNsMmi46-upPbLhz5-VqM6tEEqDrWgy2GxCAMzzg8EeyaYR8qswNoeI7ivOZEzsWx_YWp7KdFkE9bAudgjLdSxwW1PIQw-b7WIad6NK6cKgxO1WO6butm7xYZunqjtBhXgFSPkqAfVlKbJ2RaY3wlO6dJccEkRVZgmEL8Zvg2-Y04pSCeU5l_cq-GnGKaiiRmpH8CUalQeWdaqpDjl3QUChNt50aJD809AcBfwFxKMqToiA0-GjoeoOiPoj26zIR0"/>
              </div>
            ) : (
              <button onClick={handleExport} className="ml-2 bg-primary-container text-on-primary-container px-4 py-2 rounded-xl font-medium text-sm hover:opacity-90 transition-all active:scale-95 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                Export PDF
              </button>
            )}
          </div>
        </header>

        <div className="flex flex-1 pt-16 overflow-hidden">
          
          {/* SideNavBar (Command Rail) Default & Active modes */}
          <aside className={`fixed left-0 top-16 bottom-0 flex flex-col border-r border-slate-800/50 bg-slate-950 w-64 z-40 shadow-[4px_0_24px_rgba(0,240,255,0.05)] transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            
            {!pdfUrl ? (
              <div className="p-6">
                <p className="font-['Inter'] text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4">Command Rail</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-4 bg-slate-900/50 text-cyan-400 border-r-4 border-purple-500 shadow-[inset_-10px_0_20px_rgba(182,0,248,0.1)] px-4 py-3 cursor-pointer group hover:translate-x-1 duration-200">
                    <span className="material-symbols-outlined filled-icon">auto_fix_high</span>
                    <span className="font-['Inter'] text-sm uppercase tracking-widest font-medium">Convert & Create</span>
                  </div>
                  {/* Generic Sidebar entries from Stitch */}
                  {[
                    { icon: 'edit_note', label: 'Edit & Modify' },
                    { icon: 'draw', label: 'Annotate & Form' },
                    { icon: 'verified_user', label: 'Sign & Secure' },
                    { icon: 'precision_manufacturing', label: 'Advanced' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 text-slate-500 px-4 py-3 opacity-70 cursor-pointer hover:bg-slate-900 hover:text-cyan-300 transition-all hover:translate-x-1 duration-200 group">
                      <span className="material-symbols-outlined">{item.icon}</span>
                      <span className="font-['Inter'] text-sm uppercase tracking-widest">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 py-6">
                <div className="flex items-center gap-3 px-2 mb-8">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary-container to-on-secondary-fixed flex items-center justify-center shadow-[0_0_10px_rgba(182,0,248,0.3)]">
                    <span className="material-symbols-outlined text-white text-sm">precision_manufacturing</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-['Inter'] uppercase tracking-[0.2em] text-slate-500">Command Rail</div>
                    <div className="text-xs text-cyan-400 font-medium">Precision Mode Active</div>
                  </div>
                </div>
                <nav className="space-y-1">
                  <button onClick={() => alert('Convert & Create: PDF merge, split, and format conversion coming in Phase 3 (server-side processing on Oracle/Hetzner).')} className="flex items-center gap-4 text-slate-500 px-4 py-3 opacity-70 hover:bg-slate-900 hover:text-cyan-300 transition-all font-['Inter'] text-sm uppercase tracking-widest w-full text-left">
                    <span className="material-symbols-outlined">auto_fix_high</span>
                    <span>Convert & Create</span>
                  </button>
                  
                  <div className="flex flex-col">
                     <button onClick={() => setExpandedCommand(expandedCommand === 'edit' ? null : 'edit')} className={`flex items-center justify-between px-4 py-3 font-['Inter'] text-sm uppercase tracking-widest transition-all ${expandedCommand === 'edit' ? 'bg-slate-900/50 text-cyan-400 border-r-4 border-purple-500 shadow-[inset_-10px_0_20px_rgba(182,0,248,0.1)]' : 'text-slate-500 opacity-70 hover:bg-slate-900 hover:text-cyan-300'}`}>
                        <div className="flex items-center gap-4">
                           <span className="material-symbols-outlined">edit_note</span>
                           <span>Edit & Modify</span>
                        </div>
                        <span className="material-symbols-outlined text-sm">{expandedCommand === 'edit' ? 'expand_less' : 'expand_more'}</span>
                     </button>
                     <AnimatePresence>
                        {expandedCommand === 'edit' && (
                           <motion.div initial={{height:0}} animate={{height:'auto'}} exit={{height:0}} className="overflow-hidden bg-slate-900/30">
                              <div className="py-2 px-12 flex flex-col gap-3">
                                 <button 
                                   onClick={() => { setIsEditTextMode(!isEditTextMode); setIsDrawingMode(false); setIsHighlightMode(false); if(window.innerWidth < 768) setIsMobileMenuOpen(false); }}
                                   className={`flex items-center gap-3 text-xs transition-colors uppercase tracking-widest ${isEditTextMode ? 'text-green-300' : 'text-slate-400 hover:text-cyan-300'}`}
                                 >
                                    <span className="material-symbols-outlined text-sm">text_fields</span> Edit Text
                                    {isEditTextMode && <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">ON</span>}
                                 </button>
                                 <button 
                                   onClick={() => { setIsDrawingMode(!isDrawingMode); setIsHighlightMode(false); setIsEditTextMode(false); if(window.innerWidth < 768) setIsMobileMenuOpen(false); }}
                                   className={`flex items-center gap-3 text-xs transition-colors uppercase tracking-widest ${isDrawingMode ? 'text-cyan-300' : 'text-slate-400 hover:text-cyan-300'}`}
                                 >
                                    <span className="material-symbols-outlined text-sm">edit</span> Freehand Pencil
                                 </button>
                                 {isDrawingMode && (
                                   <div className="flex items-center gap-2 pl-6">
                                     <span className="text-[10px] text-slate-500 uppercase">Ink Color</span>
                                     <input type="color" value={drawingColor} onChange={(e) => setDrawingColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer border-none" />
                                   </div>
                                 )}
                                 <button 
                                   onClick={() => { setIsHighlightMode(!isHighlightMode); setIsDrawingMode(false); if(window.innerWidth < 768) setIsMobileMenuOpen(false); }}
                                   className={`flex items-center gap-3 text-xs transition-colors uppercase tracking-widest ${isHighlightMode ? 'text-yellow-300' : 'text-slate-400 hover:text-cyan-300'}`}
                                 >
                                    <span className="material-symbols-outlined text-sm">ink_highlighter</span> Highlight
                                 </button>
                                 {isHighlightMode && (
                                   <div className="flex items-center gap-2 pl-6">
                                     <span className="text-[10px] text-slate-500 uppercase">Color</span>
                                     {['#facc15', '#4ade80', '#f472b6', '#60a5fa', '#fb923c'].map(c => (
                                       <button key={c} onClick={() => setHighlightColor(c)} className={`w-5 h-5 rounded-full border-2 ${highlightColor === c ? 'border-white scale-125' : 'border-transparent'} transition-all`} style={{ backgroundColor: c }} />
                                     ))}
                                   </div>
                                 )}
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </div>

                  <div className="flex flex-col">
                     <button onClick={() => setExpandedCommand(expandedCommand === 'annotate' ? null : 'annotate')} className={`flex items-center justify-between px-4 py-3 font-['Inter'] text-sm uppercase tracking-widest transition-all ${expandedCommand === 'annotate' ? 'bg-slate-900/50 text-cyan-400 border-r-4 border-purple-500 shadow-[inset_-10px_0_20px_rgba(182,0,248,0.1)]' : 'text-slate-500 opacity-70 hover:bg-slate-900 hover:text-cyan-300'}`}>
                        <div className="flex items-center gap-4">
                           <span className="material-symbols-outlined">draw</span>
                           <span>Annotate & Form</span>
                        </div>
                        <span className="material-symbols-outlined text-sm">{expandedCommand === 'annotate' ? 'expand_less' : 'expand_more'}</span>
                     </button>
                     <AnimatePresence>
                        {expandedCommand === 'annotate' && (
                           <motion.div initial={{height:0}} animate={{height:'auto'}} exit={{height:0}} className="overflow-hidden bg-slate-900/30">
                              <div className="py-2 px-12 flex flex-col gap-3">
                                 <button 
                                   onClick={() => {
                                     const id = `TXT_${Math.floor(Math.random()*1000)}`;
                                     setOverlayElements(prev => { const next = [...prev, { id, type: 'text' as const, text: 'New Text', x: 100, y: 100, width: 250, height: 40, fontSize: 20, color: '#000000', pageNumber: currentPage, fontFamily: 'Helvetica', fontWeight: 'Normal', opacity: 100 }]; pushHistory(next); return next; });
                                     setActiveElementId(id);
                                     if(window.innerWidth < 768) setIsMobileMenuOpen(false);
                                   }}
                                   className="flex items-center gap-3 text-xs text-slate-400 hover:text-cyan-300 transition-colors uppercase tracking-widest text-left"
                                 >
                                    <span className="material-symbols-outlined text-sm">title</span> Add Text
                                 </button>
                                 <button 
                                   onClick={handleAddImage}
                                   className="flex items-center gap-3 text-xs text-slate-400 hover:text-cyan-300 transition-colors uppercase tracking-widest"
                                 >
                                    <span className="material-symbols-outlined text-sm">image</span> Add Image
                                 </button>
                                 <button onClick={() => addShape('rect')} className="flex items-center gap-3 text-xs text-slate-400 hover:text-cyan-300 transition-colors uppercase tracking-widest">
                                    <span className="material-symbols-outlined text-sm">rectangle</span> Rectangle
                                 </button>
                                 <button onClick={() => addShape('circle')} className="flex items-center gap-3 text-xs text-slate-400 hover:text-cyan-300 transition-colors uppercase tracking-widest">
                                    <span className="material-symbols-outlined text-sm">circle</span> Circle
                                 </button>
                                 <button onClick={() => addShape('line')} className="flex items-center gap-3 text-xs text-slate-400 hover:text-cyan-300 transition-colors uppercase tracking-widest">
                                    <span className="material-symbols-outlined text-sm">horizontal_rule</span> Line
                                 </button>
                                 <button onClick={() => addShape('arrow')} className="flex items-center gap-3 text-xs text-slate-400 hover:text-cyan-300 transition-colors uppercase tracking-widest">
                                    <span className="material-symbols-outlined text-sm">arrow_right_alt</span> Arrow
                                 </button>
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </div>

                  <button onClick={() => alert('Sign & Secure: PDF password protection and digital signatures coming in Phase 3.')} className="flex items-center gap-4 text-slate-500 px-4 py-3 opacity-70 hover:bg-slate-900 hover:text-cyan-300 transition-all font-['Inter'] text-sm uppercase tracking-widest w-full text-left">
                     <span className="material-symbols-outlined">verified_user</span>
                     <span>Sign & Secure</span>
                  </button>
                  <button onClick={() => alert('Advanced: OCR, batch processing, and compression coming in Phase 3.')} className="flex items-center gap-4 text-slate-500 px-4 py-3 opacity-70 hover:bg-slate-900 hover:text-cyan-300 transition-all font-['Inter'] text-sm uppercase tracking-widest w-full text-left">
                     <span className="material-symbols-outlined">precision_manufacturing</span>
                     <span>Advanced</span>
                  </button>
                </nav>
              </div>
            )}

            <div className={`mt-auto p-4 ${pdfUrl ? 'border-t border-slate-900' : 'p-6 space-y-1'}`}>
              <nav className="space-y-1">
                <div className="flex items-center gap-4 text-slate-500 px-4 py-2 opacity-70 cursor-pointer hover:text-cyan-300 transition-all font-['Inter'] text-sm uppercase tracking-widest">
                  <span className="material-symbols-outlined">history</span>
                  <span className={`${!pdfUrl && 'text-xs'}`}>History</span>
                </div>
                <div className="flex items-center gap-4 text-slate-500 px-4 py-2 opacity-70 cursor-pointer hover:text-cyan-300 transition-all font-['Inter'] text-sm uppercase tracking-widest">
                  <span className="material-symbols-outlined">help</span>
                  <span className={`${!pdfUrl && 'text-xs'}`}>Support</span>
                </div>
                {!pdfUrl && (
                  <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center gap-3 px-4">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.5)]"></div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">System Status</p>
                      <p className="text-[9px] text-slate-600 font-medium uppercase tracking-widest">Idle State</p>
                    </div>
                  </div>
                )}
              </nav>
            </div>
          </aside>

          {/* MAIN WORKSPACE SPLIT (Empty vs Loaded) */}
          {!pdfUrl ? (
            <main className="flex-1 relative flex flex-col p-4 md:p-10 bg-surface md:ml-64 md:mr-80">
              {/* Background Ambient Light */}
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-container/5 blur-[120px] rounded-full pointer-events-none"></div>
              <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary-container/5 blur-[100px] rounded-full pointer-events-none"></div>
              
              <div className="flex flex-col gap-2 mb-12">
                <h1 className="headline text-display-lg text-6xl font-bold tracking-tight text-primary leading-none">Console.Init()</h1>
                <p className="text-on-surface-variant font-body text-lg max-w-lg opacity-80">Orchestrate your documents with pixel-perfect precision. Secure, edit, and transform with Bong Bari's engine.</p>
              </div>

              {/* Center Panel: Dashboard Empty State / Dropzone */}
              <div className="flex-1 flex items-center justify-center outline-none" {...getRootProps()}>
                <div className="w-full max-w-2xl aspect-[16/9] relative group cursor-pointer outline-none">
                  {/* Glass Card Container */}
                  <div className={`absolute inset-0 bg-surface-container-low/40 backdrop-blur-md rounded-2xl border transition-all duration-500 ${isDragActive ? 'border-primary-container/50 bg-primary-container/10' : 'border-outline-variant/10 group-hover:border-primary-container/20'}`}></div>
                  
                  {/* Dashed Drag Zone */}
                  <div className={`absolute inset-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-6 drag-zone-gradient transition-colors duration-500 ${isDragActive ? 'border-cyan-400' : 'border-slate-800 group-hover:border-cyan-400/30'}`}>
                    <input {...getInputProps()} />
                    {/* Glowing Upload Icon */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary-container/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                      <div className="relative w-20 h-20 bg-surface-container-highest rounded-full flex items-center justify-center border border-primary-container/40 shadow-[0_0_30px_rgba(0,240,255,0.1)]">
                        <span className="material-symbols-outlined text-4xl text-primary-container" style={{fontVariationSettings: "'wght' 300"}}>upload_file</span>
                      </div>
                    </div>
                    
                    <div className="text-center space-y-2">
                      <h2 className="headline text-2xl font-medium text-on-surface">Drop your PDF here</h2>
                      <p className="text-on-surface-variant font-body opacity-60">or click to browse local directory</p>
                    </div>
                    
                    <button className="mt-4 px-8 py-3 bg-primary-container text-on-primary-container font-bold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-105 active:scale-95 duration-200">
                      Select Document
                    </button>
                  </div>
                </div>
              </div>

              {/* Technical Footer Decor */}
              <div className="mt-auto flex justify-between items-end">
                <div className="space-y-1">
                  <div className="flex gap-1">
                    <div className="h-1 w-8 bg-primary-container rounded-full"></div>
                    <div className="h-1 w-2 bg-slate-800 rounded-full"></div>
                    <div className="h-1 w-2 bg-slate-800 rounded-full"></div>
                  </div>
                  <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">Kernel: v2.4.0-Stable</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">Latency: 0.02ms</p>
                  <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">Buffer: Ready</p>
                </div>
              </div>
            </main>
          ) : (
            <div className="flex-1 flex overflow-hidden">
               {/* Thumbnails Drawer */}
               <div className={`border-r border-slate-800/50 bg-surface-container-low transition-all duration-300 z-30 flex flex-col ${isThumbnailsOpen ? 'w-48 translate-x-0 ml-0 md:ml-64' : 'w-0 -translate-x-full absolute ml-64'}`}>
                  <div className="p-4 border-b border-slate-800/50 flex justify-between items-center w-48 shrink-0">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pages</span>
                     <span className="text-[10px] text-cyan-400">{numPages} Total</span>
                  </div>
                  <div className="flex-1 overflow-y-auto w-48 shrink-0 p-4 space-y-4">
                     {Array.from(new Array(numPages || 1), (el, index) => (
                        <div key={index} onClick={() => setCurrentPage(index + 1)} className={`w-full aspect-[1/1.4] bg-white rounded overflow-hidden cursor-pointer transition-all relative ${currentPage === index + 1 ? 'ring-2 ring-primary-container shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'opacity-50 hover:opacity-100'}`}>
                           <Document file={pdfUrl} loading={null}>
                             <Page pageNumber={index + 1} width={120} renderTextLayer={false} renderAnnotationLayer={false} />
                           </Document>
                           <span className="absolute bottom-1 right-1 bg-slate-900/80 text-[9px] text-cyan-400 px-1.5 py-0.5 rounded font-bold">{index + 1}</span>
                        </div>
                     ))}
                  </div>
               </div>

               <section className={`flex-1 bg-surface flex flex-col items-center justify-center p-2 md:p-8 relative overflow-hidden transition-all duration-300 ${activeElement ? 'mb-[50vh] md:mb-0 md:mr-80' : 'md:mr-0'} ${!isThumbnailsOpen && 'md:ml-64'}`}>
                 {/* Background Decoration (Neon Architect style) */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-container/5 rounded-full blur-[120px] pointer-events-none"></div>
               
               <div className="relative z-10 w-full max-w-4xl h-full flex flex-col gap-8 no-scrollbar overflow-y-auto items-center py-10">
                 
                 {/* Page 1 PDF Container */}
                 <div className="relative group">
                    <div className="absolute -top-10 left-0">
                      <span className="font-headline text-5xl font-bold text-surface-container-highest/60 pointer-events-none">PAGE {String(currentPage).padStart(2, '0')}</span>
                    </div>

                    <div onDoubleClick={handlePdfDoubleClick} onClick={(e) => {
                      handleHighlightClick(e);
                      // Click outside any overlay → deselect (settle the active element)
                      const target = e.target as HTMLElement;
                      if (!target.closest('[data-overlay-el]') && !target.closest('textarea')) {
                        if (activeElementId) {
                          pushHistory(overlayElements);
                          setActiveElementId(null);
                        }
                      }
                    }} className={`w-[700px] bg-white rounded-lg shadow-2xl overflow-hidden relative border-4 transition-all flex justify-center items-center ${isHighlightMode ? 'border-yellow-400/50 cursor-crosshair' : isEditTextMode ? 'border-green-400/30 cursor-text' : 'border-transparent hover:border-primary-container/30'}`}>
                        <Document 
                          file={pdfUrl} 
                          onLoadSuccess={onDocumentLoadSuccess}
                          className="w-full flex justify-center"
                          loading={<span className="text-black p-20 font-headline">Rendering Matrix...</span>}
                        >
                          <Page 
                            pageNumber={currentPage} 
                            width={700}
                            scale={zoomLevel} 
                            className="bg-white shadow-xl"
                            renderTextLayer={true}
                            renderAnnotationLayer={false}
                          />
                        </Document>

                        {/* Live Drawing SVG Canvas map */}
                        {isDrawingMode && (
                           <div 
                              className="absolute inset-0 z-40 cursor-crosshair touch-none"
                              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                              onPointerDown={handlePointerDown}
                              onPointerMove={handlePointerMove}
                              onPointerUp={handlePointerUp}
                              onPointerCancel={handlePointerUp}
                           >
                             <svg className="w-full h-full pointer-events-none">
                               {currentPath && <path d={currentPath} stroke={drawingColor} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                             </svg>
                           </div>
                        )}

                        {/* Interactive Overlay Layer */}
                        <div className="absolute inset-0 z-30 overflow-hidden pointer-events-none" 
                           style={{ 
                              // we keep the overlay boundaries exactly over the Document width 
                              transform: `scale(${zoomLevel})`,
                              transformOrigin: 'top center'
                           }}>

                           {/* ── Detected text boxes (Edit Text Mode) ── */}
                           {isEditTextMode && detectedTexts
                             .filter(dt => dt.pageNumber === currentPage)
                             .filter(dt => !overlayElements.some(el => el.isWhiteout && Math.abs(el.x - dt.x) < 5 && Math.abs(el.y - dt.y) < 5))
                             .map((dt, i) => (
                               <div
                                 key={`dt-${i}`}
                                 className="absolute pointer-events-auto cursor-text border border-transparent hover:border-cyan-400/60 hover:bg-cyan-400/10 transition-all duration-100 group/dt"
                                 style={{ left: dt.x, top: dt.y, width: dt.width, height: dt.height }}
                                 onClick={() => {
                                   const id = `EDIT_${Math.floor(Math.random() * 100000)}`;
                                   // Hide the detected text's original rendered spans too
                                   const pageEl = document.querySelector('.react-pdf__Page__textContent');
                                   if (pageEl) {
                                     const spans = pageEl.querySelectorAll('span');
                                     spans.forEach(span => {
                                       if (span.textContent?.trim() === dt.text.trim()) {
                                         span.style.opacity = '0';
                                         span.setAttribute('data-whiteout-hidden', 'true');
                                       }
                                     });
                                   }
                                   setOverlayElements(prev => {
                                     const next = [...prev, {
                                       id, type: 'text' as const,
                                       text: dt.text,
                                       x: dt.x, y: dt.y,
                                       width: Math.max(dt.width + 60, 320), height: Math.max(dt.height * 2.5, dt.fontSize * 4),
                                       fontSize: dt.fontSize,
                                       fontFamily: 'Helvetica', fontWeight: 'Normal',
                                       opacity: 100, color: '#000000',
                                       pageNumber: currentPage,
                                       isWhiteout: true,
                                     }];
                                     pushHistory(next);
                                     return next;
                                   });
                                   setActiveElementId(id);
                                 }}
                               >
                                 <span className="absolute -top-4 left-0 bg-cyan-900/80 text-[8px] text-cyan-300 px-1 py-0.5 rounded opacity-0 group-hover/dt:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                   Click to edit
                                 </span>
                               </div>
                             ))
                           }

                           <AnimatePresence>
                              {overlayElements.filter(el => el.pageNumber === currentPage).map(el => {
                                const isActive = activeElementId === el.id;
                                const isSettled = el.isWhiteout && !isActive;

                                return (
                                <motion.div
                                  key={el.id}
                                  data-overlay-el="true"
                                  drag
                                  dragMomentum={false}
                                  onClick={() => setActiveElementId(el.id)}
                                  onDragEnd={(e, info) => {
                                      setOverlayElements(prev => { const next = prev.map(o => 
                                          o.id === el.id ? { ...o, x: o.x + info.offset.x, y: o.y + info.offset.y } : o
                                      ); pushHistory(next); return next; });
                                  }}
                                  style={{
                                    x: el.x, y: el.y, width: el.width, minHeight: el.height,
                                    opacity: (el.opacity ?? 100) / 100,
                                    ...(el.isWhiteout ? { backgroundColor: '#ffffff', zIndex: 50, boxShadow: 'none' } : {}),
                                  }}
                                  className={`absolute pointer-events-auto ${
                                    isActive
                                      ? 'cursor-move border-2 border-dashed border-secondary-container rounded-sm'
                                      : isSettled
                                        ? 'cursor-pointer border-0 outline-none'
                                        : 'cursor-move border-2 border-transparent hover:border-dashed hover:border-secondary-container/50 rounded-sm'
                                  }`}
                                >
                                  {/* Label — only when active */}
                                  {isActive && (
                                    <span className="absolute -top-3 -left-3 bg-secondary-container text-[10px] text-white px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter shadow-md z-10">
                                       {el.type === 'highlight' ? 'Highlight' : el.type === 'shape' ? (el.shapeKind || 'Shape') : el.type === 'image' ? 'Image' : el.type === 'drawing' ? 'Drawing' : el.isWhiteout ? 'Whiteout' : 'Text Box'}
                                    </span>
                                  )}

                                  {/* Highlight */}
                                  {el.type === 'highlight' ? (
                                    <div className="w-full h-full rounded" style={{ backgroundColor: el.color || '#facc15', opacity: 0.35 }} />

                                  /* Shape */
                                  ) : el.type === 'shape' ? (
                                    <svg viewBox={`0 0 ${el.width} ${el.height}`} className="w-full h-full overflow-visible pointer-events-none">
                                      {el.shapeKind === 'rect' && <rect x="1" y="1" width={el.width - 2} height={el.height - 2} stroke={el.color || '#00f0ff'} strokeWidth="2" fill="none" rx="2" />}
                                      {el.shapeKind === 'circle' && <ellipse cx={el.width / 2} cy={el.height / 2} rx={el.width / 2 - 1} ry={el.height / 2 - 1} stroke={el.color || '#00f0ff'} strokeWidth="2" fill="none" />}
                                      {(el.shapeKind === 'line' || el.shapeKind === 'arrow') && <line x1="0" y1={el.height / 2} x2={el.width} y2={el.height / 2} stroke={el.color || '#00f0ff'} strokeWidth="2" />}
                                      {el.shapeKind === 'arrow' && <polygon points={`${el.width - 10},${el.height / 2 - 6} ${el.width},${el.height / 2} ${el.width - 10},${el.height / 2 + 6}`} fill={el.color || '#00f0ff'} />}
                                    </svg>

                                  /* Image */
                                  ) : el.type === 'image' && el.src ? (
                                    <img src={el.src} alt="Overlay" className="w-full h-full object-contain pointer-events-none" />

                                  /* Text — ACTIVE: editable textarea */
                                  ) : el.type === 'text' && isActive ? (
                                    <textarea 
                                      value={el.text || ''}
                                      onChange={(e) => setOverlayElements(prev => prev.map(o => o.id === el.id ? { ...o, text: e.target.value } : o))}
                                      autoFocus
                                      style={{
                                        fontSize: `${el.fontSize || 16}px`,
                                        color: el.isWhiteout ? '#000000' : (el.color || '#000000'),
                                        backgroundColor: el.isWhiteout ? '#ffffff' : 'rgba(255,255,200,0.15)',
                                        fontFamily: (el.fontFamily || 'Helvetica') + ', sans-serif',
                                        lineHeight: 1.4,
                                        wordWrap: 'break-word',
                                        overflowWrap: 'break-word',
                                      }}
                                      className="w-full h-full outline-none resize-none overflow-auto px-1 py-0.5"
                                      placeholder="Type here..."
                                    />

                                  /* Text — SETTLED: plain rendered text (no textarea, no edit UI) */
                                  ) : el.type === 'text' ? (
                                    <div
                                      style={{
                                        fontSize: `${el.fontSize || 16}px`,
                                        color: el.isWhiteout ? '#000000' : (el.color || '#000000'),
                                        backgroundColor: el.isWhiteout ? '#ffffff' : 'transparent',
                                        fontFamily: (el.fontFamily || 'Helvetica') + ', sans-serif',
                                        lineHeight: 1.4,
                                        wordWrap: 'break-word' as const,
                                        overflowWrap: 'break-word' as const,
                                      }}
                                      className={`w-full h-full px-1 py-0.5 whitespace-pre-wrap select-none ${el.isWhiteout ? 'overflow-visible' : 'overflow-hidden'}`}
                                    >
                                      {el.text || ''}
                                    </div>

                                  /* Drawing */
                                  ) : el.type === 'drawing' && el.svgPath ? (
                                    <svg viewBox={`0 0 ${el.width} ${el.height}`} className="w-full h-full overflow-visible pointer-events-none">
                                      <path d={el.svgPath} stroke={el.color || '#000000'} strokeWidth={el.thickness || 3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  ) : null}
                                </motion.div>
                                );
                              })}
                           </AnimatePresence>
                        </div>
                    </div>
                 </div>
               </div>
               <div className={`absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1 md:gap-2 glass-panel p-1.5 md:p-2 rounded-2xl border border-outline-variant/15 shadow-2xl z-20 transition-all duration-300 ${activeElement ? 'max-md:opacity-0 max-md:pointer-events-none drop-shadow-lg' : ''}`}>
                  <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 transition-colors">
                    <span className="material-symbols-outlined">navigate_before</span>
                  </button>
                  
                  <div className="px-4 h-10 flex items-center gap-2">
                    <span className="text-sm font-medium text-white">Page</span>
                    <input 
                      className="w-8 h-7 bg-surface-container-highest border border-outline-variant/30 rounded text-center text-xs text-white focus:border-primary-container focus:ring-1 focus:ring-primary-container" 
                      type="text" 
                      value={String(currentPage).padStart(2, '0')} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1 && val <= (numPages || 1)) {
                          setCurrentPage(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                    />
                    <span className="text-sm font-medium text-slate-500">of {numPages || '??'}</span>
                  </div>
                  
                  <button onClick={() => setCurrentPage(Math.min(numPages || 1, currentPage + 1))} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 transition-colors">
                    <span className="material-symbols-outlined">navigate_next</span>
                  </button>
                  
                  <div className="w-px h-6 bg-slate-800 mx-2"></div>
                  
                  <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 transition-colors">
                    <span className="material-symbols-outlined">zoom_out</span>
                  </button>
                  <span className="text-xs font-bold text-cyan-400 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.1))} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 transition-colors">
                    <span className="material-symbols-outlined">zoom_in</span>
                  </button>
                  
                  <div className="w-px h-6 bg-slate-800 mx-2"></div>
                  <button onClick={() => setZoomLevel(1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 transition-colors" title="Fit to Screen">
                    <span className="material-symbols-outlined">fullscreen</span>
                  </button>
               </div>
            </section>
            </div>
          )}

          {/* RIGHT SIDEBAR - Splitting logic per Empty/Loaded */}
          {!pdfUrl ? (
            <aside className="fixed right-0 top-16 bottom-0 w-80 bg-surface-container-lowest border-l border-slate-800/50 flex flex-col p-6 z-40 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] hidden md:flex">
              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="font-['Inter'] text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Document Metadata</p>
                  <div className="bg-surface-container-high/50 p-5 rounded-2xl border border-outline-variant/10 space-y-4 shadow-[0_5px_15px_rgba(0,0,0,0.2)]">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant font-medium">Filename</span>
                      <span className="text-xs text-slate-600 italic">None Loaded</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant font-medium">Size</span>
                      <span className="text-xs text-slate-600">0.0 KB</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant font-medium">Pages</span>
                      <span className="text-xs text-slate-600">0 / 0</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant font-medium">Encryption</span>
                      <span className="material-symbols-outlined text-xs text-slate-700">lock_open</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="font-['Inter'] text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Quick Workflow</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => alert('Append: Upload a PDF first, then use this to merge additional pages. Full merge feature coming in Phase 3.')} className="flex flex-col items-center justify-center gap-2 p-4 bg-surface-container rounded-xl border border-outline-variant/5 hover:border-cyan-400/20 hover:bg-surface-bright transition-all group shadow-md">
                      <span className="material-symbols-outlined text-slate-500 group-hover:text-cyan-400">add_to_photos</span>
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter group-hover:text-cyan-400">Append</span>
                    </button>
                    <button onClick={() => alert('Optimize: PDF compression to reduce file size by up to 80%. Coming in Phase 3 (Server-side Ghostscript).')} className="flex flex-col items-center justify-center gap-2 p-4 bg-surface-container rounded-xl border border-outline-variant/5 hover:border-cyan-400/20 hover:bg-surface-bright transition-all group shadow-md">
                      <span className="material-symbols-outlined text-slate-500 group-hover:text-cyan-400">auto_fix_normal</span>
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter group-hover:text-cyan-400">Optimize</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-800/50 space-y-4">
                <div className="bg-secondary-container/10 p-4 rounded-xl border border-secondary-container/20 flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary-fixed text-sm">info</span>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    System is in <span className="text-secondary-fixed font-bold">Idle State</span>. Please upload a PDF to enable precision tools.
                  </p>
                </div>
                
                <button className="w-full py-4 bg-slate-800 text-slate-500 font-bold rounded-xl flex items-center justify-center gap-3 cursor-not-allowed border border-slate-700">
                  <span className="material-symbols-outlined font-bold">ios_share</span>
                  <span className="headline tracking-tight">Export PDF</span>
                </button>
              </div>
            </aside>
          ) : (
            <aside className={`fixed right-0 top-16 bottom-0 w-80 bg-surface-container-low flex flex-col border-l border-slate-800/50 z-40 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-300 md:translate-y-0 ${activeElement ? 'translate-y-0' : 'translate-y-[200%] md:translate-y-0 md:translate-x-0 translate-x-full md:!translate-x-0'} max-md:top-auto max-md:w-full max-md:h-[50vh] max-md:rounded-t-3xl max-md:shadow-[0_-10px_40px_rgba(0,0,0,0.8)]`}>
               {/* Mobile Drag Handle */}
               <div className="md:hidden w-full flex justify-center pt-3 pb-1">
                  <div className="w-12 h-1.5 bg-slate-700/50 rounded-full"></div>
               </div>
               
               <div className="p-4 md:p-6 overflow-y-auto no-scrollbar flex-1">
                 <div className="flex items-center justify-between mb-8">
                   <h2 className="font-headline text-lg font-bold text-white tracking-tight">Properties</h2>
                   <span className="text-[10px] bg-secondary-container/20 text-secondary-fixed-dim px-2 py-0.5 rounded border border-secondary-container/30 uppercase font-bold tracking-widest">
                      {activeElement ? 'Active' : 'No Selection'}
                   </span>
                 </div>
                 
                 <div className={`space-y-8 ${!activeElement ? 'opacity-30 pointer-events-none' : ''}`}>
                   
                   {/* Text Box Context */}
                   <div className="space-y-4">
                     <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Element Identity</label>
                     <div className="p-4 bg-surface-container-highest/30 rounded-xl border border-outline-variant/15">
                       <div className="flex items-center gap-3">
                         <span className="material-symbols-outlined text-secondary-fixed-dim">title</span>
                         <div>
                           <div className="text-sm font-medium text-white truncate w-40">{activeElement?.text || 'Text Box'}</div>
                           <div className="text-[10px] text-slate-500">ID: {activeElement?.id || '—'}</div>
                         </div>
                       </div>
                     </div>
                   </div>
                   
                   {/* Typography */}
                   <div className="space-y-4">
                     <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Typography</label>
                     <div className="space-y-4">
                       <div className="flex flex-col gap-2 relative">
                         <span className="text-xs text-slate-400">Font Family</span>
                         <button onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)} className="bg-surface-container-highest px-3 py-2 rounded-lg border border-outline-variant/30 flex items-center justify-between cursor-pointer hover:bg-surface-bright transition-colors w-full text-left">
                           <span className="text-sm font-medium">{activeElement?.fontFamily || 'Helvetica'}</span>
                           <span className="material-symbols-outlined text-sm">unfold_more</span>
                         </button>
                         {isFontDropdownOpen && (
                           <div className="absolute top-full left-0 mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg z-50 shadow-xl max-h-48 overflow-y-auto">
                             {FONT_FAMILIES.map(f => (
                               <button key={f} onClick={() => { activeElement && setOverlayElements(prev => { const next = prev.map(o => o.id === activeElement.id ? { ...o, fontFamily: f } : o); pushHistory(next); return next; }); setIsFontDropdownOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-800 transition-colors ${activeElement?.fontFamily === f ? 'text-cyan-400' : 'text-slate-300'}`}>
                                 {f}
                               </button>
                             ))}
                           </div>
                         )}
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div className="flex flex-col gap-2 relative">
                           <span className="text-xs text-slate-400">Weight</span>
                           <button onClick={() => setIsWeightDropdownOpen(!isWeightDropdownOpen)} className="bg-surface-container-highest px-3 py-2 rounded-lg border border-outline-variant/30 flex items-center justify-between cursor-pointer w-full text-left">
                             <span className="text-sm font-medium">{activeElement?.fontWeight || 'Normal'}</span>
                             <span className="material-symbols-outlined text-sm">expand_more</span>
                           </button>
                           {isWeightDropdownOpen && (
                             <div className="absolute top-full left-0 mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg z-50 shadow-xl">
                               {FONT_WEIGHTS.map(w => (
                                 <button key={w} onClick={() => { 
                                   if (activeElement) {
                                     // Auto-switch font family for Bold variant
                                     const base = (activeElement.fontFamily || 'Helvetica').replace(' Bold', '');
                                     const newFamily = w === 'Bold' ? `${base} Bold` : base;
                                     const validFamily = FONT_FAMILIES.includes(newFamily) ? newFamily : activeElement.fontFamily;
                                     setOverlayElements(prev => { const next = prev.map(o => o.id === activeElement.id ? { ...o, fontWeight: w, fontFamily: validFamily } : o); pushHistory(next); return next; });
                                   }
                                   setIsWeightDropdownOpen(false); 
                                 }} className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-800 transition-colors ${activeElement?.fontWeight === w ? 'text-cyan-400' : 'text-slate-300'}`}>
                                   {w}
                                 </button>
                               ))}
                             </div>
                           )}
                         </div>
                         <div className="flex flex-col gap-2">
                           <span className="text-xs text-slate-400">Size</span>
                           <div className="bg-surface-container-highest px-3 py-2 rounded-lg border border-outline-variant/30 flex items-center justify-between cursor-pointer">
                             <span className="text-sm font-medium">{activeElement?.fontSize || 24}px</span>
                             <div className="flex flex-col gap-0.5 scale-75">
                               <button onClick={() => activeElement && setOverlayElements(prev => { const next = prev.map(o => o.id === activeElement.id ? { ...o, fontSize: (o.fontSize || 16) + 2 } : o); pushHistory(next); return next; })}>
                                 <span className="material-symbols-outlined text-[10px] leading-none hover:text-white">expand_less</span>
                               </button>
                               <button onClick={() => activeElement && setOverlayElements(prev => { const next = prev.map(o => o.id === activeElement.id ? { ...o, fontSize: Math.max(8, (o.fontSize || 16) - 2) } : o); pushHistory(next); return next; })}>
                                 <span className="material-symbols-outlined text-[10px] leading-none hover:text-white">expand_more</span>
                               </button>
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                   
                   {/* Appearance */}
                   <div className="space-y-4">
                     <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Appearance</label>
                     <div className="space-y-6">
                       <div className="flex items-center justify-between">
                         <span className="text-xs text-slate-400">Text Color</span>
                         <div className="flex items-center gap-3">
                           <span className="text-xs font-mono text-slate-500 uppercase">{activeElement?.color || '#FFFFFF'}</span>
                           <div className="w-6 h-6 rounded-md border border-outline-variant/50 cursor-pointer overflow-hidden">
                              <input 
                                type="color" 
                                value={activeElement?.color || '#FFFFFF'}
                                onChange={(e) => activeElement && setOverlayElements(prev => prev.map(o => o.id === activeElement.id ? { ...o, color: e.target.value } : o))}
                                onBlur={() => pushHistory(overlayElements)}
                                className="w-10 h-10 -m-2 cursor-pointer" 
                              />
                           </div>
                         </div>
                       </div>
                       <div className="space-y-3">
                         <div className="flex justify-between items-center">
                           <span className="text-xs text-slate-400">Opacity</span>
                           <span className="text-xs font-bold text-cyan-400">{activeElement?.opacity ?? 100}%</span>
                         </div>
                         <div className="relative">
                           <input 
                             type="range" 
                             min="5" 
                             max="100" 
                             value={activeElement?.opacity ?? 100}
                             onChange={(e) => activeElement && setOverlayElements(prev => prev.map(o => o.id === activeElement.id ? { ...o, opacity: Number(e.target.value) } : o))}
                             onMouseUp={() => activeElement && pushHistory(overlayElements)}
                             className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                           />
                         </div>
                       </div>
                     </div>
                   </div>
                   
                   {/* Actions */}
                   <div className="pt-6 border-t border-slate-800/50 space-y-3">
                     <button 
                        onClick={() => {
                           if (!activeElement) return;
                           setOverlayElements(prev => { const next = prev.filter(o => o.id !== activeElement.id); pushHistory(next); return next; });
                           setActiveElementId(null);
                        }}
                        className="w-full py-3 rounded-xl border border-error/30 text-error hover:bg-error-container/20 transition-all flex items-center justify-center gap-2 font-medium"
                     >
                       <span className="material-symbols-outlined text-lg">delete</span>
                       <span>Delete Element</span>
                     </button>
                     <div className="flex gap-2">
                       <button onClick={undo} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-800 transition-all flex items-center justify-center gap-1 text-xs">
                         <span className="material-symbols-outlined text-sm">undo</span> Undo
                       </button>
                       <button onClick={redo} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-800 transition-all flex items-center justify-center gap-1 text-xs">
                         <span className="material-symbols-outlined text-sm">redo</span> Redo
                       </button>
                     </div>
                   </div>
                   
                 </div>
               </div>
               
               <div className="mt-auto p-6 bg-slate-900/30">
                 <div className="flex items-center gap-4 p-3 bg-primary-container/5 rounded-xl border border-primary-container/10">
                   <span className="material-symbols-outlined text-primary-container filled-icon">info</span>
                   <p className="text-[10px] text-on-surface-variant leading-relaxed">
                     All edits are local &amp; private. <span className="text-cyan-400 cursor-pointer hover:underline" onClick={() => alert(`Session history: ${historyRef.current.length} snapshots. Use Ctrl+Z / Ctrl+Y to navigate.`)}>View edit history ({historyRef.current.length} states).</span>
                   </p>
                 </div>
               </div>
            </aside>
          )}

        </div>
      </div>

      {/* PHRASE 2: Notifications modal */}
      <AnimatePresence>
        {isNotificationsOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[200] flex items-start justify-end pt-20 pr-6" onClick={() => setIsNotificationsOpen(false)}>
            <motion.div initial={{y:-20,opacity:0}} animate={{y:0,opacity:1}} exit={{y:-20,opacity:0}} onClick={(e) => e.stopPropagation()} className="w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Notifications</h3>
                <button onClick={() => setIsNotificationsOpen(false)} className="text-slate-400 hover:text-white"><span className="material-symbols-outlined text-sm">close</span></button>
              </div>
              <div className="p-6 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">notifications_off</span>
                <p className="text-xs text-slate-500 mt-2">No notifications yet.</p>
                <p className="text-[10px] text-slate-600 mt-1">Cloud sync notifications will appear here in Phase 3.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHRASE 2: Settings modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}} onClick={(e) => e.stopPropagation()} className="w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Settings</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white"><span className="material-symbols-outlined text-sm">close</span></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Default Export Quality</span>
                  <span className="text-xs text-cyan-400 font-medium">Maximum</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Auto-zoom on load</span>
                  <span className="text-xs text-cyan-400 font-medium">Fit Width</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">PDF Engine</span>
                  <span className="text-xs text-cyan-400 font-medium">pdf-lib v1.17</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Renderer</span>
                  <span className="text-xs text-cyan-400 font-medium">pdf.js v4.x</span>
                </div>
                <div className="pt-4 border-t border-slate-800">
                  <p className="text-[10px] text-slate-600">All processing happens in your browser. Zero data leaves your device.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHRASE 2.5: Edit Text mode indicator */}
      <AnimatePresence>
        {isEditTextMode && (
          <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} exit={{y:20,opacity:0}} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] bg-green-500/20 border border-green-500/40 px-6 py-3 rounded-2xl backdrop-blur-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-green-400">text_fields</span>
            <span className="text-sm text-green-300 font-medium">Edit Text Mode — click any text on the PDF to edit it</span>
            <span className="text-[10px] text-green-400/70 bg-green-900/30 px-2 py-0.5 rounded">{detectedTexts.length} texts detected</span>
            <button onClick={() => setIsEditTextMode(false)} className="text-green-400 hover:text-white ml-2"><span className="material-symbols-outlined text-sm">close</span></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHRASE 2: Highlight mode indicator */}
      <AnimatePresence>
        {isHighlightMode && (
          <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} exit={{y:20,opacity:0}} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] bg-yellow-500/20 border border-yellow-500/40 px-6 py-3 rounded-2xl backdrop-blur-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-yellow-400">ink_highlighter</span>
            <span className="text-sm text-yellow-300 font-medium">Click on any text in the PDF to highlight it</span>
            <button onClick={() => setIsHighlightMode(false)} className="text-yellow-400 hover:text-white ml-2"><span className="material-symbols-outlined text-sm">close</span></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHRASE 2: Drawing mode indicator */}
      <AnimatePresence>
        {isDrawingMode && (
          <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} exit={{y:20,opacity:0}} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] bg-blue-500/20 border border-blue-500/40 px-6 py-3 rounded-2xl backdrop-blur-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-400">edit</span>
            <span className="text-sm text-blue-300 font-medium">Draw on the PDF — release to save stroke</span>
            <div className="flex items-center gap-2 ml-2">
              <input type="color" value={drawingColor} onChange={(e) => setDrawingColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer border-none" />
            </div>
            <button onClick={() => setIsDrawingMode(false)} className="text-blue-400 hover:text-white ml-2"><span className="material-symbols-outlined text-sm">close</span></button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
