import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { createCharacter } from '../utils/api';
import ThemeToggle from '../components/ThemeToggle';

const CharacterCreator: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Generate preview image when description changes
  useEffect(() => {
    if (description.trim() === '') {
      setPreviewImage(null);
      return;
    }

    const timer = setTimeout(() => {
      generatePreview();
    }, 800); // Debounce the preview generation

    return () => clearTimeout(timer);
  }, [description]);

  const generatePreview = async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    setError(null);
    
    try {
      // Encode the description for the URL
      const encodedDescription = encodeURIComponent(`${name || 'Character'}, ${description}`);
      const imageUrl = `https://pollinations.ai/p/${encodedDescription}?width=512&height=512`;
      
      // We'll just set the URL directly for preview since we're using the external service
      setPreviewImage(imageUrl);
    } catch (err) {
      console.error('Error generating preview:', err);
      setError('Failed to generate preview image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !description.trim()) {
      setError('Please enter both name and description');
      return;
    }

    try {
      setIsGenerating(true);
      const response = await createCharacter({ name, description });
      
      // Navigate to the chat page with the new conversation ID
      navigate(`/chat/${response.data.conversation_id}`);
    } catch (err) {
      console.error('Error creating character:', err);
      setError('Failed to create character. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mr-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 mr-1" /> Back
            </button>
            <div className="animate-fade-in">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent text-heading">
                Create Your Character
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-body">
                Define your character's personality and appearance
              </p>
            </div>
          </div>
          <div className="w-full md:w-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="card p-6 rounded-2xl">
            <form onSubmit={handleSubmit} className="gap-lg flex flex-col">
              <div className="gap-md flex flex-col">
                <label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300 text-body">
                  Character Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input rounded-xl"
                  placeholder="Enter character name..."
                />
              </div>

              <div className="gap-md flex flex-col">
                <label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300 text-body">
                  Character Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="input rounded-xl resize-none"
                  placeholder="Describe your character's personality, appearance, background, etc...."
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50/80 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl backdrop-blur-sm border border-red-200/50 dark:border-red-900/50 shadow-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating || !name.trim() || !description.trim()}
                className={`btn btn-primary py-3.5 px-4 rounded-xl text-white font-medium transition-all duration-300 shadow-lg ${
                  isGenerating || !name.trim() || !description.trim()
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : ''
                }`}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Character...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    Create Character & Start Chatting
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Preview Section */}
          <div className="card p-6 rounded-2xl">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center text-title">
              <SparklesIcon className="h-5 w-5 mr-2 text-purple-500" />
              Character Preview
            </h2>
            
            <div className="flex flex-col items-center">
              {isGenerating && !previewImage ? (
                <div className="flex flex-col items-center justify-center h-72 w-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400 text-body">Generating preview...</p>
                </div>
              ) : previewImage ? (
                <div className="w-full flex flex-col items-center">
                  <div className="relative group">
                    <img 
                      src={previewImage} 
                      alt="Character preview" 
                      className="w-64 h-64 object-cover rounded-xl shadow-lg border-4 border-white dark:border-gray-700 transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-body">Preview generated from your description</p>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center justify-center h-72 border-2 border-dashed border-gray-300/50 dark:border-gray-600 rounded-xl bg-gradient-to-br from-purple-50/30 to-indigo-50/30 dark:from-purple-900/10 dark:to-indigo-900/10">
                  <div className="bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 p-4 rounded-full mb-4">
                    <SparklesIcon className="h-12 w-12 text-purple-500 dark:text-purple-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-center px-6 text-body">
                    Enter a character description to see a preview of your character
                  </p>
                </div>
              )}

              <div className="mt-6 w-full">
                <h3 className="font-medium text-gray-800 dark:text-white mb-2 text-title">Character Details</h3>
                <div className="bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-purple-100/50 dark:border-purple-900/30 backdrop-blur-sm card">
                  <div className="flex items-center">
                    <div className="bg-gradient-to-br from-purple-200 to-indigo-200 dark:from-purple-800/30 dark:to-indigo-800/30 p-2 rounded-lg mr-3">
                      <span className="font-semibold text-gray-800 dark:text-white text-lg">
                        {name || 'Unnamed Character'}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mt-3 text-sm whitespace-pre-line text-body">
                    {description || 'No description provided'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreator;