import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import type { Conversation } from '../types';
import { getConversations, deleteConversation } from '../utils/api';
import ThemeToggle from '../components/ThemeToggle';

const Dashboard: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const response = await getConversations();
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteConversation(id);
      fetchConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>EchoSoul Conversations</h1>
        <p>Chat with your AI characters and continue past conversations</p>
        <div className="dashboard-actions">
          <ThemeToggle />
          <Link to="/create" className="btn">
            <PlusIcon style={{width: '20px', height: '20px'}} />
            Create New Character
          </Link>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="no-conversations">
          <ChatBubbleLeftRightIcon style={{width: '64px', height: '64px'}} />
          <h2>No conversations yet</h2>
          <p>Create your first character to start chatting!</p>
          <Link to="/create" className="btn">
            Create Character
          </Link>
        </div>
      ) : (
        <ul className="conversation-list">
          {conversations.map((conversation) => (
            <li key={conversation.id} className="conversation-item">
                <Link to={`/chat/${conversation.id}`} className="conversation-link">
                    <img 
                        src={conversation.image_data} 
                        alt={conversation.character_name} 
                        style={{width: '30px', height: '30px', borderRadius: '50%', marginRight: '15px'}}
                    />
                    <span className="conversation-name">{conversation.character_name}</span>
                </Link>
              <button onClick={() => handleDelete(conversation.id)} className="delete-btn">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;