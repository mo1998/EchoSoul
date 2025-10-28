from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

from schemas.character import CharacterResponse
from schemas.message import MessageResponse

class ConversationBase(BaseModel):
    character_id: int
    image_data: str

class ConversationCreate(ConversationBase):
    pass

class ConversationResponse(ConversationBase):
    id: int
    created_at: datetime
    character: CharacterResponse
    messages: List[MessageResponse] = []
    gender: Optional[str] = None

    class Config:
        orm_mode = True