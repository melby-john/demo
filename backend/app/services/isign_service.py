import os
import json
from typing import List, Dict, Any, Optional

ISIGN_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "isign_vocabulary.json")

class ISignService:
    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._words: List[Dict[str, Any]] = []
        self._load_data()

    def _load_data(self):
        if os.path.exists(ISIGN_DATA_PATH):
            try:
                with open(ISIGN_DATA_PATH, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
                    self._words = self._data.get("words", [])
            except Exception as e:
                print(f"Error loading iSign vocabulary: {e}")
                self._data = {}
                self._words = []

    def get_stats(self) -> Dict[str, Any]:
        return {
            "source": self._data.get("source", "Exploration-Lab/iSign"),
            "benchmark_version": self._data.get("benchmark_version", "v1.1"),
            "total_words": len(self._words),
            "total_description_samples": self._data.get("total_description_samples", 0),
            "total_presence_samples": self._data.get("total_presence_samples", 0),
        }

    def search_words(self, query: Optional[str] = None, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        filtered = self._words
        if query:
            q = query.strip().lower()
            filtered = [
                w for w in self._words
                if q in w["word"].lower() or any(q in ex.lower() for ex in w.get("examples", [])) or q in w.get("description", "").lower()
            ]

        total = len(filtered)
        paginated = filtered[offset : offset + limit]

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "words": paginated
        }

    def get_word(self, word: str) -> Optional[Dict[str, Any]]:
        w_lower = word.strip().lower()
        for item in self._words:
            if item["word"].lower() == w_lower:
                return item
        return None
