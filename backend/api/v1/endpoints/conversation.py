from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import re
import json
import logging

from database import models
from database.connection import get_db
from schemas.conversation import ConversationResponse, ConversationCreate
from schemas.message import MessageResponse, ChatMessageRequest, MessageCreateRequest
from crud import conversation as crud_conversation, message as crud_message

from crewai import Agent, Task, Crew, Process
from core.llm import client as groq_client # Import the Groq client from its new location

router = APIRouter()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    db_conversation = crud_conversation.get_conversation(db, conversation_id=conversation_id)
    if not db_conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Save user message
    user_message = crud_message.create_message(db, message=MessageCreateRequest(
        conversation_id=conversation_id,
        role="user",
        content=message.user_message
    ))

    # Create a character agent
    character = db_conversation.character
    character_agent = Agent(
        role=character.name,
        goal=f"Embody the character of {character.name} and respond to the user's message.",
        backstory=character.core_memory,
        allow_delegation=False,
        verbose=True,
        llm=groq_client
    )

    # Create a task for the character agent
    character_task = Task(
        description=f"Respond to the user's message: '{message.user_message}'. Consider the character's personality and backstory. Your response should be in character.",
        expected_output="A natural language response from the character.",
        agent=character_agent
    )

    # Create a crew with the character agent and task
    crew = Crew(
        agents=[character_agent],
        tasks=[character_task],
        process=Process.sequential
    )

    # Kick off the crew to get the AI's response
    ai_response_content_obj = crew.kickoff()
    ai_response_content = ai_response_content_obj.raw
    logger.info(f"AI Response: {ai_response_content}")

    # Save AI message
    ai_message = crud_message.create_message(db, message=MessageCreateRequest(
        conversation_id=conversation_id,
        role="assistant",
        content=ai_response_content,
        character_id=character.id
    ))

    return ai_message


@router.delete("/{conversation_id}", status_code=204)
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    if not crud_conversation.delete_conversation(db, conversation_id=conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation deleted successfully"}
