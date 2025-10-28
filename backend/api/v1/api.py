from fastapi import APIRouter

from api.v1.endpoints import character, conversation, world

api_router = APIRouter()
api_router.include_router(character.router, prefix="/characters", tags=["characters"])
api_router.include_router(conversation.router, prefix="/conversations", tags=["conversations"])
api_router.include_router(world.router, prefix="/worlds", tags=["worlds"])
