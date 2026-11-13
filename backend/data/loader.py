import json
from pathlib import Path
from typing import Dict, List, Optional
from backend.models.character import Character

DATA_DIR = Path(__file__).resolve().parent
CHARACTERS_FILE = DATA_DIR / "characters.json"

_CHARACTERS_CACHE: Optional[Dict[str, Character]] = None


def load_characters() -> Dict[str, Character]:
    global _CHARACTERS_CACHE
    if _CHARACTERS_CACHE is None:
        with open(CHARACTERS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        _CHARACTERS_CACHE = {
            item["id"]: Character.model_validate(item) for item in data
        }
    return _CHARACTERS_CACHE


def get_all_characters() -> List[Character]:
    char_dict = load_characters()
    return [c.model_copy(deep=True) for c in char_dict.values()]


def get_character_by_id(character_id: str) -> Optional[Character]:
    char_dict = load_characters()
    char = char_dict.get(character_id)
    if char:
        return char.model_copy(deep=True)
    return None
