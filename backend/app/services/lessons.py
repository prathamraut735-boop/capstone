from typing import Any


PUBLISHED_LEARNING_LEVEL_IDS = {1}

LESSON_CATALOG: tuple[dict[str, Any], ...] = (
    {
        "id": "lesson-1",
        "levelId": 1,
        "title": "Find your singing voice",
        "description": "Warm up gently and explore the sounds your voice can make.",
        "instrument": "Singing",
        "duration": "8 min",
    },
    {
        "id": "lesson-2",
        "levelId": 1,
        "title": "Keep a steady beat",
        "description": "Clap, tap and listen for the steady pulse in a song.",
        "instrument": "Rhythm",
        "duration": "10 min",
    },
    {
        "id": "lesson-3",
        "levelId": 1,
        "title": "Meet your ukulele",
        "description": "Get to know the strings and how to hold your ukulele.",
        "instrument": "Ukulele",
        "duration": "12 min",
    },
    {
        "id": "lesson-4",
        "levelId": 1,
        "title": "Play your first chord",
        "description": "Practise a first chord shape at a comfortable pace.",
        "instrument": "Ukulele",
        "duration": "12 min",
    },
    {
        "id": "lesson-5",
        "levelId": 1,
        "title": "Sing a little melody",
        "description": "Listen closely and try singing a short, simple melody.",
        "instrument": "Singing",
        "duration": "9 min",
    },
    {
        "id": "lesson-6",
        "levelId": 1,
        "title": "Strum along",
        "description": "Try a gentle strumming pattern and keep the beat.",
        "instrument": "Ukulele",
        "duration": "11 min",
    },
    {
        "id": "lesson-7",
        "levelId": 1,
        "title": "Make up a tune",
        "description": "Experiment with a few notes and make a tune of your own.",
        "instrument": "Songwriting",
        "duration": "10 min",
    },
    {
        "id": "lesson-8",
        "levelId": 1,
        "title": "Put it all together",
        "description": "Bring your singing and playing together in a short practice.",
        "instrument": "Singing + ukulele",
        "duration": "14 min",
    },
)

LESSON_LEVELS = {lesson["id"]: lesson["levelId"] for lesson in LESSON_CATALOG}
