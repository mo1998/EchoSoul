from pydantic import BaseModel
from datetime import datetime
from typing import List

from schemas.character import CharacterResponse
from schemas.message import MessageResponse

class WorldBase(BaseModel):
    name: str

class WorldCreate(WorldBase):
    character_ids: List[int]

class WorldResponse(WorldBase):
    id: int
    created_at: datetime
    characters: List[CharacterResponse] = []
    messages: List[MessageResponse] = []

    class Config:
        orm_mode = True