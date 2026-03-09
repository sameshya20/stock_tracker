const axios = require('axios');

async function testChat() {
    try {
        // 1. Register a test user (or login if already exists)
        let token;
        try {
            const registerRes = await axios.post('http://localhost:5000/api/auth/register', {
                name: 'Test User',
                email: 'chattest@test.com',
                password: 'testpass123'
            });
            token = registerRes.data.token;
            console.log('[1] Registered successfully');
        } catch (e) {
            // User might already exist, try login
            const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
                email: 'chattest@test.com',
                password: 'testpass123'
            });
            token = loginRes.data.token;
            console.log('[1] Logged in successfully');
        }

        // 2. Send a chat message
        console.log('[2] Sending chat message...');
        const chatRes = await axios.post(
            'http://localhost:5000/api/chat/message',
            { message: 'hello', chatId: null },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('[2] Chat response status:', 200);
        console.log('[2] chatId:', chatRes.data.chatId);
        console.log('[2] messages count:', chatRes.data.messages?.length);
        console.log('[2] first msg:', JSON.stringify(chatRes.data.messages?.[0]));
        console.log('[2] last msg content (truncated):', chatRes.data.messages?.[chatRes.data.messages.length - 1]?.content?.substring(0, 100));

    } catch (error) {
        console.error('ERROR:', error.response?.status, error.response?.data || error.message);
    }
}

testChat();
