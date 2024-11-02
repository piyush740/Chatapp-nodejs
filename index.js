const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Object to store clients and their nicknames
let clients = {};
let users = [];

wss.on('connection', (ws) => {
    // Assign a default nickname for the client
    const userId = Date.now();  // Simple unique ID for the user
    let nickname = `User${userId}`;
    clients[userId] = { ws, nickname };

    console.log(`${nickname} connected`);

    // Notify the client of their assigned nickname
    ws.send(JSON.stringify({ type: 'system', message: `Welcome! Your nickname is ${nickname}.` }));

    // Send list of online users to all clients
    broadcastUsers();

    // Handle incoming messages
    ws.on('message', (message) => {
        const parsed = JSON.parse(message);

        // If the message is for setting a nickname
        if (parsed.type === 'set_nickname') {
            clients[userId].nickname = parsed.nickname;
            nickname = parsed.nickname;
            // Broadcast the updated user list
            broadcastUsers();
            ws.send(JSON.stringify({ type: 'system', message: `Your nickname has been changed to ${nickname}` }));
        } 
        // If it's a chat message
        else if (parsed.type === 'chat') {
            // Broadcast the message to all clients with the sender's nickname
            const broadcastMessage = JSON.stringify({
                type: 'chat',
                nickname: clients[userId].nickname,
                message: parsed.message
            });
            Object.values(clients).forEach(client => {
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(broadcastMessage);
                }
            });
        }
        // If it's a private message
        else if (parsed.type === 'private_message') {
            const recipientClient = Object.values(clients).find(client => client.nickname === parsed.recipient);
            if (recipientClient && recipientClient.ws.readyState === WebSocket.OPEN) {
                recipientClient.ws.send(JSON.stringify({
                    type: 'private_message',
                    message: parsed.message,
                    sender: nickname
                }));
            } else {
                ws.send(JSON.stringify({ type: 'system', message: 'User not found or offline.' }));
            }
        }
    });

    // When user disconnects
    ws.on('close', () => {
        console.log(`${nickname} disconnected`);
        delete clients[userId]; // Remove the client from the list
        users = users.filter(user => user !== nickname); // Remove user from the user list
        broadcastUsers(); // Broadcast updated user list
    });
});

// Function to broadcast the updated user list to all clients
function broadcastUsers() {
    users = Object.values(clients).map(client => client.nickname); // Update the user list
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'users', users }));
        }
    });
}

console.log('WebSocket server is running on ws://localhost:8080');
