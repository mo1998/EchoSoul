document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:8000/api';

    // Views
    const characterCreationView = document.getElementById('character-creation');
    const dashboardView = document.getElementById('dashboard-view');
    const chatView = document.getElementById('chat-view');

    // Buttons
    const newCharacterBtn = document.getElementById('new-character-btn');
    const backToDashboardBtn = document.getElementById('back-to-dashboard');
    const sendMessageBtn = document.getElementById('send-message-btn');

    // Forms & Inputs
    const characterForm = document.getElementById('character-form');
    const nameInput = document.getElementById('name');
    const descriptionInput = document.getElementById('description');
    const messageInput = document.getElementById('message-input');

    // Containers
    const conversationsList = document.getElementById('conversations-list');
    const chatMessages = document.getElementById('chat-messages');
    const chatCharacterName = document.getElementById('chat-character-name');
    const chatCharacterAvatar = document.getElementById('chat-character-avatar');

    let currentConversationId = null;
    let currentCharacterAvatar = null;

    function showView(view) {
        document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
        view.style.display = 'block';
    }

    async function fetchConversations() {
        try {
            const response = await fetch(`${API_BASE_URL}/conversations`);
            const conversations = await response.json();
            conversationsList.innerHTML = '';
            conversations.forEach(conv => {
                const convElement = document.createElement('div');
                convElement.classList.add('conversation');
                convElement.innerHTML = `
                    <img src="${conv.image_data}" alt="Avatar">
                    <span class="conversation-name">${conv.character_name}</span>
                    <button class="delete-btn" data-id="${conv.id}">Delete</button>
                `;
                convElement.querySelector('.conversation-name').addEventListener('click', () => {
                    currentConversationId = conv.id;
                    chatCharacterName.textContent = conv.character_name;
                    chatCharacterAvatar.src = conv.image_data;
                    currentCharacterAvatar = conv.image_data;
                    fetchMessages(conv.id);
                    showView(chatView);
                });
                convElement.querySelector('.delete-btn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const conversationId = e.target.dataset.id;
                    await deleteConversation(conversationId);
                });
                conversationsList.appendChild(convElement);
            });
        } catch (error) {
            console.error('Error fetching conversations:', error);
        }
    }

    async function deleteConversation(conversationId) {
        try {
            const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                fetchConversations();
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
        }
    }

    async function fetchMessages(conversationId) {
        try {
            const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`);
            const conversation = await response.json();
            chatMessages.innerHTML = '';
            conversation.messages.forEach(msg => {
                appendMessage(msg.role, msg.content);
            });
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    }

    function appendMessage(role, content) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', role);

        if (role === 'assistant') {
            const avatarElement = document.createElement('img');
            avatarElement.src = currentCharacterAvatar;
            avatarElement.alt = 'Avatar';
            messageElement.appendChild(avatarElement);
        }

        const contentElement = document.createElement('div');
        contentElement.classList.add('content');
        contentElement.textContent = content;
        messageElement.appendChild(contentElement);
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function handleSendMessage() {
        const message = messageInput.value.trim();
        if (!message || !currentConversationId) return;

        appendMessage('user', message);
        messageInput.value = '';

        try {
            const response = await fetch(`${API_BASE_URL}/conversations/${currentConversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_message: message }),
            });
            const data = await response.json();
            if (data.reply) {
                appendMessage('assistant', data.reply);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    characterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();

        if (!name || !description) return;

        try {
            const response = await fetch(`${API_BASE_URL}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, description }),
            });
            const data = await response.json();
            if (data.conversation_id) {
                fetchConversations();
                showView(dashboardView);
            }
        } catch (error) {
            console.error('Error creating character:', error);
        }
    });

    newCharacterBtn.addEventListener('click', () => {
        showView(characterCreationView);
    });

    backToDashboardBtn.addEventListener('click', () => {
        currentConversationId = null;
        currentCharacterAvatar = null;
        chatCharacterAvatar.src = '';
        showView(dashboardView);
    });

    sendMessageBtn.addEventListener('click', handleSendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });

    // Initial load
    fetchConversations();
    showView(dashboardView);
});
