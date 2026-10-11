from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class TrainingResponse(BaseModel):
    status: str
    message: str
    accuracy: float
    classes: List[str]
    sample_count: int
    test_accuracy: Optional[float] = None
    cv_score: Optional[float] = None
    metrics_per_class: Optional[Dict[str, Any]] = None

class ModelStatusResponse(BaseModel):
    ready: bool
    classes: List[str]
    sample_count: int
    accuracy: Optional[float] = None
    last_trained: Optional[str] = None
    estimator_count: Optional[int] = None
    feature_dimension: Optional[int] = None
    message: Optional[str] = None
