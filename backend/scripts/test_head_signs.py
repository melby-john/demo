import sys
import os

sys.path.insert(0, os.path.abspath("backend"))

from app.services.model_service import ModelService
from app.services.dataset_service import DatasetService
from scripts.generate_all_signs_dataset import build_all_sign_templates

def test():
    d_service = DatasetService()
    m_service = ModelService(d_service)
    templates = build_all_sign_templates()

    face = {
        "forehead": {"x": 0.50, "y": 0.20, "z": 0.0},
        "nose": {"x": 0.50, "y": 0.30, "z": 0.0},
        "mouth": {"x": 0.50, "y": 0.38, "z": 0.0},
        "chin": {"x": 0.50, "y": 0.46, "z": 0.0}
    }

    # Helper to shift template to an anchor
    def shift_to(pts, target_idx, target_x, target_y):
        dx = target_x - pts[target_idx][0]
        dy = target_y - pts[target_idx][1]
        return [{"x": p[0] + dx, "y": p[1] + dy, "z": p[2]} for p in pts]

    tests = [
        # Head signs
        ("dad", shift_to(templates["dad"], 4, 0.50, 0.20), face, "dad"),
        ("mom", shift_to(templates["mom"], 4, 0.50, 0.46), face, "mom"),
        ("water", shift_to(templates["water"], 8, 0.50, 0.46), face, "water"),
        ("eat", shift_to(templates["eat"], 8, 0.50, 0.38), face, "eat"),
        ("drink", shift_to(templates["drink"], 4, 0.47, 0.38), face, "drink"),
        ("thank_you", shift_to(templates["thank_you"], 8, 0.50, 0.44), face, "thank_you"),
        # Non-head signs in neutral space (hand away from face)
        ("hello", [{"x": p[0], "y": p[1], "z": p[2]} for p in templates["hello"]], face, "hello"),
        ("yes", [{"x": p[0], "y": p[1], "z": p[2]} for p in templates["yes"]], face, "yes"),
        ("no", [{"x": p[0], "y": p[1], "z": p[2]} for p in templates["no"]], face, "no"),
        ("go", [{"x": p[0], "y": p[1], "z": p[2]} for p in templates["go"]], face, "go"),
        ("thumbs_up", [{"x": p[0], "y": p[1], "z": p[2]} for p in templates["thumbs_up"]], face, "thumbs_up"),
        ("peace", [{"x": p[0], "y": p[1], "z": p[2]} for p in templates["peace"]], face, "peace"),
    ]

    print("--- Running Head & Body Sign Verification ---")
    all_passed = True
    for name, hand, f_data, expected in tests:
        res = m_service.predict(hands=[hand], face=f_data)
        actual = res["label"]
        conf = res["confidence"]
        status = "PASS" if actual == expected else "FAIL"
        if status == "FAIL":
            all_passed = False
        print(f"[{status}] {name:10} -> detected: {actual:10} (expected: {expected:10}, conf: {conf:.2f})")

    if all_passed:
        print("\nAll 12 signs including head-anchored signs PASSED with flying colors!")
    else:
        print("\nSome signs did not match expected.")

if __name__ == "__main__":
    test()
