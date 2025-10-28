from sqlalchemy.orm import Session
from database.models import Message
from schemas.message import MessageCreateRequest

def get_messages_by_conversation_id(db: Session, conversation_id: int, skip: int = 0, limit: int = 100):
    return db.query(Message).filter(Message.conversation_id == conversation_id).offset(skip).limit(limit).all()

def get_messages_by_world_id(db: Session, world_id: int, skip: int = 0, limit: int = 100):
    return db.query(Message).filter(Message.world_id == world_id).offset(skip).limit(limit).all()

def create_message(db: Session, message: MessageCreateRequest):
    db_message = Message(**message.dict())
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message