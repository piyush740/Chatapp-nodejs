const ws = new WebSocket('ws://localhost:8080');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const nicknameInput = document.getElementById('nickname-input');
const setNicknameButton = document.getElementById('set-nickname');
const userList = document.getElementById('user-list');
const emojis = ['👍', '❤️', '😂', '😊', '🎉', '🔥', '👏', '🌟'];
let currentNickname = 'Anonymous';
let typingTimeout;

// Message Types
const MESSAGE_TYPE = {
    CHAT: 'chat',
    SYSTEM: 'system',
    TYPING: 'typing',
    USERS: 'users',
    REACTION: 'reaction',
    IMAGE: 'image',
    SET_NICKNAME: 'set_nickname'
};

// Create Toast Notification
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    if (isError) {
        toast.style.background = '#ef4444';
    }
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Create Message Element
function createMessage(text, sender, isSystem = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === currentNickname ? 'message-sent' : 'message-received'}`;
    messageDiv.dataset.messageId = Math.random().toString(36).substr(2, 9);
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = text;

    const messageInfo = document.createElement('div');
    messageInfo.className = 'message-info';
    
    const timestamp = document.createElement('span');
    timestamp.textContent = new Date().toLocaleTimeString();

    messageInfo.appendChild(timestamp);
    
    const reactions = document.createElement('div');
    reactions.className = 'reactions';
    
    messageDiv.append(messageContent, messageInfo, reactions);
    
    return messageDiv;
}

// Update User List
function updateUserList(users) {
    userList.innerHTML = '';
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.textContent = user.charAt(0).toUpperCase();
        
        const name = document.createElement('span');
        name.textContent = user;

        const status = document.createElement('div');
        status.className = 'user-status status-online';
        status.dataset.user = user;  // Store the user's name in the status for easy access
        
        userDiv.append(avatar, name, status);
        userList.appendChild(userDiv);
    });
}

// WebSocket Message Handling
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch(data.type) {
        case MESSAGE_TYPE.CHAT:
            const messageElement = createMessage(data.message, data.nickname);
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            break;
            
        case MESSAGE_TYPE.SYSTEM:
            const systemMessage = createMessage(data.message, null, true);
            chatMessages.appendChild(systemMessage);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            break;
            
        case MESSAGE_TYPE.TYPING:
            const typingIndicator = document.querySelector(`[data-user="${data.nickname}"] .user-status`);
            if (typingIndicator) {
                typingIndicator.className = 'user-status status-typing';
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    typingIndicator.className = 'user-status status-online';
                }, 3000);
            }
            break;
            
        case MESSAGE_TYPE.USERS:
            updateUserList(data.users);
            break;
    }
};

// Send Message Function
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        ws.send(JSON.stringify({
            type: MESSAGE_TYPE.CHAT,
            message: message,
            nickname: currentNickname
        }));
        messageInput.value = '';
    }
}

// Handle Typing Function
function handleTyping() {
    ws.send(JSON.stringify({
        type: MESSAGE_TYPE.TYPING,
        nickname: currentNickname
    }));
}

// Event Listeners
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

messageInput.addEventListener('input', () => {
    clearTimeout(typingTimeout);
    handleTyping();
});

setNicknameButton.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();
    if (nickname) {
        currentNickname = nickname;
        ws.send(JSON.stringify({
            type: MESSAGE_TYPE.SET_NICKNAME,
            nickname: nickname
        }));
        nicknameInput.value = '';
        showToast(`Nickname set to ${nickname}`);
    }
});

// WebSocket Connection Status Handling
ws.onopen = () => {
    console.log('Connected to chat server');
    showToast('Connected to chat server');
};

ws.onclose = () => {
    console.log('Disconnected from chat server');
    showToast('Disconnected from chat server', true);
};

// Initialize with a welcome message
const welcomeMessage = createMessage('Welcome to the chat! 👋', null, true);
chatMessages.appendChild(welcomeMessage);
chatMessages.scrollTop = chatMessages.scrollHeight;
