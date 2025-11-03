const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenAI } = require("@google/genai");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini AI
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "AIzaSyDrS1aLHDiQvTy-dQZAU-IQ3qmd_D837-k"
});

// Store conversation history (in production, use a database)
const conversationHistory = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Anos AI Server is running',
    timestamp: new Date().toISOString()
  });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;

    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required' 
      });
    }

    // Get or initialize conversation history for this session
    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, []);
    }
    
    const history = conversationHistory.get(sessionId);
    
    // Add user message to history
    history.push({
      role: 'user',
      parts: [{ text: message }],
      timestamp: new Date().toISOString()
    });

    // Prepare conversation context
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `You are Anos AI, a helpful and friendly AI assistant. Respond in the same language as the user. Be concise but helpful. Current conversation history: ${JSON.stringify(history.slice(-6))} User message: ${message}`
          }
        ]
      }
    ];

    console.log('Sending request to Gemini API...');
    
    // Generate response using Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-exp-03-25",
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });

    const aiResponse = response.text;

    // Add AI response to history
    history.push({
      role: 'model',
      parts: [{ text: aiResponse }],
      timestamp: new Date().toISOString()
    });

    // Keep only last 10 messages to manage memory
    if (history.length > 10) {
      conversationHistory.set(sessionId, history.slice(-10));
    }

    res.json({ 
      reply: aiResponse,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in /api/chat:', error);
    
    // Handle specific Gemini API errors
    if (error.message.includes('API key')) {
      return res.status(401).json({ 
        error: 'Invalid API key. Please check your Gemini API configuration.' 
      });
    }
    
    if (error.message.includes('quota')) {
      return res.status(429).json({ 
        error: 'API quota exceeded. Please try again later.' 
      });
    }

    res.status(500).json({ 
      error: 'Internal server error. Please try again.' 
    });
  }
});

// Get conversation history
app.get('/api/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const history = conversationHistory.get(sessionId) || [];
  res.json({ history });
});

// Clear conversation history
app.delete('/api/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  conversationHistory.delete(sessionId);
  res.json({ message: 'Conversation history cleared' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Anos AI Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});
