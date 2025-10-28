import os
from dotenv import load_dotenv, find_dotenv
from crewai import LLM # Import LLM from crewai

# Load environment variables from the project root .env file
load_dotenv(find_dotenv())

client = LLM(
    model="groq/openai/gpt-oss-20b", # Specify the Groq model
    temperature=0.7
)

if not os.getenv("GROQ_API_KEY"):
    print("Warning: GROQ_API_KEY is not set. Please create a .env file in the project root directory.")