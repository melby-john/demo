import json
import os
from datasets import load_dataset

TOKEN = os.getenv("HF_TOKEN", "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")

def export_isign():
    print("Loading Exploration-Lab/iSign datasets from Hugging Face...")
    ds_desc = load_dataset("Exploration-Lab/iSign", "word-description-dataset_v1.1", token=TOKEN)["train"]
    ds_pres = load_dataset("Exploration-Lab/iSign", "word-presence-dataset_v1.1", token=TOKEN)["train"]

    words_map = {}

    # Process word descriptions
    for row in ds_desc:
        w = row["word"].strip().lower()
        if not w:
            continue
        if w not in words_map:
            words_map[w] = {
                "word": w,
                "word_id": row["word_id"],
                "description": row["sentence"],
                "examples": []
            }
        else:
            if row["sentence"] and row["sentence"] != words_map[w]["description"]:
                if row["sentence"] not in words_map[w]["examples"]:
                    words_map[w]["examples"].append(row["sentence"])

    # Process presence/example sentences
    for row in ds_pres:
        w = row["word"].strip().lower()
        if not w:
            continue
        sentence = row["sentence"].strip()
        if w in words_map:
            if sentence and sentence not in words_map[w]["examples"]:
                words_map[w]["examples"].append(sentence)
        else:
            words_map[w] = {
                "word": w,
                "word_id": row["word_id"],
                "description": f"Indian Sign Language sign for {w.capitalize()}",
                "examples": [sentence] if sentence else []
            }

    word_list = sorted(list(words_map.values()), key=lambda x: x["word"])
    print(f"Compiled {len(word_list)} unique ISL words!")

    os.makedirs("app/data", exist_ok=True)
    out_path = "app/data/isign_vocabulary.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({
            "source": "Exploration-Lab/iSign",
            "benchmark_version": "v1.1",
            "total_words": len(word_list),
            "total_description_samples": len(ds_desc),
            "total_presence_samples": len(ds_pres),
            "words": word_list
        }, f, indent=2)

    print(f"Successfully saved to {out_path}")

if __name__ == "__main__":
    export_isign()
