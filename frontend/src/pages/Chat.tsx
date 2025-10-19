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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize speech recognition if available
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setVoiceEnabled(false);
    }
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
    if (!text) return;
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onend = () => {
        setIsPlaying(false);
      };
      
      speechSynthesis.speak(utterance);
      setIsPlaying(true);
      
      // Stop if user clicks again
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
                <div className="message assistant">
                    <img src={conversation.image_data} alt={conversation.character_name} />
                    <div className="content">
                    <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
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