class AnosAI {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.sessionId = this.generateSessionId();
        this.isOnline = false;
        this.currentTheme = 'dark';
        
        this.initializeApp();
        this.bindEvents();
        this.checkServerStatus();
    }

    initializeApp() {
        // Set initial time for welcome message
        document.getElementById('initial-time').textContent = this.getCurrentTime();
        
        // Load theme from localStorage
        const savedTheme = localStorage.getItem('anos-ai-theme');
        if (savedTheme) {
            this.setTheme(savedTheme);
        }
        
        // Focus on input after load
        setTimeout(() => {
            document.getElementById('chat-input').focus();
        }, 1000);
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    bindEvents() {
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-button');
        const clearChatButton = document.getElementById('clear-chat');
        const themeToggleButton = document.getElementById('theme-toggle');
        const errorModalClose = document.getElementById('error-modal-close');
        const errorModalOk = document.getElementById('error-modal-ok');

        // Send message events
        sendButton.addEventListener('click', () => this.sendMessage());
        
        chatInput.addEventListener('input', (e) => {
            this.handleInputChange(e.target);
            this.updateSendButton();
        });

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Clear chat
        clearChatButton.addEventListener('click', () => this.clearChat());

        // Theme toggle
        themeToggleButton.addEventListener('click', () => this.toggleTheme());

        // Error modal
        errorModalClose.addEventListener('click', () => this.hideErrorModal());
        errorModalOk.addEventListener('click', () => this.hideErrorModal());

        // Close modal on backdrop click
        document.getElementById('error-modal').addEventListener('click', (e) => {
            if (e.target.id === 'error-modal') {
                this.hideErrorModal();
            }
        });
    }

    handleInputChange(textarea) {
        // Auto-resize
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        
        // Update character count
        const charCount = textarea.value.length;
        document.getElementById('char-count').textContent = `${charCount}/2000`;
        
        // Show warning if approaching limit
        const charCountElement = document.getElementById('char-count');
        if (charCount > 1800) {
            charCountElement.style.color = 'var(--warning)';
        } else if (charCount > 1500) {
            charCountElement.style.color = 'var(--text-muted)';
        } else {
            charCountElement.style.color = 'var(--text-muted)';
        }
    }

    updateSendButton() {
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-button');
        const hasText = chatInput.value.trim().length > 0;
        
        sendButton.disabled = !hasText || !this.isOnline;
    }

    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();

        if (!message || !this.isOnline) return;

        // Add user message to chat
        this.addMessage(message, 'user');

        // Clear input
        chatInput.value = '';
        chatInput.style.height = 'auto';
        this.updateSendButton();
        document.getElementById('char-count').textContent = '0/2000';

        // Show typing indicator
        this.showTypingIndicator();

        try {
            const response = await fetch(`${this.apiBaseUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    sessionId: this.sessionId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Hide typing indicator
            this.hideTypingIndicator();

            // Add AI response to chat
            if (data.reply) {
                this.addMessage(data.reply, 'ai');
            } else {
                throw new Error('No response from AI');
            }

        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            this.showError('Gagal mengirim pesan. Pastikan server backend berjalan dan API key Gemini valid.');
        }
    }

    addMessage(content, sender) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = `avatar ${sender}-avatar`;
        
        const icon = document.createElement('i');
        icon.className = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
        avatarDiv.appendChild(icon);
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = content;
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = this.getCurrentTime();
        
        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(timeDiv);
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showTypingIndicator() {
        document.getElementById('typing-indicator').classList.remove('hidden');
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        document.getElementById('typing-indicator').classList.add('hidden');
    }

    clearChat() {
        const chatMessages = document.getElementById('chat-messages');
        const welcomeMessage = chatMessages.querySelector('.ai-message');
        
        // Clear all messages except the welcome message
        while (chatMessages.firstChild) {
            chatMessages.removeChild(chatMessages.firstChild);
        }
        
        // Add back welcome message
        if (welcomeMessage) {
            chatMessages.appendChild(welcomeMessage);
        } else {
            // Create new welcome message if none exists
            this.addMessage('Halo! 👋 Saya Anos AI, asisten virtual Anda. Percakapan telah dibersihkan. Apa yang bisa saya bantu hari ini?', 'ai');
        }

        // Clear server-side history
        fetch(`${this.apiBaseUrl}/history/${this.sessionId}`, {
            method: 'DELETE'
        }).catch(error => {
            console.error('Error clearing server history:', error);
        });
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        
        // Update theme toggle icon
        const themeIcon = document.querySelector('#theme-toggle i');
        themeIcon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('anos-ai-theme', theme);
    }

    async checkServerStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            if (response.ok) {
                this.setOnlineStatus(true);
            } else {
                this.setOnlineStatus(false);
            }
        } catch (error) {
            console.error('Server health check failed:', error);
            this.setOnlineStatus(false);
        }
    }

    setOnlineStatus(online) {
        this.isOnline = online;
        const statusElement = document.getElementById('app-status');
        const sendButton = document.getElementById('send-button');
        
        if (online) {
            statusElement.innerHTML = 'Online';
            statusElement.style.color = 'var(--success)';
        } else {
            statusElement.innerHTML = 'Offline - Periksa Server';
            statusElement.style.color = 'var(--error)';
        }
        
        this.updateSendButton();
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-modal').classList.remove('hidden');
    }

    hideErrorModal() {
        document.getElementById('error-modal').classList.add('hidden');
    }

    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Simulate loading screen
    setTimeout(() => {
        document.getElementById('loading-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('chat-container').classList.remove('hidden');
            
            // Initialize Anos AI
            window.anosAI = new AnosAI();
        }, 500);
    }, 3000);
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.anosAI) {
        window.anosAI.checkServerStatus();
    }
});
