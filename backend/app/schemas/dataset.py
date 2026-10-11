from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.landmarks import LandmarkPoint

class SampleInput(BaseModel):
    label: str
    landmarks: Optional[List[LandmarkPoint]] = None
    hands: Optional[List[List[LandmarkPoint]]] = None
    features: Optional[List[float]] = None
    face_landmarks: Optional[List[LandmarkPoint]] = None
    faceLandmarks: Optional[List[LandmarkPoint]] = None
    face: Optional[Dict[str, Any]] = None

class AddSamplesRequest(BaseModel):
    samples: List[SampleInput]

class DatasetSummaryResponse(BaseModel):
    total_samples: int
    labels: Dict[str, int]
    label_count: int
