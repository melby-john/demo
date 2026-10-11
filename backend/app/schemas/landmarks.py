from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class LandmarkPoint(BaseModel):
    x: float
    y: float
    z: float = 0.0

class PredictionRequest(BaseModel):
    landmarks: Optional[List[LandmarkPoint]] = None
    hands: Optional[List[List[LandmarkPoint]]] = None
    features: Optional[List[float]] = None
    face_landmarks: Optional[List[LandmarkPoint]] = None
    faceLandmarks: Optional[List[LandmarkPoint]] = None
    face: Optional[Dict[str, Any]] = None

class PredictionResponse(BaseModel):
    label: str
    confidence: float
    recognized: bool
    all_probabilities: Dict[str, float] = Field(default_factory=dict)
