import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  PaperAirplaneIcon, 
  MicrophoneIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  Cog6ToothIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import type { Message, Conversation } from '../types';
import ReactMarkdown from 'react-markdown';
import { getConversation, sendMessage } from '../utils/api';
import ThemeToggle from '../components/ThemeToggle';

const Chat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [textToSpeechEnabled, setTextToSpeechEnabled] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [characterVoice, setCharacterVoice] = useState<SpeechSynthesisVoice | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!id) return;
    
    const fetchConversation = async () => {
      try {
        const response = await getConversation(Number(id));
        setConversation(response.data);
        setMessages(response.data.messages);
      } catch (error) {
        console.error('Error fetching conversation:', error);
        navigate('/');
      }
    };

    fetchConversation();
  }, [id, navigate]);

  useEffect(() => {
    if (conversation && voices.length > 0 && !characterVoice) {
      const maleVoiceNames = ['Microsoft David - English (United States)', 'Microsoft Mark - English (United States)', 'Microsoft William Online (Natural) - English (Australia)', 'Microsoft Liam Online (Natural) - English (Canada)', 'Microsoft Sam Online (Natural) - English (Hongkong)', 'Microsoft Prabhat Online (Natural) - English (India)', 'Microsoft Connor Online (Natural) - English (Ireland)', 'Microsoft Chilemba Online (Natural) - English (Kenya)', 'Microsoft Mitchell Online (Natural) - English (New Zealand)', 'Microsoft Abeo Online (Natural) - English (Nigeria)', 'Microsoft James Online (Natural) - English (Philippines)', 'Microsoft Wayne Online (Natural) - English (Singapore)', 'Microsoft AndrewMultilingual Online (Natural) - English (United States)', 'Microsoft BrianMultilingual Online (Natural) - English (United States)', 'Microsoft Andrew Online (Natural) - English (United States)', 'Microsoft Brian Online (Natural) - English (United States)', 'Microsoft Luke Online (Natural) - English (South Africa)', 'Microsoft Elimu Online (Natural) - English (Tanzania)', 'Microsoft Ryan Online (Natural) - English (United Kingdom)', 'Microsoft Thomas Online (Natural) - English (United Kingdom)', 'Microsoft Christopher Online (Natural) - English (United States)', 'Microsoft Eric Online (Natural) - English (United States)', 'Microsoft Guy Online (Natural) - English (United States)', 'Microsoft Roger Online (Natural) - English (United States)', 'Microsoft Steffan Online (Natural) - English (United States)'];
      const femaleVoiceNames = ['Microsoft Zira - English (United States)', 'Microsoft Natasha Online (Natural) - English (Australia)', 'Microsoft Clara Online (Natural) - English (Canada)', 'Microsoft Yan Online (Natural) - English (Hong Kong SAR)', 'Microsoft Neerja Online (Natural) - English (India) (Preview)', 'Microsoft Neerja Online (Natural) - English (India)', 'Microsoft Emily Online (Natural) - English (Ireland)', 'Microsoft Asilia Online (Natural) - English (Kenya)', 'Microsoft Molly Online (Natural) - English (New Zealand)', 'Microsoft Ezinne Online (Natural) - English (Nigeria)', 'Microsoft Rosa Online (Natural) - English (Philippines)', 'Microsoft Luna Online (Natural) - English (Singapore)', 'Microsoft AvaMultilingual Online (Natural) - English (United States)', 'Microsoft EmmaMultilingual Online (Natural) - English (United States)', 'Microsoft Ava Online (Natural) - English (United States)', 'Microsoft Emma Online (Natural) - English (United States)', 'Microsoft Leah Online (Natural) - English (South Africa)', 'Microsoft Imani Online (Natural) - English (Tanzania)', 'Microsoft Libby Online (Natural) - English (United Kingdom)', 'Microsoft Maisie Online (Natural) - English (United Kingdom)', 'Microsoft Sonia Online (Natural) - English (United Kingdom)', 'Microsoft Ana Online (Natural) - English (United States)', 'Microsoft Aria Online (Natural) - English (United States)', 'Microsoft Jenny Online (Natural) - English (United States)', 'Microsoft Michelle Online (Natural) - English (United States)'];

      const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
      let availableVoices: SpeechSynthesisVoice[] = [];

      console.log("Gender:",conversation.gender)

      if (conversation.gender === 'male') {
        availableVoices = englishVoices.filter(voice => maleVoiceNames.includes(voice.name));
        if (availableVoices.length === 0) {
          availableVoices = englishVoices.filter(voice => voice.name.toLowerCase().includes('male'));
        }
      } else if (conversation.gender === 'female') {
        availableVoices = englishVoices.filter(voice => femaleVoiceNames.includes(voice.name));
        if (availableVoices.length === 0) {
          availableVoices = englishVoices.filter(voice => voice.name.toLowerCase().includes('female'));
        }
      }

      if (availableVoices.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableVoices.length);
        setCharacterVoice(availableVoices[randomIndex]);
      } else {
        setCharacterVoice(englishVoices[0]);
      }
    }
  }, [conversation, voices, characterVoice]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    // Add user message to UI immediately
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await sendMessage(Number(id), inputMessage);
      
      const aiMessage: Message = {
        id: response.data.message_id,
        role: 'assistant',
        content: response.data.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages([...updatedMessages, aiMessage]);
      
      // Play text-to-speech if enabled
      if (textToSpeechEnabled && 'speechSynthesis' in window) {
        speakText(response.data.reply);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message to UI
      const errorMessage: Message = {
        id: Date.now(),
        role: 'assistant',
        content: "Sorry, I couldn't process your message. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
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
  const speakText = (text: string) => {
    if (!text || !conversation || !characterVoice) return;

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = characterVoice;
      console.log("Selected voice:", characterVoice.name);

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

  const toggleTextToSpeech = (text: string) => {
    if (isPlaying) {
      // Stop playing
      speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      // Play text as speech
      speakText(text);
    }
  };

  // Export conversation functionality
  const exportConversation = () => {
    if (!conversation) return;
    
    const conversationText = [
      `Conversation with ${conversation.character_name}`,
      `Created: ${new Date(conversation.created_at).toLocaleString()}`,
      '',
      ...messages.map(msg => 
        `[${new Date(msg.timestamp).toLocaleString()}] ${msg.role === 'user' ? 'User' : conversation.character_name}: ${msg.content}`
      )
    ].join('\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation_${conversation.character_name}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!conversation) {
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
                <div className="chat-actions">
                    <ThemeToggle />
                    <button onClick={exportConversation} className="btn icon-btn">
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

            <div className="chat-messages">
                {messages.map((message) => (
                <div key={message.id} className={`message ${message.role}`}>
                    {message.role === 'assistant' && <img src={conversation.image_data} alt={conversation.character_name} />}
                    <div className="content">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                </div>
                ))}
                {isLoading && (
                <div key="loading" className="message assistant">
                    <img src={conversation.image_data} alt={conversation.character_name} />
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
            <img src={conversation.image_data} alt={conversation.character_name} />
            <h2>{conversation.character_name}</h2>
            <p>{conversation.character_description}</p>
        </div>
    </div>
  );
};

export default Chat;
