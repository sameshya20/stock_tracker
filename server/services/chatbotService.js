const OpenAI = require('openai');
const StockService = require('./stockService');

// Known stock symbols list to avoid false positives
const KNOWN_SYMBOLS = new Set([
    // Technology
    'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'NVDA', 'INTC', 'AMD', 'ORCL', 'ADBE', 'CSCO',
    'QCOM', 'TXN', 'AVGO', 'MU', 'AMAT', 'IBM', 'CRM',
    // Internet & Social Media
    'AMZN', 'META', 'NFLX', 'BABA', 'SNAP', 'TWTR', 'PINS', 'SPOT',
    // Automobile
    'TSLA', 'TM', 'F', 'GM', 'RIVN', 'LCID', 'NIO',
    // Finance
    'JPM', 'GS', 'V', 'MA', 'MS', 'BAC', 'WFC', 'C', 'AXP', 'PYPL', 'SQ',
    // Consumer Brands
    'KO', 'PEP', 'NKE', 'MCD', 'SBUX', 'WMT', 'COST', 'DIS', 'AMGN',
    // Indian stocks (NSE suffixes for Yahoo Finance)
    'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS',
    'INFY', 'HDB', 'IBN', 'WIT', 'SIFY',
    // Others
    'SPY', 'QQQ', 'BRK', 'BRKB', 'XOM', 'CVX', 'PFE', 'JNJ', 'MRNA',
    'UBER', 'LYFT', 'ABNB', 'COIN', 'HOOD', 'GME', 'AMC', 'SHOP',
    'BA', 'RTX', 'LMT', 'DELL', 'HPQ', 'NOK'
]);

// Map common company names to symbols
const COMPANY_NAME_MAP = {
    // Technology
    'apple': 'AAPL', 'microsoft': 'MSFT', 'google': 'GOOGL', 'alphabet': 'GOOGL',
    'nvidia': 'NVDA', 'intel': 'INTC', 'amd': 'AMD', 'advanced micro': 'AMD',
    'oracle': 'ORCL', 'adobe': 'ADBE', 'cisco': 'CSCO', 'qualcomm': 'QCOM',
    'ibm': 'IBM', 'salesforce': 'CRM', 'broadcom': 'AVGO',
    // Internet & Social Media
    'amazon': 'AMZN', 'meta': 'META', 'facebook': 'META', 'instagram': 'META',
    'whatsapp': 'META', 'netflix': 'NFLX', 'alibaba': 'BABA', 'snapchat': 'SNAP',
    'snap': 'SNAP', 'spotify': 'SPOT', 'pinterest': 'PINS',
    // Automobile
    'tesla': 'TSLA', 'toyota': 'TM', 'ford': 'F', 'general motors': 'GM',
    'gm': 'GM', 'rivian': 'RIVN', 'lucid': 'LCID', 'nio': 'NIO',
    // Finance
    'jpmorgan': 'JPM', 'jp morgan': 'JPM', 'chase': 'JPM',
    'goldman sachs': 'GS', 'goldman': 'GS',
    'visa': 'V', 'mastercard': 'MA',
    'morgan stanley': 'MS', 'bank of america': 'BAC', 'wells fargo': 'WFC',
    'citigroup': 'C', 'citi': 'C', 'american express': 'AXP', 'amex': 'AXP',
    'paypal': 'PYPL', 'square': 'SQ', 'block': 'SQ',
    // Consumer Brands
    'coca-cola': 'KO', 'coca cola': 'KO', 'coke': 'KO',
    'pepsico': 'PEP', 'pepsi': 'PEP',
    'nike': 'NKE', "mcdonald's": 'MCD', 'mcdonalds': 'MCD',
    'starbucks': 'SBUX', 'walmart': 'WMT', 'costco': 'COST', 'disney': 'DIS',
    // Indian Companies (Local NSE tickers)
    'infosys': 'INFY.NS', 'hdfc bank': 'HDFCBANK.NS', 'hdfcbank': 'HDFCBANK.NS', 'hdfc': 'HDFCBANK.NS',
    'icici bank': 'ICICIBANK.NS', 'icicibank': 'ICICIBANK.NS', 'icici': 'ICICIBANK.NS',
    'wipro': 'WIT', 'tata consultancy': 'TCS.NS', 'tcs': 'TCS.NS',
    'reliance': 'RELIANCE.NS',
    // Others
    'uber': 'UBER', 'lyft': 'LYFT', 'airbnb': 'ABNB', 'coinbase': 'COIN',
    'boeing': 'BA', 'exxon': 'XOM', 'chevron': 'CVX',
    'pfizer': 'PFE', 'johnson': 'JNJ', 'moderna': 'MRNA',
    'shopify': 'SHOP'
};

class ChatbotService {
    constructor() {
        this.openai = null;
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key') {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
    }

    // Detect if the question is a stock price query and extract symbol
    detectStockPriceQuery(userMessage) {
        const msg = userMessage.toLowerCase();
        const isPriceQuery =
            msg.includes('price') || msg.includes('value') || msg.includes('worth') ||
            msg.includes('share') || msg.includes('stock') || msg.includes('today') ||
            msg.includes('current') || msg.includes('trading') || msg.includes('cost') ||
            msg.includes('how much') || msg.includes('much is') || msg.includes('rate') ||
            msg.includes('live') || msg.includes('quote') || msg.includes('update');

        if (!isPriceQuery) return null;

        // Try to find company name first
        for (const [name, sym] of Object.entries(COMPANY_NAME_MAP)) {
            if (msg.includes(name)) return sym;
        }

        // Try to find uppercase symbols in original message
        const upperTokens = userMessage.match(/\b[A-Z]{1,5}\b/g) || [];
        for (const token of upperTokens) {
            if (KNOWN_SYMBOLS.has(token)) return token;
        }

        return null;
    }

    // Format market cap nicely
    formatMarketCap(marketCap, currencySymbol = '$') {
        if (!marketCap || marketCap === 0) return 'N/A';
        if (marketCap >= 1e12) return `${currencySymbol}${(marketCap / 1e12).toFixed(2)} trillion`;
        if (marketCap >= 1e9) return `${currencySymbol}${(marketCap / 1e9).toFixed(2)} billion`;
        if (marketCap >= 1e6) return `${currencySymbol}${(marketCap / 1e6).toFixed(2)} million`;
        return `${currencySymbol}${marketCap}`;
    }

    // Get currency symbol
    getCurrencySymbol(currency) {
        if (currency === 'INR') return '₹';
        if (currency === 'EUR') return '€';
        if (currency === 'GBP') return '£';
        return '$';
    }

    // Format a focused stock price response
    async generateStockPriceResponse(symbol) {
        try {
            const quote = await StockService.getQuote(symbol);
            if (!quote || quote.price <= 0) {
                return `I couldn't fetch live data for **${symbol}** right now. Please check a financial site like [Yahoo Finance](https://finance.yahoo.com/quote/${symbol}) for the latest price.`;
            }

            const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const changeSign = quote.change >= 0 ? '+' : '';
            const changeColor = quote.change >= 0 ? '📈' : '📉';
            const curr = this.getCurrencySymbol(quote.currency || 'USD');
            const marketCapStr = this.formatMarketCap(quote.marketCap, curr);

            let response = `**${symbol}** – ${quote.companyName || symbol} (${today})

**${curr}${quote.price.toFixed(2)} ${quote.currency || 'USD'} per share** (as of latest close)

${changeColor} **Change:** ${changeSign}${curr}${quote.change?.toFixed(2)} (${changeSign}${quote.changePercent?.toFixed(2)}%) vs previous close

---

**Today's Trading Details:**
📈 Day High: ${curr}${quote.high?.toFixed(2) || 'N/A'}
📉 Day Low: ${curr}${quote.low?.toFixed(2) || 'N/A'}
🔓 Open: ${curr}${quote.open?.toFixed(2) || 'N/A'}
📦 Volume: ${quote.volume ? (quote.volume / 1e6).toFixed(1) + 'M shares' : 'N/A'}

---

**📊 Additional Info:**
🏢 Exchange: ${quote.exchange || 'NASDAQ'}
💰 Market Cap: ${marketCapStr}`;

            if (quote.fiftyTwoWeekHigh && quote.fiftyTwoWeekHigh > 0) {
                response += `\n📅 52-Week High: ${curr}${quote.fiftyTwoWeekHigh.toFixed(2)}`;
            }
            if (quote.fiftyTwoWeekLow && quote.fiftyTwoWeekLow > 0) {
                response += `\n📅 52-Week Low: ${curr}${quote.fiftyTwoWeekLow.toFixed(2)}`;
            }

            response += `\n\n✅ So roughly: **${symbol} ≈ ${curr}${Math.round(quote.price)} per share today.**

> ⚠️ Prices reflect market data and may be delayed. Not financial advice.`;

            return response;
        } catch (e) {
            return `I couldn't retrieve live price data for **${symbol}** at the moment. Please try again shortly.`;
        }
    }

    async generateResponse(userMessage, chatHistory = []) {
        // Step 1: Check if it's a direct stock price question — answer it immediately with precise data
        const priceSymbol = this.detectStockPriceQuery(userMessage);
        if (priceSymbol) {
            return await this.generateStockPriceResponse(priceSymbol);
        }

        // Step 2: Retrieve relevant financial knowledge (RAG)
        const relevantKnowledge = StockService.retrieveFinancialKnowledge(userMessage);

        // Step 3: Check for stock symbols in the message for context
        let stockContextObj = null;

        // Find explicitly listed symbols
        let extractedSymbol = null;
        const upperTokens = userMessage.match(/\b[A-Z]{1,5}\b/g) || [];
        for (const token of upperTokens) {
            if (KNOWN_SYMBOLS.has(token)) {
                extractedSymbol = token; break;
            }
        }

        // If no explicit symbol, check for company names
        if (!extractedSymbol) {
            const msgLower = userMessage.toLowerCase();
            for (const [name, sym] of Object.entries(COMPANY_NAME_MAP)) {
                if (msgLower.includes(name)) {
                    extractedSymbol = sym;
                    break;
                }
            }
        }

        if (extractedSymbol) {
            try {
                const quote = await StockService.getQuote(extractedSymbol);
                if (quote && quote.price > 0) {
                    stockContextObj = quote;
                }
            } catch (e) { /* skip */ }
        }

        const stockContext = stockContextObj
            ? `\n${stockContextObj.symbol}: $${stockContextObj.price} (${stockContextObj.changePercent > 0 ? '+' : ''}${stockContextObj.changePercent?.toFixed(2)}%)`
            : '';

        // Step 4: Build RAG context
        let ragContext = '';
        if (relevantKnowledge.length > 0) {
            ragContext = '\n\nRelevant Financial Knowledge:\n' +
                relevantKnowledge.map(k => `- ${k.topic}: ${k.content}`).join('\n');
        }

        // Step 5: Build system prompt
        const systemPrompt = `You are an AI financial assistant specialized in stock market analysis and investment advice.

Guidelines:
- Always clarify that you do not provide financial advice, only educational information
- Use data and facts to support your explanations
- Be concise but thorough
- When discussing specific stocks, mention relevant metrics
- If the knowledge base provides a structured history or timeline for a company, provide it exactly as presented
- Always suggest consulting a financial advisor for major investment decisions
- IMPORTANT: You DO HAVE access to real-time stock data. The system automatically fetches live Yahoo Finance data and injects it below. NEVER apologize and say your data is outdated or you can't provide live data if the "Current Stock Data" section is present below.

${ragContext}
${stockContext ? '\n\n🚨 SYSTEM INJECTION START 🚨\nCurrent Stock Data (This is LIVE REAL-TIME market data provided to you now):\n' + stockContext + '\n🚨 SYSTEM INJECTION END 🚨\n' : ''}`;

        // Step 6: Try Gemini AI if available
        if (process.env.GEMINI_API_KEY) {
            try {
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                // Switching to 2.5 flash to avoid API mismatch errors that user might be seeing
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

                // Format history for Gemini
                const historyStr = chatHistory.length > 0
                    ? "\n\nConversation History:\n" + chatHistory.slice(-30).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join("\n")
                    : "";

                const fullPrompt = `${systemPrompt}${historyStr}\n\nUser Question: ${userMessage}`;

                const result = await model.generateContent(fullPrompt);
                const response = result.response;
                return response.text();
            } catch (error) {
                console.error('Gemini API error:', error.message);
                // Fall down to OpenAI if Gemini fails (e.g., quota exceeded)
            }
        }

        // Step 7: Try OpenAI if available
        if (this.openai) {
            try {
                const messages = [
                    { role: 'system', content: systemPrompt },
                    ...chatHistory.slice(-30).map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    { role: 'user', content: userMessage }
                ];

                const completion = await this.openai.chat.completions.create({
                    model: 'gpt-3.5-turbo',
                    messages,
                    max_tokens: 1000,
                    temperature: 0.7
                });

                return completion.choices[0].message.content;
            } catch (error) {
                console.error('OpenAI API error:', error.message);
                return this.generateLocalResponse(userMessage, relevantKnowledge, stockContext);
            }
        }

        // Step 8: Fall back to local response generation
        return this.generateLocalResponse(userMessage, relevantKnowledge, stockContext);
    }

    generateLocalResponse(userMessage, relevantKnowledge, stockContext) {
        const msgLower = userMessage.toLowerCase();
        let response = '';

        // Intent detection
        const isGreeting = msgLower.match(/\b(hi|hello|hey|greetings|start|help|who are you)\b/);
        const isDefinition = msgLower.includes('what') || msgLower.includes('define') || msgLower.includes('explain');
        const isStrategy = msgLower.includes('how to') || msgLower.includes('strategy') || msgLower.includes('advice');

        if (isGreeting) {
            return "Hello! 👋 I'm your **AI Stock Market Assistant**, powered by real-time data and a financial knowledge base.\n\n" +
                "I can help you with:\n" +
                "📊 **Stock Prices** - Ask: 'Today's share value of AAPL' or 'What is TSLA price?'\n" +
                "📚 **Educational Concepts** - Ask: 'What is RSI?' or 'Explain P/E ratio'\n" +
                "💡 **Investment Strategies** - Ask: 'How does DCA work?' or 'Explain diversification'\n" +
                "🏢 **Company History** - Ask: 'Give the whole history of AAPL'\n\n" +
                "What would you like to explore today?";
        }

        // If we have RAG knowledge, structure it
        if (relevantKnowledge.length > 0) {
            const topResult = relevantKnowledge[0];

            if (isDefinition) {
                response = `### 📚 ${topResult.topic}\n\n${topResult.content}`;
            } else if (isStrategy) {
                response = `### 💡 ${topResult.topic}\n\n${topResult.content}`;
            } else {
                response = `### 📊 ${topResult.topic}\n\n${topResult.content}`;
            }

            if (relevantKnowledge.length > 1) {
                response += '\n\n**Related Insights:**\n';
                relevantKnowledge.slice(1, 3).forEach(k => {
                    response += `• **${k.topic}**: ${k.content.split('.')[0]}.\n`;
                });
            }
        }

        // Add real-time stock data if available
        if (stockContext) {
            const dataHeading = response ? '\n\n---\n\n### 📈 Current Market Data' : '### 📈 Current Market Data';
            response = `${response}${dataHeading}${stockContext}\n\n*Prices from live market data.*`;
        }

        // Financial disclaimer for buy/sell queries
        if (msgLower.includes('should i buy') || msgLower.includes('should i sell') || msgLower.includes('invest in')) {
            response += '\n\n> ⚠️ **IMPORTANT**: I provide educational data and analysis, not financial advice. All investments carry risk. Please consult with a certified financial professional before making significant trades.';
        }

        // Final fallback
        if (!response) {
            response = "I'm listening! I can provide real-time data on any stock (just ask the price) or explain financial metrics like **P/E Ratio**, **RSI**, **MACD**, **Market Cap**, or give detailed **company histories**.\n\nTry: 'Today's share value of AAPL' or 'What is RSI?' or 'Give the whole history of NVDA'";
        }

        return response;
    }
}

module.exports = new ChatbotService();
