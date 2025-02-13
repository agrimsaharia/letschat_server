/**
 * A chat between two clients.
 * Responsible for managing the message flow and the lifecycle of a chat.
 * Handles the connection and disconnection of clients.
 * The chat is closed and the object is destroyed when one of the clients disconnects.
 */

class ChatHandler {
    constructor(socket1, socket2) {
        this.socket1 = socket1;
        this.socket2 = socket2;
    }
    
    connect_chat() {
        // emit participant message event to the other participant
        this.socket1.on('chat message', (msg) => {
            this.socket2.emit('chat message', msg);
        });
    
        this.socket2.on('chat message', (msg) => {
            this.socket1.emit('chat message', msg);
        });
        
        // emit participant typing event to the other participant
        this.socket2.on('typing', () => {
            this.socket1.emit('typing');
        });

        this.socket1.on('typing', () => {
            this.socket2.emit('typing');
        });

        // emit chat connected event to both participants
        this.socket1.emit('chat connected');
        this.socket2.emit('chat connected');
    }

    disconnect_chat() {
        // remove all listeners created by this chat handler
        this.socket1.removeAllListeners('chat message');
        this.socket2.removeAllListeners('chat message');

        this.socket1.removeAllListeners('typing');
        this.socket2.removeAllListeners('typing');

        this.socket1.emit('chat disconnected');
        this.socket2.emit('chat disconnected');
    }

}

export {
    ChatHandler
}