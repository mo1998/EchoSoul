from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import requests
from urllib.parse import quote
import base64
from fastapi.responses import JSONResponse

from database import models
from database.connection import get_db
from schemas.character import CharacterResponse, CharacterCreate
from schemas.conversation import ConversationResponse, ConversationCreate
from crud import character as crud_character, conversation as crud_conversation

router = APIRouter()

@router.get("/", response_model=List[CharacterResponse])
def read_characters(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    characters = crud_character.get_characters(db, skip=skip, limit=limit)
    return characters


@router.post("/", response_model=CharacterResponse)
def create_character(character: CharacterCreate, db: Session = Depends(get_db)):
    db_character = crud_character.get_character_by_name(db, name=character.name)
    if db_character:
        raise HTTPException(status_code=400, detail="Character with this name already exists")
    return crud_character.create_character(db=db, character=character)


@router.get("/{character_id}", response_model=CharacterResponse)
def read_character(character_id: int, db: Session = Depends(get_db)):
    db_character = crud_character.get_character(db, character_id=character_id)
    if db_character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return db_character


@router.post("/generate", response_model=ConversationResponse)
def generate_character_with_image(request: CharacterCreate, db: Session = Depends(get_db)):
    """
    Generates a character, an image for it, and a new conversation.
    """
    print("Character generation request received...")
    
    db_character = crud_character.get_character_by_name(db, name=request.name)
    if not db_character:
        db_character = crud_character.create_character(db, character=request)

    prompt_text = f"{request.name}, {request.core_memory}"
    encoded_prompt = quote(prompt_text)
    image_url = f"https://pollinations.ai/p/{encoded_prompt}?width=512&height=512"
    
    try:
        print(f"Fetching image from: {image_url}")
        response = requests.get(image_url, timeout=180)
        response.raise_for_status()

        image_data_url = f"data:{response.headers.get('Content-Type', 'image/jpeg')};base64,{base64.b64encode(response.content).decode('utf-8')}"
        
        # Update the character with the generated image data
        db_character.image_data = image_data_url
        db.add(db_character)
        db.commit()
        db.refresh(db_character)

        db_conversation = crud_conversation.create_conversation(
            db, 
            conversation=ConversationCreate(character_id=db_character.id, image_data=image_data_url)
        )

        print("Successfully created character, generated image, and started a new conversation.")
        return db_conversation
    except Exception as e:
        print(f"Error during image fetching or encoding: {e}")
        return JSONResponse(content={"error": "Failed to generate image"}, status_code=500)
