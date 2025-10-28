from sqlalchemy.orm import Session
from database.models import World, Character
from schemas.world import WorldCreate

def get_world(db: Session, world_id: int):
    return db.query(World).filter(World.id == world_id).first()

def get_worlds(db: Session, skip: int = 0, limit: int = 100):
    return db.query(World).offset(skip).limit(limit).all()

def create_world(db: Session, world: WorldCreate):
    db_world = World(name=world.name)
    db.add(db_world)
    db.commit()
    db.refresh(db_world)
    
    for char_id in world.character_ids:
        character = db.query(Character).filter(Character.id == char_id).first()
        if character:
            db_world.characters.append(character)
    db.commit()
    db.refresh(db_world)
    return db_world

def delete_world(db: Session, world_id: int):
    db_world = db.query(World).filter(World.id == world_id).first()
    if db_world:
        db.delete(db_world)
        db.commit()
        return True
    return False