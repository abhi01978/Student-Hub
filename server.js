require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const User = require('./models/User'); 
const fs = require('fs');

const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Database Connected! AI ready ✨"))
    .catch(err => console.log("❌ DB Error: ", err));
    
// --- AI Response Function ---
const callGroqWithRetry = async (userMessage, retryCount = 0) => {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a cool 'bestie' teacher. Talk in Hinglish with emojis. Keep it short.`
                },
                { role: "user", content: userMessage }
            ],
            model: "llama-3.1-8b-instant", 
            max_tokens: 250,
            temperature: 0.8, 
        });
        return completion.choices[0].message.content;
    } catch (error) {
        if (error.status === 429 && retryCount < 2) {
            await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 3000));
            return callGroqWithRetry(userMessage, retryCount + 1);
        }
        throw error;
    }
};



// MCQ Route

app.post('/api/get-mcqs', async (req, res) => {
    try {
        const { studentClass, subject } = req.body;
        const fileName = `./questions/${studentClass}_${subject}.json`.toLowerCase().replace(/\s/g, '');

        // 1. Pehle check karo agar file hai toh wahi bhej do (API key bachegi)
        if (fs.existsSync(fileName)) {
            const savedData = fs.readFileSync(fileName, 'utf8');
            return res.json(JSON.parse(savedData));
        }

        // 2. Agar file nahi hai tabhi AI ko call karo
        const completion = await groq.chat.completions.create({
            messages: [{ 
                role: "system", 
                content: `Create 10 MCQs for ${studentClass} ${subject}. Return ONLY a JSON array of objects. Each object MUST have: "text" (question), "options" (exactly 3 strings), and "correct" (correct string from options). No extra text.` 
            }],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" }
        });

        let aiData = JSON.parse(completion.choices[0].message.content);
        // Ensure array format
        const questionsList = Array.isArray(aiData) ? aiData : (aiData.questions || []);

        if (!fs.existsSync('./questions')) fs.mkdirSync('./questions');
        fs.writeFileSync(fileName, JSON.stringify(questionsList, null, 2));
        
        res.json(questionsList);

    } catch (error) {
        console.error("MCQ Error:", error);
        res.status(500).json({ error: "AI Error" });
    }
});

// Chat Route
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const reply = await callGroqWithRetry(message);
        res.json({ reply });
    } catch (error) {
        res.status(500).json({ reply: "Server error" });
    }
});

// --- UPDATED SIGNUP ROUTE ---
app.post('/api/signup', async (req, res) => {
    try {
        const { username, email, password, class: userClass } = req.body;

        if (!username || !email || !password || !userClass) {
            return res.status(400).json({ error: "Saari details bharo bhai!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({ 
            username, 
            email, 
            password: hashedPassword, 
            class: userClass 
        });

        await newUser.save();
        res.status(201).json({ message: "Account ban gaya! Ab login karo." });

    } catch (err) {
        console.log("❌ SIGNUP ERROR DETAILS:", err.message); 
        res.status(500).json({ error: "Signup error: " + err.message }); 
    }
});

// --- UPDATED LOGIN ROUTE ---
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body; // Login ab email se hoga
        const user = await User.findOne({ email });

        if (user && await bcrypt.compare(password, user.password)) {
            // Login ke baad hum username aur class dono bhej rahe hain
            res.json({ 
                username: user.username, 
                class: user.class,
                message: "Welcome back!" 
            });
        } else {
            res.status(401).json({ error: "Galat details hai bhai!" });
        }
    } catch (err) {
        res.status(500).json({ error: "Login error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
});