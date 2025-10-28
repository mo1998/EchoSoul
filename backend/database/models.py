from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime

from database.base import Base

# Association Table for World and Character
world_characters = Table('world_characters', Base.metadata,
    Column('world_id', Integer, ForeignKey('worlds.id'), primary_key=True),
    Column('character_id', Integer, ForeignKey('characters.id'), primary_key=True)
)

# Database Models
class World(Base):
    __tablename__ = "worlds"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    characters = relationship("Character", secondary=world_characters, back_populates="worlds")
    messages = relationship("Message", back_populates="world", cascade="all, delete-orphan")

class Character(Base):
    __tablename__ = "characters"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, unique=True)
    core_memory = Column(Text)  # Initial description
    adaptive_memory = Column(Text, default="{}") # Stored as a JSON string
    
    conversations = relationship("Conversation", back_populates="character")
    worlds = relationship("World", secondary=world_characters, back_populates="characters")

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
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)
    world_id = Column(Integer, ForeignKey("worlds.id"), nullable=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=True) # Who sent it in a world context
    role = Column(String)  # "user" or "assistant"
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")
    world = relationship("World", back_populates="messages")
    character = relationship("Character") # The character who sent the message