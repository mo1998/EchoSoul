import os
import requests
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from urllib.parse import quote
from dotenv import load_dotenv
from groq import Groq
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from datetime import datetime
import base64
import uuid
import json
import re
from fastapi.responses import JSONResponse

# Load environment variables
load_dotenv()

# --- Database Setup ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./echosoul.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class Character(Base):
    __tablename__ = "characters"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, unique=True)
    core_memory = Column(Text)  # Initial description
    adaptive_memory = Column(Text, default="{}") # Stored as a JSON string
    
    conversations = relationship("Conversation", back_populates="character")

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("characters.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    image_data = Column(Text)  # Store Base64 image data

    character = relationship("Character", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String)  # "user" or "assistant"
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- FastAPI App Initialization ---
app = FastAPI()

# CORS Middleware
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:8080",
    "http://localhost:8081",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AI Client Initialization ---
client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)
if not os.getenv("GROQ_API_KEY"):
    print("Warning: GROQ_API_KEY is not set. Please create a .env file in the 'backend' directory.")

# --- Pydantic Models ---
class GenerateRequest(BaseModel):
    name: str
    description: str

class ChatMessageRequest(BaseModel):
    user_message: str

# --- API Endpoints ---

@app.get("/api")
def read_root():
    return {"Hello": "World"}

@app.post("/api/generate")
def generate_image(request: GenerateRequest, db: Session = Depends(get_db)):
    """
    Generates a character, an image for it, and a new conversation.
    """
    print("Character generation request received...")
    
    character = db.query(Character).filter(Character.name == request.name).first()
    if not character:
        character = Character(name=request.name, core_memory=request.description)
        db.add(character)
        db.commit()
        db.refresh(character)

    prompt_text = f"{request.name}, {request.description}"
    encoded_prompt = quote(prompt_text)
    image_url = f"https://pollinations.ai/p/{encoded_prompt}?width=512&height=512"
    
    try:
        print(f"Fetching image from: {image_url}")
        response = requests.get(image_url, timeout=180)
        response.raise_for_status()

        content_type = response.headers.get('Content-Type', 'image/jpeg')
        base64_image = base64.b64encode(response.content).decode('utf-8')
        data_url = f"data:{content_type};base64,{base64_image}"

        db_conversation = Conversation(
            character_id=character.id,
            image_data=data_url
        )
        db.add(db_conversation)
        db.commit()
        db.refresh(db_conversation)

        print("Successfully created character, generated image, and started a new conversation.")
        return {"image_url": data_url, "conversation_id": db_conversation.id, "character_id": character.id}
    except Exception as e:
        print(f"Error during image fetching or encoding: {e}")
        return JSONResponse(content={"error": "Failed to generate image"}, status_code=500)

@app.post("/api/conversations/{conversation_id}/messages")
def send_message(conversation_id: int, request: ChatMessageRequest, db: Session = Depends(get_db)):
    """
    Send a message in a specific conversation and get AI response.
    This endpoint now handles the memory extraction and merge logic.
    """
    print(f"Message received for conversation {conversation_id}...")
    
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        return JSONResponse(content={"error": "Conversation not found"}, status_code=404)
    
    character = conversation.character
    
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=request.user_message
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)
    
    conversation_history = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.timestamp.desc()).limit(10).all()
    conversation_text = "\n".join([f"{msg.role}: {msg.content}" for msg in reversed(conversation_history)])

    memory_extraction_prompt = f"""
    Analyze the following conversation involving the character '{character.name}'. Your task is to extract key information and present it ONLY as a JSON object. Do not include any explanatory text before or after the JSON.

    The JSON object should have the following keys:
    - "newly_learned_facts": A list of new facts learned about the character.
    - "emotional_state": A brief description of the character's current emotional state.
    - "personality_traits": Any new personality traits observed.

    Conversation:
    {conversation_text}

    JSON output:
    """

    try:
        memory_completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "system", "content": memory_extraction_prompt}],
            temperature=0.2,
            max_tokens=300
        )
        extracted_memory_str = memory_completion.choices[0].message.content.strip()
        
        if extracted_memory_str:
            try:
                # Find the JSON object within the string
                match = re.search(r'\{.*\}', extracted_memory_str, re.DOTALL)
                if match:
                    json_str = match.group(0)
                    extracted_memory = json.loads(json_str)
                    
                    adaptive_memory = json.loads(character.adaptive_memory)
                    for key, value in extracted_memory.items():
                        if key in adaptive_memory and isinstance(adaptive_memory[key], list):
                            # Avoid duplicates
                            for item in value:
                                if item not in adaptive_memory[key]:
                                    adaptive_memory[key].append(item)
                        else:
                            adaptive_memory[key] = value
                    
                    character.adaptive_memory = json.dumps(adaptive_memory, indent=4)
                    db.commit()
                    print("Successfully updated adaptive memory.")
                else:
                    print(f"No JSON object found in memory extraction output: {extracted_memory_str}")

            except json.JSONDecodeError:
                print(f"Could not decode JSON from memory extraction: {extracted_memory_str}")
        else:
            print("Memory extraction returned an empty string. Skipping memory update.")

    except Exception as e:
        print(f"Error during memory extraction: {e}")

    system_prompt = f"""
    You are {character.name}.
    Core Identity: {character.core_memory}
    Learned Memories & Traits: {character.adaptive_memory}
    
    You must act and speak as this character. Your personality is defined by your core identity and your learned memories.
    Do not break character. Do not mention you are an AI.
    """
    
    history = [{"role": msg.role, "content": msg.content} for msg in reversed(conversation_history)]
    messages = [{"role": "system", "content": system_prompt}] + history
    
    try:
        chat_completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.75,
            max_tokens=500
        )
        ai_message_content = chat_completion.choices[0].message.content.strip()
        
        ai_message = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=ai_message_content
        )
        db.add(ai_message)
        db.commit()
        db.refresh(ai_message)
        
        return {"reply": ai_message_content}
    except Exception as e:
        print(f"An error occurred with the AI model: {e}")
        return JSONResponse(content={"error": "Failed to get response from AI"}, status_code=500)

@app.get("/api/conversations/{conversation_id}")
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        return JSONResponse(content={"error": "Conversation not found"}, status_code=404)
        
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.timestamp).all()
    
    # Infer gender from description
    description = conversation.character.core_memory.lower()
    
    male_keywords = ['male', 'man', 'boy', 'he', 'his', 'him', 'father', 'son', 'brother', 'uncle', 'nephew', 'king', 'prince']
    female_keywords = ['female', 'woman', 'girl', 'she', 'her', 'hers', 'mother', 'daughter', 'sister', 'aunt', 'niece', 'queen', 'princess']

    male_score = sum(len(re.findall(rf"\b{word}\b", description, flags=re.IGNORECASE)) for word in male_keywords)
    female_score = sum(len(re.findall(rf"\b{word}\b", description, flags=re.IGNORECASE)) for word in female_keywords)
    print(f"Male score:{male_score}, Female score:{female_score}")
    gender = "neutral"
    if male_score > female_score:
        gender = "male"
    elif female_score > male_score:
        gender = "female"

    return {
        "id": conversation.id,
        "character_name": conversation.character.name,
        "character_description": conversation.character.core_memory,
        "adaptive_memory": json.loads(conversation.character.adaptive_memory),
        "gender": gender,
        "image_data": conversation.image_data,
        "created_at": conversation.created_at.isoformat(),
        "messages": [{"id": msg.id, "role": msg.role, "content": msg.content, "timestamp": msg.timestamp.isoformat()} for msg in messages]
    }

@app.get("/api/conversations")
def get_all_conversations(db: Session = Depends(get_db)):
    conversations = db.query(Conversation).order_by(Conversation.created_at.desc()).all()
    
    return [
        {
            "id": conv.id,
            "character_name": conv.character.name,
            "image_data": conv.image_data,
            "created_at": conv.created_at.isoformat()
        }
        for conv in conversations
    ]

@app.delete("/api/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        return JSONResponse(content={"error": "Conversation not found"}, status_code=404)
    
    character = conversation.character
    db.delete(conversation)
    
    if not character.conversations:
        db.delete(character)
        
    db.commit()
    
    return {"message": "Conversation deleted successfully"}
