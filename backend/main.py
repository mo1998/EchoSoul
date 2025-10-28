from fastapi import FastAPI
from api.v1.api import api_router
from database.connection import engine
from database.base import Base
from core.llm import client # Import the Groq client

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(api_router, prefix="/api/v1")
