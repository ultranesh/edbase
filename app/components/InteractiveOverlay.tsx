'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

interface OverlayMarkers {
  tl: Point; // top-left
  tr: Point; // top-right
  bl: Point; // bottom-left
  br: Point; // bottom-right
}

interface InteractiveOverlayProps {
  imageUrl: string;
  onConfirm: (markers: OverlayMarkers) => void;
  onCancel: () => void;
}

/**
 * Compute homography matrix from 4 source points to 4 destination points.
 * Uses Direct Linear Transform (DLT) algorithm.
 */
function computeHomography(
  src: [Point, Point, Point, Point],
  dst: [Point, Point, Point, Point]
): number[] | null {
  const A: number[][] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x, sy = src[i].y;
    const dx = dst[i].x, dy = dst[i].y;

    A.push([-sx, -sy, -1, 0, 0, 0, sx * dx, sy * dx, dx]);
    A.push([0, 0, 0, -sx, -sy, -1, sx * dy, sy * dy, dy]);
  }

  return solveHomography(A);
}

function solveHomography(A: number[][]): number[] | null {
  const m = 8;

  const B: number[][] = [];
  const c: number[] = [];

  for (let i = 0; i < m; i++) {
    B.push(A[i].slice(0, 8));
    c.push(-A[i][8]);
  }

  const solution = gaussianElimination(B, c);
  if (!solution) return null;

  return [...solution, 1];
}

function gaussianElimination(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const m = A[0].length;

  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < Math.min(n, m); col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }

    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    if (Math.abs(aug[col][col]) < 1e-10) continue;

    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= m; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  const x = new Array(m).fill(0);
  for (let i = Math.min(n, m) - 1; i >= 0; i--) {
    if (Math.abs(aug[i][i]) < 1e-10) continue;

    let sum = aug[i][m];
    for (let j = i + 1; j < m; j++) {
      sum -= aug[i][j] * x[j];
    }
    x[i] = sum / aug[i][i];
  }

  return x;
}

function transformPoint(p: Point, H: number[]): Point {
  const [h11, h12, h13, h21, h22, h23, h31, h32, h33] = H;

  const w = h31 * p.x + h32 * p.y + h33;
  const x = (h11 * p.x + h12 * p.y + h13) / w;
  const y = (h21 * p.x + h22 * p.y + h23) / w;

  return { x, y };
}

/**
 * PDF exact measurements in mm - these match the actual PDF CSS
 *
 * IMPORTANT: PDF now uses table-layout: fixed with explicit column widths:
 * - Num column: 7mm
 * - Each cell column: 15.5mm
 * - Gap column: 5mm
 */
const PDF_MEASUREMENTS = {
  // A4 page
  pageWidth: 210,
  pageHeight: 297,

  // Markers: 8mm squares at 5mm from edges, so centers at 9mm from edges
  markerSize: 8,
  markerEdgeOffset: 5, // Distance from page edge to marker edge

  // Content area
  contentLeft: 18,
  contentRight: 192, // 210 - 18
  contentTop: 16,
  contentBottom: 281, // 297 - 16

  // Grid layout - measured from actual PDF:
  // - top-header: logo 7mm + margin-bottom 2mm = 9mm
  // - form-box: padding 2mm + QR 15mm + padding 2mm + margin-bottom 1mm = 20mm
  // - Total header from content top: 29mm
  // - Grid header row (th): 7mm
  // So first data row starts at: 16 + 31 + 7 = 54mm from page top
  headerHeight: 31,
  gridHeaderRow: 7,
  rowHeight: 7,
  maxRows: 30,

  // FIXED column widths (from PDF CSS table-layout: fixed)
  gapWidth: 5,
  numColumnWidth: 7,     // .grid th.num, td.num { width: 7mm }
  cellColumnWidth: 15.5, // .grid th.cell, td.cell { width: 15.5mm }

  // Bubbles
  bubbleSize: 5.5,
};

/**
 * Calculate marker rectangle (the reference frame for coordinates)
 */
function getMarkerRect() {
  const m = PDF_MEASUREMENTS;
  const markerCenterOffset = m.markerEdgeOffset + m.markerSize / 2; // 5 + 4 = 9mm

  return {
    left: markerCenterOffset,   // 9mm
    right: m.pageWidth - markerCenterOffset,  // 201mm
    top: markerCenterOffset,    // 9mm
    bottom: m.pageHeight - markerCenterOffset, // 288mm
    width: m.pageWidth - 2 * markerCenterOffset,  // 192mm
    height: m.pageHeight - 2 * markerCenterOffset, // 279mm
  };
}

/**
 * Convert page mm coordinates to normalized marker-relative coordinates (0-1)
 */
function pageToNormalized(pageX: number, pageY: number): Point {
  const rect = getMarkerRect();
  return {
    x: (pageX - rect.left) / rect.width,
    y: (pageY - rect.top) / rect.height,
  };
}

/**
 * Get ideal bubble positions in normalized coordinates (0-1).
 * Uses exact PDF measurements with FIXED column widths for accurate positioning.
 */
function getIdealBubblePositions(): { questionIndex: number; optionIndex: number; point: Point }[] {
  const m = PDF_MEASUREMENTS;
  const bubbles: { questionIndex: number; optionIndex: number; point: Point }[] = [];

  // FIXED column widths from PDF CSS (table-layout: fixed)
  // Each half: numColumn(7mm) + 5 cells(15.5mm each) = 7 + 77.5 = 84.5mm
  // Total: 84.5 + 5(gap) + 84.5 = 174mm = content width ✓

  // Vertical: first data row starts at content top + header + grid header
  const gridDataTop = m.contentTop + m.headerHeight + m.gridHeaderRow; // 16 + 29 + 7 = 52mm

  // Left column: starts at content left
  const leftNumStart = m.contentLeft; // 18mm
  const leftCellsStart = leftNumStart + m.numColumnWidth; // 18 + 7 = 25mm

  // Right column: starts after left half + gap
  const leftHalfWidth = m.numColumnWidth + 5 * m.cellColumnWidth; // 7 + 77.5 = 84.5mm
  const rightNumStart = m.contentLeft + leftHalfWidth + m.gapWidth; // 18 + 84.5 + 5 = 107.5mm
  const rightCellsStart = rightNumStart + m.numColumnWidth; // 107.5 + 7 = 114.5mm

  for (let col = 0; col < 2; col++) {
    const cellsStartX = col === 0 ? leftCellsStart : rightCellsStart;

    for (let row = 0; row < m.maxRows; row++) {
      const questionIndex = col * m.maxRows + row;

      // Bubble center Y: row top + half row height
      const rowTopY = gridDataTop + row * m.rowHeight;
      const bubbleCenterY = rowTopY + m.rowHeight / 2;

      for (let opt = 0; opt < 5; opt++) {
        // Bubble center X: cell start + (cell index + 0.5) * cell width
        const bubbleCenterX = cellsStartX + (opt + 0.5) * m.cellColumnWidth;

        const normalized = pageToNormalized(bubbleCenterX, bubbleCenterY);

        bubbles.push({
          questionIndex,
          optionIndex: opt,
          point: normalized,
        });
      }
    }
  }

  return bubbles;
}

/**
 * Get bubble radius in normalized coordinates
 */
function getNormalizedBubbleRadius(): number {
  const m = PDF_MEASUREMENTS;
  const rect = getMarkerRect();
  // Bubble diameter is 5.5mm, radius is 2.75mm
  // Express as fraction of marker rectangle width
  return (m.bubbleSize / 2) / rect.width;
}

export default function InteractiveOverlay({ imageUrl, onConfirm, onCancel }: InteractiveOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState<'tl' | 'tr' | 'bl' | 'br' | 'all' | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [markersAtDragStart, setMarkersAtDragStart] = useState<OverlayMarkers | null>(null);

  // Overlay markers in pixel coordinates
  const [markers, setMarkers] = useState<OverlayMarkers>({
    tl: { x: 0, y: 0 },
    tr: { x: 0, y: 0 },
    bl: { x: 0, y: 0 },
    br: { x: 0, y: 0 },
  });

  // Initialize markers when image loads
  useEffect(() => {
    console.log('[Overlay] Loading image from URL:', imageUrl.substring(0, 50) + '...');
    const img = new Image();
    img.onload = () => {
      console.log('[Overlay] Image loaded successfully:', img.width, 'x', img.height);
      // Calculate display size (max 800px)
      const maxSize = 800;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const width = img.width * scale;
      const height = img.height * scale;

      setImageSize({ width, height });

      // Initialize markers at exact PDF positions
      // Marker centers are at 9mm from edges on A4 (210mm × 297mm)
      // X margin: 9/210 = 0.0429, Y margin adjusted higher
      const marginX = 9 / 210; // ~4.3%
      const marginY = 0.02; // ~2% (raised higher)
      setMarkers({
        tl: { x: width * marginX, y: height * marginY },
        tr: { x: width * (1 - marginX), y: height * marginY },
        bl: { x: width * marginX, y: height * (1 - marginY) },
        br: { x: width * (1 - marginX), y: height * (1 - marginY) },
      });
    };
    img.onerror = (e) => {
      console.error('[Overlay] Failed to load image. Browser may not support this format (HEIC?).', e);
      // Note: HEIC files won't load in Chrome/Firefox - need to convert first
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Calculate bubble positions AND LOCAL RADIUS using homography
  // The radius varies across the image due to perspective distortion!
  const bubblePositions = useCallback(() => {
    if (imageSize.width === 0) return [];

    // Ideal marker positions (unit square)
    const idealMarkers: [Point, Point, Point, Point] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];

    // Actual marker positions (normalized to image size)
    const actualMarkers: [Point, Point, Point, Point] = [
      { x: markers.tl.x / imageSize.width, y: markers.tl.y / imageSize.height },
      { x: markers.tr.x / imageSize.width, y: markers.tr.y / imageSize.height },
      { x: markers.bl.x / imageSize.width, y: markers.bl.y / imageSize.height },
      { x: markers.br.x / imageSize.width, y: markers.br.y / imageSize.height },
    ];

    const H = computeHomography(idealMarkers, actualMarkers);
    if (!H) return [];

    const idealBubbles = getIdealBubblePositions();
    const bubbleRadiusNorm = getNormalizedBubbleRadius();

    return idealBubbles.map(({ questionIndex, optionIndex, point }) => {
      const transformed = transformPoint(point, H);

      // Calculate LOCAL radius at this position (accounts for perspective!)
      // Use both X and Y offsets for geometric mean
      const offsetX = { x: point.x + bubbleRadiusNorm, y: point.y };
      const offsetY = { x: point.x, y: point.y + bubbleRadiusNorm };
      const transformedOffsetX = transformPoint(offsetX, H);
      const transformedOffsetY = transformPoint(offsetY, H);

      const scaleX = Math.abs(transformedOffsetX.x - transformed.x);
      const scaleY = Math.abs(transformedOffsetY.y - transformed.y);
      const localRadius = Math.sqrt(scaleX * scaleY) * imageSize.width;

      return {
        questionIndex,
        optionIndex,
        x: transformed.x * imageSize.width,
        y: transformed.y * imageSize.height,
        radius: localRadius,
      };
    });
  }, [markers, imageSize]);

  const handleMouseDown = (e: React.MouseEvent, corner?: 'tl' | 'tr' | 'bl' | 'br') => {
    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDragStart({ x, y });
    setMarkersAtDragStart({ ...markers });
    setDragging(corner || 'all');
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !dragStart || !markersAtDragStart) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    if (dragging === 'all') {
      // Move all markers
      setMarkers({
        tl: { x: markersAtDragStart.tl.x + dx, y: markersAtDragStart.tl.y + dy },
        tr: { x: markersAtDragStart.tr.x + dx, y: markersAtDragStart.tr.y + dy },
        bl: { x: markersAtDragStart.bl.x + dx, y: markersAtDragStart.bl.y + dy },
        br: { x: markersAtDragStart.br.x + dx, y: markersAtDragStart.br.y + dy },
      });
    } else {
      // Move single marker
      setMarkers({
        ...markersAtDragStart,
        [dragging]: { x: markersAtDragStart[dragging].x + dx, y: markersAtDragStart[dragging].y + dy },
      });
    }
  }, [dragging, dragStart, markersAtDragStart]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setDragStart(null);
    setMarkersAtDragStart(null);
  }, []);

  // Add/remove global mouse handlers
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Scale overlay (zoom in/out)
  const handleScale = (factor: number) => {
    const centerX = (markers.tl.x + markers.tr.x + markers.bl.x + markers.br.x) / 4;
    const centerY = (markers.tl.y + markers.tr.y + markers.bl.y + markers.br.y) / 4;

    setMarkers({
      tl: { x: centerX + (markers.tl.x - centerX) * factor, y: centerY + (markers.tl.y - centerY) * factor },
      tr: { x: centerX + (markers.tr.x - centerX) * factor, y: centerY + (markers.tr.y - centerY) * factor },
      bl: { x: centerX + (markers.bl.x - centerX) * factor, y: centerY + (markers.bl.y - centerY) * factor },
      br: { x: centerX + (markers.br.x - centerX) * factor, y: centerY + (markers.br.y - centerY) * factor },
    });
  };

  const handleConfirm = () => {
    // Convert to normalized coordinates (0-1)
    const normalizedMarkers: OverlayMarkers = {
      tl: { x: markers.tl.x / imageSize.width, y: markers.tl.y / imageSize.height },
      tr: { x: markers.tr.x / imageSize.width, y: markers.tr.y / imageSize.height },
      bl: { x: markers.bl.x / imageSize.width, y: markers.bl.y / imageSize.height },
      br: { x: markers.br.x / imageSize.width, y: markers.br.y / imageSize.height },
    };
    onConfirm(normalizedMarkers);
  };

  const bubbles = bubblePositions();

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Перетащите углы для коррекции перспективы. Двигайте оверлей целиком кликая по синей области.
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleScale(0.95)}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            −
          </button>
          <button
            onClick={() => handleScale(1.05)}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            +
          </button>
        </div>
      </div>

      {/* Image with overlay */}
      <div
        ref={containerRef}
        className="relative select-none overflow-hidden bg-gray-200 dark:bg-gray-900 rounded-lg"
        style={{ width: imageSize.width || 'auto', height: imageSize.height || 'auto' }}
      >
        {/* Background image */}
        <img
          src={imageUrl}
          alt="Scan"
          style={{ width: imageSize.width, height: imageSize.height }}
          className="block"
          draggable={false}
        />

        {/* SVG Overlay */}
        {imageSize.width > 0 && (
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            width={imageSize.width}
            height={imageSize.height}
            style={{ pointerEvents: 'none' }}
          >
            {/* Bubbles with LOCAL radius (varies due to perspective!) */}
            {bubbles.map(({ questionIndex, optionIndex, x, y, radius }) => (
              <circle
                key={`${questionIndex}-${optionIndex}`}
                cx={x}
                cy={y}
                r={radius}
                fill="none"
                stroke="rgba(59, 130, 246, 0.6)"
                strokeWidth={1.5}
              />
            ))}

            {/* Connection lines between markers */}
            <line x1={markers.tl.x} y1={markers.tl.y} x2={markers.tr.x} y2={markers.tr.y} stroke="rgba(239, 68, 68, 0.5)" strokeWidth={2} />
            <line x1={markers.tr.x} y1={markers.tr.y} x2={markers.br.x} y2={markers.br.y} stroke="rgba(239, 68, 68, 0.5)" strokeWidth={2} />
            <line x1={markers.br.x} y1={markers.br.y} x2={markers.bl.x} y2={markers.bl.y} stroke="rgba(239, 68, 68, 0.5)" strokeWidth={2} />
            <line x1={markers.bl.x} y1={markers.bl.y} x2={markers.tl.x} y2={markers.tl.y} stroke="rgba(239, 68, 68, 0.5)" strokeWidth={2} />
          </svg>
        )}

        {/* Draggable area for moving entire overlay */}
        {imageSize.width > 0 && (
          <div
            className="absolute cursor-move"
            style={{
              left: Math.min(markers.tl.x, markers.bl.x),
              top: Math.min(markers.tl.y, markers.tr.y),
              width: Math.max(markers.tr.x, markers.br.x) - Math.min(markers.tl.x, markers.bl.x),
              height: Math.max(markers.bl.y, markers.br.y) - Math.min(markers.tl.y, markers.tr.y),
              background: 'rgba(59, 130, 246, 0.1)',
            }}
            onMouseDown={(e) => handleMouseDown(e)}
          />
        )}

        {/* Corner markers (draggable) */}
        {imageSize.width > 0 && (
          <>
            {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
              <div
                key={corner}
                className="absolute w-6 h-6 bg-red-500 border-2 border-red-700 cursor-grab active:cursor-grabbing rounded-sm flex items-center justify-center text-white text-xs font-bold shadow-lg"
                style={{
                  left: markers[corner].x - 12,
                  top: markers[corner].y - 12,
                  zIndex: 10,
                }}
                onMouseDown={(e) => handleMouseDown(e, corner)}
              >
                {corner.toUpperCase()}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Отмена
        </button>
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Сканировать
        </button>
      </div>
    </div>
  );
}
