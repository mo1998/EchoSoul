from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import logging
import json

from database import models
from database.connection import get_db
from schemas.world import WorldResponse, WorldCreate
from schemas.message import MessageResponse, ChatMessageRequest, MessageCreateRequest
from crud import world as crud_world, message as crud_message, character as crud_character

from crewai import Agent, Task, Crew, Process
from core.llm import client as groq_client # Import the Groq client from its new location

router = APIRouter()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[WorldResponse])
def read_worlds(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    worlds = crud_world.get_worlds(db, skip=skip, limit=limit)
    return worlds


@router.post("/", response_model=WorldResponse)
def create_world(world: WorldCreate, db: Session = Depends(get_db)):
    return crud_world.create_world(db=db, world=world)


@router.get("/{world_id}", response_model=WorldResponse)
def read_world(world_id: int, db: Session = Depends(get_db)):
    db_world = crud_world.get_world(db, world_id=world_id)
    if db_world is None:
        raise HTTPException(status_code=404, detail="World not found")
    return db_world


@router.post("/{world_id}/messages", response_model=MessageResponse)
def create_message_for_world(world_id: int, message: ChatMessageRequest, db: Session = Depends(get_db)):
    db_world = crud_world.get_world(db, world_id=world_id)
    if not db_world:
        raise HTTPException(status_code=404, detail="World not found")

    user_message = crud_message.create_message(db, message=MessageCreateRequest(world_id=world_id, role="user", content=message.user_message))

    # Create a list of character agents
    character_agents = []
    for character in db_world.characters:
        agent = Agent(
            role=character.name,
            goal=f"Embody the character of {character.name} and respond to the user's message.",
            backstory=character.core_memory,
            allow_delegation=False,
            verbose=True,
            llm=groq_client # Pass the Groq client here
        )
        character_agents.append(agent)

    # Create a director agent
    director = Agent(
        role="Director",
        goal="Analyze the user's message and the conversation history, then select ONE character to respond. Output the chosen character's name and their response in JSON format: {'character_name': '[Name]', 'response': '[Response]'}",
        backstory="You are the director of a multi-character conversation. Your job is to ensure the conversation flows naturally and that the characters respond appropriately by selecting the best character to reply.",
        allow_delegation=True,
        verbose=True,
        llm=groq_client # Pass the Groq client here
    )

    # Create a task for the director to choose a character and get their response
    director_task = Task(
        description=f"Given the user's message: '{message.user_message}', and the available characters: {', '.join([c.name for c in db_world.characters])}. Choose the most appropriate character to respond and generate their response. Output in JSON format: {{'character_name': '[Name]', 'response': '[Response]'}}",
        expected_output="A JSON object containing the chosen character's name and their response.",
        agent=director
    )

    # Create a crew with only the director initially
    crew = Crew(
        agents=[director] + character_agents, # Include all agents for context, but director will delegate
        tasks=[director_task],
        process=Process.sequential # Director makes decision, then (implicitly) one character responds
    )

    # Kick off the crew
    result_json_str = str(crew.kickoff()) 
    logger.info(f"Crew kickoff result: {result_json_str}")

    try:
        # Attempt to parse the JSON output from the director
        parsed_result = json.loads(result_json_str)
        responding_character_name = parsed_result.get("character_name")
        ai_message_content = parsed_result.get("response")

        if not responding_character_name or not ai_message_content:
            raise ValueError("Director did not return expected JSON format.")

    except json.JSONDecodeError:
        logger.error(f"Failed to decode JSON from crew result: {result_json_str}")
        raise HTTPException(status_code=500, detail="AI Director returned malformed JSON.")
    except ValueError as e:
        logger.error(f"Error parsing director's output: {e}")
        raise HTTPException(status_code=500, detail=f"Error parsing director's output: {e}")

    responding_character = crud_character.get_character_by_name(db, name=responding_character_name)
    if not responding_character:
        logger.error(f"Responding character '{responding_character_name}' not found in database.")
        raise HTTPException(status_code=500, detail=f"Responding character '{responding_character_name}' not found.")

    ai_message = crud_message.create_message(db, message=MessageCreateRequest(world_id=world_id, role="assistant", content=ai_message_content, character_id=responding_character.id))

    return ai_message


@router.delete("/{world_id}", status_code=204)
def delete_world(world_id: int, db: Session = Depends(get_db)):
    if not crud_world.delete_world(db, world_id=world_id):
        raise HTTPException(status_code=404, detail="World not found")
    return {"message": "World deleted successfully"}
