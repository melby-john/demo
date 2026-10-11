import json
import os

vocab_path = "backend/app/data/isign_vocabulary.json"

with open(vocab_path, "r", encoding="utf-8") as f:
    data = json.load(f)

daily_signs = [
    {
        "word": "yes",
        "word_id": "essential_yes",
        "category": "Responses & Agreement",
        "description": "Form a closed fist (S-handshape) and nod it up and down from the wrist like a nodding head, signifying agreement and affirmation.",
        "examples": ["Yes, I understand.", "Yes, that is correct.", "Yes, please."]
    },
    {
        "word": "no",
        "word_id": "essential_no",
        "category": "Responses & Agreement",
        "description": "Extend index and middle fingers with thumb underneath, then snap them down quickly together against the thumb, indicating negation or refusal.",
        "examples": ["No, thank you.", "No, not right now.", "No problem at all."]
    },
    {
        "word": "toilet",
        "word_id": "essential_toilet",
        "category": "Daily Needs",
        "description": "Make a 'T' handshape with thumb tucked between index and middle finger, and shake the hand gently side-to-side to request the restroom.",
        "examples": ["Where is the toilet?", "I need to use the toilet.", "Please direct me to the toilet."]
    },
    {
        "word": "go",
        "word_id": "essential_go",
        "category": "Actions & Movement",
        "description": "Point both index fingers forward and roll them outward and away from the body in an arc to indicate moving or departing.",
        "examples": ["Let us go now.", "It is time to go.", "Go ahead, please."]
    },
    {
        "word": "eat",
        "word_id": "essential_eat",
        "category": "Daily Needs & Food",
        "description": "Bring fingertips together with thumb in a squished 'O' handshape and tap them repeatedly towards the mouth to signify food or dining.",
        "examples": ["Time to eat lunch.", "Would you like to eat?", "I want to eat fruit."]
    },
    {
        "word": "drink",
        "word_id": "essential_drink",
        "category": "Daily Needs & Food",
        "description": "Form a 'C' handshape mimicking holding a glass or cup, and tilt it upward toward the mouth as if taking a drink.",
        "examples": ["Please give me a drink.", "I need a drink of water.", "Drink warm fluids."]
    },
    {
        "word": "stop",
        "word_id": "essential_stop",
        "category": "Actions & Movement",
        "description": "Bring the pinky edge of an open flat hand firmly down into the open palm of the opposite hand in a chopping motion to signal halting.",
        "examples": ["Please stop here.", "Stop and listen.", "Let us stop for a moment."]
    },
    {
        "word": "all done",
        "word_id": "essential_all_done",
        "category": "Actions & Routine",
        "description": "Hold both open hands up with palms facing inward, then twist wrists outward so palms face away, signaling finished or all done.",
        "examples": ["I am all done with my work.", "Are you all done eating?", "We are all done for today."]
    },
    {
        "word": "sit",
        "word_id": "essential_sit",
        "category": "Actions & Movement",
        "description": "Bend index and middle fingers on both hands; tap the dominant bent fingers gently across the non-dominant bent fingers.",
        "examples": ["Please sit down here.", "Take a chair and sit.", "Sit with your family."]
    },
    {
        "word": "open",
        "word_id": "essential_open",
        "category": "Actions & Routine",
        "description": "Place both flat hands together with palms facing inward, then swing them outward and apart like opening double doors.",
        "examples": ["Open the door please.", "Open the book to page 10.", "Open the window."]
    },
    {
        "word": "less",
        "word_id": "essential_less",
        "category": "Quantity & Comparison",
        "description": "Hold both flat hands horizontally with one above the other; lower the upper hand down closer to indicate reduction or a smaller amount.",
        "examples": ["A little less sugar, please.", "Please speak with less noise.", "I need less time."]
    },
    {
        "word": "more",
        "word_id": "essential_more",
        "category": "Quantity & Comparison",
        "description": "Bring both hands into flattened 'O' shapes with fingertips touching thumbs, and tap the fingertips together repeatedly to request more.",
        "examples": ["More please.", "Can I have more water?", "Tell me more about it."]
    },
    {
        "word": "thank you",
        "word_id": "essential_thank_you",
        "category": "Politeness & Social",
        "description": "Touch the fingertips of a flat open hand to the chin or lips, then extend the hand forward toward the person to express gratitude.",
        "examples": ["Thank you very much.", "Thank you for helping me.", "I appreciate that, thank you."]
    },
    {
        "word": "water",
        "word_id": "essential_water",
        "category": "Daily Needs & Food",
        "description": "Form a 'W' handshape with three middle fingers extended, and tap the side of the index finger against the chin twice.",
        "examples": ["May I have a glass of water?", "Drink fresh water.", "Please pour some water."]
    },
    {
        "word": "mom",
        "word_id": "essential_mom",
        "category": "Family & People",
        "description": "Open the hand with all fingers spread (5-handshape) and tap the thumb tip gently against the chin twice to indicate mother.",
        "examples": ["My mom is at home.", "I will call mom.", "Mom is helping me study."]
    },
    {
        "word": "dad",
        "word_id": "essential_dad",
        "category": "Family & People",
        "description": "Open the hand with all fingers spread (5-handshape) and tap the thumb tip gently against the forehead twice to indicate father.",
        "examples": ["My dad is coming.", "I spoke with dad today.", "Dad showed me this sign."]
    },
    {
        "word": "please",
        "word_id": "essential_please",
        "category": "Politeness & Social",
        "description": "Place the flat open palm against the center of the chest and move it in a clockwise circular motion to express a polite request.",
        "examples": ["Please help me.", "Come here please.", "Please pass the book."]
    },
    {
        "word": "sorry",
        "word_id": "essential_sorry",
        "category": "Politeness & Social",
        "description": "Make a closed fist ('A' handshape) and rub it in a circular motion over the chest to express apology, regret, or sympathy.",
        "examples": ["I am so sorry.", "Sorry for the delay.", "I am sorry to disturb you."]
    },
    {
        "word": "help",
        "word_id": "essential_help",
        "category": "Assistance & Urgent",
        "description": "Place a closed fist with thumb extended upward on top of the flat palm of the other hand, and lift both hands upward together.",
        "examples": ["Please help me.", "Can I help you with that?", "We need help here."]
    },
    {
        "word": "question",
        "word_id": "essential_question",
        "category": "Inquiry & Learning",
        "description": "Extend index finger and flex it repeatedly into a hook shape resembling a question mark to ask or indicate a query.",
        "examples": ["I have a question.", "May I ask a question?", "Any questions so far?"]
    },
    {
        "word": "show me",
        "word_id": "essential_show_me",
        "category": "Communication & Inquiry",
        "description": "Press the tip of the dominant index finger into the center of the open non-dominant palm and push both forward toward the signer.",
        "examples": ["Show me how it is done.", "Please show me the sign.", "Show me the picture."]
    },
    {
        "word": "you're welcome",
        "word_id": "essential_youre_welcome",
        "category": "Politeness & Social",
        "description": "Hold open flat palm near waist/chest level and sweep outward and down in a welcoming motion responding to gratitude.",
        "examples": ["You are welcome!", "You are very welcome anytime.", "Happy to help, you are welcome."]
    },
    {
        "word": "i love you",
        "word_id": "essential_i_love_you",
        "category": "Affection & Expression",
        "description": "Extend the thumb, index finger, and pinky finger simultaneously with middle and ring fingers folded down (the universal ILY sign).",
        "examples": ["I love you so much.", "Sending the I love you sign.", "I love you Mom and Dad."]
    },
    {
        "word": "clean",
        "word_id": "essential_clean",
        "category": "Daily Life & Routine",
        "description": "Place dominant flat palm on non-dominant flat palm and slide the dominant hand smoothly forward across the surface.",
        "examples": ["Keep your hands clean.", "Please clean the table.", "Everything is neat and clean."]
    }
]

existing_words = {w["word"].lower(): w for w in data.get("words", [])}

added_count = 0
for s in daily_signs:
    if s["word"].lower() not in existing_words:
        data["words"].insert(0, s)
        added_count += 1

data["total_words"] = len(data["words"])

with open(vocab_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Added {added_count} essential daily signs to {vocab_path}. Total vocabulary words now: {data['total_words']}")
