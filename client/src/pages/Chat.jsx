import { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../services/api';
import { HiOutlinePaperAirplane, HiOutlinePlus, HiOutlineTrash, HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import toast from 'react-hot-toast';

// Safe markdown renderer - no external dependencies needed
const renderMarkdown = (text) => {
    if (!text) return '';
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Headers
    text = text.replace(/^### (.*$)/gm, '<h3 style="font-size:1em;font-weight:700;margin:8px 0 4px;">$1</h3>');
    text = text.replace(/^## (.*$)/gm, '<h2 style="font-size:1.1em;font-weight:700;margin:10px 0 4px;">$1</h2>');
    text = text.replace(/^# (.*$)/gm, '<h1 style="font-size:1.2em;font-weight:700;margin:12px 0 4px;">$1</h1>');
    // Blockquote
    text = text.replace(/^> (.*$)/gm, '<blockquote style="border-left:3px solid #7c3aed;padding-left:8px;opacity:0.8;margin:6px 0;">$1</blockquote>');
    // Horizontal rule
    text = text.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:10px 0;"/>');
    // Bullet lists
    text = text.replace(/^[•\-\*] (.*$)/gm, '<div style="display:flex;gap:6px;margin:2px 0;"><span style="color:#a78bfa;flex-shrink:0;">•</span><span>$1</span></div>');
    // Numbered lists
    text = text.replace(/^\d+\. (.*$)/gm, '<div style="display:flex;gap:6px;margin:2px 0;padding-left:4px;"><span>$1</span></div>');
    // Line breaks
    text = text.replace(/\n/g, '<br/>');
    // Clean up double breaks after block elements
    text = text.replace(/<\/h[123]><br\/>/g, '</h$1>');
    text = text.replace(/<\/blockquote><br\/>/g, '</blockquote>');
    text = text.replace(/<\/div><br\/>/g, '</div>');
    text = text.replace(/<hr[^>]*\/><br\/>/g, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:10px 0;"/>');
    return text;
};

const Chat = () => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [chatId, setChatId] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        loadChatHistory();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadChatHistory = async () => {
        try {
            const { data } = await chatAPI.getChatHistory();
            setChatHistory(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading chat history:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadChat = async (id) => {
        try {
            const { data } = await chatAPI.getChat(id);
            setChatId(data.chatId || data.id);
            setMessages(Array.isArray(data.messages) ? data.messages : []);
        } catch (error) {
            console.error('Error loading chat:', error);
            toast.error('Failed to load chat');
        }
    };

    const startNewChat = () => {
        setChatId(null);
        setMessages([]);
        inputRef.current?.focus();
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!message.trim() || sending) return;

        const userMsg = message.trim();
        setMessage('');
        setSending(true);

        // Add user message immediately
        setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date().toISOString() }]);

        try {
            const { data } = await chatAPI.sendMessage({ message: userMsg, chatId });
            setChatId(data.chatId);
            setMessages(Array.isArray(data.messages) ? data.messages : []);
            loadChatHistory();
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to get response');
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setSending(false);
        }
    };

    const deleteChat = async (id) => {
        try {
            await chatAPI.deleteChat(id);
            setChatHistory(prev => prev.filter(c => c.id !== id));
            if (chatId === id) {
                startNewChat();
            }
            toast.success('Chat deleted');
        } catch (error) {
            console.error('Error deleting chat:', error);
            toast.error('Failed to delete chat');
        }
    };

    const quickPrompts = [
        "Today's share value of AAPL",
        "Give the whole history of Reliance",
        "What is the price of Tata Consultancy Services?",
        "Tell me about NVIDIA's history",
        "What is a P/E ratio?",
        "Who is the CEO of Tesla?"
    ];

    return (
        <div className="animate-fade-in flex h-[calc(100vh-48px)] gap-6 max-w-[1600px]">
            {/* Sidebar - Chat History */}
            <div className="hidden lg:flex flex-col w-72 glass-card overflow-hidden">
                <div className="p-4 border-b border-dark-border">
                    <button
                        onClick={startNewChat}
                        className="w-full flex items-center justify-center gap-2 py-2.5 gradient-bg text-white rounded-xl font-medium hover:opacity-90 transition-all text-sm"
                    >
                        <HiOutlinePlus /> New Chat
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {chatHistory.map((chat) => (
                        <div
                            key={chat.id}
                            className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${chatId === chat.id ? 'bg-primary/15 text-primary' : 'text-dark-text-secondary hover:bg-dark-card-hover'
                                }`}
                            onClick={() => loadChat(chat.id)}
                        >
                            <HiOutlineChatBubbleLeftRight className="flex-shrink-0 text-sm" />
                            <span className="text-sm truncate flex-1">{chat.title}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                                className="opacity-0 group-hover:opacity-100 text-dark-text-secondary hover:text-loss transition-all flex-shrink-0"
                            >
                                <HiOutlineTrash className="text-sm" />
                            </button>
                        </div>
                    ))}
                    {chatHistory.length === 0 && !loading && (
                        <p className="text-xs text-dark-text-secondary text-center py-8 px-4">
                            No conversations yet. Start a new chat!
                        </p>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col glass-card overflow-hidden">
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-dark-border flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <span className="text-white text-lg">📈</span>
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-dark-text">AI Stock Assistant</h2>
                        <p className="text-xs text-dark-text-secondary">Real-Time Data • Technical Analysis • Financial Insights</p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6">
                                <span className="text-3xl">📈</span>
                            </div>
                            <h3 className="text-xl font-bold text-dark-text mb-2">AI Stock Assistant</h3>
                            <p className="text-dark-text-secondary text-sm mb-8 max-w-md">
                                Your intelligent financial analyst for real-time stock data, technical indicators, and educational market insights.
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl">
                                {quickPrompts.map((prompt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setMessage(prompt); inputRef.current?.focus(); }}
                                        className="text-left px-4 py-3 bg-dark-bg/50 hover:bg-dark-card-hover border border-dark-border rounded-xl text-xs text-dark-text-secondary hover:text-dark-text transition-all"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-sm">🤖</span>
                                </div>
                            )}
                            <div
                                className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-primary text-white rounded-br-md'
                                    : 'bg-dark-bg/80 text-dark-text border border-dark-border rounded-bl-md'
                                    }`}
                                style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
                            >
                                {msg.role === 'user' ? (
                                    <span>{msg.content}</span>
                                ) : (
                                    <div
                                        className="chat-message-content"
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content || '') }}
                                    />
                                )}
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-lg bg-dark-card-hover flex items-center justify-center flex-shrink-0 mt-0.5 text-sm">
                                    👤
                                </div>
                            )}
                        </div>
                    ))}

                    {sending && (
                        <div className="flex gap-3 animate-fade-in">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                                <span className="text-sm">🤖</span>
                            </div>
                            <div className="bg-dark-bg/80 border border-dark-border rounded-2xl rounded-bl-md px-4 py-3">
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="px-6 py-4 border-t border-dark-border">
                    <form onSubmit={handleSend} className="flex gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="flex-1 px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-dark-text placeholder-dark-text-secondary/50 focus:outline-none focus:border-primary transition-all text-sm"
                            placeholder="Ask about stocks, financial terms, market analysis..."
                            disabled={sending}
                        />
                        <button
                            type="submit"
                            disabled={!message.trim() || sending}
                            className="px-4 py-3 gradient-bg text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <HiOutlinePaperAirplane className="text-lg" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chat;
