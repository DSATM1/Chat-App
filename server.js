const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Get database password from environment variable or use a default for development
const dbPassword = process.env.DB_PASSWORD || 'suraj123'; // Your actual MongoDB Atlas password

// MongoDB Connection
const connectionString = `mongodb+srv://Chat_App:${dbPassword}@chatapp.xl7gv.mongodb.net/chatapp?retryWrites=true&w=majority&appName=ChatApp`;

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => {
    console.error('MongoDB connection error:', err);
    // Continue with in-memory data if MongoDB connection fails
    setupInMemoryData();
});

// In-memory data storage for MongoDB fallback
let inMemoryUsers = [];
let inMemoryMessages = [];
let isUsingInMemory = false;

function setupInMemoryData() {
    console.log('Using in-memory data storage as fallback');
    isUsingInMemory = true;
    
    // Create a test user for convenience
    inMemoryUsers.push({
        username: 'test',
        password: '$2a$10$zPzOUaWcM1SZLjVxXykRne4eBRvZc0JDSwxAqcKetxNOybV2JNDHu', // hashed 'password'
        createdAt: new Date()
    });
    
    // Log test user details for easy access
    console.log('Test user created. Use these credentials to login:');
    console.log('Username: test');
    console.log('Password: password');
    
    // Add some sample messages
    inMemoryMessages.push({
        username: 'ChatBot',
        message: 'Welcome to the in-memory chat!',
        room: 'general',
        timestamp: new Date()
    });
}

// User Schema
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Message Schema
const messageSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    room: {
        type: String,
        default: 'general'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// API Routes
// Server status endpoint
app.get('/api/status', (req, res) => {
    res.status(200).json({ status: 'ok', mode: isUsingInMemory ? 'in-memory' : 'mongodb' });
});

// Create test user endpoint (for debugging only)
app.get('/api/create-test-user', async (req, res) => {
    try {
        if (isUsingInMemory) {
            return res.json({ message: 'Using in-memory mode, test user already exists', 
                            username: 'test', 
                            password: 'password' });
        }
        
        // Check if test user already exists in MongoDB
        const existingUser = await User.findOne({ username: 'test' });
        if (existingUser) {
            return res.json({ message: 'Test user already exists', username: 'test' });
        }
        
        // Create test user in MongoDB
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password', salt);
        
        const testUser = new User({
            username: 'test',
            password: hashedPassword
        });
        
        await testUser.save();
        return res.json({ 
            message: 'Test user created successfully', 
            username: 'test', 
            password: 'password'
        });
    } catch (err) {
        console.error('Error creating test user:', err);
        return res.status(500).json({ message: 'Failed to create test user' });
    }
});

// Register a new user
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (isUsingInMemory) {
            // Check if username already exists in memory
            const existingUser = inMemoryUsers.find(user => user.username === username);
            if (existingUser) {
                return res.status(400).json({ message: 'Username already exists' });
            }
            
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            // Create and store new user in memory
            const newUser = {
                username,
                password: hashedPassword,
                createdAt: new Date()
            };
            
            inMemoryUsers.push(newUser);
            return res.status(201).json({ message: 'User registered successfully' });
        }
        
        // MongoDB implementation - unchanged
        // Check if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create new user
        const newUser = new User({
            username,
            password: hashedPassword
        });
        
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login user
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`Login attempt: ${username}`);
        
        if (isUsingInMemory) {
            console.log('Using in-memory user database');
            // Check if user exists in memory
            const user = inMemoryUsers.find(user => user.username === username);
            if (!user) {
                console.log(`User not found: ${username}`);
                return res.status(400).json({ message: 'Invalid credentials' });
            }
            
            // Check password
            const isMatch = await bcrypt.compare(password, user.password);
            console.log(`Password match: ${isMatch}`);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }
            
            console.log(`Login successful for: ${username}`);
            return res.json({ message: 'Login successful', username: user.username });
        }
        
        // MongoDB implementation
        console.log('Using MongoDB user database');
        // Check if user exists
        const user = await User.findOne({ username });
        if (!user) {
            console.log(`User not found in MongoDB: ${username}`);
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`Password match: ${isMatch}`);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        console.log(`Login successful for: ${username}`);
        res.json({ message: 'Login successful', username: user.username });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('New user connected');
    
    // Join a room
    socket.on('joinRoom', async ({ username, room }) => {
        socket.join(room);
        
        // Welcome message
        socket.emit('message', {
            username: 'ChatBot',
            message: `Welcome to the ${room} chat room!`,
            timestamp: new Date()
        });
        
        // Broadcast when a user connects
        socket.to(room).emit('message', {
            username: 'ChatBot',
            message: `${username} has joined the chat`,
            timestamp: new Date()
        });
        
        // Load previous messages
        try {
            if (isUsingInMemory) {
                // Get messages from in-memory storage
                const messages = inMemoryMessages
                    .filter(msg => msg.room === room)
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .slice(0, 50);
                    
                socket.emit('loadMessages', messages);
            } else {
                // Get messages from MongoDB
                const messages = await Message.find({ room }).sort({ timestamp: 1 }).limit(50);
                socket.emit('loadMessages', messages);
            }
        } catch (err) {
            console.error('Error loading messages:', err);
        }
    });
    
    // Listen for chat message
    socket.on('chatMessage', async ({ username, message, room }) => {
        const newMessage = { 
            username, 
            message, 
            room, 
            timestamp: new Date() 
        };
        
        try {
            if (isUsingInMemory) {
                // Store message in memory
                inMemoryMessages.push(newMessage);
            } else {
                // Store message in MongoDB
                const mongoMessage = new Message(newMessage);
                await mongoMessage.save();
            }
            
            // Emit message to room
            io.to(room).emit('message', newMessage);
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });
    
    // Clear chat messages for a room
    socket.on('clearChat', async ({ room }) => {
        try {
            if (isUsingInMemory) {
                // Clear messages for this room in memory
                inMemoryMessages = inMemoryMessages.filter(msg => msg.room !== room);
                console.log(`Chat cleared for room: ${room}`);
            } else {
                // Clear messages for this room in MongoDB
                await Message.deleteMany({ room });
                console.log(`Chat messages deleted from MongoDB for room: ${room}`);
            }
            
            // Broadcast to all users in room that chat was cleared
            socket.to(room).emit('chatCleared', { room });
        } catch (err) {
            console.error('Error clearing chat messages:', err);
        }
    });
    
    // User typing
    socket.on('typing', ({ username, room }) => {
        socket.to(room).emit('typing', { username });
    });
    
    // Disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 