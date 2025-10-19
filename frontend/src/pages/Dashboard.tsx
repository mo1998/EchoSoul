import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import type { Conversation } from '../types';
import { getConversations } from '../utils/api';
import ThemeToggle from '../components/ThemeToggle';

const Dashboard: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch conversations from backend
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

    fetchConversations();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              EchoSoul Conversations
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Chat with your AI characters and continue past conversations
            </p>
          </div>
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <div className="flex-1 md:flex-none">
              <ThemeToggle />
            </div>
            <Link 
              to="/create"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl flex items-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 border border-purple-500/20"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create New Character
            </Link>
          </div>
        </div>

        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <ChatBubbleLeftRightIcon className="h-16 w-16 mx-auto text-gray-400" />
            <h2 className="mt-4 text-xl font-semibold text-gray-600">No conversations yet</h2>
            <p className="mt-2 text-gray-500">Create your first character to start chatting!</p>
            <Link 
              to="/create"
              className="mt-6 inline-block bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-full"
            >
              Create Character
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => (
              <Link 
                key={conversation.id} 
                to={`/chat/${conversation.id}`}
                className="block bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100/50 dark:border-gray-700/50 hover:border-purple-300/50 dark:hover:border-purple-500/30"
              >
                <div className="p-6">
                  <div className="flex items-start">
                    <div className="relative flex-shrink-0">
                      {conversation.image_data ? (
                        <img 
                          src={conversation.image_data} 
                          alt={conversation.character_name} 
                          className="w-16 h-16 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-md"
                        />
                      ) : (
                        <div className="bg-gradient-to-br from-purple-200 to-indigo-200 dark:from-purple-900/30 dark:to-indigo-900/30 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-full w-16 h-16 flex items-center justify-center">
                          <span className="text-purple-500 dark:text-purple-400 text-xl font-bold">
                            {conversation.character_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-800 dark:text-white truncate">{conversation.character_name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                        {conversation.character_description}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-gray-100/80 dark:border-gray-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 px-2 py-1 rounded-full">
                      {new Date(conversation.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 px-2 py-1 rounded-full">
                        {conversation.messages?.length || 0} messages
                      </span>
                      <span className="inline-block bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                        Chat Now
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;