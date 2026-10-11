import { LandmarkPoint, FaceKeypoints } from '../types';

// Hand landmark connections (pairs of landmark indices)
export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm base knuckles
  [5, 9], [9, 13], [13, 17]
];

export function drawFaceLandmarks(
  ctx: CanvasRenderingContext2D,
  face: FaceKeypoints | null,
  canvasWidth: number,
  canvasHeight: number,
  mirror: boolean = true
) {
  if (!face) return;

  const toCanvas = (pt: LandmarkPoint) => ({
    x: mirror ? (1 - pt.x) * canvasWidth : pt.x * canvasWidth,
    y: pt.y * canvasHeight
  });

  const forehead = toCanvas(face.forehead);
  const mouth = toCanvas(face.mouth);
  const chin = toCanvas(face.chin);
  const nose = face.nose ? toCanvas(face.nose) : null;

  ctx.save();

  // Subtle connection line along face midline (forehead -> nose -> mouth -> chin)
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)'; // Emerald
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(forehead.x, forehead.y);
  if (nose) ctx.lineTo(nose.x, nose.y);
  ctx.lineTo(mouth.x, mouth.y);
  ctx.lineTo(chin.x, chin.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw Anchor Targets
  const anchors = [
    { pt: forehead, label: 'Dad (Forehead)', color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.7)' },
    { pt: mouth, label: 'Eat/Drink', color: '#34d399', glow: 'rgba(52, 211, 153, 0.7)' },
    { pt: chin, label: 'Mom/Water', color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.7)' }
  ];

  anchors.forEach(({ pt, label, color, glow }) => {
    // Outer pulse ring
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 8, 0, 2 * Math.PI);
    ctx.strokeStyle = glow;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Solid core dot
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 10;
    ctx.fill();

    // Small label tag
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#000000';
    ctx.fillText(label, pt.x + 12, pt.y + 3);
  });

  ctx.restore();
}

export function drawTrackingOverlays(
  ctx: CanvasRenderingContext2D,
  hands: LandmarkPoint[][],
  face: FaceKeypoints | null,
  canvasWidth: number,
  canvasHeight: number,
  mirror: boolean = true
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  if (face) {
    drawFaceLandmarks(ctx, face, canvasWidth, canvasHeight, mirror);
  }
  if (hands && hands.length > 0) {
    drawHandLandmarksOnly(ctx, hands, canvasWidth, canvasHeight, mirror);
  }
}

function drawHandLandmarksOnly(
  ctx: CanvasRenderingContext2D,
  hands: LandmarkPoint[][],
  canvasWidth: number,
  canvasHeight: number,
  mirror: boolean = true
) {
  if (!hands || hands.length === 0) return;

  const handColors = [
    { line: '#06b6d4', joint: '#22d3ee', glow: 'rgba(6, 182, 212, 0.6)' }, // Hand 1: Cyan
    { line: '#a855f7', joint: '#c084fc', glow: 'rgba(168, 85, 247, 0.6)' }  // Hand 2: Purple
  ];

  hands.forEach((landmarks, handIndex) => {
    if (!landmarks || landmarks.length < 21) return;

    const colors = handColors[handIndex % handColors.length];

    // Convert normalized landmarks (0..1) to canvas coordinates
    const points = landmarks.map(lm => {
      const x = mirror ? (1 - lm.x) * canvasWidth : lm.x * canvasWidth;
      const y = lm.y * canvasHeight;
      return { x, y, z: lm.z };
    });

    // Draw connection lines
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = colors.line;
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 8;

    HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const p1 = points[startIdx];
      const p2 = points[endIdx];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    });

    // Draw joints
    points.forEach((p, idx) => {
      // Fingertips (4, 8, 12, 16, 20) are slightly larger
      const isTip = [4, 8, 12, 16, 20].includes(idx);
      const isWrist = idx === 0;
      const radius = isTip ? 5.5 : isWrist ? 6 : 4;

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isTip ? '#ffffff' : colors.joint;
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = isTip ? 12 : 6;
      ctx.fill();

      // Border for high contrast
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#070b14';
      ctx.stroke();
    });
  });

  // Reset shadow
  ctx.shadowBlur = 0;
}

export function drawHandLandmarks(
  ctx: CanvasRenderingContext2D,
  hands: LandmarkPoint[][],
  canvasWidth: number,
  canvasHeight: number,
  mirror: boolean = true
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  drawHandLandmarksOnly(ctx, hands, canvasWidth, canvasHeight, mirror);
}
