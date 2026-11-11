from typing import List
from fastapi import APIRouter, HTTPException
from backend.data.loader import get_all_characters, get_character_by_id
from backend.models.character import Character

router = APIRouter(prefix="/api/characters", tags=["Characters"])


@router.get("", response_model=List[Character])
def list_characters() -> List[Character]:
    return get_all_characters()


@router.get("/{character_id}", response_model=Character)
def get_character(character_id: str) -> Character:
    char = get_character_by_id(character_id)
    if not char:
        raise HTTPException(
            status_code=404, detail=f"Character '{character_id}' not found"
        )
    return char
