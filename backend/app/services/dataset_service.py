import json
import logging
import uuid
import datetime
import math
import numpy as np
from typing import List, Dict, Any, Optional
from app.core.config import DATASET_FILE

logger = logging.getLogger(__name__)

class DatasetService:
    def __init__(self):
        self._ensure_dataset_file()

    def _ensure_dataset_file(self):
        if not DATASET_FILE.exists():
            with open(DATASET_FILE, "w", encoding="utf-8") as f:
                json.dump({"samples": []}, f, indent=2)

    def load_samples(self) -> List[Dict[str, Any]]:
        self._ensure_dataset_file()
        try:
            with open(DATASET_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("samples", [])
        except Exception as e:
            logger.error(f"Error loading dataset: {e}")
            return []

    def save_samples(self, samples: List[Dict[str, Any]]):
        with open(DATASET_FILE, "w", encoding="utf-8") as f:
            json.dump({"samples": samples}, f, indent=2)

    def add_samples(self, new_samples: List[Dict[str, Any]]) -> int:
        existing = self.load_samples()
        added_count = 0
        now = datetime.datetime.now().isoformat()

        for s in new_samples:
            label = str(s.get("label", "")).strip().lower()
            if not label:
                continue

            sample_entry = {
                "id": str(uuid.uuid4()),
                "label": label,
                "landmarks": s.get("landmarks"),
                "hands": s.get("hands"),
                "features": s.get("features"),
                "face": s.get("face"),
                "face_landmarks": s.get("face_landmarks") or s.get("faceLandmarks"),
                "created_at": now
            }
            existing.append(sample_entry)
            added_count += 1

        self.save_samples(existing)
        return added_count

    def get_summary(self) -> Dict[str, Any]:
        samples = self.load_samples()
        label_counts: Dict[str, int] = {}
        for s in samples:
            lbl = s.get("label", "").strip().lower()
            if lbl:
                label_counts[lbl] = label_counts.get(lbl, 0) + 1

        return {
            "total_samples": len(samples),
            "labels": label_counts,
            "label_count": len(label_counts)
        }

    def delete_samples(self, label: Optional[str] = None) -> int:
        samples = self.load_samples()
        if label:
            target_label = label.strip().lower()
            filtered = [s for s in samples if s.get("label", "").strip().lower() != target_label]
            removed = len(samples) - len(filtered)
            self.save_samples(filtered)
            return removed
        else:
            total = len(samples)
            self.save_samples([])
            return total

    def seed_default_samples(self) -> int:
        """
        Seeds canonical realistic landmark datasets for all 24 daily essential signs
        plus canonical signs (hello, thumbs_up, peace), augmented with rotation, scale, and left/right mirroring.
        """
        from scripts.generate_all_signs_dataset import build_all_sign_templates, generate_augmented_dataset
        templates = build_all_sign_templates()
        generated_samples = generate_augmented_dataset(templates)
        return self.add_samples(generated_samples)
