export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: number;
  character_name: string;
  character_description: string;
  gender?: string;
  image_data: string;
  created_at: string;
  messages: Message[];
}

export interface CharacterData {
  name: string;
  description: string;
  image_data?: string;
}