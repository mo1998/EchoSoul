from sqlalchemy.orm import Session, joinedload
from database.models import Conversation, Message, Character
from schemas.conversation import ConversationCreate
from schemas.message import MessageCreateRequest

def get_conversation(db: Session, conversation_id: int):
    return db.query(Conversation).options(joinedload(Conversation.character)).filter(Conversation.id == conversation_id).first()

def get_conversations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Conversation).options(joinedload(Conversation.character)).offset(skip).limit(limit).all()

def create_conversation(db: Session, conversation: ConversationCreate):
    db_conversation = Conversation(character_id=conversation.character_id, image_data=conversation.image_data)
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    return db_conversation

def delete_conversation(db: Session, conversation_id: int):
    db_conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if db_conversation:
        character = db_conversation.character
        db.delete(db_conversation)
        if not character.conversations:
            db.delete(character)
        db.commit()
        return True
    return False