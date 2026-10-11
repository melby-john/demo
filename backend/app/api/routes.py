import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.landmarks import PredictionRequest, PredictionResponse
from app.schemas.dataset import AddSamplesRequest, DatasetSummaryResponse
from app.schemas.model import TrainingResponse, ModelStatusResponse
from app.services.dataset_service import DatasetService
from app.services.model_service import ModelService
from app.services.isign_service import ISignService

router = APIRouter(prefix="/api")

# Initialize services
dataset_service = DatasetService()
model_service = ModelService(dataset_service)
isign_service = ISignService()

@router.get("/health")
def get_health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "app": "SignConnect AI",
        "tagline": "Every Sign. Every Voice.",
        "version": "1.0.0",
        "timestamp": datetime.datetime.now().isoformat()
    }

@router.get("/model/status", response_model=ModelStatusResponse)
def get_model_status():
    """Returns current model status, active classes, accuracy, and sample count."""
    status_info = model_service.get_status()
    return status_info

@router.get("/dataset/summary", response_model=DatasetSummaryResponse)
def get_dataset_summary():
    """Returns summary of recorded training samples grouped by label."""
    return dataset_service.get_summary()

@router.post("/dataset/samples")
def add_dataset_samples(payload: AddSamplesRequest):
    """
    Appends newly recorded sign landmark samples to the persistent dataset.
    """
    if not payload.samples:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No samples provided in payload."
        )

    # Basic limit protection
    if len(payload.samples) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload exceeds maximum limit of 5,000 samples per batch."
        )

    sample_dicts = [s.model_dump() for s in payload.samples]
    added = dataset_service.add_samples(sample_dicts)

    return {
        "status": "success",
        "added_count": added,
        "summary": dataset_service.get_summary()
    }

@router.delete("/dataset/samples")
def delete_dataset_samples(label: Optional[str] = Query(None, description="Optional label to delete. If omitted, clears all.")):
    """Deletes samples from dataset (either specific label or all)."""
    removed = dataset_service.delete_samples(label)
    return {
        "status": "success",
        "deleted_count": removed,
        "label": label or "all",
        "summary": dataset_service.get_summary()
    }

@router.post("/dataset/reset-default")
def reset_default_dataset():
    """Resets dataset to default canonical signs and retrains model."""
    dataset_service.delete_samples()
    added = dataset_service.seed_default_samples()
    training_res = model_service.train_model()
    return {
        "status": "success",
        "message": f"Reset dataset with {added} samples across 27 core & daily signs.",
        "training": training_res
    }

@router.post("/model/train", response_model=TrainingResponse)
def train_model():
    """
    Trains a Random Forest classifier on all currently collected dataset samples.
    """
    try:
        result = model_service.train_model()
        return result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model training failed: {str(e)}"
        )

@router.post("/model/predict", response_model=PredictionResponse)
def predict_sign(payload: PredictionRequest):
    """
    Classifies input hand landmarks using the trained model.
    """
    try:
        face_lms = payload.face_landmarks or payload.faceLandmarks
        prediction = model_service.predict(
            landmarks=payload.landmarks,
            hands=payload.hands,
            features=payload.features,
            face=payload.face,
            face_landmarks=face_lms
        )
        return prediction
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(re)
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(e)}"
        )

# --- Exploration-Lab/iSign Benchmark Routes ---

@router.get("/isign/stats")
def get_isign_stats():
    """Returns metadata and statistics from Exploration-Lab/iSign benchmark dataset."""
    return isign_service.get_stats()

@router.get("/isign/words")
def get_isign_words(
    q: Optional[str] = Query(None, description="Search query for word, description, or example sentences"),
    limit: int = Query(100, ge=1, le=2000, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset")
):
    """Searches and returns paginated ISL words from Exploration-Lab/iSign benchmark."""
    return isign_service.search_words(query=q, limit=limit, offset=offset)

@router.get("/isign/words/{word}")
def get_isign_word_detail(word: str):
    """Returns details, semantic definition, and example presence sentences for a specific ISL word."""
    result = isign_service.get_word(word)
    if not result:
        raise HTTPException(status_code=404, detail=f"Word '{word}' not found in iSign dataset.")
    return result
