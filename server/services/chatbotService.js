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
    'BA', 'RTX', 'LMT', 'DELL', 'HPQ', 'NOK', 'COOP'
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
    'shopify': 'SHOP',
    'mr cooper': 'COOP', 'mr. cooper': 'COOP',
    // Multilingual common names
    'एप्पल': 'AAPL', 'गूगल': 'GOOGL', 'अमेज़न': 'AMZN', 'टेस्ला': 'TSLA', 'माइक्रोसॉफ्ट': 'MSFT',
    'रिलायंस': 'RELIANCE.NS', 'टाटा': 'TCS.NS', 'इनफोसिस': 'INFY.NS'
};

class ChatbotService {
    constructor() {
        this.openai = null;
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key') {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
    }

    // Detect if the question is asking for historical data/past days
    detectStockHistoryQuery(userMessage) {
        const msg = userMessage.toLowerCase();

        // Keywords that indicate history (English, Hindi, Spanish)
        const hasHistoryKeywords =
            msg.includes('past') || msg.includes('last') || msg.includes('history') ||
            msg.includes('previous days') || msg.includes('recent days') ||
            msg.includes('purana') || msg.includes('itihas') || msg.includes('pichle') ||
            msg.includes('historia') || msg.includes('pasado');

        if (!hasHistoryKeywords) return null;

        // Extract number of days (default to 10 if not specified)
        const dayMatch = msg.match(/\b(\d+)\b\s*(day|trading)/);
        const days = dayMatch ? parseInt(dayMatch[1]) : 10;

        // Limit to 30 days for chat response efficiency
        const limitedDays = Math.min(days, 30);

        // Find the symbol
        let symbol = null;
        for (const [name, sym] of Object.entries(COMPANY_NAME_MAP)) {
            if (msg.includes(name)) {
                symbol = sym;
                break;
            }
        }

        if (!symbol) {
            const upperTokens = userMessage.match(/\b[A-Z]{1,5}\b/g) || [];
            for (const token of upperTokens) {
                if (KNOWN_SYMBOLS.has(token)) {
                    symbol = token;
                    break;
                }
            }
        }

        return symbol ? { symbol, days: limitedDays } : null;
    }

    // Generate response for historical data
    async generateStockHistoryResponse(symbol, days = 10) {
        try {
            // We fetch slightly more to calculate trend
            const range = days <= 5 ? '5d' : days <= 12 ? '1mo' : '3mo';
            const history = await StockService.getHistoricalData(symbol, range);

            if (!history || history.length === 0) {
                return `I couldn't fetch historical data for **${symbol}** right now.`;
            }

            // Get the last N days
            const recentData = history.slice(-days).reverse();
            const quote = await StockService.getQuote(symbol);

            const companyName = quote.companyName || symbol;
            const currency = this.getCurrencySymbol(quote.currency);

            let table = `Here are the last ~${recentData.length} trading days closing prices for **${companyName}** (approximate from recent market data):\n\n`;
            table += `| Date | Close Price (${quote.currency}) |\n`;
            table += `| :--- | :--- |\n`;

            recentData.forEach(day => {
                const dateStr = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                table += `| ${dateStr} | ${currency}${day.close.toFixed(2)} |\n`;
            });

            // Calculate Trend
            const oldestClose = recentData[recentData.length - 1].close;
            const newestClose = recentData[0].close;
            const priceDiff = newestClose - oldestClose;
            const percentChange = (priceDiff / oldestClose) * 100;

            let trendDescription = '';
            if (percentChange > 2) {
                trendDescription = `The stock has shown strong bullish momentum, rising **${percentChange.toFixed(1)}%** over the last ${days} days.`;
            } else if (percentChange < -2) {
                trendDescription = `The stock has pulled back by **${Math.abs(percentChange).toFixed(1)}%**, showing a short-term downward correction.`;
            } else {
                trendDescription = `The stock has been trading sideways with minor fluctuations (**${percentChange.toFixed(1)}%**) over this period.`;
            }

            const response = `${table}\n\n**Trend:**\n\n${trendDescription}\n\nShort-term momentum shows ${percentChange >= 0 ? 'steady growth' : 'a minor correction'} based on recent closing values.\n\n📊 **Current price (latest trade):** ~${currency}${quote.price.toFixed(2)}`;

            return response;
        } catch (e) {
            console.error('History response error:', e);
            return `Sorry, I encountered an error while retrieving the price history for **${symbol}**.`;
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
            msg.includes('live') || msg.includes('quote') || msg.includes('update') ||
            msg.includes('keemat') || msg.includes('daam') || msg.includes('bhav') ||
            msg.includes('precio') || msg.includes('valor');

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
        // Step 1a: Check for historical data request
        const historyQuery = this.detectStockHistoryQuery(userMessage);
        if (historyQuery) {
            return await this.generateStockHistoryResponse(historyQuery.symbol, historyQuery.days);
        }

        // Step 1b: Check if it's a direct stock price question
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
        const systemPrompt = `You are **AI Stock Assistant**, an intelligent financial assistant with deep knowledge of the global stock market. Your mission is to help users understand stocks, companies, and financial concepts using clear explanations and real-time data.

### 🌐 LANGUAGE RULE (ABSOLUTE PRIORITY):
- **ALWAYS detect the language** of the user's question.
- **ALWAYS respond in the SAME language** as the user's question (e.g., Hindi for Hindi, Tamil for Tamil, Spanish for Spanish).
- If the knowledge base or stock data below is in English, you MUST **translate everything** (explanations, metrics, insights) into the user's language.
- Never answer in English if the question is in another language.

### Your Core Capabilities:
1. **Real-Time Stock Information**: Provide current price, daily change, market cap, P/E ratio, volume, and 52-week high/low. You have access to LIVE data injected below.
2. **Technical Analysis**: Explain indicators like RSI, MACD, Moving Averages (50-day / 200-day), Support/Resistance, and Volume trends.
3. **Company Information**: Provide history, business models, sector info, and key products/milestones.
4. **Financial Education**: Explain basics, ETFs, Dividends, Inflation, Diversification, and Dollar-cost averaging.

### Response Style Guidelines:
- **Structure**: Always use a clear, professional, and structured approach.
- **Format**: Use bullet points for readability.
- **Method**: Provide simple and clear explanations followed by actionable insights.
- **Educational Support**: Tailor depth based on user expertise (simple for beginners, deep for advanced).

### Important Rules:
- **Risk Statement**: Always state that stock investing involves risk in the user's language.
- **No Guarantees**: NEVER guarantee profits or specific financial outcomes.
- **Educational Role**: You provide educational insights, NOT direct investment advice.
- **Live Data**: Use the data provided in the injection section accurately.

${ragContext}
${stockContext ? '\n\n🚨 SYSTEM INJECTION START 🚨\nCurrent Stock Data (LIVE REAL-TIME data for you to translate and use):\n' + stockContext + '\n🚨 SYSTEM INJECTION END 🚨\n' : ''}`;

        // Step 6: Try Gemini AI if available
        if (process.env.GEMINI_API_KEY) {
            try {
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
            return "Hello! I am your **AI Stock Assistant**. 👋 I'm here to help you navigate the stock market with real-time data and financial insights.\n\n" +
                "I can help you with:\n" +
                "📊 **Real-Time Data** - Current price, market cap, and daily changes.\n" +
                "🔍 **Technical Analysis** - Indicators like RSI, MACD, and Moving Averages.\n" +
                "📚 **Financial Education** - Understanding ETFs, dividends, and diversification.\n" +
                "🏢 **Company Insights** - Business models and historical performance.\n\n" +
                "What would you like to analyze or learn about today?";
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
            response = `${response}${dataHeading}${stockContext}\n\n*Live market prices provided for educational purposes.*`;
        }

        // Financial disclaimer for relevant queries
        const needsDisclaimer = msgLower.includes('buy') || msgLower.includes('sell') || msgLower.includes('invest') || msgLower.includes('profit');
        if (needsDisclaimer) {
            response += '\n\n> ⚠️ **Risk Warning**: Stock investing involves risk. I provide educational insights and data analysis, not financial advice. Please consult a professional advisor before making investment decisions.';
        }

        // Final fallback
        if (!response) {
            response = "I'm ready to help! I can provide real-time data on any stock or explain financial metrics like **RSI**, **MACD**, **P/E Ratio**, and **Market Cap**.\n\nTry asking: 'What is the current price of AAPL?' or 'Explain RSI in simple terms.'";
        }

        return response;
    }
}

module.exports = new ChatbotService();
