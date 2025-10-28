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
  }, [description, name]);

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
      const response = await createCharacter({ name, core_memory: description });
      
      // Navigate to the chat page with the new conversation ID
      navigate(`/chat/${response.data.id}`);
    } catch (err) {
      console.error('Error creating character:', err);
      setError('Failed to create character. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="character-creator">
      <div className="character-creator-header">
        <button onClick={() => navigate('/')} className="btn back-btn">
          <ArrowLeftIcon style={{width: '20px', height: '20px'}} /> Back
        </button>
        <h1>Create Your Character</h1>
        <ThemeToggle />
      </div>

      <div className="creator-content">
        <div className="form-section">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Character Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter character name..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Character Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Describe your character's personality, appearance, background, etc...."
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isGenerating || !name.trim() || !description.trim()}
              className="btn create-btn"
            >
              {isGenerating ? (
                <>
                  <div className="spinner"></div>
                  Creating Character...
                </>
              ) : (
                <>
                  <SparklesIcon style={{width: '20px', height: '20px'}} />
                  Create Character & Start Chatting
                </>
              )}
            </button>
          </form>
        </div>

        <div className="preview-section">
          <h2>Character Preview</h2>
          <div className="preview-box">
            {isGenerating && !previewImage ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Generating preview...</p>
              </div>
            ) : previewImage ? (
              <img src={previewImage} alt="Character preview" />
            ) : (
              <div className="empty-preview">
                <SparklesIcon className="icon" style={{width: '64px', height: '64px'}} />
                <p>Enter a character description to see a preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreator;