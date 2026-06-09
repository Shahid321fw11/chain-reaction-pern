const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt'); 
const pool = require('./db');     
// 1. Import HTTP module and Socket.io for WebSockets
const http = require('http'); 
const { Server } = require('socket.io'); 

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());


// --- WEBSOCKET SETUP ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Server Memory: This will track all active games
const activeRooms = {}; 

io.on('connection', (socket) => {
    console.log(`🔌 User Connected: ${socket.id}`);

    // 1. CREATE A ROOM
    socket.on('create_room', (data) => {
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase(); // Random 6 char code
        
        // Initialize the room in the server's memory
        activeRooms[roomCode] = {
            players: [{ socketId: socket.id, email: data.email, playerNum: 1 }],
            gameStarted: false
        };

        socket.join(roomCode);
        
        // Tell the creator their room code and that they are Player 1
        socket.emit('room_created', { roomCode, players: activeRooms[roomCode].players });
    });

    // 2. JOIN A ROOM
    socket.on('join_room', (data) => {
        const { roomCode, email } = data;
        const room = activeRooms[roomCode];

        if (!room) {
            return socket.emit('error_message', 'Room not found!');
        }
        if (room.gameStarted) {
            return socket.emit('error_message', 'Game has already started!');
        }
        if (room.players.length >= 4) {
            return socket.emit('error_message', 'Room is full (Max 4 players)!');
        }

        // Assign Player 2, 3, or 4
        const playerNum = room.players.length + 1;
        room.players.push({ socketId: socket.id, email, playerNum });
        socket.join(roomCode);

        // Tell EVERYONE in the room that a new player joined
        io.to(roomCode).emit('player_joined', room.players);
    });

    // 3. START THE GAME
    socket.on('start_game', (roomCode) => {
        if (activeRooms[roomCode]) {
            activeRooms[roomCode].gameStarted = true;
            // Tell everyone in the room to switch to the game board!
            io.to(roomCode).emit('game_started');
        }
    });

    // 4. HANDLE MOVES
    socket.on('send_move', (moveData) => {
        // Broadcast the updated board to everyone else in the room
        socket.to(moveData.roomCode).emit('receive_move', moveData);
    });

    // --- NEW: RESTART THE GAME ---
    socket.on('restart_game', (roomCode) => {
        // Tell everyone in this specific room to wipe their boards clean
        io.to(roomCode).emit('game_restarted');
    });

    // 5. DISCONNECT LOGIC
    // --- UPDATED: DISCONNECT LOGIC ---
    socket.on('disconnect', () => {
        console.log(`🔴 User Disconnected: ${socket.id}`);
        
        // Search through all active rooms to find where this player was
        for (const roomCode in activeRooms) {
            const room = activeRooms[roomCode];
            const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
            
            if (playerIndex !== -1) {
                // We found the player! 
                const disconnectedPlayer = room.players[playerIndex];
                
                // Remove them from the room's memory
                room.players.splice(playerIndex, 1);
                
                if (room.players.length === 0) {
                    // If the room is completely empty now, delete it to save server memory
                    delete activeRooms[roomCode];
                } else {
                    // Tell the remaining players that someone left
                    io.to(roomCode).emit('player_disconnected', disconnectedPlayer.email);
                    
                    // Force the room back into the lobby state
                    room.gameStarted = false; 
                    io.to(roomCode).emit('player_joined', room.players); 
                }
                break; // Stop searching once we found them
            }
        }
    });
});

// --- REGISTRATION ROUTE ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: "Email already registered!" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
            [email, hashedPassword]
        );

        res.status(201).json({
            message: "User registered successfully!",
            user: newUser.rows[0]
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

// --- LOGIN ROUTE ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        res.json({
            message: "Login successful!",
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

app.get('/', (req, res) => {
    res.send("Server is running successfully!");
});

// --- START SERVER ---
// 5. CRITICAL FIX: Change app.listen to server.listen so WebSockets actually start!
server.listen(PORT, () => {
    console.log(`🚀 Server is happily running with WebSockets on port ${PORT}`);
});