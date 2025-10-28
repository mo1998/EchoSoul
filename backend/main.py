from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.v1.api import api_router
from database.connection import engine
from database.base import Base
from core.llm import client # Import the Groq client

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Set up CORS middleware
origins = [
    "http://localhost:5173",  # Frontend URL
    "http://127.0.0.1:5173", # Frontend URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
