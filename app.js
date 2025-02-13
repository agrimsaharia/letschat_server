import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

// Get the directory name of the current module
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")))

// Use the PORT from environment variable 
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

import { ChatHandler } from './handlers/chat_handler.js';

var available_client = null;

const allocate_chat = (socket) => {
  if (available_client) {
    console.log('allocating chat with ' + available_client.id);
    const chat = new ChatHandler(socket, available_client);
    socket.chat_handler = chat;
    available_client.chat_handler = chat;
    chat.connect_chat();
    available_client = null;
  } else {
    console.log('user ' + socket.id + ' added to availability queue');
    available_client = socket;
  }
}

const destroy_chat = (chat) => {
  chat.disconnect_chat();
  chat.socket1.chat_handler = null;
  chat.socket2.chat_handler = null;
  chat = null;
}

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log('user ' + socket.id + ' connected');
  socket.chat_handler = null;
  
  socket.on('disconnect', () => {
    console.log('user ' + socket.id + ' disconnected');
    
    // only one case shall be triggered. But both are checked for safety.
    if (socket.chat_handler) {
      destroy_chat(socket.chat_handler);
    } else if (socket.id === available_client?.id) {
      available_client = null;
      socket.emit('chat disconnected');
      console.log('user ' + socket.id + ' removed from availability queue');
    } 
  });

  socket.on('request connect chat', () => {
    console.log('user ' + socket.id + ' requesting chat');
    if (socket.chat_handler) {
      console.log('user ' + socket.id + ' already in chat');
    } else {
      allocate_chat(socket);
    }
  });

  socket.on('request disconnect chat', () => {
    console.log('user ' + socket.id + ' requesting to disconnect chat');
    
    // only one case shall be triggered. But both are checked for safety.
    if (socket.chat_handler) {
      destroy_chat(socket.chat_handler);
    } else if (socket.id === available_client?.id) {
      available_client = null;
      socket.emit('chat disconnected');
      console.log('user ' + socket.id + ' removed from availability queue');
    } else {
      console.log('user ' + socket.id + ' not in chat');
    }
  });
});
