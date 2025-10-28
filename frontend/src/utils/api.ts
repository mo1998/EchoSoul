import axios from 'axios';
import type { Character, Conversation, World, CharacterCreate, WorldCreate, Message } from '../types';

const API_BASE_URL = 'http://localhost:8000/api/v1'; // Updated to include /v1

// Create axios instance with default settings
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
const getConversations = () => apiClient.get<Conversation[]>('/conversations');

const getConversation = (id: number) => apiClient.get<Conversation>(`/conversations/${id}`);

const createCharacter = (data: { name: string; core_memory: string }) => 
  apiClient.post<Conversation>('/characters/generate', data); // Returns Conversation, not Character

const sendMessage = (conversationId: number, message: string) => 
  apiClient.post<Message>(`/conversations/${conversationId}/messages`, { 
    user_message: message 
  });

const deleteConversation = (id: number) => apiClient.delete(`/conversations/${id}`);

const getCharacters = () => apiClient.get<Character[]>('/characters');

const createWorld = (data: WorldCreate) => 
  apiClient.post<World>('/worlds', data);

const getAllWorlds = () => apiClient.get<World[]>('/worlds');

const getWorld = (id: number) => apiClient.get<World>(`/worlds/${id}`);

const sendWorldMessage = (worldId: number, message: string) => 
  apiClient.post<Message>(`/worlds/${worldId}/messages`, { 
    user_message: message 
  });

const deleteWorld = (id: number) => apiClient.delete(`/worlds/${id}`);

export {
  getConversations,
  getConversation,
  createCharacter,
  sendMessage,
  deleteConversation,
  getCharacters,
  createWorld,
  getAllWorlds,
  getWorld,
  sendWorldMessage,
  deleteWorld,
};

export default apiClient;