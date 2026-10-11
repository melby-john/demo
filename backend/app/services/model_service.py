import logging
from typing import Dict, Any, Optional
from app.ml.trainer import ModelTrainer
from app.ml.predictor import ModelPredictor
from app.services.dataset_service import DatasetService

logger = logging.getLogger(__name__)

class ModelService:
    def __init__(self, dataset_service: DatasetService):
        self.dataset_service = dataset_service
        self.trainer = ModelTrainer()
        self.predictor = ModelPredictor()

        # If no model exists and dataset is empty, initialize default seed and train initial model
        if not self.predictor.is_ready():
            summary = self.dataset_service.get_summary()
            if summary["total_samples"] == 0:
                logger.info("Initializing starter sign dataset and training default prototype model...")
                self.dataset_service.seed_default_samples()
                try:
                    self.train_model()
                except Exception as e:
                    logger.warning(f"Could not auto-train starter model: {e}")

    def get_status(self) -> Dict[str, Any]:
        return self.predictor.get_status()

    def train_model(self) -> Dict[str, Any]:
        samples = self.dataset_service.load_samples()
        result = self.trainer.train(samples)
        # Reload predictor with freshly trained model
        self.predictor.load_model()
        return result

    def predict(self, landmarks=None, hands=None, features=None, face=None, face_landmarks=None) -> Dict[str, Any]:
        return self.predictor.predict(
            landmarks=landmarks,
            hands=hands,
            features=features,
            face=face,
            face_landmarks=face_landmarks
        )
