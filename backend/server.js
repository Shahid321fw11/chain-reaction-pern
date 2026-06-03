const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt'); // 1. Import encryption tool
const pool = require('./db');     // 2. Import our database link

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());

// --- REGISTRATION ROUTE ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Step A: Check if the email already exists
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: "Email already registered!" });
        }

        // Step B: Scramble (hash) the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Step C: Save the new user to the database
        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
            [email, hashedPassword]
        );

        // Step D: Send success response
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

        // Step A: Find the user in the database by email
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        // If no user matches that email, stop and return error
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const user = userResult.rows[0];

        // Step B: Compare the typed password with the scrambled password in the DB
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Step C: Success! Send back the user data
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

app.listen(PORT, () => {
    console.log(`Server is happily running on port ${PORT}`);
});