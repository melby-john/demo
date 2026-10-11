import sys
import os

sys.path.insert(0, os.path.abspath("backend"))

from app.services.dataset_service import DatasetService
from app.services.model_service import ModelService
from app.services.isign_service import ISignService

d_service = DatasetService()
summary = d_service.get_summary()
print("Total samples in dataset:", summary["total_samples"])
print("Total classes in dataset:", summary["label_count"])

m_service = ModelService(d_service)
status = m_service.get_status()
print("Model ready:", status["ready"])
print("Classes trained:", len(status["classes"]))
print("Accuracy:", status["accuracy"])

i_service = ISignService()
vocab_stats = i_service.get_stats()
print("ISign total words:", vocab_stats["total_words"])

for test_word in ["toilet", "eat", "drink", "water", "i love you", "yes", "no", "help", "mom", "dad"]:
    found = i_service.get_word(test_word)
    print(f"Lookup '{test_word}':", bool(found))
