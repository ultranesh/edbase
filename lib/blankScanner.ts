import jsQR from 'jsqr';

// ============================================================================
// BLANK LAYOUT SPECIFICATION
// ============================================================================

/**
 * Спецификация бланка ответов
 *
 * Все пропорции вычислены из PDF CSS (route.ts):
 *
 * Страница A4: 210mm × 297mm
 * Маркеры: 8mm × 8mm, на 5mm от края, центры: (9, 9), (201, 9), (9, 288), (201, 288)
 *
 * Координатная система (0-1):
 * - Начало (0,0) = центр верхнего левого маркера (9mm, 9mm)
 * - Конец (1,1) = центр нижнего правого маркера (201mm, 288mm)
 * - X диапазон: 192mm (201-9)
 * - Y диапазон: 279mm (288-9)
 *
 * Расчёты пропорций:
 * - Content left: 18mm от края → (18-9)/192 = 0.047
 * - Grid top: ~51mm от верха (header+form) → (51-9)/279 = 0.15
 * - Gap: 5mm из 174mm контента = 0.029 от ширины грида
 * - Number col: 8mm из 84.5mm половины = 0.095 от halfWidth
 * - Bubble: 5.5mm диаметр, радиус 2.75mm → 2.75/192 = 0.014
 */
export const BLANK_SPEC = {
  table: {
    maxRows: 30,
    columns: 2,
    options: 5,
  },

  // Пропорции (0-1) относительно прямоугольника между ЦЕНТРАМИ маркеров
  // Точно вычислено из PDF CSS - см. комментарий выше

  grid: {
    // Вертикальные границы (0 = верхние маркеры, 1 = нижние маркеры)
    // Вычислено из PDF CSS: header+form ~35mm, grid starts at ~51mm from page top
    // (51-9)/279 = 0.15 где 9mm = центр верхнего маркера, 279mm = Y диапазон между маркерами
    top: 0.15,
    bottom: 0.90,   // среднее между 0.88 (вверх) и 0.92 (вниз)

    // Горизонтальные границы (0 = левые маркеры, 1 = правые маркеры)
    // Content starts at 18mm from page edge, marker center at 9mm
    // (18-9)/192 = 0.047, (192-9)/192 = 0.953
    left: 0.047,
    right: 0.953,

    // Gap между колонками: увеличен для правильного позиционирования правой колонки
    gap: 0.045,

    // Колонка номеров: увеличено для сдвига кружков вправо
    numberColumnRatio: 0.15,

    // Размер кружка: 5.5mm диаметр, радиус 2.75mm, 2.75/192 = 0.014
    bubbleRadius: 0.014,
  },

  // Legacy (для fallback без калибровки)
  layout: {
    contentLeft: 0.047,
    contentRight: 0.953,
    gridTop: 0.15,
    gridBottom: 0.90,
    columnGap: 0.045,
    numberColumnWidth: 0.15,
  },
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface GridBoundsRatio {
  topRatio: number;
  bottomRatio: number;
  leftRatio: number;
  rightRatio: number;
  centerGapRatio: number;
  // Calibration marker positions (where user clicked)
  markers?: {
    tl: { x: number; y: number };
    tr: { x: number; y: number };
    bl: { x: number; y: number };
    br: { x: number; y: number };
  };
}

export interface ScanResult {
  success: boolean;
  testId?: string;
  answers: (number | null)[];
  confidence: number;
  error?: string;
  gridBoundsRatio?: GridBoundsRatio;
  debug?: {
    qrFound: boolean;
    markersFound: boolean;
    pageCorners: { tl: Point; tr: Point; bl: Point; br: Point } | null;
    perspectiveCorrected: boolean;
    // AI hybrid fields
    aiMarkers?: {
      topLeft: { x: number; y: number };
      topRight: { x: number; y: number };
      bottomLeft: { x: number; y: number };
      bottomRight: { x: number; y: number };
    };
    aiGridBounds?: GridBoundsRatio;
    aiRaw?: string;
    aiDebug?: unknown;
  };
}

interface Point {
  x: number;
  y: number;
}

interface PageCorners {
  tl: Point; // top-left
  tr: Point; // top-right
  bl: Point; // bottom-left
  br: Point; // bottom-right
}

// ============================================================================
// HOMOGRAPHY TRANSFORMATION (Perspective Transform)
// ============================================================================

/**
 * Compute 3x3 homography matrix from 4 source points to 4 destination points.
 * This allows mapping any point from the "ideal" PDF coordinate space
 * to the "real" photo coordinate space based on the 4 marker positions.
 *
 * Uses Direct Linear Transform (DLT) algorithm with NORMALIZATION for numerical stability.
 * This is crucial when dealing with perspective distortion (trapezoid shapes).
 */
function computeHomography(
  src: [Point, Point, Point, Point],  // Source points (ideal PDF markers)
  dst: [Point, Point, Point, Point]   // Destination points (clicked markers)
): number[] | null {
  // Step 1: Normalize source and destination points for numerical stability
  const { normalized: srcNorm, T: Tsrc } = normalizePoints(src);
  const { normalized: dstNorm, T: Tdst } = normalizePoints(dst);

  // Build the 8x9 matrix for DLT using NORMALIZED points
  const A: number[][] = [];

  for (let i = 0; i < 4; i++) {
    const sx = srcNorm[i].x, sy = srcNorm[i].y;
    const dx = dstNorm[i].x, dy = dstNorm[i].y;

    A.push([-sx, -sy, -1, 0, 0, 0, sx * dx, sy * dx, dx]);
    A.push([0, 0, 0, -sx, -sy, -1, sx * dy, sy * dy, dy]);
  }

  // Solve using Gaussian elimination
  const hNorm = solveHomography(A);
  if (!hNorm) return null;

  // Step 2: Denormalize the homography matrix
  // H = Tdst_inv * Hnorm * Tsrc
  const Hnorm = [
    [hNorm[0], hNorm[1], hNorm[2]],
    [hNorm[3], hNorm[4], hNorm[5]],
    [hNorm[6], hNorm[7], hNorm[8]],
  ];

  const TdstInv = invertNormMatrix(Tdst);
  const H = multiplyMatrices(multiplyMatrices(TdstInv, Hnorm), Tsrc);

  // Flatten back to array
  return [H[0][0], H[0][1], H[0][2], H[1][0], H[1][1], H[1][2], H[2][0], H[2][1], H[2][2]];
}

/**
 * Normalize points by centering and scaling.
 * Returns normalized points and the transformation matrix T.
 */
function normalizePoints(points: Point[]): { normalized: Point[]; T: number[][] } {
  // Calculate centroid
  let cx = 0, cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  cx /= points.length;
  cy /= points.length;

  // Calculate average distance from centroid
  let avgDist = 0;
  for (const p of points) {
    avgDist += Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
  }
  avgDist /= points.length;

  // Scale factor: we want average distance to be sqrt(2)
  const scale = avgDist > 0.0001 ? Math.sqrt(2) / avgDist : 1;

  // Normalization matrix T
  const T = [
    [scale, 0, -scale * cx],
    [0, scale, -scale * cy],
    [0, 0, 1],
  ];

  // Normalize points
  const normalized = points.map(p => ({
    x: scale * (p.x - cx),
    y: scale * (p.y - cy),
  }));

  return { normalized, T };
}

/**
 * Invert a 3x3 normalization matrix (which has a special structure).
 */
function invertNormMatrix(T: number[][]): number[][] {
  const s = T[0][0]; // scale
  const tx = T[0][2];
  const ty = T[1][2];

  return [
    [1 / s, 0, -tx / s],
    [0, 1 / s, -ty / s],
    [0, 0, 1],
  ];
}

/**
 * Multiply two 3x3 matrices.
 */
function multiplyMatrices(A: number[][], B: number[][]): number[][] {
  const result: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return result;
}

/**
 * Solve the homography system using Gaussian elimination.
 * Returns the 9-element homography vector [h11, h12, h13, h21, h22, h23, h31, h32, h33]
 */
function solveHomography(A: number[][]): number[] | null {
  const n = 9;
  const m = 8;

  // Augment A with an identity-like structure for solving
  // We'll find the solution where h33 = 1 (normalized)

  // Create augmented matrix [A | 0] and solve A * h = 0
  // We use the constraint h33 = 1 to make it solvable

  // Rearrange to solve for h1-h8 given h9=1
  // Each row: -sx*h1 - sy*h2 - h3 + sx*dx*h7 + sy*dx*h8 + dx*h9 = 0
  // Rearrange: -sx*h1 - sy*h2 - h3 + sx*dx*h7 + sy*dx*h8 = -dx

  const B: number[][] = [];
  const c: number[] = [];

  for (let i = 0; i < m; i++) {
    B.push(A[i].slice(0, 8));
    c.push(-A[i][8]);
  }

  // Solve B * h[0:8] = c using Gaussian elimination with partial pivoting
  const solution = gaussianElimination(B, c);
  if (!solution) return null;

  // h33 = 1
  return [...solution, 1];
}

/**
 * Gaussian elimination with partial pivoting to solve Ax = b
 */
function gaussianElimination(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const m = A[0].length;

  // Create augmented matrix
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  // Forward elimination
  for (let col = 0; col < Math.min(n, m); col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }

    // Swap rows
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    if (Math.abs(aug[col][col]) < 1e-10) continue; // Skip near-zero pivot

    // Eliminate
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= m; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution
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

/**
 * Transform a point using the homography matrix.
 * H is a 9-element array [h11, h12, h13, h21, h22, h23, h31, h32, h33]
 */
function transformPoint(p: Point, H: number[]): Point {
  const [h11, h12, h13, h21, h22, h23, h31, h32, h33] = H;

  const w = h31 * p.x + h32 * p.y + h33;
  const x = (h11 * p.x + h12 * p.y + h13) / w;
  const y = (h21 * p.x + h22 * p.y + h23) / w;

  return { x, y };
}

/**
 * PDF exact measurements in mm - MUST MATCH InteractiveOverlay.tsx exactly!
 */
const PDF_MEASUREMENTS = {
  // A4 page
  pageWidth: 210,
  pageHeight: 297,

  // Markers: 8mm squares at 5mm from edges, so centers at 9mm from edges
  markerSize: 8,
  markerEdgeOffset: 5,

  // Content area
  contentLeft: 18,
  contentRight: 192,
  contentTop: 16,
  contentBottom: 281,

  // Grid layout
  headerHeight: 31,  // MUST MATCH InteractiveOverlay!
  gridHeaderRow: 7,
  rowHeight: 7,
  maxRows: 30,

  // FIXED column widths (from PDF CSS table-layout: fixed)
  gapWidth: 5,
  numColumnWidth: 7,
  cellColumnWidth: 15.5,

  // Bubbles
  bubbleSize: 5.5,
};

/**
 * Calculate marker rectangle (the reference frame for normalized coordinates)
 */
function getMarkerRect() {
  const m = PDF_MEASUREMENTS;
  const markerCenterOffset = m.markerEdgeOffset + m.markerSize / 2; // 9mm

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
 * Получить позиции всех кружков как ПРОПОРЦИИ (0-1) относительно области между маркерами.
 * ВАЖНО: Эта функция должна давать ТОЧНО такие же позиции как InteractiveOverlay.tsx!
 */
function getIdealBubblePositions(): { questionIndex: number; optionIndex: number; point: Point }[] {
  const m = PDF_MEASUREMENTS;
  const bubbles: { questionIndex: number; optionIndex: number; point: Point }[] = [];

  // Vertical: first data row starts at content top + header + grid header
  const gridDataTop = m.contentTop + m.headerHeight + m.gridHeaderRow; // 16 + 31 + 7 = 54mm

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
 * Get bubble radius in normalized coordinates (0-1 relative to marker rect width)
 * MUST MATCH InteractiveOverlay.tsx!
 */
function getNormalizedBubbleRadius(): number {
  const m = PDF_MEASUREMENTS;
  const rect = getMarkerRect();
  // Bubble diameter is 5.5mm, radius is 2.75mm
  return (m.bubbleSize / 2) / rect.width;
}

/**
 * "Идеальные" позиции маркеров = углы единичного квадрата.
 * (0,0) = TL, (1,0) = TR, (0,1) = BL, (1,1) = BR
 */
function getIdealMarkerPositions(): [Point, Point, Point, Point] {
  return [
    { x: 0, y: 0 },  // top-left
    { x: 1, y: 0 },  // top-right
    { x: 0, y: 1 },  // bottom-left
    { x: 1, y: 1 },  // bottom-right
  ];
}

interface ProcessedImage {
  imageData: ImageData;
  grayData: Uint8Array;
  binaryData: Uint8Array;
  threshold: number;
  width: number;
  height: number;
}

// ============================================================================
// MAIN SCAN FUNCTION
// ============================================================================

export async function scanBlank(
  imageSource: File | HTMLCanvasElement | ImageData,
  knownTestId?: string,
  overrideGridBounds?: GridBoundsRatio
): Promise<ScanResult> {
  try {
    console.log('[Scanner] === SCAN START ===');
    console.log('[Scanner] Source type:', imageSource instanceof File ? `File: ${(imageSource as File).name}, ${(imageSource as File).size} bytes` : 'Canvas/ImageData');

    // Step 1: Загрузка изображения
    const imageData = await getImageData(imageSource);
    console.log('[Scanner] Image loaded:', imageData.width, 'x', imageData.height);

    let processed = preprocessImage(imageData);
    console.log('[Scanner] Preprocessed, threshold:', processed.threshold);

    // Step 2: Поиск QR-кода
    let qrResult = findQRCode(processed);
    let rotation = 0;

    if (!qrResult) {
      for (const rot of [90, 180, 270]) {
        const rotated = rotateImage(imageData, rot);
        const rotatedProcessed = preprocessImage(rotated);
        qrResult = findQRCode(rotatedProcessed);
        if (qrResult) {
          processed = rotatedProcessed;
          rotation = rot;
          break;
        }
      }
    }

    const testId = qrResult || knownTestId;
    if (!testId) {
      return {
        success: false,
        answers: [],
        confidence: 0,
        error: 'QR код табылмады',
        debug: { qrFound: false, markersFound: false, pageCorners: null, perspectiveCorrected: false },
      };
    }

    // Step 3: Найти угловые маркеры и получить ВНЕШНИЕ углы страницы
    const pageCorners = findPageCorners(processed);
    let markersFound = !!pageCorners;
    let perspectiveCorrected = false;

    let finalProcessed: ReturnType<typeof preprocessImage>;
    let pageWidth: number;
    let pageHeight: number;

    if (pageCorners) {
      // Step 4: Коррекция перспективы - приводим к прямоугольнику
      const correctedResult = correctPerspective(processed.imageData, pageCorners);
      if (correctedResult) {
        finalProcessed = preprocessImage(correctedResult.imageData);
        pageWidth = correctedResult.width;
        pageHeight = correctedResult.height;
        perspectiveCorrected = true;
      } else {
        // Fallback: use original image without perspective correction
        console.log('[Scanner] Perspective correction failed, using original image');
        finalProcessed = processed;
        pageWidth = imageData.width;
        pageHeight = imageData.height;
      }
    } else {
      // No markers found - use original image with fixed proportions
      console.log('[Scanner] Markers not found, using original image with fixed proportions');
      finalProcessed = processed;
      pageWidth = imageData.width;
      pageHeight = imageData.height;
    }

    // Step 5: Вычислить позиции сетки
    // Используем AI-детектированные границы если они есть, иначе фиксированные пропорции
    const gridBoundsRatio: GridBoundsRatio = overrideGridBounds || {
      topRatio: BLANK_SPEC.layout.gridTop,
      bottomRatio: BLANK_SPEC.layout.gridBottom,
      leftRatio: BLANK_SPEC.layout.contentLeft,
      rightRatio: BLANK_SPEC.layout.contentRight,
      centerGapRatio: BLANK_SPEC.layout.columnGap,
    };

    // Step 6: Детектировать заполненные бабблы
    // ВАЖНО: Если есть калиброванные маркеры - используем гомографию!
    let answers: (number | null)[];

    if (overrideGridBounds?.markers) {
      // Homography-based detection using calibrated markers
      // ВАЖНО: Используем ОРИГИНАЛЬНОЕ изображение (processed), а не finalProcessed!
      // Маркеры были откалиброваны для оригинального изображения,
      // а гомография сама обрабатывает перспективу математически.
      console.log('[Scanner] Using CALIBRATED homography detection');
      console.log('[Scanner] Using ORIGINAL image size:', processed.width, 'x', processed.height);
      answers = detectBubblesWithHomography(processed, overrideGridBounds.markers);
    } else {
      // Fallback: legacy ratio-based detection
      console.log('[Scanner] Using LEGACY ratio-based detection');
      const gridBounds = calculateGridFromPageWithRatios(pageWidth, pageHeight, gridBoundsRatio);
      answers = detectBubbles(finalProcessed, gridBounds);
    }

    return {
      success: true,
      testId,
      answers,
      confidence: calculateConfidence(answers),
      gridBoundsRatio,
      debug: {
        qrFound: true,
        markersFound,
        pageCorners: pageCorners || null,
        perspectiveCorrected,
      },
    };
  } catch (error) {
    console.error('Scan error:', error);
    return {
      success: false,
      answers: [],
      confidence: 0,
      error: error instanceof Error ? error.message : 'Белгісіз қате',
    };
  }
}

// ============================================================================
// IMAGE LOADING & PREPROCESSING
// ============================================================================

function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return type.includes('heic') || type.includes('heif') ||
         name.endsWith('.heic') || name.endsWith('.heif');
}

async function convertHeicToJpeg(file: File): Promise<Blob> {
  try {
    console.log('[HEIC] Converting HEIC file:', file.name, 'size:', file.size);
    const heic2any = (await import('heic2any')).default;
    console.log('[HEIC] heic2any loaded successfully');
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    console.log('[HEIC] Conversion successful');
    return Array.isArray(result) ? result[0] : result;
  } catch (error) {
    console.error('[HEIC] Conversion failed:', error);
    throw new Error(`HEIC конвертация сәтсіз: ${error instanceof Error ? error.message : 'Белгісіз қате'}`);
  }
}

async function getImageData(source: File | HTMLCanvasElement | ImageData): Promise<ImageData> {
  if (source instanceof ImageData) return source;

  if (source instanceof HTMLCanvasElement) {
    const ctx = source.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    return ctx.getImageData(0, 0, source.width, source.height);
  }

  let fileToProcess: File | Blob = source;
  const isHeic = isHeicFile(source);

  if (isHeic) {
    console.log('[Scanner] Detected HEIC file:', source.name);
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Файл оқылмады'));
    reader.readAsDataURL(fileToProcess);
  });

  // Try to load image - some browsers (Safari) support HEIC natively
  const tryLoadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
    });
  };

  let img: HTMLImageElement;
  try {
    img = await tryLoadImage(dataUrl);
    console.log('[Scanner] Image loaded natively, size:', img.width, 'x', img.height);
  } catch {
    // Native load failed - try HEIC conversion if it's a HEIC file
    if (isHeic) {
      console.log('[Scanner] Native HEIC load failed, trying heic2any conversion...');
      try {
        fileToProcess = await convertHeicToJpeg(source);
        console.log('[Scanner] HEIC converted, new size:', fileToProcess.size);

        const convertedDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Конвертацияланған файл оқылмады'));
          reader.readAsDataURL(fileToProcess);
        });

        img = await tryLoadImage(convertedDataUrl);
        console.log('[Scanner] Converted image loaded, size:', img.width, 'x', img.height);
      } catch (heicError) {
        console.error('[Scanner] HEIC conversion failed:', heicError);
        throw new Error('HEIC файлын ашу мүмкін болмады. JPG немесе PNG форматында жүктеңіз.');
      }
    } else {
      throw new Error('Сурет жүктелмеді');
    }
  }

  // Process the loaded image
  const maxSize = 2000;
  const minSize = 800;
  let { width, height } = img;

  if (width > maxSize || height > maxSize) {
    const ratio = Math.min(maxSize / width, maxSize / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }
  if (width < minSize && height < minSize) {
    const ratio = minSize / Math.min(width, height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function preprocessImage(imageData: ImageData): ProcessedImage {
  const { width, height, data } = imageData;
  const grayData = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    grayData[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  const threshold = calculateOtsuThreshold(grayData);
  const binaryData = new Uint8Array(width * height);
  for (let i = 0; i < grayData.length; i++) {
    binaryData[i] = grayData[i] < threshold ? 1 : 0;
  }

  return { imageData, grayData, binaryData, threshold, width, height };
}

function calculateOtsuThreshold(grayData: Uint8Array): number {
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < grayData.length; i++) {
    histogram[grayData[i]]++;
  }

  const total = grayData.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0, wB = 0, wF = 0, maxVariance = 0, threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;
    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  // Для фотографий используем более низкий порог (меньше чёрного)
  return Math.min(threshold, 180);
}

function rotateImage(imageData: ImageData, degrees: number): ImageData {
  const { width, height, data } = imageData;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  if (degrees === 90 || degrees === 270) {
    canvas.width = height;
    canvas.height = width;
  } else {
    canvas.width = width;
    canvas.height = height;
  }

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;
  const tempImageData = tempCtx.createImageData(width, height);
  tempImageData.data.set(data);
  tempCtx.putImageData(tempImageData, 0, 0);

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(tempCanvas, -width / 2, -height / 2);

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// ============================================================================
// QR CODE DETECTION
// ============================================================================

function findQRCode(processed: ProcessedImage): string | null {
  const { imageData, width, height } = processed;

  // Try original
  let code = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
  if (code?.data) return code.data;

  // Try specific regions where QR is likely to be
  const regions = [
    { x: width * 0.7, y: 0, w: width * 0.3, h: height * 0.2 },
    { x: 0, y: 0, w: width * 0.3, h: height * 0.2 },
  ];

  for (const region of regions) {
    const regionData = extractRegion(imageData, region.x, region.y, region.w, region.h);
    if (regionData) {
      code = jsQR(regionData.data, regionData.width, regionData.height, { inversionAttempts: 'attemptBoth' });
      if (code?.data) return code.data;
    }
  }

  return null;
}

function extractRegion(imageData: ImageData, startX: number, startY: number, width: number, height: number): ImageData | null {
  const x = Math.floor(startX);
  const y = Math.floor(startY);
  const w = Math.floor(width);
  const h = Math.floor(height);
  if (w <= 0 || h <= 0) return null;

  const regionData = new ImageData(w, h);
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const srcIdx = ((y + row) * imageData.width + (x + col)) * 4;
      const dstIdx = (row * w + col) * 4;
      regionData.data[dstIdx] = imageData.data[srcIdx];
      regionData.data[dstIdx + 1] = imageData.data[srcIdx + 1];
      regionData.data[dstIdx + 2] = imageData.data[srcIdx + 2];
      regionData.data[dstIdx + 3] = imageData.data[srcIdx + 3];
    }
  }
  return regionData;
}

// ============================================================================
// MARKER DETECTION - FIND ALL SQUARE MARKERS (ZipGrade style)
// ============================================================================

interface SquareMarker {
  cx: number;  // center X
  cy: number;  // center Y
  x: number;   // top-left X
  y: number;   // top-left Y
  width: number;
  height: number;
  area: number;
}

/**
 * Найти 4 угловых маркера используя поиск квадратных контуров (как ZipGrade)
 * 1. Найти ВСЕ квадратные контуры на изображении
 * 2. Выбрать 4 которые образуют прямоугольник документа
 * 3. Вернуть внешние углы этих маркеров
 */
function findPageCorners(processed: ProcessedImage): PageCorners | null {
  const { binaryData, grayData, width, height } = processed;

  console.log('[Scanner] Looking for square markers, image:', width, 'x', height);

  // Шаг 1: Найти все квадратные маркеры
  const markers = findAllSquareMarkers(binaryData, grayData, width, height);
  console.log('[Scanner] Found', markers.length, 'square markers');

  if (markers.length < 4) {
    console.log('[Scanner] Not enough markers found');
    return null;
  }

  // Шаг 2: Выбрать 4 маркера в углах (самые крайние)
  const corners = select4CornerMarkers(markers, width, height);

  if (!corners) {
    console.log('[Scanner] Could not select 4 corner markers');
    return null;
  }

  console.log('[Scanner] Corner markers selected:', {
    tl: `(${corners.tl.cx}, ${corners.tl.cy})`,
    tr: `(${corners.tr.cx}, ${corners.tr.cy})`,
    bl: `(${corners.bl.cx}, ${corners.bl.cy})`,
    br: `(${corners.br.cx}, ${corners.br.cy})`,
  });

  // Шаг 3: Вернуть ВНЕШНИЕ углы маркеров
  return {
    tl: { x: corners.tl.x, y: corners.tl.y },
    tr: { x: corners.tr.x + corners.tr.width, y: corners.tr.y },
    bl: { x: corners.bl.x, y: corners.bl.y + corners.bl.height },
    br: { x: corners.br.x + corners.br.width, y: corners.br.y + corners.br.height },
  };
}

/**
 * Найти все квадратные маркеры на изображении
 * Ищем по ВСЕМУ изображению, затем фильтруем
 */
function findAllSquareMarkers(data: Uint8Array, grayData: Uint8Array, width: number, height: number): SquareMarker[] {
  const markers: SquareMarker[] = [];
  const visited = new Uint8Array(width * height);

  // Минимальный и максимальный размер маркера (в процентах от меньшей стороны)
  const minSide = Math.min(width, height);
  const minSize = Math.floor(minSide * 0.012); // 1.2% - минимум ~12px на 1000px изображении
  const maxSize = Math.floor(minSide * 0.15);  // 15% - максимум

  console.log('[Scanner] Image size:', width, 'x', height);
  console.log('[Scanner] Marker size range:', minSize, '-', maxSize, 'px');

  // Считаем сколько чёрных пикселей всего (для диагностики)
  let blackCount = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 1) blackCount++;
  }
  console.log('[Scanner] Black pixels:', blackCount, '/', data.length, '=', (blackCount / data.length * 100).toFixed(1) + '%');

  // Сканируем ВСЁ изображение, но с шагом для скорости
  const step = Math.max(1, Math.floor(minSize / 3));
  let totalComponents = 0;
  let tooSmall = 0, tooBig = 0, badAspect = 0, lowDensity = 0, tooBright = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = y * width + x;

      // Пропускаем если уже посещён или не чёрный
      if (visited[idx] || data[idx] !== 1) continue;

      // Flood fill чтобы найти связный компонент
      const component = floodFillComponent(data, visited, width, height, x, y, maxSize * maxSize * 4);

      if (!component) continue;
      totalComponents++;

      const { minX, maxX, minY, maxY, count } = component;
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      const area = w * h;
      const density = count / area;

      // Проверяем критерии квадратного маркера
      if (w < minSize || h < minSize) { tooSmall++; continue; }
      if (w > maxSize || h > maxSize) { tooBig++; continue; }

      // Aspect ratio - квадрат
      const aspectRatio = w / h;
      if (aspectRatio < 0.5 || aspectRatio > 2.0) { badAspect++; continue; }

      // Плотность - заполненный квадрат
      if (density < 0.35) { lowDensity++; continue; }

      // Проверяем что маркер реально чёрный (средняя яркость < 100)
      let sumGray = 0;
      let grayCount = 0;
      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const idx = py * width + px;
          if (data[idx] === 1) {
            sumGray += grayData[idx];
            grayCount++;
          }
        }
      }
      const avgGray = grayCount > 0 ? sumGray / grayCount : 255;
      if (avgGray > 120) { tooBright++; continue; } // Не достаточно чёрный

      markers.push({
        cx: (minX + maxX) / 2,
        cy: (minY + maxY) / 2,
        x: minX,
        y: minY,
        width: w,
        height: h,
        area: count,
      });
    }
  }

  console.log('[Scanner] Components found:', totalComponents);
  console.log('[Scanner] Rejected - tooSmall:', tooSmall, 'tooBig:', tooBig, 'badAspect:', badAspect, 'lowDensity:', lowDensity, 'tooBright:', tooBright);
  console.log('[Scanner] Valid markers:', markers.length);

  // Логируем найденные маркеры
  markers.forEach((m, i) => {
    console.log(`[Scanner] Marker ${i}: pos=(${Math.round(m.cx)}, ${Math.round(m.cy)}) size=${m.width}x${m.height} area=${m.area}`);
  });

  return markers;
}

/**
 * Flood fill для поиска связного компонента
 */
function floodFillComponent(
  data: Uint8Array,
  visited: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  maxPixels: number
): { minX: number; maxX: number; minY: number; maxY: number; count: number } | null {
  const stack: [number, number][] = [[startX, startY]];
  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  let count = 0;

  while (stack.length > 0 && count < maxPixels) {
    const [x, y] = stack.pop()!;
    const idx = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[idx] || data[idx] !== 1) continue;

    visited[idx] = 1;
    count++;

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    // 4-связность
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  if (count === 0) return null;
  return { minX, maxX, minY, maxY, count };
}

/**
 * Выбрать 4 маркера в углах документа
 */
function select4CornerMarkers(
  markers: SquareMarker[],
  imgWidth: number,
  imgHeight: number
): { tl: SquareMarker; tr: SquareMarker; bl: SquareMarker; br: SquareMarker } | null {
  if (markers.length < 4) return null;

  // Сортируем по похожему размеру (маркеры должны быть одинакового размера)
  const avgArea = markers.reduce((s, m) => s + m.area, 0) / markers.length;
  const similarMarkers = markers.filter(m => {
    const ratio = m.area / avgArea;
    return ratio > 0.3 && ratio < 3.0;
  });

  if (similarMarkers.length < 4) {
    console.log('[Scanner] Not enough similar-sized markers');
    return null;
  }

  // Ищем 4 маркера которые образуют прямоугольник
  // Используем простой метод: выбираем маркеры ближайшие к углам изображения
  let tl: SquareMarker | null = null;
  let tr: SquareMarker | null = null;
  let bl: SquareMarker | null = null;
  let br: SquareMarker | null = null;

  let minDistTL = Infinity, minDistTR = Infinity, minDistBL = Infinity, minDistBR = Infinity;

  for (const m of similarMarkers) {
    // Расстояние до углов изображения
    const distTL = Math.sqrt(m.cx * m.cx + m.cy * m.cy);
    const distTR = Math.sqrt((imgWidth - m.cx) ** 2 + m.cy * m.cy);
    const distBL = Math.sqrt(m.cx * m.cx + (imgHeight - m.cy) ** 2);
    const distBR = Math.sqrt((imgWidth - m.cx) ** 2 + (imgHeight - m.cy) ** 2);

    if (distTL < minDistTL) { minDistTL = distTL; tl = m; }
    if (distTR < minDistTR) { minDistTR = distTR; tr = m; }
    if (distBL < minDistBL) { minDistBL = distBL; bl = m; }
    if (distBR < minDistBR) { minDistBR = distBR; br = m; }
  }

  if (!tl || !tr || !bl || !br) return null;

  // Проверяем что это разные маркеры
  const unique = new Set([tl, tr, bl, br]);
  if (unique.size !== 4) {
    console.log('[Scanner] Corner markers overlap');
    return null;
  }

  // Проверяем что маркеры образуют разумный прямоугольник
  const topWidth = tr.cx - tl.cx;
  const bottomWidth = br.cx - bl.cx;
  const leftHeight = bl.cy - tl.cy;
  const rightHeight = br.cy - tr.cy;

  // Ширина и высота должны быть положительными и близкими
  if (topWidth < imgWidth * 0.3 || bottomWidth < imgWidth * 0.3) {
    console.log('[Scanner] Document too narrow');
    return null;
  }
  if (leftHeight < imgHeight * 0.3 || rightHeight < imgHeight * 0.3) {
    console.log('[Scanner] Document too short');
    return null;
  }

  // Соотношение сторон не должно сильно отличаться
  const widthRatio = topWidth / bottomWidth;
  const heightRatio = leftHeight / rightHeight;
  if (widthRatio < 0.7 || widthRatio > 1.4 || heightRatio < 0.7 || heightRatio > 1.4) {
    console.log('[Scanner] Document shape too skewed');
    return null;
  }

  return { tl, tr, bl, br };
}

// ============================================================================
// PERSPECTIVE CORRECTION
// ============================================================================

interface CorrectedImage {
  imageData: ImageData;
  width: number;
  height: number;
}

/**
 * Исправить перспективу - преобразовать 4 угла в прямоугольник
 */
function correctPerspective(imageData: ImageData, corners: PageCorners): CorrectedImage | null {
  try {
    const { width: srcWidth, height: srcHeight, data: srcData } = imageData;

    // Вычисляем размеры результата
    const topWidth = Math.sqrt(
      Math.pow(corners.tr.x - corners.tl.x, 2) + Math.pow(corners.tr.y - corners.tl.y, 2)
    );
    const bottomWidth = Math.sqrt(
      Math.pow(corners.br.x - corners.bl.x, 2) + Math.pow(corners.br.y - corners.bl.y, 2)
    );
    const leftHeight = Math.sqrt(
      Math.pow(corners.bl.x - corners.tl.x, 2) + Math.pow(corners.bl.y - corners.tl.y, 2)
    );
    const rightHeight = Math.sqrt(
      Math.pow(corners.br.x - corners.tr.x, 2) + Math.pow(corners.br.y - corners.tr.y, 2)
    );

    const dstWidth = Math.round(Math.max(topWidth, bottomWidth));
    const dstHeight = Math.round(Math.max(leftHeight, rightHeight));

    if (dstWidth < 100 || dstHeight < 100) {
      return null;
    }

    // Создаём результат
    const canvas = document.createElement('canvas');
    canvas.width = dstWidth;
    canvas.height = dstHeight;
    const ctx = canvas.getContext('2d')!;
    const dstImageData = ctx.createImageData(dstWidth, dstHeight);
    const dstData = dstImageData.data;

    // Билинейная интерполяция для каждого пикселя
    for (let dstY = 0; dstY < dstHeight; dstY++) {
      for (let dstX = 0; dstX < dstWidth; dstX++) {
        // Нормализованные координаты в результате
        const u = dstX / (dstWidth - 1);
        const v = dstY / (dstHeight - 1);

        // Билинейная интерполяция в исходном изображении
        const topX = corners.tl.x + u * (corners.tr.x - corners.tl.x);
        const topY = corners.tl.y + u * (corners.tr.y - corners.tl.y);
        const bottomX = corners.bl.x + u * (corners.br.x - corners.bl.x);
        const bottomY = corners.bl.y + u * (corners.br.y - corners.bl.y);

        const srcX = topX + v * (bottomX - topX);
        const srcY = topY + v * (bottomY - topY);

        // Получаем цвет пикселя (билинейная интерполяция)
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = Math.min(x0 + 1, srcWidth - 1);
        const y1 = Math.min(y0 + 1, srcHeight - 1);

        if (x0 < 0 || y0 < 0 || x0 >= srcWidth || y0 >= srcHeight) {
          continue;
        }

        const fx = srcX - x0;
        const fy = srcY - y0;

        const dstIdx = (dstY * dstWidth + dstX) * 4;

        for (let c = 0; c < 4; c++) {
          const v00 = srcData[(y0 * srcWidth + x0) * 4 + c];
          const v10 = srcData[(y0 * srcWidth + x1) * 4 + c];
          const v01 = srcData[(y1 * srcWidth + x0) * 4 + c];
          const v11 = srcData[(y1 * srcWidth + x1) * 4 + c];

          const value =
            v00 * (1 - fx) * (1 - fy) +
            v10 * fx * (1 - fy) +
            v01 * (1 - fx) * fy +
            v11 * fx * fy;

          dstData[dstIdx + c] = Math.round(value);
        }
      }
    }

    ctx.putImageData(dstImageData, 0, 0);

    return {
      imageData: ctx.getImageData(0, 0, dstWidth, dstHeight),
      width: dstWidth,
      height: dstHeight,
    };
  } catch (error) {
    console.error('Perspective correction error:', error);
    return null;
  }
}

// ============================================================================
// GRID CALCULATION
// ============================================================================

interface GridBounds {
  // Границы области данных таблицы
  gridTop: number;
  gridBottom: number;
  gridLeft: number;
  gridRight: number;
  // Параметры
  columnWidth: number;
  rowHeight: number;
  centerGap: number;
  numberColumnWidth: number;
}

/**
 * Вычислить позиции сетки на основе фиксированных пропорций
 */
function calculateGridFromPage(pageWidth: number, pageHeight: number): GridBounds {
  return calculateGridFromPageWithRatios(pageWidth, pageHeight, {
    topRatio: BLANK_SPEC.layout.gridTop,
    bottomRatio: BLANK_SPEC.layout.gridBottom,
    leftRatio: BLANK_SPEC.layout.contentLeft,
    rightRatio: BLANK_SPEC.layout.contentRight,
    centerGapRatio: BLANK_SPEC.layout.columnGap,
  });
}

/**
 * Вычислить позиции сетки на основе указанных пропорций (для гибридного сканирования)
 */
function calculateGridFromPageWithRatios(
  pageWidth: number,
  pageHeight: number,
  ratios: GridBoundsRatio
): GridBounds {
  const gridLeft = pageWidth * ratios.leftRatio;
  const gridRight = pageWidth * ratios.rightRatio;
  const gridTop = pageHeight * ratios.topRatio;
  const gridBottom = pageHeight * ratios.bottomRatio;

  const contentWidth = gridRight - gridLeft;
  const gridHeight = gridBottom - gridTop;

  const centerGap = contentWidth * (ratios.centerGapRatio || BLANK_SPEC.layout.columnGap);
  const columnWidth = (contentWidth - centerGap) / 2;
  const numberColumnWidth = columnWidth * BLANK_SPEC.layout.numberColumnWidth;
  const rowHeight = gridHeight / BLANK_SPEC.table.maxRows;

  console.log('[Scanner] Grid calculated with ratios:', {
    pageWidth, pageHeight,
    gridTop, gridBottom, gridLeft, gridRight,
    columnWidth, rowHeight, centerGap,
    ratios
  });

  return {
    gridTop,
    gridBottom,
    gridLeft,
    gridRight,
    columnWidth,
    rowHeight,
    centerGap,
    numberColumnWidth,
  };
}

// ============================================================================
// BUBBLE DETECTION
// ============================================================================

/**
 * Детектировать заполненные бабблы
 */
function detectBubbles(processed: ProcessedImage, bounds: GridBounds): (number | null)[] {
  const { grayData, width, threshold } = processed;
  const answers: (number | null)[] = [];

  const optionsCount = BLANK_SPEC.table.options;
  const bubbleAreaWidth = bounds.columnWidth - bounds.numberColumnWidth;
  const optionWidth = bubbleAreaWidth / optionsCount;

  // Обрабатываем обе колонки
  for (let col = 0; col < 2; col++) {
    const colStartX = col === 0
      ? bounds.gridLeft
      : bounds.gridLeft + bounds.columnWidth + bounds.centerGap;

    for (let row = 0; row < BLANK_SPEC.table.maxRows; row++) {
      const rowCenterY = bounds.gridTop + (row + 0.5) * bounds.rowHeight;
      const bubbleHeight = bounds.rowHeight * 0.7;
      const bubbleTop = rowCenterY - bubbleHeight / 2;

      // Измеряем заполненность каждого бабла
      const fillRatios: number[] = [];

      for (let opt = 0; opt < optionsCount; opt++) {
        const bubbleCenterX = colStartX + bounds.numberColumnWidth + (opt + 0.5) * optionWidth;
        const bubbleWidth = optionWidth * 0.6;
        const bubbleLeft = bubbleCenterX - bubbleWidth / 2;

        const fillRatio = measureBubbleFill(
          grayData, width,
          bubbleLeft, bubbleTop,
          bubbleWidth, bubbleHeight,
          threshold
        );
        fillRatios.push(fillRatio);
      }

      // Определяем ответ
      const answer = determineAnswer(fillRatios);
      answers.push(answer);
    }
  }

  return answers;
}

/**
 * Измерить заполненность кружка используя ДВА метода:
 * 1. Средняя яркость (mean) - закрашенный кружок ТЕМНЕЕ
 * 2. Dark pixel ratio с АДАПТИВНЫМ порогом
 *
 * Ключевое отличие от предыдущей версии:
 * - НЕ используем глобальный Otsu порог (он плохо работает при неравномерном освещении)
 * - Используем СРЕДНЮЮ ЯРКОСТЬ для сравнения кружков между собой
 * - Закрашенный кружок имеет МЕНЬШУЮ среднюю яркость (темнее)
 *
 * Этот подход основан на исследовании PMC6226159 которое показало 99.94% точность
 * используя dual-parameter validation (pixel count + pixel sum)
 */
function measureBubbleFillWithGlobalThreshold(
  grayData: Uint8Array,
  imageWidth: number,
  imageHeight: number,
  cx: number, cy: number,
  radius: number,
  _globalThreshold: number // Не используем глобальный порог!
): { fillRatio: number; darkCount: number; totalCount: number; mean: number } {
  // Sample area - круговая область ВНУТРИ кружка
  // Используем 75% радиуса - немного больше чем раньше (65%) для лучшего захвата
  // при небольших смещениях центра
  const sampleRadius = radius * 0.75;

  const startX = Math.max(0, Math.floor(cx - sampleRadius));
  const startY = Math.max(0, Math.floor(cy - sampleRadius));
  const endX = Math.min(imageWidth, Math.ceil(cx + sampleRadius));
  const endY = Math.min(imageHeight, Math.ceil(cy + sampleRadius));

  // Собираем пиксели в круглой области
  const pixels: number[] = [];
  let sum = 0;
  const radiusSq = sampleRadius * sampleRadius;

  for (let py = startY; py < endY; py++) {
    for (let px = startX; px < endX; px++) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= radiusSq) {
        const idx = py * imageWidth + px;
        if (idx >= 0 && idx < grayData.length) {
          const pixel = grayData[idx];
          pixels.push(pixel);
          sum += pixel;
        }
      }
    }
  }

  const totalCount = pixels.length;
  if (totalCount === 0) {
    return { fillRatio: 0, darkCount: 0, totalCount: 0, mean: 255 };
  }

  // Средняя яркость - это ГЛАВНЫЙ показатель!
  // Закрашенный кружок имеет НИЗКУЮ среднюю яркость
  const mean = sum / totalCount;

  // Для dark count используем ЛОКАЛЬНЫЙ адаптивный порог
  // Порог = средняя яркость ЭТОГО кружка (не глобальная!)
  // Пиксели темнее среднего = "тёмные"
  // Но для закрашенного кружка почти ВСЕ пиксели будут тёмными
  let darkCount = 0;
  for (const pixel of pixels) {
    // Порог: если пиксель темнее чем (средняя + 20), считаем тёмным
    // Для закрашенного кружка большинство пикселей будут очень тёмными
    if (pixel < 180) { // Абсолютный порог для "тёмного" пикселя
      darkCount++;
    }
  }

  // Fill ratio на основе средней яркости (инвертированная)
  // mean=50 (очень темный) → fillRatio высокий
  // mean=200 (светлый) → fillRatio низкий
  // Нормализуем: 255=белый(0%), 0=черный(100%)
  const fillRatio = Math.max(0, (255 - mean) / 255);

  return {
    fillRatio,
    darkCount,
    totalCount,
    mean
  };
}

/**
 * Legacy wrapper для старого detectBubbles (без калибровки).
 */
function measureBubbleFill(
  grayData: Uint8Array,
  imageWidth: number,
  x: number, y: number,
  rectWidth: number, rectHeight: number,
  globalThreshold: number
): number {
  // Центр и радиус из прямоугольника
  const cx = x + rectWidth / 2;
  const cy = y + rectHeight / 2;
  const radius = Math.min(rectWidth, rectHeight) / 2;

  const result = measureBubbleFillWithGlobalThreshold(
    grayData,
    imageWidth,
    grayData.length / imageWidth, // imageHeight
    cx, cy,
    radius,
    globalThreshold
  );

  return result.fillRatio;
}

/**
 * Детектировать заполненные бабблы используя ГОМОГРАФИЮ.
 * Это главная функция для калиброванного сканирования!
 *
 * Маркеры задают 4 угла: (0,0), (1,0), (0,1), (1,1) -> реальные координаты на фото.
 * Мы вычисляем гомографию и трансформируем идеальные позиции кружков в координаты фото.
 */
function detectBubblesWithHomography(
  processed: ProcessedImage,
  markers: { tl: Point; tr: Point; bl: Point; br: Point }
): (number | null)[] {
  const { grayData, width, height, threshold } = processed;
  const answers: (number | null)[] = [];

  console.log('[Scanner] === HOMOGRAPHY DETECTION START ===');
  console.log('[Scanner] Image size:', width, 'x', height);
  console.log('[Scanner] Threshold (Otsu):', threshold);
  console.log('[Scanner] Markers:', JSON.stringify(markers));

  // Ideal marker positions (unit square)
  const idealMarkers: [Point, Point, Point, Point] = [
    { x: 0, y: 0 },  // TL
    { x: 1, y: 0 },  // TR
    { x: 0, y: 1 },  // BL
    { x: 1, y: 1 },  // BR
  ];

  // Actual marker positions (in pixel coordinates)
  const destMarkers: [Point, Point, Point, Point] = [
    { x: markers.tl.x * width, y: markers.tl.y * height },
    { x: markers.tr.x * width, y: markers.tr.y * height },
    { x: markers.bl.x * width, y: markers.bl.y * height },
    { x: markers.br.x * width, y: markers.br.y * height },
  ];

  // Compute homography: ideal (0-1) -> pixel coordinates
  const H = computeHomography(idealMarkers, destMarkers);
  if (!H) {
    console.error('[Scanner] Failed to compute homography!');
    return new Array(60).fill(null);
  }

  // Get ideal bubble positions (same as InteractiveOverlay uses)
  const idealBubbles = getIdealBubblePositions();

  // Get normalized bubble radius for LOCAL calculation at each position
  const bubbleRadiusNorm = getNormalizedBubbleRadius();

  console.log('[Scanner] Normalized bubble radius:', bubbleRadiusNorm);

  // Process each question (60 total: 30 per column)
  for (let questionIndex = 0; questionIndex < 60; questionIndex++) {
    const fillRatios: number[] = [];
    const darkCounts: number[] = [];

    // Check each of 5 options for this question
    for (let optionIndex = 0; optionIndex < 5; optionIndex++) {
      // Find the ideal bubble position for this question+option
      const bubble = idealBubbles.find(
        b => b.questionIndex === questionIndex && b.optionIndex === optionIndex
      );

      if (!bubble) {
        fillRatios.push(0);
        darkCounts.push(0);
        continue;
      }

      // Transform ideal position to pixel coordinates
      const screenPos = transformPoint(bubble.point, H);
      const cx = screenPos.x;
      const cy = screenPos.y;

      // Calculate LOCAL bubble radius at this position (accounts for perspective!)
      // Uses geometric mean of X and Y scale for accuracy with perspective distortion
      const offsetX = { x: bubble.point.x + bubbleRadiusNorm, y: bubble.point.y };
      const offsetY = { x: bubble.point.x, y: bubble.point.y + bubbleRadiusNorm };
      const screenOffsetX = transformPoint(offsetX, H);
      const screenOffsetY = transformPoint(offsetY, H);
      const scaleX = Math.abs(screenOffsetX.x - screenPos.x);
      const scaleY = Math.abs(screenOffsetY.y - screenPos.y);
      const bubbleRadiusPx = Math.sqrt(scaleX * scaleY);

      // Debug logging for first and last questions to verify perspective scaling
      if (questionIndex === 0 && optionIndex === 2) {
        console.log('[Scanner] Q1 bubble radius:', bubbleRadiusPx.toFixed(1), 'px (scaleX:', scaleX.toFixed(1), 'scaleY:', scaleY.toFixed(1), ')');
      }
      if (questionIndex === 29 && optionIndex === 2) {
        console.log('[Scanner] Q30 bubble radius:', bubbleRadiusPx.toFixed(1), 'px (scaleX:', scaleX.toFixed(1), 'scaleY:', scaleY.toFixed(1), ')');
      }

      // Measure fill ratio using GLOBAL threshold (PyImageSearch approach)
      const result = measureBubbleFillWithGlobalThreshold(
        grayData,
        width,
        height,
        cx, cy,
        bubbleRadiusPx,
        threshold  // Use global Otsu threshold!
      );

      fillRatios.push(result.fillRatio);
      darkCounts.push(result.darkCount);
    }

    // Determine answer using RELATIVE COMPARISON
    const answer = determineAnswer(fillRatios);
    answers.push(answer);

    // Debug log - показываем fill% для каждого кружка
    const sortedFills = [...fillRatios].sort((a, b) => b - a);
    const maxFill = sortedFills[0];
    const secondFill = sortedFills[1];
    const answerStr = answer === MULTIPLE_ANSWERS ? 'MULTI!' : (answer !== null ? ['A', 'B', 'C', 'D', 'E'][answer] : '-');

    // Логируем первые 15 вопросов, множественные ответы, и "подозрительные" случаи
    // где второй по яркости близок к первому (возможно пропущен множественный ответ)
    const suspicious = (maxFill > 0.30 && secondFill > 0.30 && (maxFill - secondFill) < 0.15);
    if (questionIndex < 15 || answer === MULTIPLE_ANSWERS || suspicious || (maxFill > 0.35 && answer === null)) {
      const fillStr = fillRatios.map(r => (r * 100).toFixed(0).padStart(2)).join(' ');
      const note = suspicious && answer !== MULTIPLE_ANSWERS ? ' ⚠️ close!' : '';
      console.log(`[Scan] Q${(questionIndex + 1).toString().padStart(2)}: [${fillStr}] -> ${answerStr}${note}`);
    }
  }

  const detectedCount = answers.filter(a => a !== null).length;
  console.log('[Scanner] === DETECTION COMPLETE ===');
  console.log('[Scanner] Detected answers:', detectedCount, 'out of 60');

  return answers;
}

/**
 * Специальное значение для множественного ответа (закрашено 2+ кружка)
 * Используется как маркер невалидного ответа
 */
export const MULTIPLE_ANSWERS = -1;

/**
 * Определить ответ - ОТНОСИТЕЛЬНОЕ СРАВНЕНИЕ (PyImageSearch подход)
 *
 * Алгоритм:
 * 1. Проверяем, не закрашено ли несколько кружков (возвращаем MULTIPLE_ANSWERS)
 * 2. Находим кружок с максимальным заполнением
 * 3. Сравниваем его со ВТОРЫМ по величине
 * 4. Если разница достаточная - это ответ
 *
 * Возвращает:
 * - 0-4: валидный ответ (A-E)
 * - null: нет ответа (пустой ряд)
 * - MULTIPLE_ANSWERS (-1): закрашено 2+ кружка (невалидно)
 */
/**
 * Определить ответ на основе СРЕДНЕЙ ЯРКОСТИ кружков.
 *
 * Новый подход (основан на исследовании PMC6226159):
 * - fillRatio теперь = (255 - mean) / 255, где mean = средняя яркость
 * - Закрашенный кружок ТЕМНЕЕ → выше fillRatio
 * - Пустой кружок СВЕТЛЕЕ → ниже fillRatio
 *
 * Типичные значения:
 * - Пустой кружок (белый фон): mean ~200-220, fillRatio ~0.14-0.22
 * - Закрашенный кружок: mean ~80-120, fillRatio ~0.53-0.69
 *
 * Ключевой принцип: ОТНОСИТЕЛЬНОЕ СРАВНЕНИЕ внутри ряда!
 * Выбираем кружок который ЗНАЧИТЕЛЬНО темнее остальных.
 */
function determineAnswer(fillRatios: number[]): number | null {
  // Сортируем для нахождения max и second max
  const indexed = fillRatios.map((fill, idx) => ({ fill, idx }));
  indexed.sort((a, b) => b.fill - a.fill);

  const maxFill = indexed[0].fill;
  const maxIdx = indexed[0].idx;
  const secondMaxFill = indexed[1].fill;
  const thirdMaxFill = indexed[2]?.fill || 0;

  // Абсолютная разница между первым и вторым
  const diff = maxFill - secondMaxFill;

  // Соотношение (во сколько раз первый темнее второго)
  const ratio = secondMaxFill > 0.01 ? maxFill / secondMaxFill : 10;

  // Средний fill для "фоновых" кружков (все кроме максимального)
  const backgroundFills = indexed.slice(1).map(i => i.fill);
  const avgBackground = backgroundFills.reduce((a, b) => a + b, 0) / backgroundFills.length;
  const diffFromBackground = maxFill - avgBackground;

  // ПРОВЕРКА НА МНОЖЕСТВЕННЫЙ ОТВЕТ:
  // Два кружка оба значительно темнее фона И близки друг к другу
  // diff < 0.40 означает: разница до 40% считается "оба закрашены"
  // Пример: A=40%, B=75% (diff=35%) -> MULTI
  if (maxFill > 0.35 && secondMaxFill > 0.35) {
    // Оба достаточно тёмные (закрашены)
    if (diff < 0.40 && thirdMaxFill < 0.28) {
      // Первый и второй близки, третий значительно светлее
      return MULTIPLE_ANSWERS;
    }
  }

  // ГЛАВНОЕ ПРАВИЛО: Максимальный должен быть ЗНАЧИТЕЛЬНО темнее фона
  // Разница от среднего фона должна быть минимум 15%
  if (diffFromBackground >= 0.15) {
    return maxIdx;
  }

  // ДОПОЛНИТЕЛЬНОЕ ПРАВИЛО: Если максимальный в 1.5+ раза темнее второго
  if (ratio >= 1.5 && maxFill > 0.30) {
    return maxIdx;
  }

  // ПРАВИЛО для очень тёмных кружков: если maxFill > 50% и разница > 8%
  if (maxFill > 0.50 && diff > 0.08) {
    return maxIdx;
  }

  // Все кружки примерно одинаковой яркости - нет ответа
  return null;
}

// ============================================================================
// CONFIDENCE
// ============================================================================

function calculateConfidence(answers: (number | null)[]): number {
  const answeredCount = answers.filter(a => a !== null).length;
  const totalCount = answers.length;
  if (totalCount === 0) return 0;

  const answerRate = answeredCount / totalCount;
  if (answerRate >= 0.3) return 0.7 + answerRate * 0.3;
  if (answerRate >= 0.1) return 0.4 + answerRate * 0.6;
  return answerRate * 4;
}

// ============================================================================
// PREVIEW
// ============================================================================

export async function createScanPreview(
  canvas: HTMLCanvasElement,
  imageSource: File | HTMLCanvasElement,
  answers: (number | null)[],
  gridBoundsRatio?: GridBoundsRatio
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Load image
  let fileToProcess: File | Blob = imageSource instanceof HTMLCanvasElement
    ? await new Promise<Blob>((resolve) => imageSource.toBlob((b) => resolve(b!)))
    : imageSource;

  if (imageSource instanceof File && isHeicFile(imageSource)) {
    fileToProcess = await convertHeicToJpeg(imageSource);
  }

  const dataUrl = imageSource instanceof HTMLCanvasElement
    ? imageSource.toDataURL()
    : await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(fileToProcess);
      });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 800;
      let { width, height } = img;

      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Draw overlay
      drawAnswerOverlay(ctx, width, height, answers, gridBoundsRatio);
      resolve();
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

function drawAnswerOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  answers: (number | null)[],
  gridBoundsRatio?: GridBoundsRatio
): void {
  // If we have calibration markers, use homography-based transformation
  if (gridBoundsRatio?.markers) {
    drawOverlayWithHomography(ctx, width, height, answers, gridBoundsRatio.markers);
    return;
  }

  // Fallback to simple ratio-based positioning (no calibration)
  drawOverlayFallback(ctx, width, height, answers, gridBoundsRatio);
}

/**
 * Draw overlay using homography transformation based on calibrated marker positions.
 * This maps the "ideal" PDF coordinates to the actual photo coordinates.
 */
function drawOverlayWithHomography(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  answers: (number | null)[],
  markers: { tl: Point; tr: Point; bl: Point; br: Point }
): void {
  // Get ideal marker positions (from PDF spec, normalized 0-1)
  const idealMarkers = getIdealMarkerPositions();

  // Destination markers (where user clicked, also normalized 0-1)
  const destMarkers: [Point, Point, Point, Point] = [
    { x: markers.tl.x, y: markers.tl.y },
    { x: markers.tr.x, y: markers.tr.y },
    { x: markers.bl.x, y: markers.bl.y },
    { x: markers.br.x, y: markers.br.y },
  ];

  // Compute homography matrix: ideal → destination
  const H = computeHomography(idealMarkers, destMarkers);

  if (!H) {
    console.error('[Overlay] Failed to compute homography, falling back to simple method');
    drawOverlayFallback(ctx, width, height, answers, undefined);
    return;
  }

  console.log('[Overlay] Homography computed successfully');

  // Get all ideal bubble positions (in 0-1 proportions relative to markers)
  const idealBubbles = getIdealBubblePositions();

  // Get normalized bubble radius for LOCAL calculation
  const bubbleRadiusNorm = getNormalizedBubbleRadius();

  // Helper function to calculate LOCAL radius at a given position
  // Uses BOTH X and Y offsets to get the average scale (accounts for perspective properly)
  const getLocalRadius = (point: Point): number => {
    const screenPoint = transformPoint(point, H);

    // Check scale in X direction
    const offsetX = { x: point.x + bubbleRadiusNorm, y: point.y };
    const screenOffsetX = transformPoint(offsetX, H);
    const scaleX = Math.abs(screenOffsetX.x - screenPoint.x);

    // Check scale in Y direction
    const offsetY = { x: point.x, y: point.y + bubbleRadiusNorm };
    const screenOffsetY = transformPoint(offsetY, H);
    const scaleY = Math.abs(screenOffsetY.y - screenPoint.y);

    // Use average of both scales for radius (geometric mean for better accuracy)
    const avgScale = Math.sqrt(scaleX * scaleY);

    return avgScale * width;
  };

  // Debug: Log radius at top and bottom to verify perspective scaling
  const topBubble = idealBubbles.find(b => b.questionIndex === 0 && b.optionIndex === 2);
  const bottomBubble = idealBubbles.find(b => b.questionIndex === 29 && b.optionIndex === 2);
  if (topBubble && bottomBubble) {
    console.log('[Overlay] Radius at TOP (Q1):', getLocalRadius(topBubble.point).toFixed(1), 'px');
    console.log('[Overlay] Radius at BOTTOM (Q30):', getLocalRadius(bottomBubble.point).toFixed(1), 'px');
  }

  // === 1. Draw corner markers at clicked positions ===
  const markerSize = Math.min(width, height) * 0.025;
  ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;

  [markers.tl, markers.tr, markers.bl, markers.br].forEach((m) => {
    const sx = m.x * width;
    const sy = m.y * height;
    ctx.fillRect(sx - markerSize / 2, sy - markerSize / 2, markerSize, markerSize);
    ctx.strokeRect(sx - markerSize / 2, sy - markerSize / 2, markerSize, markerSize);
  });

  // === 2. Draw ALL bubble circles (blue outline) using homography with LOCAL radius ===
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
  ctx.lineWidth = 1.5;

  idealBubbles.forEach(({ point }) => {
    const screenPoint = transformPoint(point, H);
    const sx = screenPoint.x * width;
    const sy = screenPoint.y * height;
    const localRadius = getLocalRadius(point);

    ctx.beginPath();
    ctx.arc(sx, sy, localRadius, 0, Math.PI * 2);
    ctx.stroke();
  });

  // === 3. Highlight detected answers ===
  answers.forEach((answer, questionIndex) => {
    if (answer === null) return;

    // MULTIPLE_ANSWERS: Draw ALL bubbles for this question in RED
    if (answer === MULTIPLE_ANSWERS) {
      ctx.strokeStyle = '#dc2626'; // Red
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(220, 38, 38, 0.4)'; // Red fill

      // Highlight all 5 options for this question
      for (let opt = 0; opt < 5; opt++) {
        const bubble = idealBubbles.find(
          (b) => b.questionIndex === questionIndex && b.optionIndex === opt
        );
        if (!bubble) continue;

        const screenPoint = transformPoint(bubble.point, H);
        const sx = screenPoint.x * width;
        const sy = screenPoint.y * height;
        const localRadius = getLocalRadius(bubble.point);

        ctx.beginPath();
        ctx.arc(sx, sy, localRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      return;
    }

    // Normal answer: Draw in GREEN
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.5)';

    const bubble = idealBubbles.find(
      (b) => b.questionIndex === questionIndex && b.optionIndex === answer
    );
    if (!bubble) return;

    const screenPoint = transformPoint(bubble.point, H);
    const sx = screenPoint.x * width;
    const sy = screenPoint.y * height;
    const localRadius = getLocalRadius(bubble.point);

    ctx.beginPath();
    ctx.arc(sx, sy, localRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

/**
 * Fallback overlay drawing without homography (simple ratio-based).
 */
function drawOverlayFallback(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  answers: (number | null)[],
  gridBoundsRatio?: GridBoundsRatio
): void {
  const layout = BLANK_SPEC.layout;

  const gridTop = height * (gridBoundsRatio?.topRatio ?? layout.gridTop);
  const gridBottom = height * (gridBoundsRatio?.bottomRatio ?? layout.gridBottom);
  const gridLeft = width * (gridBoundsRatio?.leftRatio ?? layout.contentLeft);
  const gridRight = width * (gridBoundsRatio?.rightRatio ?? layout.contentRight);

  const contentWidth = gridRight - gridLeft;
  const gridHeight = gridBottom - gridTop;
  const centerGap = contentWidth * (gridBoundsRatio?.centerGapRatio ?? layout.columnGap);
  const columnWidth = (contentWidth - centerGap) / 2;
  const rowHeight = gridHeight / BLANK_SPEC.table.maxRows;
  const numberColumnWidth = columnWidth * layout.numberColumnWidth;
  const optionWidth = (columnWidth - numberColumnWidth) / BLANK_SPEC.table.options;
  const bubbleRadius = Math.min(optionWidth, rowHeight) * 0.28;

  // Draw ALL bubble circles (blue outline)
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
  ctx.lineWidth = 1.5;

  for (let col = 0; col < 2; col++) {
    const colStartX = col === 0 ? gridLeft : gridLeft + columnWidth + centerGap;

    for (let row = 0; row < BLANK_SPEC.table.maxRows; row++) {
      const rowCenterY = gridTop + (row + 0.5) * rowHeight;

      for (let opt = 0; opt < BLANK_SPEC.table.options; opt++) {
        const bubbleCenterX = colStartX + numberColumnWidth + (opt + 0.5) * optionWidth;

        ctx.beginPath();
        ctx.arc(bubbleCenterX, rowCenterY, bubbleRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // Highlight detected answers
  answers.forEach((answer, idx) => {
    if (answer === null) return;

    const col = idx < BLANK_SPEC.table.maxRows ? 0 : 1;
    const row = idx % BLANK_SPEC.table.maxRows;
    const colStartX = col === 0 ? gridLeft : gridLeft + columnWidth + centerGap;
    const rowCenterY = gridTop + (row + 0.5) * rowHeight;

    // MULTIPLE_ANSWERS: Draw ALL bubbles in RED
    if (answer === MULTIPLE_ANSWERS) {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(220, 38, 38, 0.4)';

      for (let opt = 0; opt < BLANK_SPEC.table.options; opt++) {
        const bubbleCenterX = colStartX + numberColumnWidth + (opt + 0.5) * optionWidth;
        ctx.beginPath();
        ctx.arc(bubbleCenterX, rowCenterY, bubbleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      return;
    }

    // Normal answer: GREEN
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.5)';

    const bubbleCenterX = colStartX + numberColumnWidth + (answer + 0.5) * optionWidth;

    ctx.beginPath();
    ctx.arc(bubbleCenterX, rowCenterY, bubbleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

// ============================================================================
// AI SCANNER (Cloudflare Workers AI fallback)
// ============================================================================

/**
 * Use AI to find marker positions, then use local scanner for bubble detection
 */
export async function scanWithAI(
  imageSource: File | HTMLCanvasElement,
  totalQuestions: number,
  testId?: string
): Promise<ScanResult> {
  try {
    console.log('[AI Hybrid] Starting hybrid scan...');

    // Convert to base64
    const base64 = await imageToBase64(imageSource);

    // Step 1: Ask AI to find the 4 corner markers
    console.log('[AI Hybrid] Step 1: Finding markers with AI...');
    const markersResponse = await fetch('/api/scan/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64,
        mode: 'markers',
      }),
    });

    if (!markersResponse.ok) {
      const error = await markersResponse.json();
      throw new Error(error.error || 'AI markers detection failed');
    }

    const markersResult = await markersResponse.json();
    console.log('[AI Hybrid] Markers result:', markersResult);

    if (!markersResult.success || !markersResult.markers) {
      console.log('[AI Hybrid] AI could not find markers, falling back to default layout');
      // Fall back to local scanner with default layout
      return await scanBlank(imageSource, testId);
    }

    // Step 2: Convert marker percentages to grid bounds
    const markers = markersResult.markers;
    console.log('[AI Hybrid] Markers found:', markers);

    // Calculate grid bounds from markers (markers are at edges, grid is inside)
    // Markers are at ~2-3% from edges, grid starts after header (~12.5% from top)
    const gridBoundsRatio: GridBoundsRatio = {
      topRatio: Math.max(markers.topLeft.y, markers.topRight.y) / 100 + 0.10, // Grid starts ~10% below top markers
      bottomRatio: Math.min(markers.bottomLeft.y, markers.bottomRight.y) / 100 - 0.02,
      leftRatio: Math.max(markers.topLeft.x, markers.bottomLeft.x) / 100 + 0.06,
      rightRatio: Math.min(markers.topRight.x, markers.bottomRight.x) / 100 - 0.06,
      centerGapRatio: BLANK_SPEC.layout.columnGap,
    };

    console.log('[AI Hybrid] Calculated grid bounds:', gridBoundsRatio);

    // Step 3: Use local scanner with AI-detected bounds
    console.log('[AI Hybrid] Step 2: Running local scanner with AI bounds...');
    const localResult = await scanBlank(imageSource, testId, gridBoundsRatio);

    return {
      ...localResult,
      debug: {
        qrFound: localResult.debug?.qrFound ?? false,
        markersFound: localResult.debug?.markersFound ?? true,
        pageCorners: localResult.debug?.pageCorners ?? null,
        perspectiveCorrected: localResult.debug?.perspectiveCorrected ?? false,
        aiMarkers: markers,
        aiGridBounds: gridBoundsRatio,
      },
    };
  } catch (error) {
    console.error('[AI Hybrid] Error:', error);
    // Fall back to pure local scanner
    console.log('[AI Hybrid] Falling back to local scanner...');
    return await scanBlank(imageSource, testId);
  }
}

/**
 * Hybrid scan: try local first, fallback to AI
 */
export async function scanBlankHybrid(
  imageSource: File | HTMLCanvasElement | ImageData,
  totalQuestions: number,
  knownTestId?: string
): Promise<ScanResult> {
  // Try local scanner first
  const localResult = await scanBlank(imageSource, knownTestId);

  // If local succeeded with reasonable confidence, use it
  if (localResult.success && localResult.confidence > 0.5) {
    console.log('[Hybrid] Local scan succeeded, confidence:', localResult.confidence);
    return localResult;
  }

  // Check if AI is available (only works with File or Canvas)
  if (!(imageSource instanceof File) && !(imageSource instanceof HTMLCanvasElement)) {
    console.log('[Hybrid] Cannot use AI with ImageData, returning local result');
    return localResult;
  }

  // Fallback to AI
  console.log('[Hybrid] Local scan failed or low confidence, trying AI...');
  const aiResult = await scanWithAI(
    imageSource as File | HTMLCanvasElement,
    totalQuestions,
    knownTestId || localResult.testId
  );

  // Return AI result if successful, otherwise return local result
  if (aiResult.success) {
    console.log('[Hybrid] AI scan succeeded');
    return aiResult;
  }

  console.log('[Hybrid] Both scanners failed, returning local result');
  return localResult;
}

// Convert image to base64 with resizing for AI scanner
async function imageToBase64(source: File | HTMLCanvasElement): Promise<string> {
  const MAX_DIMENSION = 1024; // Max width/height for AI scanner
  const QUALITY = 0.85; // Higher quality for better recognition

  if (source instanceof HTMLCanvasElement) {
    // Resize canvas if needed
    if (source.width > MAX_DIMENSION || source.height > MAX_DIMENSION) {
      const scale = Math.min(MAX_DIMENSION / source.width, MAX_DIMENSION / source.height);
      const resized = document.createElement('canvas');
      resized.width = source.width * scale;
      resized.height = source.height * scale;
      const ctx = resized.getContext('2d');
      if (ctx) {
        ctx.drawImage(source, 0, 0, resized.width, resized.height);
        return resized.toDataURL('image/jpeg', QUALITY);
      }
    }
    return source.toDataURL('image/jpeg', QUALITY);
  }

  // For File, load into image and resize
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Resize if needed
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', QUALITY));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(source);
  });
}
