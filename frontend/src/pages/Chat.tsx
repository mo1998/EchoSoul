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
      const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
      let selectedVoice: SpeechSynthesisVoice | null = null;

      // 1. Prioritize voice_id from backend
      if (conversation.character.voice_id) {
        selectedVoice = englishVoices.find(voice => voice.name === conversation.character.voice_id) || null;
      }

      // 2. Fallback to first English voice if no specific voice or gender-based voice found
      if (!selectedVoice && englishVoices.length > 0) {
        selectedVoice = englishVoices[0];
      }
      
      if (selectedVoice) {
        setCharacterVoice(selectedVoice);
      }
    }
  }, [conversation, voices, characterVoice]);

  // Robust scroll-to-bottom: wait for next paint and use container.scrollTo fallback
  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const container = chatContainerRef.current;
    if (container) {
      // prefer the scroll API (less fragile with layout shifts)
      try {
        container.scrollTo({ top: container.scrollHeight, behavior });
        return;
      } catch (e) {
        // Fall back to scrollIntoView if needed
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!stickToBottom) return;

    // defer to the next animation frame so newly-mounted message DOM is present
    const raf = requestAnimationFrame(() => {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'assistant') {
        const lastMessageElement = messageRefs.current[lastMessage.id];
        if (lastMessageElement) {
          // If we have a direct element, try to scroll it into view. If not, fallback to container
          try {
            lastMessageElement.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            return;
          } catch (e) { /* ignore and fallback */ }
        }
      }
      // fallback scroll to bottom
      scrollToBottom('auto');
    });

    return () => cancelAnimationFrame(raf);
  }, [messages, stickToBottom]);

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Slightly larger tolerance to account for fractional pixels/layout shifts
      const atBottom = scrollHeight - scrollTop - clientHeight <= 20;
      setStickToBottom(atBottom);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const messageToSend = inputMessage;

    setStickToBottom(true);

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // ensure UI scrolls to show the optimistic user's message
    requestAnimationFrame(() => scrollToBottom('smooth'));

    try {
      const response = await sendMessage(Number(id), messageToSend);
      
      const aiMessage: Message = {
        id: response.data.id,
        role: 'assistant',
        content: response.data.content,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Play text-to-speech if enabled
      if (textToSpeechEnabled && 'speechSynthesis' in window) {
        speakText(response.data.content);
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
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // final ensure: scroll after the assistant message has been appended/painted
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
      `Conversation with ${conversation.character.name}`,
      `Created: ${new Date(conversation.created_at).toLocaleString()}`,
      '',
      ...messages.map(msg => 
        `[${new Date(msg.timestamp).toLocaleString()}] ${msg.role === 'user' ? 'User' : conversation.character.name}: ${msg.content}`
      )
    ].join('\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation_${conversation.character.name}_${new Date().toISOString().slice(0, 10)}.txt`;
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

            <div className="chat-messages" ref={chatContainerRef} onScroll={handleScroll}>
                {messages.map((message) => (
                <div key={message.id} className={`message ${message.role}`} ref={el => { messageRefs.current[message.id] = el; }}>
                    {message.role === 'assistant' && <img src={conversation.image_data} alt={conversation.character.name} />}
                    <div className="content">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                </div>
                ))}
                {isLoading && (
                <div key="loading" className="message assistant">
                    <img src={conversation.image_data} alt={conversation.character.name} />
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
            <img src={conversation.image_data} alt={conversation.character.name} />
            <h2>{conversation.character.name}</h2>
            <p>{conversation.character.core_memory}</p>
        </div>
    </div>
  );
};

export default Chat;