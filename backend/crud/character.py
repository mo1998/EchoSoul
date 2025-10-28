import re
import random
from sqlalchemy.orm import Session
from database.models import Character
from schemas.character import CharacterCreate

MALE_VOICE_NAMES = ['Microsoft David - English (United States)', 'Microsoft Mark - English (United States)', 'Microsoft William Online (Natural) - English (Australia)', 'Microsoft Liam Online (Natural) - English (Canada)', 'Microsoft Sam Online (Natural) - English (Hongkong)', 'Microsoft Prabhat Online (Natural) - English (India)', 'Microsoft Connor Online (Natural) - English (Ireland)', 'Microsoft Chilemba Online (Natural) - English (Kenya)', 'Microsoft Mitchell Online (Natural) - English (New Zealand)', 'Microsoft Abeo Online (Natural) - English (Nigeria)', 'Microsoft James Online (Natural) - English (Philippines)', 'Microsoft Wayne Online (Natural) - English (Singapore)', 'Microsoft AndrewMultilingual Online (Natural) - English (United States)', 'Microsoft BrianMultilingual Online (Natural) - English (United States)', 'Microsoft Andrew Online (Natural) - English (United States)', 'Microsoft Brian Online (Natural) - English (United States)', 'Microsoft Luke Online (Natural) - English (South Africa)', 'Microsoft Elimu Online (Natural) - English (Tanzania)', 'Microsoft Ryan Online (Natural) - English (United Kingdom)', 'Microsoft Thomas Online (Natural) - English (United Kingdom)', 'Microsoft Christopher Online (Natural) - English (United States)', 'Microsoft Eric Online (Natural) - English (United States)', 'Microsoft Guy Online (Natural) - English (United States)', 'Microsoft Roger Online (Natural) - English (United States)', 'Microsoft Steffan Online (Natural) - English (United States)']
FEMALE_VOICE_NAMES = ['Microsoft Zira - English (United States)', 'Microsoft Natasha Online (Natural) - English (Australia)', 'Microsoft Clara Online (Natural) - English (Canada)', 'Microsoft Yan Online (Natural) - English (Hong Kong SAR)', 'Microsoft Neerja Online (Natural) - English (India) (Preview)', 'Microsoft Neerja Online (Natural) - English (India)', 'Microsoft Emily Online (Natural) - English (Ireland)', 'Microsoft Asilia Online (Natural) - English (Kenya)', 'Microsoft Molly Online (Natural) - English (New Zealand)', 'Microsoft Ezinne Online (Natural) - English (Nigeria)', 'Microsoft Rosa Online (Natural) - English (Philippines)', 'Microsoft Luna Online (Natural) - English (Singapore)', 'Microsoft AvaMultilingual Online (Natural) - English (United States)', 'Microsoft EmmaMultilingual Online (Natural) - English (United States)', 'Microsoft Ava Online (Natural) - English (United States)', 'Microsoft Emma Online (Natural) - English (United States)', 'Microsoft Leah Online (Natural) - English (South Africa)', 'Microsoft Imani Online (Natural) - English (Tanzania)', 'Microsoft Libby Online (Natural) - English (United Kingdom)', 'Microsoft Maisie Online (Natural) - English (United Kingdom)', 'Microsoft Sonia Online (Natural) - English (United Kingdom)', 'Microsoft Ana Online (Natural) - English (United States)', 'Microsoft Aria Online (Natural) - English (United States)', 'Microsoft Jenny Online (Natural) - English (United States)', 'Microsoft Michelle Online (Natural) - English (United States)']

def _select_voice_id(gender: str | None) -> str | None:
    if gender == 'male':
        return random.choice(MALE_VOICE_NAMES)
    elif gender == 'female':
        return random.choice(FEMALE_VOICE_NAMES)
    return None

def _infer_gender_from_description(description: str) -> str | None:
    description_lower = description.lower()
    words = re.findall(r'''\b\w+\b''', description_lower)

    male_keywords = ["he", "him", "his", "male", "man", "boy"]
    female_keywords = ["she", "her", "hers", "female", "woman", "girl"]

    male_score = sum(1 for word in words if word in male_keywords)
    female_score = sum(1 for word in words if word in female_keywords)

    if male_score > female_score:
        return "male"
    if female_score > male_score:
        return "female"
    return None

def get_character(db: Session, character_id: int):
    return db.query(Character).filter(Character.id == character_id).first()

def get_character_by_name(db: Session, name: str):
    return db.query(Character).filter(Character.name == name).first()

def get_characters(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Character).offset(skip).limit(limit).all()

def create_character(db: Session, character: CharacterCreate):
    # Infer gender from core_memory if not explicitly provided
    gender = character.gender
    if gender is None:
        gender = _infer_gender_from_description(character.core_memory)

    voice_id = character.voice_id
    if voice_id is None:
        voice_id = _select_voice_id(gender)

    db_character = Character(
        name=character.name,
        core_memory=character.core_memory,
        adaptive_memory=character.adaptive_memory,
        image_data=character.image_data,
        voice_id=voice_id,
        gender=gender
    )
    db.add(db_character)
    db.commit()
    db.refresh(db_character)
    return db_character