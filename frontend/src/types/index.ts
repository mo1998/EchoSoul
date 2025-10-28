export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  conversation_id?: number;
  world_id?: number;
  character_id?: number;
}

export interface Character {
  id: number;
  name: string;
  core_memory: string;
  adaptive_memory: Record<string, any>; // Assuming adaptive_memory is a JSON object
  image_data?: string; // This is added in the frontend, not directly from backend schema
}

export interface Conversation {
  id: number;
  character_id: number;
  created_at: string;
  image_data: string;
  character: Character; // Nested character object
  messages: Message[];
  gender?: string;
}

export interface World {
  id: number;
  name: string;
  created_at: string;
  characters: Character[];
  messages: Message[];
}

export interface CharacterCreate {
  name: string;
  description: string; // This maps to core_memory in the backend
}

export interface WorldCreate {
  name: string;
  character_ids: number[];
}