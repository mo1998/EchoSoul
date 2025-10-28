import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  PaperAirplaneIcon, 
  MicrophoneIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  Cog6ToothIcon,
  ArrowUpTrayIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import type { Message, World, Character } from '../types'; // Assuming World and Character types exist
import ReactMarkdown from 'react-markdown';
import { getWorld, sendWorldMessage } from '../utils/api';
import ThemeToggle from '../components/ThemeToggle';

const sum = (arr: number[]) => arr.reduce((acc, curr) => acc + curr, 0);

const WorldChat: React.FC = () => { 
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [world, setWorld] = useState<World | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [textToSpeechEnabled, setTextToSpeechEnabled] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [characterVoices, setCharacterVoices] = useState<{[key: number]: SpeechSynthesisVoice | null}>({});
  const [stickToBottom, setStickToBottom] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{[key: number]: HTMLDivElement | null}>({});

  // Initialize speech recognition and voices
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setVoiceEnabled(false);
    }

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };

    // Load voices initially and on change
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (!id || !/^[0-9]+$/.test(id)) {
      console.error('Invalid or missing world ID in URL:', id);
      navigate('/');
      return;
    }
    const worldId = Number(id);
    
    const fetchWorld = async () => {
      if (isNaN(worldId)) {
        console.error('Invalid world ID for fetchWorld:', id);
        navigate('/');
        return;
      }
      try {
        const response = await getWorld(worldId);
        setWorld(response.data);
        setMessages(response.data.messages);
      } catch (error) {
        console.error('Error fetching world:', error);
        navigate('/');
      }
    };

    fetchWorld();
  }, [id, navigate]);

  useEffect(() => {
    if (world && voices.length > 0) {
      const newCharacterVoices: {[key: number]: SpeechSynthesisVoice | null} = {};
      const maleVoiceNames = ['Microsoft David - English (United States)', 'Microsoft Mark - English (United States)', 'Microsoft William Online (Natural) - English (Australia)', 'Microsoft Liam O[...'];
      const femaleVoiceNames = ['Microsoft Zira - English (United States)', 'Microsoft Natasha Online (Natural) - English (Australia)', 'Microsoft Clara Online (Natural) - English (Canada)', 'Micr[...'];

      const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));

      world.characters.forEach(char => {
        let selectedVoice: SpeechSynthesisVoice | null = null;
        const description = char.core_memory.toLowerCase();
        
        const male_keywords = ['male', 'man', 'boy', 'he', 'his', 'him', 'father', 'son', 'brother', 'uncle', 'nephew', 'king', 'prince'];
        const female_keywords = ['female', 'woman', 'girl', 'she', 'her', 'hers', 'mother', 'daughter', 'sister', 'aunt', 'niece', 'queen', 'princess'];

        const male_score = sum(male_keywords.map(word => (description.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length));
        const female_score = sum(female_keywords.map(word => (description.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length));

        let gender = "neutral";
        if (male_score > female_score) {
            gender = "male";
        } else if (female_score > male_score) {
            gender = "female";
        }

        if (gender === 'male') {
          selectedVoice = englishVoices.find(voice => maleVoiceNames.includes(voice.name)) || englishVoices.find(voice => voice.name.toLowerCase().includes('male')) || englishVoices[0];
        } else if (gender === 'female') {
          selectedVoice = englishVoices.find(voice => femaleVoiceNames.includes(voice.name)) || englishVoices.find(voice => voice.name.toLowerCase().includes('female')) || englishVoices[0];
        } else {
          selectedVoice = englishVoices[Math.floor(Math.random() * englishVoices.length)];
        }
        newCharacterVoices[char.id] = selectedVoice;
      });
      setCharacterVoices(newCharacterVoices);
    }
  }, [world, voices]);

  // Robust scroll-to-bottom: prefer container.scrollTo and defer to next frame
  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const container = chatContainerRef.current;
    if (container) {
      try {
        container.scrollTo({ top: container.scrollHeight, behavior });
        return;
      } catch (e) {
        // fallback
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!stickToBottom) return;

    const raf = requestAnimationFrame(() => {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'assistant') {
        const lastMessageElement = messageRefs.current[lastMessage.id];
        if (lastMessageElement) {
          try {
            lastMessageElement.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            return;
          } catch (e) { /* ignore and fallback */ }
        }
      }
      scrollToBottom('auto');
    });

    return () => cancelAnimationFrame(raf);
  }, [messages, stickToBottom]);

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollHeight - scrollTop - clientHeight <= 20;
      setStickToBottom(atBottom);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!id) {
      console.error('World ID is undefined. Cannot send message.');
      return;
    }
    const worldId = Number(id);
    if (isNaN(worldId)) {
      console.error('Invalid world ID:', id, '. Cannot send message.');
      return;
    }

    const messageToSend = inputMessage;

    setStickToBottom(true);

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString(),
      character_id: null, // User message, no character_id
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // optimistic scroll
    requestAnimationFrame(() => scrollToBottom('smooth'));

    try {
      const response = await sendWorldMessage(worldId, messageToSend);
      
      const aiMessage: Message = {
        id: response.data.id,
        role: 'assistant',
        content: response.data.content,
        timestamp: new Date().toISOString(),
        character_id: response.data.character_id,
      };
      setMessages(prev => [...prev, aiMessage]);
      
      // Play text-to-speech if enabled
      if (textToSpeechEnabled && 'speechSynthesis' in window && aiMessage.character_id) {
        const voice = characterVoices[aiMessage.character_id];
        if (voice) speakText(aiMessage.content, voice);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message to UI
      const errorMessage: Message = {
        id: Date.now(),
        role: 'assistant',
        content: "Sorry, I couldn't process your message. Please try again.",
        timestamp: new Date().toISOString(),
        character_id: null,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // ensure final scroll after assistant arrives
      requestAnimationFrame(() => scrollToBottom('smooth'));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Voice input functionality
  const toggleVoiceInput = () => {
    if (isListening) {
      // Stop listening
      setIsListening(false);
      // In a real app, we would stop the browser's speech recognition
      if ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) {
        // Stop the recognition
      }
    } else {
      // Start listening
      if ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results) 
            .map((result: any) => result[0])
            .map((result) => result.transcript)
            .join('');
          setInputMessage(transcript);
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
        setIsListening(true);
      } else {
        alert('Speech recognition is not supported in your browser');
      }
    }
  };

  // Text-to-speech functionality
  const speakText = (text: string, voice: SpeechSynthesisVoice) => {
    if (!text || !voice) return;

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      console.log("Selected voice:", voice.name);

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => {
        setIsPlaying(false);
      };

      speechSynthesis.speak(utterance);
      setIsPlaying(true);

      utterance.onstart = () => {
        setIsPlaying(true);
      };
    }
  };

  const toggleTextToSpeech = (text: string, characterId: number) => {
    if (isPlaying) {
      // Stop playing
      speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      // Play text as speech
      const voice = characterVoices[characterId];
      if (voice) speakText(text, voice);
    }
  };

  // Export conversation functionality
  const exportWorldChat = () => {
    if (!world) return; 
    
    const conversationText = [
      `World Chat: ${world.name}`,
      '',
      ...messages.map(msg => {
        const senderName = msg.role === 'user' ? 'User' : world.characters.find(char => char.id === msg.character_id)?.name || 'Unknown';
        return `[${new Date(msg.timestamp).toLocaleString()}] ${senderName}: ${msg.content}`;
      })
    ].join('\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `world_chat_${world.name.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!world) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="chat-page">
        <div className="chat-container">
            <div className="chat-header">
                <img src="/vite.svg" alt="Logo" className="logo" />
                <div className="dashboard-actions">
                    <ThemeToggle />
                    <button onClick={exportWorldChat} className="btn icon-btn">
                        <ArrowUpTrayIcon style={{width: '20px', height: '20px'}}/>
                    </button>
                    <button onClick={() => setShowSettings(!showSettings)} className="btn icon-btn">
                        <Cog6ToothIcon style={{width: '20px', height: '20px'}}/>
                    </button>
                </div>
            </div>

            {showSettings && (
                <div className="settings-panel">
                <h3>Chat Settings</h3>
                <div className="setting">
                    <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={() => setVoiceEnabled(!voiceEnabled)}
                    />
                    <label>Voice Input</label>
                </div>
                <div className="setting">
                    <input
                    type="checkbox"
                    checked={textToSpeechEnabled}
                    onChange={() => setTextToSpeechEnabled(!textToSpeechEnabled)}
                    />
                    <label>Text-to-Speech</label>
                </div>
                </div>
            )}

            <div className="chat-messages" ref={chatContainerRef} onScroll={handleScroll}>
                {messages.map((message) => {
                    const senderCharacter = world.characters.find(char => char.id === message.character_id);
                    return (
                        <div key={message.id} className={`message ${message.role}`} ref={el => { messageRefs.current[message.id] = el; }}>
                            {message.role === 'assistant' && senderCharacter && (
                                <img src={senderCharacter.image_data} alt={senderCharacter.name} />
                            )}
                            <div className="content">
                                {message.role === 'assistant' && senderCharacter && (
                                    <span className="message-sender-name">{senderCharacter.name}</span>
                                )}
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                                {textToSpeechEnabled && message.role === 'assistant' && senderCharacter && (
                                    <button 
                                        onClick={() => toggleTextToSpeech(message.content, senderCharacter.id)}
                                        className="tts-button"
                                    >
                                        {isPlaying ? <SpeakerXMarkIcon style={{width: '16px', height: '16px'}}/> : <SpeakerWaveIcon style={{width: '16px', height: '16px'}}/>}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
                {isLoading && (
                <div key="loading" className="message assistant">
                    {world.characters[0] && <img src={world.characters[0].image_data} alt={world.characters[0].name} />}
                    <div className="content">
                    <div className="typing-indicator">
                        <span key="dot1"></span>
                        <span key="dot2"></span>
                        <span key="dot3"></span>
                    </div>
                    </div>
                </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {!stickToBottom && (
                <button 
                    onClick={() => {
                        scrollToBottom('smooth');
                        setStickToBottom(true);
                    }}
                    className="btn scroll-to-bottom-btn"
                >
                    <ArrowDownIcon style={{width: '20px', height: '20px'}}/>
                </button>
            )}

            <div className="chat-input">
                <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                />
                {voiceEnabled && (
                <button onClick={toggleVoiceInput} className={`btn icon-btn ${isListening ? 'listening' : ''}`}>
                    <MicrophoneIcon style={{width: '20px', height: '20px'}}/>
                </button>
                )}
                <button onClick={handleSendMessage} disabled={isLoading || !inputMessage.trim()} className="btn send-btn">
                <PaperAirplaneIcon style={{width: '20px', height: '20px'}}/>
                </button>
            </div>
        </div>
        <div className="character-panel">
            <button onClick={() => navigate('/')} className="btn back-btn">
                <ArrowLeftIcon style={{width: '20px', height: '20px'}}/> Back
            </button>
            <h2>{world.name}</h2>
            <h3>Characters:</h3>
            <ul className="world-character-list">
                {world.characters.map(char => (
                    <li key={char.id}>
                        <img src={char.image_data} alt={char.name} style={{width: '30px', height: '30px', borderRadius: '50%', marginRight: '10px'}}/>
                        {char.name}
                    </li>
                ))}
            </ul>
        </div>
    </div>
  );
};

export default WorldChat;