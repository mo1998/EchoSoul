from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MessageBase(BaseModel):
    role: str
    content: str
    conversation_id: Optional[int] = None
    world_id: Optional[int] = None
    character_id: Optional[int] = None

class MessageCreateRequest(MessageBase):
    pass

class ChatMessageRequest(BaseModel):
    user_message: str

class MessageResponse(MessageBase):
    id: int
    timestamp: datetime

    class Config:
        orm_mode = True