import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import type { Conversation, World } from '../types';
import { getConversations, deleteConversation, getAllWorlds, deleteWorld } from '../utils/api';
import ThemeToggle from '../components/ThemeToggle';

const Dashboard: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const response = await getConversations();
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchWorlds = async () => {
    try {
      const response = await getAllWorlds();
      setWorlds(response.data);
    } catch (error) {
      console.error('Error fetching worlds:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchConversations(), fetchWorlds()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleDeleteConversation = async (id: number) => {
    try {
      await deleteConversation(id);
      fetchConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    } 
  };

  const handleDeleteWorld = async (id: number) => {
    try {
      await deleteWorld(id);
      fetchWorlds();
    } catch (error) {
      console.error('Error deleting world:', error);
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
        <div>
          <h1>EchoSoul Conversations</h1>
          <p className="subtitle">Chat with your AI characters and continue past conversations</p>
        </div>
        <div className="dashboard-actions">
          <ThemeToggle />
          <Link to="/create" className="btn">
            <PlusIcon style={{width: '20px', height: '20px'}} />
            Create New Character
          </Link>
          <Link to="/create-world" className="btn">
            <PlusIcon style={{width: '20px', height: '20px'}} />
            Create New World
          </Link>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="no-conversations">
          <ChatBubbleLeftRightIcon className="icon" style={{width: '64px', height: '64px'}} />
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
                        alt={conversation.character.name} 
                        style={{width: '30px', height: '30px', borderRadius: '50%', marginRight: '15px'}}
                    />
                    <span className="conversation-name">{conversation.character.name}</span>
                </Link>
              <button onClick={() => handleDeleteConversation(conversation.id)} className="btn delete-btn">Delete</button>
            </li>
          ))}
        </ul>
      )}

      <div className="dashboard-header" style={{marginTop: '40px'}}>
        <div>
          <h1>EchoSoul Worlds</h1>
          <p className="subtitle">Create shared environments for multiple characters to interact</p>
        </div>
      </div>

      {worlds.length === 0 ? (
        <div className="no-conversations">
          <ChatBubbleLeftRightIcon className="icon" style={{width: '64px', height: '64px'}} />
          <h2>No worlds yet</h2>
          <p>Create your first world to start multi-character conversations!</p>
          <Link to="/create-world" className="btn">
            Create World
          </Link>
        </div>
      ) : (
        <ul className="conversation-list"> {/* Re-using conversation-list for styling */}
          {worlds.map((world) => (
            <li key={world.id} className="conversation-item">
              <Link to={`/world/${world.id}`} className="conversation-link">
                {/* World might not have a single image, could display first character's image or a generic icon */}
                <img 
                  src={world.characters.length > 0 ? world.characters[0].image_data : '/vite.svg'} 
                  alt={world.name} 
                  style={{width: '30px', height: '30px', borderRadius: '50%', marginRight: '15px'}}
                />
                <span className="conversation-name">{world.name}</span>
              </Link>
              <button onClick={() => handleDeleteWorld(world.id)} className="btn delete-btn">Delete</button>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
};

export default Dashboard;