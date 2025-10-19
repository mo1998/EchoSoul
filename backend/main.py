
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

# Load environment variables
load_dotenv()

# --- Database Setup ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./echosoul.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    character_name = Column(String, index=True)
    character_description = Column(Text)
    image_data = Column(Text)  # Store Base64 image data
    created_at = Column(DateTime, default=datetime.utcnow)
    
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

# CORS Middleware: Allows the React frontend to communicate with this backend
origins = [
    "http://localhost:3000",
    "http://localhost:5173",  # Default Vite dev server port
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
# Initialize the Groq client
# The user will need to create a .env file in the 'backend' directory
# with their GROQ_API_KEY
client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)
if not os.getenv("GROQ_API_KEY"):
    print("Warning: GROQ_API_KEY is not set. Please create a .env file in the 'backend' directory.")


# --- Pydantic Models (for Request Bodies) ---
class GenerateRequest(BaseModel):
    name: str
    description: str

class ChatRequest(BaseModel):
    character_data: dict
    history: list[dict]

class ChatMessageRequest(BaseModel):
    user_message: str

# --- API Endpoints ---

@app.get("/api")
def read_root():
    return {"Hello": "World"}

@app.post("/api/generate")
def generate_image(request: GenerateRequest, db: Session = Depends(get_db)):
    """
    Generates an image based on the character description, encodes it as a Base64 Data URL.
    """
    print("Image generation request received...")
    prompt_text = f"{request.name}, {request.description}"
    encoded_prompt = quote(prompt_text)
    image_url = f"https://pollinations.ai/p/{encoded_prompt}?width=512&height=512"
    
    try:
        print(f"Fetching image from: {image_url}")
        response = requests.get(image_url, timeout=180)
        response.raise_for_status()

        # Encode the image content into Base64
        content_type = response.headers.get('Content-Type', 'image/jpeg')
        base64_image = base64.b64encode(response.content).decode('utf-8')
        data_url = f"data:{content_type};base64,{base64_image}"

        # Save to database
        db_conversation = Conversation(
            character_name=request.name,
            character_description=request.description,
            image_data=data_url
        )
        db.add(db_conversation)
        db.commit()
        db.refresh(db_conversation)

        print("Successfully encoded image to Base64 Data URL and saved to database.")
        return {"image_url": data_url, "conversation_id": db_conversation.id}
    except Exception as e:
        print(f"Error during image fetching or encoding: {e}")
        return {"error": "Failed to generate image"}, 500

@app.post("/api/chat")
def chat_with_character(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Handles the chat logic, sending context to the AI model.
    """
    print("Chat request received...")
    character_data = request.character_data
    history = request.history

    system_prompt = f"""
    You are {character_data['name']}. Your personality, history, and appearance are defined by the following description:
    ---
    {character_data['description']}
    ---
    You must act and speak as this character at all times. Do not break character. Do not mention that you are an AI.
    Be engaging and respond to the user in a natural way that is true to your character.
    """
    
    messages = [{"role": "system", "content": system_prompt}] + history

    try:
        chat_completion = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=messages,
            temperature=0.75,
            max_tokens=200
        )
        ai_message = chat_completion.choices[0].message.content.strip()
        
        # TODO: Need to identify conversation_id in a real scenario
        # For now, we'll need to pass conversation_id in the request
        return {"reply": ai_message}
    except Exception as e:
        print(f"An error occurred with the AI model: {e}")
        return {"error": "Failed to get response from AI"}, 500

# New endpoint for handling chat messages with conversation ID
@app.post("/api/conversations/{conversation_id}/messages")
def send_message(conversation_id: int, request: ChatMessageRequest, db: Session = Depends(get_db)):
    """
    Send a message in a specific conversation and get AI response.
    """
    print(f"Message received for conversation {conversation_id}...")
    
    # Get the conversation from database
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        return {"error": "Conversation not found"}, 404
    
    # Get all messages in the conversation
    messages_in_db = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.timestamp).all()
    
    # Add the new user message to the database
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=request.user_message
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)
    
    # Build the history for the AI
    history = [{"role": msg.role, "content": msg.content} for msg in messages_in_db] + [{"role": "user", "content": request.user_message}]
    
    # Prepare the system prompt
    system_prompt = f"""
    You are {conversation.character_name}. Your personality, history, and appearance are defined by the following description:
    ---
    {conversation.character_description}
    ---
    You must act and speak as this character at all times. Do not break character. Do not mention that you are an AI.
    Be engaging and respond to the user in a natural way that is true to your character.
    """
    
    messages = [{"role": "system", "content": system_prompt}] + history
    
    try:
        chat_completion = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=messages,
            temperature=0.75,
            max_tokens=200
        )
        ai_message_content = chat_completion.choices[0].message.content.strip()
        
        # Add the AI response to the database
        ai_message = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=ai_message_content
        )
        db.add(ai_message)
        db.commit()
        db.refresh(ai_message)
        
        return {"reply": ai_message_content, "message_id": ai_message.id}
    except Exception as e:
        print(f"An error occurred with the AI model: {e}")
        return {"error": "Failed to get response from AI"}, 500

# Endpoint to get conversation history
@app.get("/api/conversations/{conversation_id}")
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """
    Get conversation details and message history.
    """
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        return {"error": "Conversation not found"}, 404
        
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.timestamp).all()
    
    return {
        "id": conversation.id,
        "character_name": conversation.character_name,
        "character_description": conversation.character_description,
        "image_data": conversation.image_data,
        "created_at": conversation.created_at.isoformat(),
        "messages": [{"id": msg.id, "role": msg.role, "content": msg.content, "timestamp": msg.timestamp.isoformat()} for msg in messages]
    }

# Endpoint to get all conversations
@app.get("/api/conversations")
def get_all_conversations(db: Session = Depends(get_db)):
    """
    Get all conversations.
    """
    conversations = db.query(Conversation).order_by(Conversation.created_at.desc()).all()
    
    return [{
        "id": conv.id,
        "character_name": conv.character_name,
        "character_description": conv.character_description,
        "image_data": conv.image_data,
        "created_at": conv.created_at.isoformat()
    } for conv in conversations]

# Endpoint to delete a conversation
@app.delete("/api/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """
    Delete a conversation and all its messages.
    """
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        return {"error": "Conversation not found"}, 404
    
    db.delete(conversation)
    db.commit()
    
    return {"message": "Conversation deleted successfully"}

# Test endpoint to save image to test directory
@app.post("/api/test-image")
def test_image_save(request: GenerateRequest):
    """
    Test endpoint to generate and save image to test directory for verification.
    """
    import os
    print("Test image save request received...")
    prompt_text = f"{request.name}, {request.description}"
    encoded_prompt = quote(prompt_text)
    image_url = f"https://pollinations.ai/p/{encoded_prompt}?width=512&height=512"
    
    try:
        print(f"Fetching image from: {image_url}")
        response = requests.get(image_url, timeout=120)
        response.raise_for_status()

        # Generate a unique filename
        filename = f"test_image_{uuid.uuid4().hex[:8]}.jpg"
        filepath = os.path.join("test", filename)
        
        # Create test directory if it doesn't exist
        os.makedirs("test", exist_ok=True)
        
        # Save the image content to file
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        print(f"Image saved to: {filepath}")
        
        # Encode the image content into Base64
        content_type = response.headers.get('Content-Type', 'image/jpeg')
        base64_image = base64.b64encode(response.content).decode('utf-8')
        data_url = f"data:{content_type};base64,{base64_image}"

        return {"image_url": data_url, "saved_path": filepath}
    except Exception as e:
        print(f"Error during image fetching or saving: {e}")
        return {"error": f"Failed to generate and save image: {str(e)}"}, 500

