from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import re

from database import models
from database.connection import get_db
from schemas.conversation import ConversationResponse, ConversationCreate
from schemas.message import MessageResponse, ChatMessageRequest, MessageCreateRequest
from crud import conversation as crud_conversation, message as crud_message

router = APIRouter()

@router.get("/", response_model=List[ConversationResponse])
def read_conversations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    conversations = crud_conversation.get_conversations(db, skip=skip, limit=limit)
    return conversations


@router.post("/", response_model=ConversationResponse)
def create_conversation(conversation: ConversationCreate, db: Session = Depends(get_db)):
    return crud_conversation.create_conversation(db=db, conversation=conversation)


@router.get("/{conversation_id}", response_model=ConversationResponse)
def read_conversation(conversation_id: int, db: Session = Depends(get_db)):
    db_conversation = crud_conversation.get_conversation(db, conversation_id=conversation_id)
    if db_conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Infer gender from description
    description = db_conversation.character.core_memory.lower()
    
    male_keywords = ['male', 'man', 'boy', 'he', 'his', 'him', 'father', 'son', 'brother', 'uncle', 'nephew', 'king', 'prince']
    female_keywords = ['female', 'woman', 'girl', 'she', 'her', 'hers', 'mother', 'daughter', 'sister', 'aunt', 'niece', 'queen', 'princess']

    male_score = sum(len(re.findall(rf"\b{word}\b", description, flags=re.IGNORECASE)) for word in male_keywords)
    female_score = sum(len(re.findall(rf"\b{word}\b", description, flags=re.IGNORECASE)) for word in female_keywords)
    
    gender = "neutral"
    if male_score > female_score:
        gender = "male"
    elif female_score > male_score:
        gender = "female"

    db_conversation.gender = gender
    db_conversation.messages = crud_message.get_messages_by_conversation_id(db, conversation_id=conversation_id)

    return db_conversation


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
def create_message_for_conversation(conversation_id: int, message: ChatMessageRequest, db: Session = Depends(get_db)):
    message_create_request = MessageCreateRequest(
        conversation_id=conversation_id,
        role="user",
        content=message.user_message
    )
    return crud_message.create_message(db=db, message=message_create_request)


@router.delete("/{conversation_id}", status_code=204)
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    if not crud_conversation.delete_conversation(db, conversation_id=conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation deleted successfully"}
