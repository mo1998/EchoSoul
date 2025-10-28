from pydantic import BaseModel
from typing import Optional

class CharacterBase(BaseModel):
    name: str
    core_memory: str
    adaptive_memory: str = "{}"
    image_data: Optional[str] = None
    voice_id: Optional[str] = None
    gender: Optional[str] = None

class CharacterCreate(CharacterBase):
    pass

class CharacterResponse(CharacterBase):
    id: int
    image_data: Optional[str] = None

    class Config:
        orm_mode = True