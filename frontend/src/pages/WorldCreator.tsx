import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import ThemeToggle from '../components/ThemeToggle';
import type { Character, WorldCreate } from '../types';
import { getCharacters, createWorld } from '../utils/api';

const WorldCreator: React.FC = () => {
  const navigate = useNavigate();
  const [worldName, setWorldName] = useState('');
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await getCharacters(); 
        setAvailableCharacters(response.data);
      } catch (error) {
        console.error('Error fetching characters:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharacters();
  }, []);

  const handleCharacterSelect = (characterId: number) => {
    setSelectedCharacters(prev => 
      prev.includes(characterId)
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId]
    );
  };

  const handleCreateWorld = async () => {
    if (!worldName.trim() || selectedCharacters.length < 2) {
      alert('Please enter a world name and select at least two characters.');
      return;
    }

    setIsCreating(true);
    try {
      const newWorld: WorldCreate = { name: worldName, character_ids: selectedCharacters };
      const response = await createWorld(newWorld);
      navigate(`/world/${response.data.id}`);
    } catch (error) {
      console.error('Error creating world:', error);
      alert('Failed to create world.');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="character-creator">
      <div className="dashboard-header">
        <div>
          <h1>Create New World</h1>
          <p className="subtitle">Set up a shared environment for multiple AI characters</p>
        </div>
        <div className="dashboard-actions">
          <ThemeToggle />
          <button onClick={() => navigate(-1)} className="btn">
            <ArrowLeftIcon style={{width: '20px', height: '20px'}} />
            Back
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="worldName">World Name</label>
        <input
          type="text"
          id="worldName"
          value={worldName}
          onChange={(e) => setWorldName(e.target.value)}
          placeholder="e.g., The Enchanted Forest, Sci-Fi Nexus"
          disabled={isCreating}
        />
      </div>

      <div className="form-group">
        <label>Select Characters (at least 2)</label>
        <div className="character-selection-grid">
          {availableCharacters.map(char => (
            <div 
              key={char.id} 
              className={`character-card ${selectedCharacters.includes(char.id) ? 'selected' : ''}`}
              onClick={() => handleCharacterSelect(char.id)}
            >
              <img src={char.image_data} alt={char.name} />
              <span>{char.name}</span>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={handleCreateWorld} 
        className="btn" 
        disabled={isCreating || !worldName.trim() || selectedCharacters.length < 2}
      >
        {isCreating ? 'Creating...' : 'Create World'}
      </button>
    </div>
  );
};

export default WorldCreator;