// Connect to Socket.io server
const socket = io();

// Initialize offline message queue
let offlineMessageQueue = [];
let isOnline = navigator.onLine;

// IndexedDB setup for offline message storage
let db;
const dbName = 'chatAppDB';
const dbVersion = 1;
const messageStore = 'offlineMessages';

// Open IndexedDB
const request = indexedDB.open(dbName, dbVersion);

request.onerror = (event) => {
    console.error('IndexedDB error:', event.target.error);
};

request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains(messageStore)) {
        db.createObjectStore(messageStore, { keyPath: 'id', autoIncrement: true });
    }
};

request.onsuccess = (event) => {
    db = event.target.result;
    // Load any pending messages when DB is ready
    loadOfflineMessages();
};

// Load messages from IndexedDB
function loadOfflineMessages() {
    if (!db) return;
    
    const transaction = db.transaction([messageStore], 'readonly');
    const store = transaction.objectStore(messageStore);
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = (event) => {
        offlineMessageQueue = event.target.result;
        console.log(`Loaded ${offlineMessageQueue.length} offline messages from storage`);
    };
}

// Save a message to IndexedDB
function saveMessageToIndexedDB(message) {
    if (!db) return;
    
    const transaction = db.transaction([messageStore], 'readwrite');
    const store = transaction.objectStore(messageStore);
    store.add(message);
}

// Remove a message from IndexedDB
function removeMessageFromIndexedDB(messageId) {
    if (!db) return;
    
    const transaction = db.transaction([messageStore], 'readwrite');
    const store = transaction.objectStore(messageStore);
    store.delete(messageId);
}

// Network status monitoring
window.addEventListener('online', () => {
    isOnline = true;
    console.log('Connection restored. Sending queued messages...');
    sendQueuedMessages();
});

window.addEventListener('offline', () => {
    isOnline = false;
    console.log('Connection lost. Messages will be queued.');
});

// Send all queued messages when back online
function sendQueuedMessages() {
    if (offlineMessageQueue.length > 0) {
        console.log(`Sending ${offlineMessageQueue.length} queued messages`);
        
        offlineMessageQueue.forEach(message => {
            socket.emit('chatMessage', message);
            removeMessageFromIndexedDB(message.id);
        });
        
        // Clear queue after sending
        offlineMessageQueue = [];
    }
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
                
                // Initialize push notifications if supported
                if ('PushManager' in window) {
                    initPushNotifications(registration);
                }
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}

// Initialize push notifications
async function initPushNotifications(registration) {
    try {
        // Request permission
        const permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return;
        }
        
        // Get existing subscription or create a new one
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
            // Create a new subscription
            const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
            
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });
            
            console.log('Created new push subscription');
        }
        
        // In a real app, you would send this subscription to your server
        console.log('Push subscription:', subscription);
        
    } catch (error) {
        console.error('Error initializing push notifications:', error);
    }
}

// Helper function to convert base64 string to Uint8Array
// (required for applicationServerKey)
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Show notification when receiving messages while app is in background
function showNotification(message) {
    if ('serviceWorker' in navigator && 'PushManager' in window && !document.hasFocus()) {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('New Chat Message', {
                body: `${message.username}: ${message.message}`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                vibrate: [200, 100, 200],
                data: {
                    url: window.location.href,
                    room: message.room
                }
            });
        });
    }
}

// DOM Elements - Auth
const authContainer = document.getElementById('authContainer');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const registerUsername = document.getElementById('registerUsername');
const registerPassword = document.getElementById('registerPassword');
const confirmPassword = document.getElementById('confirmPassword');
const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');
const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');

// DOM Elements - Chat
const chatContainer = document.getElementById('chatContainer');
const currentUser = document.getElementById('currentUser');
const logoutButton = document.getElementById('logoutButton');
const messageInput = document.getElementById('messageInput');
const messagesContainer = document.getElementById('messages');
const roomSelect = document.getElementById('roomSelect');
const typingIndicator = document.getElementById('typingIndicator');
const fileUploadSection = document.getElementById('fileUploadSection');
const fileInput = document.getElementById('fileInput');
const sendButton = document.getElementById('sendButton');
const uploadButton = document.getElementById('uploadButton');
const clearChatButton = document.getElementById('clearChatButton');

// Connection status element
const connectionStatus = document.getElementById('connectionStatus');

// Global variables
let currentUsername = '';
let currentRoom = 'general';
let typingTimeout;

// Tab switching
loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    clearMessages();
});

registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
    clearMessages();
});

// Clear message elements
function clearMessages() {
    loginMessage.textContent = '';
    registerMessage.textContent = '';
}

// Register function
registerButton.addEventListener('click', async () => {
    const username = registerUsername.value.trim();
    const password = registerPassword.value.trim();
    const confirmPwd = confirmPassword.value.trim();
    
    // Validate input
    if (!username || !password) {
        registerMessage.textContent = 'Please enter both username and password';
        return;
    }
    
    if (password !== confirmPwd) {
        registerMessage.textContent = 'Passwords do not match';
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            registerMessage.textContent = data.message || 'Registration failed';
            return;
        }
        
        // Registration successful
        registerMessage.textContent = 'Registration successful! You can now login.';
        registerMessage.classList.add('success');
        
        // Clear form
        registerUsername.value = '';
        registerPassword.value = '';
        confirmPassword.value = '';
        
        // Switch to login tab after a delay
        setTimeout(() => {
            loginTab.click();
            loginUsername.value = username;
        }, 2000);
        
    } catch (err) {
        console.error('Registration error:', err);
        registerMessage.textContent = 'An error occurred. Please try again.';
    }
});

// Login function
loginButton.addEventListener('click', async () => {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();
    
    // Validate input
    if (!username || !password) {
        loginMessage.textContent = 'Please enter both username and password';
        return;
    }
    
    // Clear previous messages
    loginMessage.textContent = 'Logging in...';
    loginMessage.classList.remove('success');
    loginMessage.classList.remove('error');
    
    try {
        console.log(`Attempting to login with username: ${username}`);
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (!response.ok) {
            loginMessage.textContent = data.message || 'Login failed';
            loginMessage.classList.add('error');
            console.error('Login failed:', data.message);
            return;
        }
        
        // Login successful
        loginMessage.textContent = 'Login successful!';
        loginMessage.classList.add('success');
        console.log('Login successful for:', username);
        
        // Set current user and room
        currentUsername = username;
        currentRoom = roomSelect.value;
        
        // Show chat container and hide auth
        authContainer.style.display = 'none';
        chatContainer.style.display = 'block';
        
        // Set current user display
        currentUser.textContent = `Logged in as: ${currentUsername}`;
        
        // Join the selected room and toggle file upload section visibility
        joinRoom();
        
        // Clear login form
        loginUsername.value = '';
        loginPassword.value = '';
        
    } catch (err) {
        console.error('Login error:', err);
        loginMessage.textContent = 'An error occurred. Please try again.';
        loginMessage.classList.add('error');
    }
});

// Logout function
logoutButton.addEventListener('click', () => {
    // Hide chat container and show auth
    chatContainer.style.display = 'none';
    authContainer.style.display = 'block';
    
    // Clear current user
    currentUsername = '';
    
    // Clear messages
    messagesContainer.innerHTML = '';
    
    // Reset login tab
    loginTab.click();
});

// Join a chat room
function joinRoom() {
    // Clear messages when changing rooms
    messagesContainer.innerHTML = '';
    
    // Get the selected room
    currentRoom = roomSelect.value;
    
    // Toggle file upload section based on selected room
    toggleFileUploadSection(currentRoom);
    
    // Join the room via Socket.io
    socket.emit('joinRoom', { username: currentUsername, room: currentRoom });
}

// Toggle file upload section visibility based on room
function toggleFileUploadSection(room) {
    // Remove previous room classes
    chatContainer.classList.remove('room-general', 'room-tech');
    
    // Add current room class
    chatContainer.classList.add(`room-${room}`);
    
    // Show file upload only in tech room
    if (room === 'tech') {
        fileUploadSection.classList.add('active');
    } else {
        fileUploadSection.classList.remove('active');
    }
}

// Room change event
roomSelect.addEventListener('change', joinRoom);

// Send a message
function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) {
        return;
    }
    
    const messageData = {
        username: currentUsername,
        message: message,
        room: currentRoom,
        timestamp: new Date()
    };
    
    // If online, send normally
    if (isOnline) {
        socket.emit('chatMessage', messageData);
    } else {
        // If offline, queue the message
        console.log('Offline: Message queued for later sending');
        saveMessageToIndexedDB(messageData);
        offlineMessageQueue.push(messageData);
        
        // Show in UI with offline indicator
        const offlineMessage = {
            ...messageData,
            offline: true
        };
        addMessageToDOM(offlineMessage);
    }
    
    // Clear input
    messageInput.value = '';
}

// Send button click event
sendButton.addEventListener('click', sendMessage);

// Handle typing indicator
function typing() {
    // Emit typing event
    socket.emit('typing', { username: currentUsername, room: currentRoom });
    
    // Clear previous timeout
    clearTimeout(typingTimeout);
    
    // Set new timeout
    typingTimeout = setTimeout(() => {
        socket.emit('typing', { username: '', room: currentRoom });
    }, 1000);
}

// Message input keypress event
messageInput.addEventListener('keypress', (e) => {
    // Send message on Enter key
    if (e.key === 'Enter') {
        sendMessage();
    } else {
        typing();
    }
});

// Upload a file
uploadButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file');
        return;
    }
    
    // In a real app, you would upload the file to the server
    // For this demo, we'll just send a message about the file
    socket.emit('chatMessage', {
        username: currentUsername,
        message: `Shared a file: ${file.name}`,
        room: currentRoom
    });
    
    // Clear file input
    fileInput.value = '';
});

// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Add message to DOM
function addMessageToDOM(message) {
    const messageElement = document.createElement('div');
    
    // Determine message type
    if (message.username === 'ChatBot') {
        messageElement.classList.add('message-item', 'system');
        messageElement.innerHTML = `
            <div>${message.message}</div>
            <div class="timestamp">${formatTimestamp(message.timestamp)}</div>
        `;
    } else {
        const isSentByCurrentUser = message.username === currentUsername;
        messageElement.classList.add('message-item', isSentByCurrentUser ? 'sent' : 'received');
        
        // Add offline class if message is queued
        if (message.offline) {
            messageElement.classList.add('offline');
        }
        
        messageElement.innerHTML = `
            <div class="username">${message.username}</div>
            <div>${message.message}</div>
            <div class="timestamp">
                ${formatTimestamp(message.timestamp)}
                ${message.offline ? '<span class="offline-indicator">⌛ Queued</span>' : ''}
            </div>
        `;
    }
    
    // Add to messages container
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Socket.io event listeners
socket.on('message', (message) => {
    addMessageToDOM(message);
    
    // Show notification for messages not from current user
    if (message.username !== currentUsername && message.username !== 'ChatBot') {
        // Vibrate device
        if ('vibrate' in navigator) {
            navigator.vibrate(200);
        }
        
        // Show push notification if window is not focused
        showNotification(message);
    }
});

socket.on('loadMessages', (messages) => {
    messages.forEach(message => {
        addMessageToDOM(message);
    });
});

socket.on('typing', ({ username }) => {
    if (username) {
        typingIndicator.textContent = `${username} is typing...`;
    } else {
        typingIndicator.textContent = '';
    }
});

// Handle when another user clears the chat
socket.on('chatCleared', ({ room }) => {
    if (room === currentRoom) {
        // Clear messages from the UI
        messagesContainer.innerHTML = '';
        
        // Add system message
        const clearMessage = {
            username: 'ChatBot',
            message: 'Chat has been cleared by another user',
            timestamp: new Date()
        };
        
        addMessageToDOM(clearMessage);
    }
});

// Connection status handling
socket.on('connect', () => {
    connectionStatus.textContent = 'Connected';
    connectionStatus.classList.add('connected');
    connectionStatus.classList.remove('disconnected');
});

socket.on('disconnect', () => {
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.classList.add('disconnected');
    connectionStatus.classList.remove('connected');
});

// Check server status
fetch('/api/status')
    .then(response => {
        if (response.ok) {
            connectionStatus.textContent = 'Server OK';
            connectionStatus.classList.add('connected');
        } else {
            connectionStatus.textContent = 'Server Error';
            connectionStatus.classList.add('disconnected');
        }
    })
    .catch(err => {
        connectionStatus.textContent = 'Server Unreachable';
        connectionStatus.classList.add('disconnected');
        console.error('Server status check failed:', err);
    });

// Clear Chat functionality
clearChatButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all messages? This cannot be undone.')) {
        clearChatMessages();
    }
});

// Function to clear chat messages
function clearChatMessages() {
    // Clear messages from the UI
    messagesContainer.innerHTML = '';
    
    // Emit event to clear messages on the server for this room
    socket.emit('clearChat', { room: currentRoom });
    
    // Add system message about clearing chat
    const clearMessage = {
        username: 'ChatBot',
        message: `Chat has been cleared by ${currentUsername}`,
        timestamp: new Date()
    };
    
    addMessageToDOM(clearMessage);
} 