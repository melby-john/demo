import json
import math
import logging
from typing import Dict, Any, List, Optional, Tuple
import joblib
import numpy as np

from app.core.config import MODEL_FILE, LABEL_ENCODER_FILE, METADATA_FILE
from app.ml.feature_extractor import extract_features_from_sample

logger = logging.getLogger(__name__)

def _parse_pt(pt: Any) -> Optional[Tuple[float, float, float]]:
    if pt is None:
        return None
    if hasattr(pt, "x"):
        return (float(pt.x), float(pt.y), float(getattr(pt, "z", 0.0)))
    if isinstance(pt, dict):
        return (float(pt.get("x", 0.0)), float(pt.get("y", 0.0)), float(pt.get("z", 0.0)))
    if isinstance(pt, (list, tuple)) and len(pt) >= 2:
        return (float(pt[0]), float(pt[1]), float(pt[2]) if len(pt) > 2 else 0.0)
    return None

def evaluate_geometric_rules(
    hands: Optional[List[List[Any]]],
    landmarks: Optional[List[Any]],
    face: Optional[Dict[str, Any]] = None,
    face_landmarks: Optional[List[Any]] = None
) -> Tuple[Optional[str], float]:
    """
    Evaluates anatomically invariant geometric rules on detected hand and face landmarks.
    Recognizes canonical Indian Sign Language (ISL) gestures, including head-anchored signs:
    - 'dad': Open 5-hand with thumb touching or near forehead
    - 'mom': Open 5-hand with thumb touching or near chin
    - 'water': 'W' handshape (index, middle, ring extended) touching or near chin/mouth
    - 'thank_you': Flat open hand extending from chin/mouth
    - 'eat': Bunched fingertips / squished O-shape touching or near mouth
    - 'drink': C-handshape / cup-shape tipped toward mouth
    - 'hello': All 5 fingers extended in neutral space
    - 'thumbs_up': Thumb pointing upward with 4 fingers curled
    - 'peace': Index and middle fingers open in V-shape
    - 'yes': Closed fist nodding
    - 'no': Index and middle pinching thumb
    - 'go': Index pointing forward
    - 'stop': Flat open hand
    - 'help': Thumbs-up on flat palm
    - 'clean': Flat palm sliding on flat palm
    - 'toilet': T-handshape (thumb between index and middle knuckles)
    - 'i_love_you': Thumb, index, and pinky extended
    """
    active_landmarks = None
    hand_count = 0

    if hands and len(hands) > 0 and len(hands[0]) >= 21:
        active_landmarks = hands[0]
        hand_count = len(hands)
    elif landmarks and len(landmarks) >= 21:
        active_landmarks = landmarks[:21]
        hand_count = 2 if len(landmarks) >= 42 else 1

    if not active_landmarks:
        return None, 0.0

    # Parse hand coordinates
    coords = []
    for lm in active_landmarks[:21]:
        pt = _parse_pt(lm)
        coords.append(pt if pt else (0.0, 0.0, 0.0))

    def d(i: int, j: int) -> float:
        p1 = coords[i]
        p2 = coords[j]
        dx = p1[0] - p2[0]
        dy = p1[1] - p2[1]
        dz = (p1[2] - p2[2]) * 0.5
        return math.sqrt(dx ** 2 + dy ** 2 + dz ** 2)

    def dist_2d(p1: Tuple[float, float, float], p2: Tuple[float, float, float]) -> float:
        return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)

    palm_size = d(0, 9)
    if palm_size < 1e-4:
        palm_size = 1.0

    # Finger extensions: tip distance to wrist vs PIP to wrist
    index_ext = d(8, 0) > d(6, 0) * 1.05
    middle_ext = d(12, 0) > d(10, 0) * 1.05
    ring_ext = d(16, 0) > d(14, 0) * 1.05
    pinky_ext = d(20, 0) > d(18, 0) * 1.05

    # Thumb analysis
    thumb_ext = d(4, 9) > d(2, 9) * 1.08 or d(4, 17) > d(2, 17) * 1.10 or d(4, 0) > d(2, 0) * 1.10
    thumb_pointing_up = (coords[2][1] - coords[4][1]) > (palm_size * 0.08)

    # Finger spread metrics
    pinch_dist = d(4, 8) / palm_size
    v_spread = d(8, 12) / palm_size
    hand_span = d(4, 20) / palm_size
    all_five_open = index_ext and middle_ext and ring_ext and pinky_ext and (thumb_ext or v_spread > 0.12)
    flat_fingers_together = index_ext and middle_ext and ring_ext and pinky_ext and (v_spread <= 0.22)
    w_handshape = index_ext and middle_ext and ring_ext and not pinky_ext

    # Extract Face Anchors (Forehead, Mouth, Chin, Nose)
    forehead_pt: Optional[Tuple[float, float, float]] = None
    mouth_pt: Optional[Tuple[float, float, float]] = None
    chin_pt: Optional[Tuple[float, float, float]] = None
    nose_pt: Optional[Tuple[float, float, float]] = None

    if face and isinstance(face, dict):
        forehead_pt = _parse_pt(face.get("forehead"))
        mouth_pt = _parse_pt(face.get("mouth"))
        chin_pt = _parse_pt(face.get("chin"))
        nose_pt = _parse_pt(face.get("nose"))

    if not forehead_pt and face_landmarks and len(face_landmarks) > 152:
        forehead_pt = _parse_pt(face_landmarks[10])
        mouth_pt = _parse_pt(face_landmarks[13])
        chin_pt = _parse_pt(face_landmarks[152])
        nose_pt = _parse_pt(face_landmarks[1])

    # Head scale normalization
    head_scale = 0.22
    has_face = False
    if forehead_pt and chin_pt:
        has_face = True
        head_height = abs(chin_pt[1] - forehead_pt[1])
        if head_height > 0.05:
            head_scale = head_height
    elif mouth_pt or chin_pt or forehead_pt:
        has_face = True

    thumb_tip = coords[4]
    index_tip = coords[8]
    middle_tip = coords[12]
    palm_center = (
        (coords[0][0] + coords[9][0]) / 2,
        (coords[0][1] + coords[9][1]) / 2,
        (coords[0][2] + coords[9][2]) / 2
    )

    # Precise handshape classification:
    # 1. Open 5-hand: all 5 fingers extended and spread wide (span > 1.6)
    is_open_5_hand = (
        index_ext and middle_ext and ring_ext and pinky_ext and thumb_ext and
        hand_span > 1.60 and pinch_dist > 0.35
    )

    # 2. 'W' Handshape: Index, middle, ring extended, pinky curled, thumb folded
    is_w_handshape = index_ext and middle_ext and ring_ext and not pinky_ext

    # 3. Bunched fingertips (Squished 'O'): fingertips gathered together towards mouth
    tip_cluster = max(d(4, 8), d(8, 12), d(12, 16)) / palm_size
    is_bunched_eat = (
        tip_cluster < 0.42 and
        d(4, 12) / palm_size < 0.45 and
        not is_open_5_hand and
        not is_w_handshape
    )

    # 4. 'C' Cup Handshape: curved fingers holding glass, thumb opposing curved fingers
    is_c_drink = (
        0.35 <= pinch_dist <= 1.15 and
        not is_open_5_hand and
        not is_bunched_eat and
        not is_w_handshape and
        (index_ext or middle_ext)
    )

    # 5. Flat hand: all 4 fingers extended flat together
    is_flat_hand = (
        index_ext and middle_ext and ring_ext and pinky_ext and
        v_spread <= 0.22
    )

    # Contact proximity thresholds (in normalized webcam coordinates)
    contact_radius = min(0.13, max(0.08, palm_size * 0.75))
    mouth_radius = min(0.14, max(0.09, palm_size * 0.85))

    # =========================================================================
    # 1. HEAD-ANCHORED SIGNS (Evaluated first to prevent hello/stop hijacking)
    # =========================================================================

    # (A) DAD: Open 5-hand with thumb touching or at forehead
    if is_open_5_hand:
        if forehead_pt:
            dist_to_forehead = min(
                dist_2d(thumb_tip, forehead_pt),
                dist_2d(coords[2], forehead_pt),
                dist_2d(coords[5], forehead_pt)
            )
            dist_to_chin = dist_2d(thumb_tip, chin_pt) if chin_pt else 1.0

            # Thumb/hand is touching forehead, above mouth/chin level, and closer to forehead than chin
            if dist_to_forehead <= contact_radius and dist_to_forehead < dist_to_chin * 0.85:
                if mouth_pt is None or thumb_tip[1] <= mouth_pt[1]:
                    return "dad", 0.97
        elif coords[0][1] < 0.38 and thumb_tip[1] < 0.28:
            return "dad", 0.93

    # (B) MOM: Open 5-hand with thumb touching chin (thumb is closest anchor to chin)
    if is_open_5_hand:
        if chin_pt:
            dist_to_chin = min(
                dist_2d(thumb_tip, chin_pt),
                dist_2d(coords[2], chin_pt)
            )
            dist_to_forehead = dist_2d(thumb_tip, forehead_pt) if forehead_pt else 1.0
            dist_to_mouth = dist_2d(thumb_tip, mouth_pt) if mouth_pt else 1.0
            dist_index_to_chin = dist_2d(index_tip, chin_pt)

            # Thumb is touching chin, clearly closer to chin than forehead or mouth,
            # and thumb is closer to chin than index fingertip is (distinguishes from thank_you)
            if dist_to_chin <= contact_radius and dist_to_chin <= dist_to_mouth + 0.03:
                if dist_to_chin < dist_to_forehead * 0.85 and dist_to_chin < dist_index_to_chin:
                    if forehead_pt is None or thumb_tip[1] >= forehead_pt[1] + 0.05:
                        return "mom", 0.97
        elif 0.36 <= thumb_tip[1] <= 0.58 and coords[0][1] >= 0.55:
            pass

    # (C) WATER: 'W' handshape touching chin or mouth
    if is_w_handshape:
        if chin_pt or mouth_pt:
            target_pt = chin_pt or mouth_pt
            assert target_pt is not None
            dist_to_target = min(
                dist_2d(index_tip, target_pt),
                dist_2d(thumb_tip, target_pt),
                dist_2d(coords[6], target_pt)
            )
            if dist_to_target <= mouth_radius:
                return "water", 0.97
        # W-handshape in neutral space is also recognized as Water
        return "water", 0.95

    # (D) EAT: Bunched fingertips (squished O-shape) tapping towards mouth
    if is_bunched_eat:
        if mouth_pt or chin_pt:
            target_pt = mouth_pt or chin_pt
            assert target_pt is not None
            dist_to_target = min(
                dist_2d(index_tip, target_pt),
                dist_2d(thumb_tip, target_pt),
                dist_2d(middle_tip, target_pt)
            )
            if dist_to_target <= mouth_radius:
                return "eat", 0.96
        elif 0.28 <= index_tip[1] <= 0.48 and coords[0][1] > 0.48:
            return "eat", 0.91

    # (E) THANK YOU: Flat open hand with fingertips starting at chin or mouth
    if index_ext and middle_ext and ring_ext and pinky_ext:
        if chin_pt or mouth_pt:
            target_pt = chin_pt or mouth_pt
            assert target_pt is not None
            dist_fingertip = min(
                dist_2d(index_tip, target_pt),
                dist_2d(middle_tip, target_pt)
            )
            dist_thumb = dist_2d(thumb_tip, target_pt)
            # Fingertips (index or middle) at mouth or chin, closer to mouth/chin than thumb
            if dist_fingertip <= mouth_radius and dist_fingertip <= dist_thumb + 0.05:
                if forehead_pt is None or index_tip[1] >= forehead_pt[1] + 0.05:
                    return "thank_you", 0.96

    # (F) DRINK: C-handshape or cup hand tipped towards mouth
    if mouth_pt:
        dist_to_mouth = min(
            dist_2d(thumb_tip, mouth_pt),
            dist_2d(index_tip, mouth_pt)
        )
        dist_to_chin = dist_2d(thumb_tip, chin_pt) if chin_pt else 1.0
        # Hand at mouth, closer to mouth than chin, not bunched like eat, not open 5 hand
        if dist_to_mouth <= mouth_radius and dist_to_mouth <= dist_to_chin and not is_bunched_eat and not is_open_5_hand:
            if thumb_ext or is_c_drink:
                return "drink", 0.96
    elif 0.28 <= thumb_tip[1] <= 0.52 and coords[0][1] > 0.48 and not is_bunched_eat and not is_open_5_hand:
        return "drink", 0.91

    # =========================================================================
    # 2. TWO-HANDED GESTURES (Help, Clean)
    # =========================================================================
    if hand_count >= 2 and hands and len(hands) > 1 and len(hands[1]) >= 21:
        if thumb_pointing_up and not index_ext and not middle_ext and not ring_ext and not pinky_ext:
            return "help", 0.94
        return "clean", 0.88

    # =========================================================================
    # 3. NON-HEAD STANDARD GESTURES
    # =========================================================================

    # I LOVE YOU ('ILY'): Thumb, Index, and Pinky extended, Middle and Ring curled
    if thumb_ext and index_ext and pinky_ext and not middle_ext and not ring_ext:
        return "i_love_you", 0.96

    # GO / POINT: Index extended straight, others curled
    if index_ext and not middle_ext and not ring_ext and not pinky_ext and not thumb_pointing_up:
        return "go", 0.94

    # HELLO: All 5 fingers extended and spread in neutral space (away from head anchors)
    if all_five_open:
        return "hello", 0.95

    # THUMBS UP: Thumb pointing upward, other 4 fingers curled
    if thumb_pointing_up and not index_ext and not middle_ext and not ring_ext and not pinky_ext:
        return "thumbs_up", 0.94

    # PEACE: Index and middle extended in V-shape, ring and pinky curled
    if index_ext and middle_ext and not ring_ext and not pinky_ext and v_spread > 0.10:
        return "peace", 0.94

    # STOP: All 4 fingers extended flat together in neutral space
    if index_ext and middle_ext and ring_ext and pinky_ext:
        return "stop", 0.92

    # NO: Index and middle pinching with thumb
    if index_ext and middle_ext and pinch_dist < 0.45 and not ring_ext and not pinky_ext:
        return "no", 0.93

    # TOILET: Fist with thumb poking up between index & middle knuckles
    if not index_ext and not middle_ext and not ring_ext and not pinky_ext and (coords[4][1] < coords[6][1]):
        return "toilet", 0.91

    # YES: Closed fist (all fingers curled, thumb folded, NOT pointing up)
    if not index_ext and not middle_ext and not ring_ext and not pinky_ext and not thumb_pointing_up:
        return "yes", 0.92

    return None, 0.0

class ModelPredictor:
    def __init__(self):
        self.model = None
        self.label_encoder = None
        self.metadata = None
        self.load_model()

    def load_model(self) -> bool:
        """Loads model and label encoder if they exist on disk."""
        if MODEL_FILE.exists() and LABEL_ENCODER_FILE.exists():
            try:
                self.model = joblib.load(MODEL_FILE)
                self.label_encoder = joblib.load(LABEL_ENCODER_FILE)
                if METADATA_FILE.exists():
                    with open(METADATA_FILE, "r", encoding="utf-8") as f:
                        self.metadata = json.load(f)
                else:
                    self.metadata = {}
                return True
            except Exception as e:
                logger.error(f"Failed to load model files: {e}")
                self.model = None
                self.label_encoder = None
                return False
        return False

    def is_ready(self) -> bool:
        return self.model is not None and self.label_encoder is not None

    def get_status(self) -> Dict[str, Any]:
        ready = self.is_ready()
        if not ready:
            ready = self.load_model()

        if ready and self.label_encoder is not None:
            classes = [str(c) for c in self.label_encoder.classes_]
            metadata = self.metadata or {}
            return {
                "ready": True,
                "classes": classes,
                "sample_count": metadata.get("sample_count", 0),
                "accuracy": metadata.get("test_accuracy") or metadata.get("train_accuracy", 1.0),
                "last_trained": metadata.get("last_trained"),
                "estimator_count": metadata.get("n_estimators", 100),
                "feature_dimension": metadata.get("feature_dimension", 148),
                "message": f"Model active with {len(classes)} sign classes."
            }
        else:
            return {
                "ready": False,
                "classes": [],
                "sample_count": 0,
                "accuracy": None,
                "last_trained": None,
                "message": "No model trained yet."
            }

    def predict(
        self,
        landmarks: Optional[List[Any]] = None,
        hands: Optional[List[List[Any]]] = None,
        features: Optional[List[float]] = None,
        face: Optional[Dict[str, Any]] = None,
        face_landmarks: Optional[List[Any]] = None
    ) -> Dict[str, Any]:
        """
        Runs hybrid inference: evaluates head & hand geometric invariant rules and Random Forest ensemble.
        """
        # 1. Evaluate geometric rules with face & head awareness
        rule_label, rule_conf = evaluate_geometric_rules(
            hands=hands,
            landmarks=landmarks,
            face=face,
            face_landmarks=face_landmarks
        )

        # 2. Extract standardized 148D feature vector
        feature_vector = extract_features_from_sample(
            landmarks=landmarks,
            hands=hands,
            features=features
        )

        rf_probabilities = {}
        rf_top_label = None
        rf_top_conf = 0.0

        # Run Random Forest if loaded
        if self.is_ready():
            try:
                X = np.array([feature_vector], dtype=np.float32)
                probs = self.model.predict_proba(X)[0]
                classes = self.label_encoder.classes_

                for cls_name, prob in zip(classes, probs):
                    rf_probabilities[str(cls_name)] = round(float(prob), 4)

                top_idx = int(np.argmax(probs))
                rf_top_label = str(classes[top_idx])
                rf_top_conf = float(probs[top_idx])
            except Exception as e:
                logger.warning(f"RF predict error: {e}")

        # 3. Decision Fusion
        final_label = None
        final_confidence = 0.0
        all_probs: Dict[str, float] = {}

        if rule_label:
            # Rule detected a definitive gesture
            final_label = rule_label
            rf_score = rf_probabilities.get(rule_label, 0.0)
            # Never drag down a definitive geometric rule match; boost up to 0.99 if RF agrees
            final_confidence = round(max(rule_conf, min(0.99, rule_conf + 0.1 * rf_score)), 4)
        elif rf_top_label and rf_top_conf >= 0.35:
            final_label = rf_top_label
            final_confidence = round(rf_top_conf, 4)
        elif rf_top_label:
            final_label = rf_top_label
            final_confidence = round(rf_top_conf, 4)
        else:
            final_label = "unknown"
            final_confidence = 0.0

        all_probs = rf_probabilities if rf_probabilities else {final_label: final_confidence}
        if rule_label and rule_label in all_probs:
            all_probs[rule_label] = max(all_probs[rule_label], final_confidence)

        return {
            "label": final_label,
            "confidence": min(1.0, max(0.0, final_confidence)),
            "recognized": final_confidence >= 0.50,
            "all_probabilities": all_probs
        }
