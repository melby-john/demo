import { LandmarkPoint, FaceKeypoints, PredictionResult } from '../types';

function parsePt(pt: any): [number, number, number] | null {
  if (!pt) return null;
  if (typeof pt.x === 'number') {
    return [pt.x, pt.y, pt.z ?? 0.0];
  }
  if (Array.isArray(pt) && pt.length >= 2) {
    return [pt[0], pt[1], pt[2] ?? 0.0];
  }
  return null;
}

function dist3d(p1: [number, number, number], p2: [number, number, number]): number {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  const dz = (p1[2] - p2[2]) * 0.5;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function dist2d(p1: [number, number, number], p2: [number, number, number]): number {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Pure client-side anatomically invariant Indian Sign Language (ISL) geometric classifier.
 * Evaluates hand & face landmarks directly in the browser (60 FPS, 0 latency, 0 backend dependency).
 */
export function evaluateGeometricRules(
  hands?: any[][],
  face?: FaceKeypoints | null,
  faceLandmarks?: any[]
): PredictionResult | null {
  if (!hands || hands.length === 0 || !hands[0] || hands[0].length < 21) {
    return null;
  }

  const activeLandmarks = hands[0];
  const handCount = hands.length;

  const coords: [number, number, number][] = [];
  for (let i = 0; i < 21; i++) {
    const pt = parsePt(activeLandmarks[i]);
    coords.push(pt || [0.0, 0.0, 0.0]);
  }

  const d = (i: number, j: number) => dist3d(coords[i], coords[j]);

  let palmSize = d(0, 9);
  if (palmSize < 1e-4) palmSize = 1.0;

  // Finger extensions: tip to wrist vs PIP to wrist
  const indexExt = d(8, 0) > d(6, 0) * 1.05;
  const middleExt = d(12, 0) > d(10, 0) * 1.05;
  const ringExt = d(16, 0) > d(14, 0) * 1.05;
  const pinkyExt = d(20, 0) > d(18, 0) * 1.05;

  // Thumb analysis
  const thumbExt = d(4, 9) > d(2, 9) * 1.08 || d(4, 17) > d(2, 17) * 1.10 || d(4, 0) > d(2, 0) * 1.10;
  const thumbPointingUp = (coords[2][1] - coords[4][1]) > (palmSize * 0.08);

  // Spread metrics
  const pinchDist = d(4, 8) / palmSize;
  const vSpread = d(8, 12) / palmSize;
  const handSpan = d(4, 20) / palmSize;
  const allFiveOpen = indexExt && middleExt && ringExt && pinkyExt && (thumbExt || vSpread > 0.12);

  // Parse Head Anchors (forehead, mouth, chin)
  let foreheadPt: [number, number, number] | null = null;
  let mouthPt: [number, number, number] | null = null;
  let chinPt: [number, number, number] | null = null;

  if (face) {
    foreheadPt = parsePt(face.forehead);
    mouthPt = parsePt(face.mouth);
    chinPt = parsePt(face.chin);
  }

  if (!foreheadPt && faceLandmarks && faceLandmarks.length > 152) {
    foreheadPt = parsePt(faceLandmarks[10]);
    mouthPt = parsePt(faceLandmarks[13]);
    chinPt = parsePt(faceLandmarks[152]);
  }

  const thumbTip = coords[4];
  const indexTip = coords[8];
  const middleTip = coords[12];

  const contactRadius = Math.min(0.14, Math.max(0.08, palmSize * 0.85));
  const mouthRadius = Math.min(0.15, Math.max(0.09, palmSize * 0.90));

  const isWHandshape = indexExt && middleExt && ringExt && !pinkyExt;
  const isBunchedEat = (Math.max(d(4, 8), d(8, 12), d(12, 16)) / palmSize) < 0.44 && (d(4, 12) / palmSize) < 0.48 && !allFiveOpen;

  // ==========================================
  // 1. HEAD-ANCHORED SIGNS (Dad, Mom, Water, Eat, Drink, Thank You)
  // ==========================================

  // (A) DAD: Open 5-hand with thumb touching or near forehead
  if (allFiveOpen) {
    if (foreheadPt) {
      const distToForehead = Math.min(
        dist2d(thumbTip, foreheadPt),
        dist2d(coords[2], foreheadPt),
        dist2d(coords[5], foreheadPt)
      );
      const distToChin = chinPt ? dist2d(thumbTip, chinPt) : 1.0;
      if (distToForehead <= contactRadius && distToForehead < distToChin * 0.85) {
        return { label: 'dad', confidence: 0.96, recognized: true };
      }
    } else if (coords[0][1] < 0.38 && thumbTip[1] < 0.28) {
      return { label: 'dad', confidence: 0.92, recognized: true };
    }
  }

  // (B) MOM: Open 5-hand with thumb touching chin
  if (allFiveOpen) {
    if (chinPt) {
      const distToChin = Math.min(dist2d(thumbTip, chinPt), dist2d(coords[2], chinPt));
      const distToForehead = foreheadPt ? dist2d(thumbTip, foreheadPt) : 1.0;
      if (distToChin <= contactRadius && distToChin < distToForehead * 0.85) {
        return { label: 'mom', confidence: 0.96, recognized: true };
      }
    }
  }

  // (C) WATER: 'W' handshape (index, middle, ring extended) at mouth or chin
  if (isWHandshape) {
    const targetPt = chinPt || mouthPt;
    if (targetPt) {
      const distTarget = Math.min(dist2d(indexTip, targetPt), dist2d(thumbTip, targetPt));
      if (distTarget <= mouthRadius) {
        return { label: 'water', confidence: 0.97, recognized: true };
      }
    }
    return { label: 'water', confidence: 0.93, recognized: true };
  }

  // (D) EAT: Bunched fingertips tapping near mouth
  if (isBunchedEat) {
    const targetPt = mouthPt || chinPt;
    if (targetPt) {
      const distTarget = Math.min(dist2d(indexTip, targetPt), dist2d(thumbTip, targetPt));
      if (distTarget <= mouthRadius) {
        return { label: 'eat', confidence: 0.96, recognized: true };
      }
    } else if (indexTip[1] < 0.45 && coords[0][1] > 0.45) {
      return { label: 'eat', confidence: 0.90, recognized: true };
    }
  }

  // (E) THANK YOU: Flat open hand extending from chin / mouth
  if (indexExt && middleExt && ringExt && pinkyExt) {
    const targetPt = chinPt || mouthPt;
    if (targetPt) {
      const distFingertip = Math.min(dist2d(indexTip, targetPt), dist2d(middleTip, targetPt));
      if (distFingertip <= mouthRadius) {
        return { label: 'thank_you', confidence: 0.96, recognized: true };
      }
    }
  }

  // (F) DRINK: C-handshape or cup tipped towards mouth
  if (mouthPt) {
    const distToMouth = Math.min(dist2d(thumbTip, mouthPt), dist2d(indexTip, mouthPt));
    if (distToMouth <= mouthRadius && !isBunchedEat && !allFiveOpen) {
      return { label: 'drink', confidence: 0.95, recognized: true };
    }
  }

  // ==========================================
  // 2. TWO-HANDED GESTURES (Help, Clean)
  // ==========================================
  if (handCount >= 2 && hands[1] && hands[1].length >= 21) {
    if (thumbPointingUp && !indexExt && !middleExt && !ringExt && !pinkyExt) {
      return { label: 'help', confidence: 0.94, recognized: true };
    }
    return { label: 'clean', confidence: 0.88, recognized: true };
  }

  // ==========================================
  // 3. CANONICAL SINGLE-HAND GESTURES
  // ==========================================

  // I LOVE YOU ('ILY'): Thumb, index, and pinky extended, middle and ring curled
  if (thumbExt && indexExt && pinkyExt && !middleExt && !ringExt) {
    return { label: 'i_love_you', confidence: 0.97, recognized: true };
  }

  // PEACE / V-SIGN: Index and middle open in V-shape, others curled
  if (indexExt && middleExt && !ringExt && !pinkyExt && vSpread > 0.10) {
    return { label: 'peace', confidence: 0.95, recognized: true };
  }

  // THUMBS UP: Thumb pointing up, 4 fingers curled
  if (thumbPointingUp && !indexExt && !middleExt && !ringExt && !pinkyExt) {
    return { label: 'thumbs_up', confidence: 0.96, recognized: true };
  }

  // GO / POINT: Index extended, others curled
  if (indexExt && !middleExt && !ringExt && !pinkyExt && !thumbPointingUp) {
    return { label: 'go', confidence: 0.94, recognized: true };
  }

  // NO: Index and middle pinching with thumb
  if (indexExt && middleExt && pinchDist < 0.45 && !ringExt && !pinkyExt) {
    return { label: 'no', confidence: 0.93, recognized: true };
  }

  // TOILET: Fist with thumb poking between index and middle
  if (!indexExt && !middleExt && !ringExt && !pinkyExt && (coords[4][1] < coords[6][1])) {
    return { label: 'toilet', confidence: 0.92, recognized: true };
  }

  // YES: Closed fist (nodding)
  if (!indexExt && !middleExt && !ringExt && !pinkyExt && !thumbPointingUp) {
    return { label: 'yes', confidence: 0.92, recognized: true };
  }

  // HELLO / OPEN / STOP (Open 5-hand):
  if (allFiveOpen) {
    // If fingers are spread wide -> hello / open
    if (handSpan > 1.6 || vSpread > 0.18) {
      return { label: 'hello', confidence: 0.96, recognized: true };
    }
    // Flat fingers together -> stop
    return { label: 'stop', confidence: 0.93, recognized: true };
  }

  // Fallback for flat 4-finger hand
  if (indexExt && middleExt && ringExt && pinkyExt) {
    return { label: 'stop', confidence: 0.92, recognized: true };
  }

  return null;
}
