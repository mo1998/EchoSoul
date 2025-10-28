from pydantic import BaseModel

class CharacterBase(BaseModel):
    name: str
    core_memory: str
    adaptive_memory: str = "{}"

class CharacterCreate(CharacterBase):
    pass

class CharacterResponse(CharacterBase):
    id: int

    class Config:
        orm_mode = True