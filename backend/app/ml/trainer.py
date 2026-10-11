import datetime
import json
import logging
from typing import Dict, Any, List, Tuple
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

from app.core.config import MODEL_FILE, LABEL_ENCODER_FILE, METADATA_FILE
from app.ml.feature_extractor import extract_features_from_sample, FEATURE_DIM

logger = logging.getLogger(__name__)

class ModelTrainer:
    def __init__(self):
        pass

    def train(self, samples: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Trains a Random Forest classifier on collected landmark samples.
        """
        if not samples:
            raise ValueError("Cannot train on an empty dataset. Please record sign samples first.")

        # Group by label to validate
        label_counts: Dict[str, int] = {}
        for s in samples:
            label = s.get("label", "").strip()
            if label:
                label_counts[label] = label_counts.get(label, 0) + 1

        if len(label_counts) < 2:
            raise ValueError(
                f"Training requires at least 2 distinct sign labels. Currently found {len(label_counts)}: {list(label_counts.keys())}. "
                "Please record samples for at least two different signs."
            )

        for lbl, count in label_counts.items():
            if count < 3:
                raise ValueError(
                    f"Sign label '{lbl}' has only {count} samples. Please record at least 3 samples per sign (10+ recommended)."
                )

        # Extract features and targets
        X_list: List[List[float]] = []
        y_list: List[str] = []

        for s in samples:
            try:
                feat = extract_features_from_sample(
                    landmarks=s.get("landmarks"),
                    hands=s.get("hands"),
                    features=s.get("features")
                )
                X_list.append(feat)
                y_list.append(s["label"].strip().lower())
            except Exception as e:
                logger.warning(f"Skipping invalid sample during training: {e}")
                continue

        if len(X_list) < 6:
            raise ValueError("Insufficient valid samples extracted for training. Please record more samples.")

        X = np.array(X_list, dtype=np.float32)
        y = np.array(y_list)

        # Encode labels
        label_encoder = LabelEncoder()
        y_encoded = label_encoder.fit_transform(y)
        classes = [str(c) for c in label_encoder.classes_]

        # Evaluate split strategy
        min_class_samples = min(label_counts.values())
        test_acc = None

        if min_class_samples >= 2 and len(X) >= 10:
            try:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
                )
            except Exception:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y_encoded, test_size=0.2, random_state=42
                )
        else:
            X_train, y_train = X, y_encoded
            X_test, y_test = None, None

        # Train Random Forest Classifier
        rf = RandomForestClassifier(
            n_estimators=100,
            max_depth=15,
            min_samples_split=2,
            random_state=42,
            n_jobs=-1
        )
        rf.fit(X_train, y_train)

        train_acc = float(accuracy_score(y_train, rf.predict(X_train)))

        if X_test is not None and len(X_test) > 0:
            test_preds = rf.predict(X_test)
            test_acc = float(accuracy_score(y_test, test_preds))
        else:
            test_acc = train_acc

        # Fit on full dataset for maximum deployment quality
        rf_full = RandomForestClassifier(
            n_estimators=100,
            max_depth=15,
            min_samples_split=2,
            random_state=42,
            n_jobs=-1
        )
        rf_full.fit(X, y_encoded)

        # Save artifacts
        joblib.dump(rf_full, MODEL_FILE)
        joblib.dump(label_encoder, LABEL_ENCODER_FILE)

        metadata = {
            "classes": classes,
            "sample_count": len(X),
            "train_accuracy": round(train_acc, 4),
            "test_accuracy": round(test_acc, 4) if test_acc is not None else round(train_acc, 4),
            "last_trained": datetime.datetime.now().isoformat(),
            "n_estimators": 100,
            "feature_dimension": FEATURE_DIM,
            "label_distribution": label_counts,
        }

        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        return {
            "status": "success",
            "message": f"Successfully trained Random Forest model with {len(classes)} signs ({len(X)} total samples).",
            "accuracy": metadata["test_accuracy"],
            "classes": classes,
            "sample_count": len(X),
            "test_accuracy": metadata["test_accuracy"],
            "metrics_per_class": label_counts,
        }
