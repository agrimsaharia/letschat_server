// Description: Client side script for the chat application

import { AlertHandler } from './alert_handler.js';

const socket = io()

const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const newChatButton = document.getElementById('newChatButton');
const disconnectButton = document.getElementById('disconnectButton');

/**
 * A general rule of thumb:
 *  - Use messages from system for socket.emit and socket.on events
 *      - This is to ensure that the client side is aware of the event that has been triggered
 *  - Use static alerts for system prompts that are triggered by the UI interaction
 *      - This is to ensure that the client side is informed properly
 *  - Use temp alerts for for non-critical prompts 
 */

const alertHandler = new AlertHandler(document, 'alerts');

// Utility to append a message to the chat
function appendMessage(sender, text) {
    const messageElement = document.createElement('div');
    
    messageElement.style.textAlign = (sender === "You") ? 'right' : 'left';
    messageElement.textContent = `${sender}: ${text}`;
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

const UserStatus = {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected'
};

const ChatStatus = {
    REQUESTED_CONNECT: 'requested_connect',
    ONGOING: 'ongoing',
    REQUESTED_DISCONNECT: 'requested_disconnect',
    TERMINATED: 'terminated'
};

let userStatus = UserStatus.DISCONNECTED;
let chatStatus = ChatStatus.TERMINATED;
let typing_alert_id = null;

socket.on('connect_error', (error) => {
    appendMessage('System', 'Connection error: ' + error.message);
    userStatus = UserStatus.DISCONNECTED;
});

// Handle socket events
socket.on('connect', () => {
    appendMessage('System', 'Connected to server.');
    userStatus = UserStatus.CONNECTED;
});

socket.on('chat connected', () => {
    appendMessage('System', `Connected to chat`);
    chatStatus = ChatStatus.ONGOING;
});

socket.on('chat message', (text) => {
    alertHandler.remove_alert(typing_alert_id);
    appendMessage(`Stranger`, text);
});

socket.on('chat disconnected', () => {
    appendMessage('System', 'Chat has disconnected.');
    chatStatus = ChatStatus.TERMINATED;
});

socket.on('disconnect', () => {
    appendMessage('System', 'Disconnected from server. Please hard refresh the page.');
    userStatus = UserStatus.DISCONNECTED;
});

socket.on('typing', () => {
    typing_alert_id = alertHandler.show_temp_alert('Stranger is typing...', 300);
});

// Button handlers
sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (
        message === '' 
        || userStatus === UserStatus.DISCONNECTED
        || chatStatus !== ChatStatus.ONGOING
    ) return;
    socket.emit('chat message', message);
    appendMessage(`You`, message);
    messageInput.value = '';
});

messageInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendButton.click();
    }
});

messageInput.addEventListener('input', function(event) {
    if (chatStatus === ChatStatus.ONGOING) {
        socket.emit('typing');
    }
});

newChatButton.addEventListener('click', () => {
    if (userStatus === UserStatus.DISCONNECTED) {
        alertHandler.show_static_alert('Please wait for the connection to be established...', 300);
    } else if (chatStatus === ChatStatus.REQUESTED_CONNECT) {
        alertHandler.show_static_alert('Chat request already in progress...', 300);
    } else if (chatStatus === ChatStatus.ONGOING) {
        alertHandler.show_static_alert('Please disconnect ongoing chat first.', 300);
    } else if (chatStatus === ChatStatus.REQUESTED_DISCONNECT) {
        alertHandler.show_static_alert('Please wait for the current chat to disconnect.', 300);
    } else {
        chatStatus = ChatStatus.REQUESTED_CONNECT;
        socket.emit('request connect chat');
        appendMessage('System', 'Requesting a new chat...');
    }
});

disconnectButton.addEventListener('click', () => {
    if (chatStatus === ChatStatus.REQUESTED_CONNECT) {
        chatStatus = ChatStatus.REQUESTED_DISCONNECT;
        appendMessage('System', `Cancelling request.`);
        socket.emit('request disconnect chat');
    } else if (chatStatus === ChatStatus.ONGOING) {
        chatStatus = ChatStatus.REQUESTED_DISCONNECT;
        appendMessage('System', 'Requesting to disconnect the chat...');
        socket.emit('request disconnect chat');
    } else if (chatStatus === ChatStatus.REQUESTED_DISCONNECT) {
        alertHandler.show_static_alert('Disconnect request already in progress...', 300);
    } else if (chatStatus === ChatStatus.TERMINATED) {
        alertHandler.show_static_alert('No chat to disconnect.', 300);
    } else {
        console.error('Invalid chat status');
    }

});

// socket.connect()
