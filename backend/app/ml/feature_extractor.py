import math
from typing import List, Optional, Union, Dict, Any
from app.schemas.landmarks import LandmarkPoint

# Feature dimension per hand:
# 63 relative coords + 5 extension ratios + 4 inter-tip spreads + 2 thumb pose indicators = 74 features per hand
# Total for 2 hands: 74 * 2 = 148 features
FEATURES_PER_HAND = 74
FEATURE_DIM = FEATURES_PER_HAND * 2  # 148

def _extract_single_hand_features(landmarks: List[Union[LandmarkPoint, dict, list]]) -> List[float]:
    """
    Extracts 74 robust geometric features for a single hand:
    - 63 translation- and scale-normalized 3D coordinates relative to wrist.
    - 5 finger extension ratios (rotation invariant).
    - 4 inter-fingertip spread distances (rotation invariant).
    - 2 thumb pose metrics (upward vector and fold against fist).
    """
    if len(landmarks) < 21:
        raise ValueError(f"Expected 21 landmarks for a hand, got {len(landmarks)}")

    # Extract clean (x, y, z)
    coords = []
    for lm in landmarks[:21]:
        if isinstance(lm, (LandmarkPoint, object)) and hasattr(lm, "x"):
            coords.append((float(lm.x), float(lm.y), float(getattr(lm, "z", 0.0))))
        elif isinstance(lm, dict):
            coords.append((float(lm.get("x", 0.0)), float(lm.get("y", 0.0)), float(lm.get("z", 0.0))))
        elif isinstance(lm, (list, tuple)) and len(lm) >= 2:
            z_val = float(lm[2]) if len(lm) > 2 else 0.0
            coords.append((float(lm[0]), float(lm[1]), z_val))
        else:
            coords.append((0.0, 0.0, 0.0))

    wx, wy, wz = coords[0]

    def d(i: int, j: int) -> float:
        p1 = coords[i]
        p2 = coords[j]
        return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2 + (p1[2] - p2[2]) ** 2)

    # Palm scale: distance from wrist (0) to middle finger MCP (9)
    palm_scale = d(0, 9)
    if palm_scale < 1e-4:
        # Fallback to max distance
        max_dist = max(d(0, i) for i in range(1, 21))
        palm_scale = max_dist if max_dist > 1e-4 else 1.0

    # 1. 63 Normalized relative coordinates
    rel_coords = []
    for x, y, z in coords:
        rel_coords.extend([
            (x - wx) / palm_scale,
            (y - wy) / palm_scale,
            (z - wz) / palm_scale
        ])

    # 2. 5 Finger extension ratios (tip to wrist vs PIP/MCP to wrist)
    # Thumb: tip(4) to middle MCP(9) vs IP(3) to MCP(9)
    thumb_ext = d(4, 9) / (d(2, 9) + 1e-5)
    index_ext = d(8, 0) / (d(6, 0) + 1e-5)
    middle_ext = d(12, 0) / (d(10, 0) + 1e-5)
    ring_ext = d(16, 0) / (d(14, 0) + 1e-5)
    pinky_ext = d(20, 0) / (d(18, 0) + 1e-5)

    # 3. 4 Inter-tip spreads normalized by palm size
    thumb_index_spread = d(4, 8) / palm_scale
    index_middle_spread = d(8, 12) / palm_scale
    middle_ring_spread = d(12, 16) / palm_scale
    ring_pinky_spread = d(16, 20) / palm_scale

    # 4. 2 Thumb pose indicators
    # Note: in screen coords, y is 0 at top, so (MCP y - TIP y) is positive when pointing UP
    thumb_upward = (coords[2][1] - coords[4][1]) / palm_scale
    thumb_to_index_base = d(4, 5) / palm_scale

    features = (
        rel_coords +
        [thumb_ext, index_ext, middle_ext, ring_ext, pinky_ext] +
        [thumb_index_spread, index_middle_spread, middle_ring_spread, ring_pinky_spread] +
        [thumb_upward, thumb_to_index_base]
    )

    return features

def extract_features_from_sample(
    landmarks: Optional[List[Any]] = None,
    hands: Optional[List[List[Any]]] = None,
    features: Optional[List[float]] = None
) -> List[float]:
    """
    Extracts a standardized 148-dimensional feature vector.
    Supports either pre-extracted features, a list of hands, or a single hand's landmarks.
    """
    if features is not None and len(features) > 0:
        if len(features) == FEATURE_DIM:
            return [float(v) for v in features]
        elif len(features) == FEATURES_PER_HAND:
            return [float(v) for v in features] + [0.0] * FEATURES_PER_HAND
        elif len(features) > FEATURE_DIM:
            return [float(v) for v in features[:FEATURE_DIM]]
        else:
            return [float(v) for v in features] + [0.0] * (FEATURE_DIM - len(features))

    features_vector: List[float] = []

    if hands and len(hands) > 0:
        # Hand 1
        hand1_feats = _extract_single_hand_features(hands[0])
        features_vector.extend(hand1_feats)

        # Hand 2 (if present)
        if len(hands) > 1 and len(hands[1]) >= 21:
            hand2_feats = _extract_single_hand_features(hands[1])
            features_vector.extend(hand2_feats)
        else:
            features_vector.extend([0.0] * FEATURES_PER_HAND)
    elif landmarks and len(landmarks) >= 21:
        # Single hand landmarks provided
        hand1_feats = _extract_single_hand_features(landmarks[:21])
        features_vector.extend(hand1_feats)
        if len(landmarks) >= 42:
            hand2_feats = _extract_single_hand_features(landmarks[21:42])
            features_vector.extend(hand2_feats)
        else:
            features_vector.extend([0.0] * FEATURES_PER_HAND)
    else:
        raise ValueError("No valid hand landmarks provided. Expected at least 21 landmark points.")

    return features_vector
