import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Create axios instance with default settings
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
const getConversations = () => apiClient.get('/conversations');

const getConversation = (id: number) => apiClient.get(`/conversations/${id}`);

const createCharacter = (data: { name: string; description: string }) => 
  apiClient.post('/generate', data);

const sendMessage = (conversationId: number, message: string) => 
  apiClient.post(`/conversations/${conversationId}/messages`, { 
    user_message: message 
  });

const testImage = (data: { name: string; description: string }) => 
  apiClient.post('/test-image', data);

export {
  getConversations,
  getConversation,
  createCharacter,
  sendMessage,
  testImage
};

export default apiClient;