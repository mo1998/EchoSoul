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
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-indigo-900 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-md p-4 flex items-center justify-between border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mr-4 p-2 rounded-full hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" /> Back
          </button>
          <div className="flex items-center">
            <div className="relative">
              {conversation.image_data ? (
                <img 
                  src={conversation.image_data} 
                  alt={conversation.character_name} 
                  className="w-10 h-10 rounded-full object-cover border-2 border-purple-200 shadow-sm"
                />
              ) : (
                <div className="bg-gradient-to-br from-purple-200 to-indigo-200 dark:from-purple-900/30 dark:to-indigo-900/30 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-full w-10 h-10 flex items-center justify-center">
                  <span className="text-purple-500 dark:text-purple-400 text-xs font-bold">
                    {conversation.character_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="ml-3">
              <h2 className="font-bold text-gray-800 dark:text-white text-title">{conversation.character_name}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse-slow"></span>
                Online
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          <button 
            onClick={exportConversation}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-full transition-colors"
            title="Export conversation"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-full transition-colors"
            title="Settings"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm card">
          <h3 className="font-medium text-gray-800 dark:text-white text-heading mb-3">Chat Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={() => setVoiceEnabled(!voiceEnabled)}
                className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <label className="text-gray-700 dark:text-gray-300 text-body">Voice Input</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={textToSpeechEnabled}
                onChange={() => setTextToSpeechEnabled(!textToSpeechEnabled)}
                className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <label className="text-gray-700 dark:text-gray-300 text-body">Text-to-Speech</label>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="max-w-3xl mx-auto spacer-sm">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex mb-6 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && conversation.image_data && (
                <img 
                  src={conversation.image_data} 
                  alt={conversation.character_name} 
                  className="w-9 h-9 rounded-full object-cover mr-3 mt-1 flex-shrink-0"
                />
              )}
              <div 
                className={`max-w-xs md:max-w-md lg:max-w-lg rounded-2xl px-4 py-3 relative ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-tr-none shadow-lg' 
                    : 'bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-800 dark:text-gray-100 rounded-tl-none shadow-lg border border-gray-200/50 dark:border-gray-600/50'
                }`}
              >
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown components={{
                    p: ({node, ...props}) => <p className="message-content" {...props} />,
                    ul: ({node, ...props}) => <ul className="message-content" {...props} />,
                    ol: ({node, ...props}) => <ol className="message-content" {...props} />,
                    li: ({node, ...props}) => <li className="message-content" {...props} />,
                    em: ({node, ...props}) => <em className="message-content" {...props} />,
                    strong: ({node, ...props}) => <strong className="message-content" {...props} />,
                    pre: ({node, ...props}) => <pre className="message-content" {...props} />,
                    code: ({node, ...props}) => <code className="message-content" {...props} />,
                  }}>
                    {message.content}
                  </ReactMarkdown>
                </div>
                <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-purple-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                
                {/* Text-to-speech button for assistant messages */}
                {message.role === 'assistant' && textToSpeechEnabled && (
                  <button
                    onClick={() => toggleTextToSpeech(message.content)}
                    className={`absolute bottom-1 right-2 p-1 rounded-full ${
                      isPlaying ? 'text-red-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title={isPlaying ? "Stop speaking" : "Listen to message"}
                  >
                    {isPlaying ? (
                      <SpeakerXMarkIcon className="h-4 w-4" />
                    ) : (
                      <SpeakerWaveIcon className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
              {message.role === 'user' && (
                <div className="ml-3">
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex mb-6 justify-start">
              {conversation.image_data && (
                <img 
                  src={conversation.image_data} 
                  alt={conversation.character_name} 
                  className="w-9 h-9 rounded-full object-cover mr-3 mt-1 flex-shrink-0"
                />
              )}
              <div className="bg-white text-gray-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 p-4 fixed bottom-0 left-0 right-0 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-end gap-md">
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="w-full px-4 py-3 pr-12 border border-gray-300/50 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white/70 dark:bg-gray-700/70 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 input"
              rows={1}
              style={{ minHeight: '56px', maxHeight: '120px' }}
            />
            {voiceEnabled && (
              <button
                onClick={toggleVoiceInput}
                className={`absolute right-3 bottom-3 p-1 rounded-full ${
                  isListening ? 'text-red-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <MicrophoneIcon className={`h-5 w-5 ${isListening ? 'animate-pulse' : ''}`} />
              </button>
            )}
          </div>
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className={`h-12 w-12 flex items-center justify-center rounded-full transition-all duration-300 ${
              inputMessage.trim()
                ? 'btn btn-primary'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
            }`}
          >
            <PaperAirplaneIcon className="h-5 w-5 transform rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;