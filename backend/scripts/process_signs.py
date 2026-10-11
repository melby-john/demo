import os
import shutil
from PIL import Image

src_img = r"C:\Users\MELBY\.gemini\antigravity-ide\brain\92609eb8-0449-4c6d-b28f-dfeefd145d88\.user_uploaded\media_1791651785470.jpg"
out_dir = r"frontend/public/signs"
os.makedirs(out_dir, exist_ok=True)

# Copy full master chart
shutil.copyfile(src_img, os.path.join(out_dir, "daily_signs_chart.jpg"))
print("Copied master daily_signs_chart.jpg")

img = Image.open(src_img)

row_bands = [(1, 224), (261, 484), (520, 743), (780, 1003)]
col_bands = [(0, 158), (173, 330), (347, 504), (522, 678), (695, 851), (866, 1024)]

cards = [
    [("yes", "Yes"), ("no", "No"), ("toilet", "Toilet"), ("go", "Go"), ("eat", "Eat"), ("drink", "Drink")],
    [("stop", "Stop"), ("all_done", "All Done"), ("sit", "Sit"), ("open", "Open"), ("less", "Less"), ("more", "More")],
    [("thank_you", "Thank You"), ("water", "Water"), ("mom", "Mom"), ("dad", "Dad"), ("please", "Please"), ("sorry", "Sorry")],
    [("help", "Help"), ("question", "Question"), ("show_me", "Show Me"), ("youre_welcome", "You're Welcome"), ("i_love_you", "I Love You"), ("clean", "Clean")]
]

for r_idx, (r_start, r_end) in enumerate(row_bands):
    for c_idx, (c_start, c_end) in enumerate(col_bands):
        slug, title = cards[r_idx][c_idx]
        cropped = img.crop((c_start, r_start, c_end, r_end))
        out_path = os.path.join(out_dir, f"{slug}.jpg")
        cropped.save(out_path, quality=95)
        print(f"Saved {slug}.jpg: size {cropped.size}")

print("Successfully sliced all 24 sign cards!")
