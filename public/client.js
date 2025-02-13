// Description: Client side script for the chat application

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

class AlertHandler {
    constructor(document, alertDivId) {
        this.document = document;
        this.alertDiv = document.getElementById(alertDivId);
        
        this.alert_counter = 0;

        this.temp_alert_element = document.createElement('div');
        this.temp_alert_active = false;
        this.temp_alert_timeout = 0;
        this.curr_temp_alert_id = 0;

        this.static_alert_by_id = {};
    }

    #__get_new_id() {
        this.alert_counter++;
        return this.alert_counter;
    }

    // remove the temp alert element from the alert div
    #__upon_temp_alert_timeout() {
        if (this.temp_alert_active) {
            this.alertDiv.removeChild(this.temp_alert_element);
            this.temp_alert_active = false;
            return true;
        }
        return false;
    }

    // delete the static alert element from the alert div
    #__upon_static_alert_timeout(alert_id) {
        const static_alert_element = this.static_alert_by_id[alert_id];
        if (static_alert_element) {
            this.alertDiv.removeChild(static_alert_element);
            delete this.static_alert_by_id[alert_id];
            return true;
        } else {
            console.debug('Alert with id ' + alert_id + ' not found or has been deleted already');
            return false;
        }
    }

    show_temp_alert(text, duration = 300) {
        this.curr_temp_alert_id = this.#__get_new_id();
        this.temp_alert_element.textContent = text;
        if (!this.temp_alert_active) {
            this.alertDiv.appendChild(this.temp_alert_element);
            this.temp_alert_active = true;
        }
        clearTimeout(this.temp_alert_timeout);
        this.temp_alert_timeout = setTimeout(() => {
            this.#__upon_temp_alert_timeout();
        }, duration);
        this.alertDiv.scrollTop = this.alertDiv.scrollHeight;
        return this.curr_temp_alert_id; 
    }

    remove_alert(alert_id) {
        if (this.curr_temp_alert_id === alert_id) {
            clearTimeout(this.temp_alert_timeout);
            this.#__upon_temp_alert_timeout();
            return true;
        } else {
            return this.#__upon_static_alert_timeout(alert_id);
        }
    }

    show_static_alert(text, duration = 1000) {
        // NOTE: Removing the temp alert
        // Otherwise we need to ensure that the temp alert remains at the top of the alert div
        this.remove_alert(this.curr_temp_alert_id);

        // create a new static alert element
        const static_alert_element = this.document.createElement('div');
        const alert_id = this.#__get_new_id();
        static_alert_element.textContent = text;
        this.alertDiv.prepend(static_alert_element);
        this.static_alert_by_id[alert_id] = static_alert_element;
        setTimeout(() => {
            this.#__upon_static_alert_timeout(alert_id);
        }, duration);
        this.alertDiv.scrollTop = this.alertDiv.scrollHeight;
        return alert_id
    }

}

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
        alertHandler.show_static_alert('Please wait for the connection to be re-established...', 300);
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
