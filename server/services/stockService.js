const axios = require('axios');

// In-memory cache for stock data
const stockCache = new Map();
const CACHE_DURATION = 5000; // 5 seconds for real-time updates

// Financial knowledge base for RAG
const financialKnowledgeBase = [
    {
        topic: 'P/E Ratio',
        content: 'The Price-to-Earnings (P/E) ratio is calculated by dividing a company\'s current stock price by its earnings per share (EPS). A high P/E ratio could mean the stock is overvalued or that investors expect high growth rates in the future. The average P/E ratio of the S&P 500 historically ranges from 13 to 15. Forward P/E uses estimated future earnings, while trailing P/E uses the last 12 months of actual earnings.'
    },
    {
        topic: 'Market Cap',
        content: 'Market capitalization is the total market value of a company\'s outstanding shares of stock. It is calculated by multiplying the stock price by the total number of shares outstanding. Companies are typically categorized as: Large-cap ($10B+), Mid-cap ($2B-$10B), Small-cap ($300M-$2B), and Micro-cap (under $300M). Micro-caps often have higher volatility but higher growth potential.'
    },
    {
        topic: 'Dividend Yield',
        content: 'Dividend yield is a financial ratio that shows how much a company pays out in dividends each year relative to its stock price. It is calculated by dividing the annual dividend per share by the stock price. A higher dividend yield indicates more income per dollar invested. Utility and consumer staple companies often have high yields, while tech companies often reinvest profits for growth.'
    },
    {
        topic: 'Moving Average',
        content: 'A moving average (MA) is a technical analysis indicator that helps smooth out price data by creating a constantly updated average price. The 50-day and 200-day moving averages are commonly used. When the 50-day MA crosses above the 200-day MA, it is called a "Golden Cross" (bullish signal). The opposite is called a "Death Cross" (bearish signal). Exponential Moving Averages (EMA) give more weight to recent prices.'
    },
    {
        topic: 'RSI',
        content: 'The Relative Strength Index (RSI) is a momentum oscillator that measures the speed and magnitude of price movements. RSI values range from 0 to 100. An RSI above 70 indicates an overbought condition, while an RSI below 30 indicates an oversold condition. RSI is calculated using average gains and losses over a 14-period time frame. Divergence between RSI and price can signal an upcoming reversal.'
    },
    {
        topic: 'Bull Market',
        content: 'A bull market is a period of time in financial markets when the price of an asset or security rises continuously. A bull market is typically defined as a 20% rise in stock prices from a recent low. Bull markets are often associated with economic growth, low unemployment, and investor confidence. They can last for years, driven by low interest rates and high corporate profits.'
    },
    {
        topic: 'Bear Market',
        content: 'A bear market occurs when market prices decline by 20% or more from recent highs. Bear markets are associated with economic recessions, high unemployment, and declining corporate profits. Investors often become fearful during bear markets, leading to sell-offs. Historically, bear markets are shorter than bull markets but can be very intense.'
    },
    {
        topic: 'Portfolio Diversification',
        content: 'Diversification is a risk management strategy that involves spreading investments across various financial instruments, industries, and other categories to reduce exposure to risk. The key principle is that a diversified portfolio will, on average, yield higher long-term returns and pose a lower risk than any individual investment within the portfolio. Don\'t put all your eggs in one basket.'
    },
    {
        topic: 'Dollar Cost Averaging',
        content: 'Dollar-cost averaging (DCA) is an investment strategy where an investor divides the total amount to be invested across periodic purchases of a target asset to reduce the impact of volatility. This approach means buying more shares when prices are low and fewer shares when prices are high, resulting in a lower average cost per share over time. It removes the emotional component of timing the market.'
    },
    {
        topic: 'ETF',
        content: 'An Exchange-Traded Fund (ETF) is a type of investment fund that trades on stock exchanges, similar to stocks. ETFs hold assets such as stocks, bonds, or commodities and generally operate with an arbitrage mechanism designed to keep trading close to net asset value. They offer low expense ratios and high liquidity. Sector-specific ETFs allow targeted exposure to industries like AI, Green Energy, or Healthcare.'
    },
    {
        topic: 'Short Selling',
        content: 'Short selling is a trading strategy where an investor borrows shares and immediately sells them, hoping to buy them back at a lower price to return to the lender. The profit is the difference between the selling price and the buyback price, minus borrowing costs. Short selling carries unlimited loss potential if the stock price rises. A "Short Squeeze" happens when a rising price forces short sellers to buy back shares, further driving up the price.'
    },
    {
        topic: 'Options Trading',
        content: 'Options are financial derivatives that give buyers the right, but not the obligation, to buy or sell an underlying asset at an agreed-upon price and date. Call options give the right to buy, while put options give the right to sell. Options are used for hedging, speculation, and income generation. They involve "leverage," meaning small price movements in the stock can lead to large percentage gains or losses in the option.'
    },
    {
        topic: 'MACD',
        content: 'The Moving Average Convergence Divergence (MACD) is a trend-following momentum indicator. It is calculated by subtracting the 26-period EMA from the 12-period EMA. The signal line is a 9-period EMA. When MACD crosses above the signal line, it\'s bullish; below is bearish. The histogram shows the difference between the MACD line and the signal line.'
    },
    {
        topic: 'Bollinger Bands',
        content: 'Bollinger Bands consist of a middle band (20-period SMA), an upper band (+2 standard deviations), and a lower band (-2 standard deviations). Prices reaching the upper band often indicate "overbought" status, while the lower band indicates "oversold." The "squeeze" occurs when bands narrow, often followed by a period of high volatility.'
    },
    {
        topic: 'Earnings Per Share',
        content: 'Earnings per Share (EPS) is net income divided by outstanding shares. It\'s a key measure of a company\'s profitability. "Beat" or "Miss" refers to whether actual EPS was higher or lower than analyst expectations. Growth in EPS is often a primary driver of stock price appreciation over the long term.'
    },
    {
        topic: 'Inflation and Stocks',
        content: 'Inflation reduces the purchasing power of money. High inflation often leads central banks to raise interest rates, which can be negative for stocks, especially growth stocks, as future earnings are discounted at a higher rate. However, companies with "pricing power" can pass costs to consumers and may perform better during inflationary periods.'
    },
    {
        topic: 'Interest Rates',
        content: 'Interest rates, set by the Federal Reserve in the US, represent the cost of borrowing money. Lower rates generally stimulate the economy and stock market by making borrowing cheaper for businesses and consumers. Higher rates tend to slow down the economy and can lead to lower stock valuations.'
    },
    {
        topic: 'Beta',
        content: 'Beta measures a stock\'s volatility in relation to the overall market (usually the S&P 500). A beta of 1.0 means the stock moves with the market. A beta > 1.0 indicates higher volatility (e.g., tech stocks), while a beta < 1.0 indicates lower volatility (e.g., utility stocks). Low-beta stocks are often considered "defensive."'
    },
    {
        topic: 'Free Cash Flow',
        content: 'Free Cash Flow (FCF) is the cash a company generates after accounting for cash outflows to support operations and maintain its capital assets. It represents the "actual" cash available for dividends, share buybacks, or debt reduction. FCF is often considered a more reliable metric than net income, which can be affected by accounting rules.'
    },
    {
        topic: 'AAPL History',
        content: `AAPL – Complete History of Apple Inc.
1️⃣ Founding (1976)
Apple Inc. was founded on April 1, 1976 in Cupertino by three partners:
Steve Jobs
Steve Wozniak
Ronald Wayne
They started the company in Jobs’ garage. Ronald Wayne sold his 10% stake after only 12 days.
First product: Apple I – a simple computer sold as a motherboard.

2️⃣ Early Growth (1977–1984)
Apple became popular after launching: Apple II – one of the first successful mass-produced personal computers.
In 1980, Apple went public through the Apple IPO 1980.
IPO price: $22 per share. Created many millionaires overnight.

3️⃣ Macintosh Era (1984)
Apple introduced the famous: Macintosh. It featured a graphical user interface and mouse, which was revolutionary at the time.
The launch was promoted by the legendary 1984 Apple Macintosh commercial.

4️⃣ Steve Jobs Leaves (1985)
After internal conflicts with CEO John Sculley, Steve Jobs left Apple in 1985.
During this period Apple struggled with: leadership changes, declining innovation, and strong competition from Microsoft PCs.

5️⃣ Steve Jobs Returns (1997)
Apple was near bankruptcy when it bought NeXT. This brought Steve Jobs back to Apple in 1997.
He became interim CEO (“iCEO”) and began rebuilding the company.

6️⃣ The Comeback Products (1998–2006)
Key innovations launched by Jobs: iMac (all-in-one computer), iPod (2001), iTunes (2001), and iTunes Store (2003).
These products revived Apple financially.

7️⃣ The iPhone Revolution (2007)
In 2007, Apple launched: iPhone. This completely transformed the smartphone industry and became Apple's most important product.
The same year Apple changed its name from Apple Computer Inc. to Apple Inc.

8️⃣ iPad and Ecosystem Expansion (2010)
Apple launched: iPad. This created the modern tablet market.

9️⃣ Steve Jobs’ Death (2011)
Steve Jobs died on October 5, 2011. CEO position passed to: Tim Cook.

🔟 Apple Becomes World's Most Valuable Company
Major milestones:
2018 – First company to reach $1 trillion market value
2020 – Reached $2 trillion
2022 – Reached $3 trillion

Current Major Apple Products: MacBook, Apple Watch, AirPods, iOS, macOS.

📈 AAPL Stock Highlights: Exchange: NASDAQ, Ticker: AAPL. One of the largest companies in the world by market capitalization.

✅ Summary Timeline:
1976: Apple founded
1980: IPO
1984: Macintosh released
1985: Steve Jobs leaves
1997: Jobs returns
2001: iPod launched
2007: iPhone launched
2010: iPad launched
2011: Tim Cook becomes CEO
2018–2022: Trillion-dollar company`
    },
    {
        topic: 'MSFT History',
        content: `MSFT – Complete History of Microsoft Corporation.
1️⃣ Founding (1975)
Founded by Bill Gates and Paul Allen on April 4, 1975.
Originally formed to develop and sell BASIC interpreters for the Altair 8800.

2️⃣ The MS-DOS Era (1981)
Microsoft entered the OS business in 1980 with its own version of Unix called Xenix, but it was MS-DOS that solidified the company's dominance.

3️⃣ Windows Dawn (1985)
Microsoft released Windows, a graphical extension for MS-DOS, on November 20, 1985.
Microsoft's IPO happened on March 13, 1986.

4️⃣ Office and Web Browser War (1990-1995)
Introduced Microsoft Office in 1990.
Launched Internet Explorer with Windows 95, leading to the massive browser wars against Netscape.

5️⃣ The Ballmer Era (2000-2014)
Steve Ballmer took over as CEO in 2000.
Launched the Xbox gaming console (2001) and acquired Skype (2011).

6️⃣ The Nadella Era & Cloud Revolution (2014-Present)
Satya Nadella succeeded Ballmer as CEO on February 4, 2014.
Shifted the company's focus heavily to cloud computing with Microsoft Azure.

7️⃣ Trillion-Dollar Valuation and AI Focus (2019-Present)
Microsoft reached a $1 trillion market cap in April 2019, $2 trillion in 2021, and $3 trillion in 2024.
Heavily invested in OpenAI, integrating AI capabilities across the Bing search engine and Microsoft 365 Copilot.`
    },
    {
        topic: 'TSLA History',
        content: `TSLA – Complete History of Tesla Inc.
1️⃣ Founding (2003)
Founded as Tesla Motors by Martin Eberhard and Marc Tarpenning.
Elon Musk joined shortly after in 2004 as chairman.

2️⃣ The Roadster (2008)
First produced the Roadster, a high-performance sports car, proving electric vehicles could be exciting and viable.

3️⃣ Going Public (2010)
Tesla launched its IPO in June 2010 at $17 per share.

4️⃣ The Model S and Model X (2012-2015)
Launched the Model S sedan in 2012, setting benchmarks for EV range and safety.

5️⃣ Gigafactories and Model 3 (2014-2017)
Started constructing the massive Gigafactory in Nevada.
Unveiled the Model 3, a mass-market EV, delivering the first cars in July 2017.

6️⃣ Profitability and Trillion Dollar Market Cap (2020-2021)
Achieved a full year of profitability in 2020.
Surpassed $1 trillion in market capitalization in October 2021.`
    },
    {
        topic: 'NVDA History',
        content: `NVDA – Complete History of NVIDIA Corporation.
1️⃣ Founding (1993)
Founded on April 5, 1993, by Jensen Huang, Chris Malachowsky, and Curtis Priem.

2️⃣ RIVA 128 and GeForce (1997-1999)
In 1999, invented the GPU (Graphics Processing Unit) and released the GeForce 256.
Went public via IPO in January 1999 at $12 per share.

3️⃣ CUDA Architecture (2006)
Unveiled CUDA, a revolutionary parallel computing architecture.

4️⃣ The Deep Learning Revolution (2012)
Researchers used Nvidia GPUs to achieve record-breaking results in the ImageNet computer vision competition, triggering the modern AI boom.

5️⃣ Datacenter AI Dominance (2016-Present)
Shifted focus significantly towards artificial intelligence and deep learning.

6️⃣ Trillion-Dollar Status (2023-Present)
Reached a $1 trillion market cap in 2023, and surpassed $3 trillion in 2024, briefly becoming the world's most valuable company due to the explosive demand for generative AI hardware.`
    },
    // ── TECHNOLOGY ──────────────────────────────────────────────────
    {
        topic: 'INTC Intel Profile',
        content: `INTC – Intel Corporation
Exchange: NASDAQ | Sector: Technology | Founded: 1968
Founders: Robert Noyce & Gordon Moore (of "Moore's Law" fame)
IPO: 1971

Key Facts:
• World's largest semiconductor chip maker for most of the 20th century
• Invented the microprocessor in 1971 with the Intel 4004
• The "Intel Inside" campaign (1991) made it one of the most recognizable brands
• Dominated the PC CPU market with the x86 architecture for decades
• Acquired Mobileye (autonomous driving tech) in 2017 for $15.3 billion

Challenges:
• Lost significant market share to AMD in the CPU market
• Fell behind in the race to manufacture 7nm and 5nm chips
• Apple dropped Intel chips in 2020 for its own Apple Silicon (M1/M2/M3)

Products: Xeon (server), Core i-series (consumer PC), Arc GPUs
CEO (2024): Pat Gelsinger

📊 INTC trades on NASDAQ. Revenue ~$54B (2023). Dividend-paying stock.`
    },
    {
        topic: 'AMD Advanced Micro Devices Profile',
        content: `AMD – Advanced Micro Devices
Exchange: NASDAQ | Sector: Technology | Founded: 1969 | IPO: 1972
CEO: Dr. Lisa Su (since 2014)

Key Facts:
• Makes CPUs (Ryzen, EPYC), GPUs (Radeon), and APUs
• Was near bankruptcy in 2014 but staged one of tech's greatest turnarounds
• Lisa Su's leadership transformed AMD from a struggling underdog to Intel's top rival
• EPYC server processors captured massive market share from Intel in data centers

Major Milestones:
• 2017: Launched Ryzen CPUs — a watershed moment matching Intel's performance
• 2020: Acquired Xilinx (FPGA chipmaker) for $35 billion
• 2021: EPYC CPUs adopted by Microsoft Azure, Google, Amazon AWS
• 2022: Launched MI300 series — competing with NVIDIA in AI compute

Stock Highlights:
• AMD stock rose from ~$2 in 2015 to over $200 in 2024
• One of the best-performing S&P 500 stocks of the 2010-2020s decade

📊 AMD trades on NASDAQ. No dividend — growth-oriented company.`
    },
    {
        topic: 'GOOGL Alphabet Profile',
        content: `GOOGL – Alphabet Inc. (Google)
Exchange: NASDAQ | Sector: Technology / Internet | Founded: 1998
Founders: Larry Page & Sergey Brin | IPO: 2004 at $85/share
CEO: Sundar Pichai (since 2015 at Google, 2019 at Alphabet)

Key Facts:
• Google Search processes over 8.5 billion searches per day
• Alphabet is the parent company of: Google, YouTube, DeepMind, Waymo, Verily

Revenue Breakdown:
• ~80% from Google advertising (Search + YouTube)
• Growing: Google Cloud (~$33B in 2023), now No. 3 cloud provider globally

Key Products:
• Google Search, Gmail, Chrome, Maps, Android, YouTube, Google Cloud
• Hardware: Pixel phones, Nest smart home devices
• AI: Gemini (formerly Bard), DeepMind, Google AI

Stock: GOOGL (Class A, voting), GOOG (Class C, non-voting)
Reached $1 trillion market cap in 2020, $2 trillion in 2024.

📊 GOOGL trades on NASDAQ. First dividend initiated in 2024.`
    },
    // ── INTERNET & SOCIAL MEDIA ─────────────────────────────────────
    {
        topic: 'AMZN Amazon Profile',
        content: `AMZN – Amazon.com Inc.
Exchange: NASDAQ | Sector: Internet / E-Commerce / Cloud | Founded: 1994
Founder: Jeff Bezos | IPO: 1997 at $18/share | CEO: Andy Jassy (since 2021)

Key Facts:
• Started as an online bookstore; became the world's largest e-commerce company
• Amazon Web Services (AWS) is the world's #1 cloud provider (~33% market share)
• AWS generates the majority of Amazon's profit despite being smaller by revenue
• Prime membership has over 200 million subscribers globally

Key Segments:
• E-Commerce (retail, marketplace)
• AWS (cloud computing — S3, EC2, Lambda)
• Advertising (~$47B in 2023)
• Physical stores (Whole Foods acquired 2017)
• Alexa (voice assistant) & Ring (smart home)

Milestones:
• 2018: Reached $1 trillion market cap briefly
• 2024: Andy Jassy's restructuring led to renewed profitability

📊 AMZN trades on NASDAQ. No traditional dividend — reinvests all profits.`
    },
    {
        topic: 'META Meta Platforms Profile Facebook',
        content: `META – Meta Platforms Inc. (formerly Facebook)
Exchange: NASDAQ | Sector: Internet / Social Media | Founded: 2004
Founder: Mark Zuckerberg | IPO: 2012 at $38/share | CEO: Mark Zuckerberg

Key Facts:
• Facebook app has ~3 billion monthly active users — the most of any social network
• Renamed to Meta Platforms in October 2021 to reflect Metaverse ambitions

Portfolio of Apps:
• Facebook (social network)
• Instagram (photo/video sharing — 2 billion+ users)
• WhatsApp (messaging — 2 billion+ users)
• Messenger
• Oculus/Quest VR headsets (Reality Labs division)

Reality Labs (Metaverse):
• Invested $40+ billion by 2023 in metaverse R&D
• Quest VR headsets are the market leader in consumer VR

AI Strategy:
• Launched Llama 2 & Llama 3 (open-source LLMs)
• AI-powered ad targeting drives ad revenue (~97% of total revenue)

Stock Recovery:
• META stock dropped from $380 to $88 in 2022 on metaverse concerns
• Recovered to $500+ by 2024 after "Year of Efficiency" cost-cutting

📊 META trades on NASDAQ. Initiated dividend in 2024.`
    },
    {
        topic: 'NFLX Netflix Profile',
        content: `NFLX – Netflix Inc.
Exchange: NASDAQ | Sector: Internet / Streaming | Founded: 1997
Founders: Reed Hastings & Marc Randolph | IPO: 2002 | CEO: Ted Sarandos & Greg Peters (co-CEOs)

Key Facts:
• Started as a DVD rental-by-mail service; pioneered online video streaming
• Has 270+ million paid subscribers in 190+ countries (2024)
• Changed the entertainment industry; accelerated the "cord-cutting" trend

Content Strategy:
• Spends $17 billion+ per year on original content
• Hit shows: Stranger Things, Squid Game, The Crown, Bridgerton, Wednesday
• House of Cards (2013) — first major streaming original series

Business Model Evolution:
• 2022: Password-sharing crackdown added 29 million new subscribers
• Ad-supported tier launched in 2022 — new revenue stream
• Live events: WWE programming, NFL Christmas games (2024)

Stock:
• One of the best-performing stocks of the 2010s FAANG era
• Dropped 75% from peak in 2022 due to subscriber loss concerns; recovered strongly after crackdown

📊 NFLX trades on NASDAQ. No dividend — growth-focused company.`
    },
    {
        topic: 'BABA Alibaba Profile',
        content: `BABA – Alibaba Group Holding Ltd.
Exchange: NYSE (ADR) & HKEX | Sector: Internet / E-Commerce | Founded: 1999
Founder: Jack Ma | IPO: 2014 (NYSE) — largest IPO in history at the time ($25 billion)
CEO: Eddie Wu (since 2023)

Key Businesses:
• Taobao & Tmall — China's largest e-commerce platforms
• Alibaba Cloud (Aliyun) — #1 cloud provider in China, #4 globally
• AliExpress — global online retail platform
• Lazada — Southeast Asia e-commerce
• Ant Group — fintech subsidiary (Alipay payment system)

Key Facts:
• Handles more transactions than Amazon and eBay combined
• Singles' Day (November 11) sale generates over $80 billion in sales in 24 hours
• Faced regulatory crackdown from Chinese government in 2020-2021 — $2.8B antitrust fine

Stock Challenges:
• Stock fell from $320 in 2020 to ~$70 by 2022 due to regulatory and delisting concerns
• US-China geopolitical tensions create ADR risk (Chinese companies trading in US)

📊 BABA trades on NYSE as American Depositary Receipt (ADR). Listed in HK (9988.HK) as well.`
    },
    // ── AUTOMOBILE ──────────────────────────────────────────────────
    {
        topic: 'TSLA Tesla Profile',
        content: `TSLA – Tesla Inc.
Exchange: NASDAQ | Sector: Automobile / Technology | Founded: 2003
IPO: 2010 at $17/share | CEO: Elon Musk

Key Products:
• Model 3 (mass market sedan — best-selling EV globally)
• Model Y (SUV — top-selling car in the world in 2023)
• Model S, Model X (premium), Cybertruck (2023)
• Energy: Megapack (grid-scale storage), Powerwall (home battery)

Key Facts:
• First profitable American automaker to go public since Ford in 1956
• Supercharger network: 50,000+ stations globally
• Autopilot & Full Self-Driving (FSD) are industry-leading ADAS features
• Gigafactories in Nevada, Texas, Shanghai, Berlin

Stock Performance:
• Rose from $17 IPO to $400+ in 2021 (split-adjusted)
• Became part of the S&P 500 in December 2020
• Dropped 65%+ in 2022 due to Elon Musk's Twitter acquisition concerns; recovered

📊 TSLA trades on NASDAQ. No dividend — reinvests in growth.`
    },
    {
        topic: 'TM Toyota Profile',
        content: `TM – Toyota Motor Corporation
Exchange: NYSE (ADR) & Tokyo Stock Exchange | Sector: Automobile | Founded: 1937
Headquarters: Toyota City, Japan | CEO: Koji Sato

Key Facts:
• World's largest automaker by sales volume (10 million+ vehicles/year)
• Invented the Toyota Production System (TPS) / Lean Manufacturing — adopted worldwide
• Pioneer of mass-market hybrid vehicles (Toyota Prius, launched 1997)

Key Brands:
• Toyota (mass market)
• Lexus (luxury)
• Daihatsu (mini vehicles)
• Hino (trucks/buses)

Milestones:
• 1997: Launched Prius — world's first mass-produced hybrid car
• 2014: Launched Mirai — hydrogen fuel cell vehicle
• 2021: Launched bZ series — battery electric vehicles

Market Position (2024):
• Over 400,000 employees worldwide
• Sold over 11.2 million vehicles in 2023 — #1 in the world

📊 TM trades on NYSE as ADR. Japanese primary listing: 7203.T (Tokyo)`
    },
    {
        topic: 'F Ford Motor Company Profile',
        content: `F – Ford Motor Company
Exchange: NYSE | Sector: Automobile | Founded: 1903
Founder: Henry Ford | IPO: 1956 | CEO: Jim Farley

Key Facts:
• Henry Ford invented the moving assembly line — transformed manufacturing
• Ford Model T (1908) was the first mass-produced affordable automobile
• F-Series pickup truck has been the best-selling vehicle in the USA for 47 consecutive years

Key Brands:
• Ford (trucks, SUVs, cars)
• Lincoln (luxury vehicles)
• Ford Pro (commercial vehicles)

EV Strategy (Ford+):
• Ford Mustang Mach-E (electric SUV)
• Ford F-150 Lightning (electric truck)
• Ford E-Transit (electric commercial)
• Invested $50 billion in EV development by 2026

Financial:
• Revenue ~$185 billion (2023)
• Dividend-paying stock (restored after COVID-19 cut)
• Stock trades between $10-$20 typically

📊 F trades on NYSE. American auto icon with 120+ years of history.`
    },
    {
        topic: 'GM General Motors Profile',
        content: `GM – General Motors Company
Exchange: NYSE | Sector: Automobile | Founded: 1908
IPO: 2010 (re-IPO after bankruptcy exit) | CEO: Mary Barra

Key Facts:
• Was the world's largest automaker for most of the 20th century
• Filed for Chapter 11 bankruptcy in 2009 during the financial crisis ($50B+ in losses)
• US government bailout ($49.5 billion) allowed survival and restructuring
• Re-IPO'd in 2010 — one of the largest IPOs in US history

Key Brands:
• Chevrolet, Cadillac, Buick, GMC
• OnStar (connected vehicle services)
• Cruise (autonomous vehicles — self-driving division)

EV Strategy:
• Ultium EV Platform — modular battery system
• Silverado EV, Equinox EV, Blazer EV, Hummer EV
• Invested $35 billion in EVs and autonomous vehicles by 2025

📊 GM trades on NYSE. Dividend-paying company. Mary Barra is the first female CEO of a major automaker.`
    },
    // ── FINANCE ─────────────────────────────────────────────────────
    {
        topic: 'JPM JPMorgan Chase Profile',
        content: `JPM – JPMorgan Chase & Co.
Exchange: NYSE | Sector: Finance / Banking | Founded: 1799 (heritage)
CEO: Jamie Dimon (since 2006)

Key Facts:
• Largest US bank by assets (~$4 trillion)
• Provides investment banking, commercial banking, financial services, asset management
• Rescued Bear Stearns (2008) and Washington Mutual (2008) during the financial crisis

Business Divisions:
• Consumer & Community Banking (Chase brand)
• Commercial Banking
• investment Banking (M&A advisory, underwriting)
• Asset & Wealth Management
• Markets (trading)

Notable Facts:
• Serves 80+ million US households
• Consistent dividend payer — raised dividend every year for 10+ straight years
• Jamie Dimon — one of the most influential CEOs on Wall Street

Financials:
• Revenue: ~$162 billion (2023)
• Net income: ~$49 billion (2023) — record profit

📊 JPM trades on NYSE. Major component of the Dow Jones Industrial Average (DJIA) and S&P 500.`
    },
    {
        topic: 'GS Goldman Sachs Profile',
        content: `GS – The Goldman Sachs Group Inc.
Exchange: NYSE | Sector: Finance / Investment Banking | Founded: 1869
CEO: David Solomon (since 2018)

Key Facts:
• One of the world's most prestigious investment banking firms
• Survived the 2008 financial crisis by converting to a bank holding company
• Known for advising on the largest mergers, acquisitions, and IPOs globally

Business Divisions:
• Global Banking & Markets (trading, advisory)
• Asset & Wealth Management
• Consumer & Wealth Management

Notable:
• Has advised on over 50% of the world's 50 largest M&A deals
• Goldman Sachs alumni are found in governments worldwide ("Government Sachs")
• Launched Marcus by Goldman Sachs — consumer banking arm (2016)

Stock:
• Part of the Dow Jones Industrial Average (DJIA)
• Revenue ~$46 billion (2023)

📊 GS trades on NYSE. Premium financial brand with 150+ year history.`
    },
    {
        topic: 'V Visa Profile',
        content: `V – Visa Inc.
Exchange: NYSE | Sector: Finance / Payments | Founded: 1958 | IPO: 2008
CEO: Ryan McInerney (since 2023)

Key Facts:
• World's largest payments network by transaction volume
• Processes over 200 billion transactions per year across 200+ countries
• Visa does NOT issue credit cards — it provides the network connecting banks and merchants

Business Model:
• Network/platform business (asset-light, extremely high margins)
• Revenue from data processing, international transactions, and service charges
• ~80%+ operating margins (one of the highest of any company)

Market Position:
• Over 4 billion Visa cards in circulation
• Competes with Mastercard, American Express, Discover, and emerging digital payments

Stock Performance:
• IPO'd at $44/share in 2008; reached $280+ by 2024
• One of the most consistent dividend growers in the S&P 500

📊 V trades on NYSE. Warren Buffett's Berkshire Hathaway holds a significant position in Visa.`
    },
    {
        topic: 'MA Mastercard Profile',
        content: `MA – Mastercard Inc.
Exchange: NYSE | Sector: Finance / Payments | Founded: 1966 | IPO: 2006
CEO: Michael Miebach (since 2021)

Key Facts:
• World's second-largest payment processing network after Visa
• Processes over 120 billion transactions per year in 210+ countries
• Like Visa, Mastercard does NOT issue credit cards — it is a payment network

Products & Services:
• Mastercard (debit/credit/prepaid)
• Maestro (debit)
• Cirrus (ATM network)
• Mastercard Send (peer-to-peer payments)
• Cyber & Intelligence services (fraud detection AI)

Business Model:
• Asset-light, high-margin network model (similar to Visa)
• Revenue from branded volume, cross-border fees, switched transactions

Stock Performance:
• IPO at $39/share in 2006; reached $450+ by 2024
• Consecutive dividend increases every year for 10+ years

📊 MA trades on NYSE. Often compared as a "duopoly" with Visa in global payments.`
    },
    // ── CONSUMER BRANDS ─────────────────────────────────────────────
    {
        topic: 'KO Coca-Cola Profile',
        content: `KO – The Coca-Cola Company
Exchange: NYSE | Sector: Consumer Staples / Beverages | Founded: 1886 | IPO: 1919
CEO: James Quincey (since 2017)

Key Facts:
• Most recognized brand in the world (valued at ~$80 billion)
• Coca-Cola is sold in 200+ countries — more than the UN has members
• Owns 500+ beverage brands including Sprite, Fanta, Minute Maid, Dasani, Powerade, Vitaminwater

Warren Buffett Connection:
• Berkshire Hathaway is the largest shareholder (~400 million shares)
• Buffett has called Coca-Cola one of his best investments ever

Dividends:
• Coca-Cola is a "Dividend Aristocrat" — has raised its dividend every year for 60+ consecutive years
• One of the most reliable income stocks on the NYSE

Market Facts:
• ~1.9 billion servings consumed per day globally
• Diet Coke, Coke Zero are top diet beverages globally
• Revenue ~$46 billion (2023)

📊 KO trades on NYSE. Part of the Dow Jones Industrial Average (DJIA). Classic defensive dividend stock.`
    },
    {
        topic: 'PEP PepsiCo Profile',
        content: `PEP – PepsiCo Inc.
Exchange: NASDAQ | Sector: Consumer Staples / Food & Beverages | Founded: 1965 | IPO: 1972
CEO: Ramon Laguarta (since 2018)

Key Facts:
• PepsiCo is more diversified than Coca-Cola — about half its revenue is from food/snacks
• Owns: Pepsi, Mountain Dew, Gatorade, Tropicana, Lay's, Doritos, Cheetos, Quaker Oats

The Cola Wars:
• Pepsi Challenge (1975) marketing campaign showed Pepsi beat Coke in blind taste tests
• Coca-Cola still outsells Pepsi globally but Pepsi leads in snack foods

Dividend Aristocrat:
• Has raised its dividend for 50+ consecutive years
• Consistent, reliable income stock — popular among dividend investors

Financials:
• Revenue ~$91 billion (2023) — larger than Coca-Cola due to food segment
• Expanding into health foods and low-sugar beverages

📊 PEP trades on NASDAQ. Defensive stock — performs well in recessions due to consumer staples nature.`
    },
    {
        topic: 'NKE Nike Profile',
        content: `NKE – Nike Inc.
Exchange: NYSE | Sector: Consumer Discretionary / Apparel | Founded: 1964
Founder: Phil Knight | IPO: 1980 | CEO: Elliott Hill (since 2024)

Key Facts:
• World's largest athletic footwear and apparel brand
• "Just Do It" slogan (1988) is one of the most recognized marketing campaigns ever
• Swoosh logo was designed by a Portland State student for $35 in 1971

Key Partnerships & Endorsements:
• Michael Jordan → Air Jordan line (started 1984, now $5+ billion brand)
• LeBron James, Serena Williams, Cristiano Ronaldo, Kylian Mbappé
• Converse and Hurley are subsidiaries

Business Model:
• Primarily sells through own retail stores and direct-to-consumer digital channels
• "Direct" strategy means selling more on Nike.com (higher margins)
• Manufacturing outsourced to Vietnam, China, Indonesia

Revenue: ~$51 billion (FY2023)
Dividend: Yes — consistent dividend payer and stock buyback program

📊 NKE trades on NYSE. Part of the Dow Jones Industrial Average (DJIA).`
    },
    {
        topic: "MCD McDonald's Profile",
        content: `MCD – McDonald's Corporation
Exchange: NYSE | Sector: Consumer Discretionary / Fast Food | Founded: 1940
IPO: 1965 | CEO: Chris Kempczinski (since 2019)

Key Facts:
• World's largest fast food chain by revenue and brand value
• 40,000+ locations in 100+ countries; serves 70 million customers daily
• Ronald McDonald and the Golden Arches are among the most recognized symbols globally

Business Model:
• ~95% of McDonald's restaurants are franchised (franchisees pay royalties)
• McDonald's makes money from: rent (real estate), royalties, company-operated restaurants
• Owns billions of dollars in real estate — sometimes described as a "real estate company with a restaurant"

Menu Innovation:
• McFlurry, Big Mac, Quarter Pounder, Chicken McNuggets (1980)
• Launched Grand Mac, McPlant (plant-based burger), and chicken sandwiches

Dividend Aristocrat:
• Raised dividend for 46+ consecutive years — highly reliable income stock

Financials:
• Revenue ~$25 billion (2023) | Market Cap ~$200+ billion
• Very high profit margins due to franchise model

📊 MCD trades on NYSE. Part of the Dow Jones Industrial Average (DJIA).`
    },
    // ── INDIAN STOCKS ───────────────────────────────────────────────
    {
        topic: 'INFY Infosys Profile India TCS Indian IT',
        content: `INFY – Infosys Limited
Exchange: NYSE (ADR) & NSE/BSE (India) | Sector: Information Technology | Founded: 1981
Headquarters: Bengaluru, India | CEO: Salil Parekh (since 2018)
NSE Symbol: INFY | BSE: 500209 | US ADR: INFY

Founders: N. R. Narayana Murthy and 6 co-founders, with an initial capital of ₹10,000

Key Facts:
• India's 2nd largest IT services company (after TCS)
• Provides IT consulting, software development, business process outsourcing
• Clients include Fortune 500 companies across 50+ countries
• One of the first Indian companies to be listed on NASDAQ (1999)

Services:
• Digital transformation, cloud computing, AI/ML services
• ERP implementations (SAP, Oracle)
• Cybersecurity services

Revenue: ~$18.5 billion (FY2024) | 330,000+ employees
Dividend: Regular dividend payer; periodic special dividends

Stock:
• Listed on NYSE as ADR (1 ADS = 1 equity share)
• Also actively traded on NSE and BSE

📊 INFY is the most liquid Indian IT stock available on US markets.`
    },
    {
        topic: 'TCS Tata Consultancy Services India Profile',
        content: `TCS – Tata Consultancy Services
Exchange: NSE/BSE (India) | Sector: IT Services | Founded: 1968
NSE Symbol: TCS | BSE: 532540 | Parent: Tata Group
CEO: K Krithivasan (since 2023) | Headquarters: Mumbai, India

Key Facts:
• India's largest IT company and Asia's largest IT services company by market cap
• Subsidiary of Tata Sons — part of the iconic Tata Group conglomerate
• One of the most valuable companies in India (Top 3 by market cap)

Services:
• IT outsourcing, application development, ERP, BPO
• Digital transformation, AI/ML, IoT services
• Industry verticals: BFSI, retail, manufacturing, healthcare, telecom

Revenue: ~$29 billion (FY2024) | 600,000+ employees | 55+ countries

Stock Performance:
• TCS is one of the most stable, blue-chip stocks on NSE
• Consistent dividend payer with high return on equity

Note: TCS does NOT trade directly on US exchanges. US investors can access it through India-focused ETFs.

📊 TCS trades on NSE (India). Part of the Nifty 50 and Sensex indices.`
    },
    {
        topic: 'RELIANCE Reliance Industries India Profile',
        content: `RELIANCE – Reliance Industries Limited
Exchange: NSE/BSE (India) | Sector: Conglomerate | Founded: 1966
NSE Symbol: RELIANCE | BSE: 500325 | Founder: Dhirubhai Ambani
Chairman & MD: Mukesh Ambani | Headquarters: Mumbai, India

Key Facts:
• India's largest private sector company by revenue and market cap
• Mukesh Ambani is one of the richest people in the world
• Founded as a textile company; evolved into energy, petrochemicals, retail, and telecom

Business Segments:
• Oil to Chemicals (O2C) — world's largest refinery complex at Jamnagar
• Retail: Reliance Retail — India's largest retailer (JioMart, Reliance Fresh, Trends)
• Digital Services: Jio — India's #1 telecom operator (500M+ users)
• Media: JioCinema, Network18, Colors TV

Jio Disruption (2016):
• Launched with free data and calls — disrupted India's telecom industry
• Brought affordable 4G internet to 500 million Indians
• Accelerated India's digital economy growth

Revenue: ~₹9 lakh crore ($108 billion) (FY2024)

📊 RELIANCE trades on NSE & BSE. Part of Nifty 50 and Sensex. Available to US investors via India ETFs only.`
    },
    {
        topic: 'HDFCBANK HDFC Bank India Profile',
        content: `HDFCBANK – HDFC Bank Limited
Exchange: NSE/BSE (India) & NYSE (ADR: HDB) | Sector: Banking | Founded: 1994
NSE Symbol: HDFCBANK | US ADR: HDB | CEO: Sashidhar Jagdishan

Key Facts:
• India's largest private sector bank by assets (~₹34 lakh crore)
• Merged with parent HDFC Ltd. (housing finance) in 2023 — largest merger in Indian corporate history
• Consistently ranked as one of India's most trusted and valuable brands
• Known for superior asset quality, low NPAs (non-performing assets), and digital banking

Products:
• Retail banking: savings, loans, credit cards, insurance
• Corporate banking: working capital, project finance
• Digital: HDFC Mobile Banking, PayZapp, SmartBuy

Branch Network: 8,000+ branches, 20,000+ ATMs across India
Employees: 200,000+

Revenue: ~$26 billion (FY2024) | Net Profit ~$8 billion (FY2024)

Stock:
• US ADR: HDB (NYSE) — each ADS = 3 equity shares
• Nifty 50 and Sensex constituent (heavily weighted)

📊 HDFCBANK (India) / HDB (NYSE ADR). Most valuable Indian bank.`
    },
    {
        topic: 'ICICIBANK ICICI Bank India Profile',
        content: `ICICIBANK – ICICI Bank Limited
Exchange: NSE/BSE (India) & NYSE (ADR: IBN) | Sector: Banking | Founded: 1994
NSE Symbol: ICICIBANK | US ADR: IBN | CEO: Sandeep Bakhshi

Key Facts:
• India's 2nd largest private sector bank
• Originally promoted by ICICI (Industrial Credit and Investment Corporation of India)
• Underwent major transformation under Chanda Kochhar and then Sandeep Bakhshi

Products:
• Retail: savings, home loans, personal loans, credit cards
• Business banking, corporate banking, treasury
• iMobile Pay — digital banking app with 10M+ users
• ICICI Prudential Life Insurance, ICICI Lombard (insurance subsidiaries)

Branch Network: 6,500+ branches, 17,000+ ATMs
International Presence: UK, Canada, Singapore, Hong Kong, USA

Revenue: ~$20 billion (FY2024) | Net Profit: ~$8 billion (FY2024)

Stock:
• US ADR: IBN (NYSE) — significant institutional ownership
• Strong performer among Indian bank stocks in the last 5 years
• Part of Nifty 50 and Sensex

📊 ICICIBANK (India) / IBN (NYSE ADR). Available to US investors via ADR.`
    }
];

class StockService {
    // Get stock quote using Yahoo Finance
    static async getQuote(symbol) {
        const cacheKey = `quote_${symbol}`;
        const cached = stockCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }

        try {
            // Try Yahoo Finance via a public API endpoint
            const response = await axios.get(
                `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
                {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' },
                    timeout: 10000
                }
            );

            const result = response.data.chart.result[0];
            const meta = result.meta;
            const quote = result.indicators.quote[0];

            const data = {
                symbol: meta.symbol,
                companyName: meta.longName || meta.shortName || meta.symbol,
                price: meta.regularMarketPrice || 0,
                previousClose: meta.chartPreviousClose || meta.previousClose || 0,
                change: (meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice)) || 0,
                changePercent: meta.chartPreviousClose
                    ? (((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100)
                    : 0,
                high: meta.regularMarketDayHigh || quote.high?.[quote.high.length - 1] || 0,
                low: meta.regularMarketDayLow || quote.low?.[quote.low.length - 1] || 0,
                open: meta.regularMarketOpen || quote.open?.[0] || 0,
                volume: meta.regularMarketVolume || quote.volume?.[quote.volume.length - 1] || 0,
                marketCap: meta.marketCap || 0,
                fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
                fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
                currency: meta.currency || 'USD',
                exchange: meta.fullExchangeName || meta.exchangeName || 'NASDAQ'
            };

            stockCache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
        } catch (error) {
            console.error(`Error fetching quote for ${symbol}:`, error.message);
            // Return mock data for demo
            return StockService.getMockQuote(symbol);
        }
    }

    // Get historical data
    static async getHistoricalData(symbol, range = '1mo', interval = '1d') {
        const cacheKey = `hist_${symbol}_${range}_${interval}`;
        const cached = stockCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 10) {
            return cached.data;
        }

        try {
            const response = await axios.get(
                `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`,
                {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' },
                    timeout: 10000
                }
            );

            const result = response.data.chart.result[0];
            const timestamps = result.timestamp || [];
            const quote = result.indicators.quote[0];

            let data = timestamps.map((ts, i) => ({
                date: new Date(ts * 1000).toISOString(),
                open: quote.open?.[i] || 0,
                high: quote.high?.[i] || 0,
                low: quote.low?.[i] || 0,
                close: quote.close?.[i] || 0,
                volume: quote.volume?.[i] || 0
            })).filter(d => d.close > 0);

            // Dynamically ensure the chart includes today's real-time price
            try {
                const currentQuote = await StockService.getQuote(symbol);
                if (currentQuote && data.length > 0) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const lastDataStr = data[data.length - 1].date.split('T')[0];

                    if (todayStr !== lastDataStr) {
                        // Append today's data if it doesn't exist
                        data.push({
                            date: new Date().toISOString(),
                            open: currentQuote.open || currentQuote.price,
                            high: currentQuote.high || currentQuote.price,
                            low: currentQuote.low || currentQuote.price,
                            close: currentQuote.price,
                            volume: currentQuote.volume || 0
                        });
                    } else {
                        // Update the final candle with the latest live price
                        data[data.length - 1].close = currentQuote.price;
                        data[data.length - 1].volume = Math.max(data[data.length - 1].volume, currentQuote.volume || 0);
                    }
                }
            } catch (e) {
                console.error("Failed to append today's quote:", e.message);
            }

            stockCache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
        } catch (error) {
            console.error(`Error fetching historical data for ${symbol}:`, error.message);
            return StockService.getMockHistoricalData(symbol, range);
        }
    }

    // Search stocks
    static async searchStocks(query) {
        try {
            const response = await axios.get(
                `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`,
                {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' },
                    timeout: 10000
                }
            );

            return (response.data.quotes || []).map(q => ({
                symbol: q.symbol,
                name: q.shortname || q.longname || q.symbol,
                exchange: q.exchange || '',
                type: q.quoteType || ''
            }));
        } catch (error) {
            console.error('Error searching stocks:', error.message);
            return StockService.getMockSearchResults(query);
        }
    }

    // Get Market Indices
    static async getIndices() {
        const symbols = ['^GSPC', '^DJI', '^IXIC', '^NSEI'];
        const quotes = await Promise.all(symbols.map(s => StockService.getQuote(s)));
        const nameMap = {
            '^GSPC': 'S&P 500',
            '^DJI': 'Dow Jones',
            '^IXIC': 'NASDAQ Composite',
            '^NSEI': 'NIFTY 50'
        };
        return quotes.map(q => ({ ...q, name: nameMap[q.symbol] || q.companyName, companyName: nameMap[q.symbol] || q.companyName }));
    }

    // Get trending/popular stocks
    static async getTrendingStocks() {
        const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'WMT'];
        const quotes = await Promise.all(symbols.map(s => StockService.getQuote(s)));
        return quotes;
    }

    // Get top gainers and losers
    static async getGainersLosers() {
        const symbols = [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM',
            'V', 'WMT', 'DIS', 'NFLX', 'AMD', 'INTC', 'BA', 'GS', 'MS', 'UBER',
            'CRM', 'PYPL'
        ];

        const quotes = await Promise.all(symbols.map(s => StockService.getQuote(s)));
        const sorted = quotes.sort((a, b) => b.changePercent - a.changePercent);

        return {
            gainers: sorted.slice(0, 5),
            losers: sorted.slice(-5).reverse()
        };
    }

    // Mock data for when APIs are unavailable
    static getMockQuote(symbol) {
        const mockPrices = {
            'AAPL': { price: 178.72, name: 'Apple Inc.' },
            'MSFT': { price: 415.50, name: 'Microsoft Corporation' },
            'GOOGL': { price: 141.80, name: 'Alphabet Inc.' },
            'AMZN': { price: 178.25, name: 'Amazon.com Inc.' },
            'TSLA': { price: 193.57, name: 'Tesla Inc.' },
            'META': { price: 474.99, name: 'Meta Platforms Inc.' },
            'NVDA': { price: 721.28, name: 'NVIDIA Corporation' },
            'JPM': { price: 183.27, name: 'JPMorgan Chase & Co.' },
            'V': { price: 279.08, name: 'Visa Inc.' },
            'WMT': { price: 168.45, name: 'Walmart Inc.' },
            'DIS': { price: 111.95, name: 'The Walt Disney Company' },
            'NFLX': { price: 567.22, name: 'Netflix Inc.' },
            'AMD': { price: 172.38, name: 'Advanced Micro Devices' },
            'INTC': { price: 43.72, name: 'Intel Corporation' },
            'BA': { price: 204.65, name: 'Boeing Company' },
            'GS': { price: 385.20, name: 'Goldman Sachs Group' },
            'MS': { price: 87.45, name: 'Morgan Stanley' },
            'UBER': { price: 72.30, name: 'Uber Technologies' },
            'CRM': { price: 278.90, name: 'Salesforce Inc.' },
            'PYPL': { price: 62.15, name: 'PayPal Holdings' }
        };

        const mock = mockPrices[symbol] || { price: 100 + Math.random() * 200, name: symbol };
        const changePercent = (Math.random() - 0.5) * 8;
        const previousClose = mock.price / (1 + changePercent / 100);

        return {
            symbol,
            companyName: mock.name,
            price: parseFloat(mock.price.toFixed(2)),
            previousClose: parseFloat(previousClose.toFixed(2)),
            change: parseFloat((mock.price - previousClose).toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            high: parseFloat((mock.price * (1 + Math.random() * 0.02)).toFixed(2)),
            low: parseFloat((mock.price * (1 - Math.random() * 0.02)).toFixed(2)),
            open: parseFloat(previousClose.toFixed(2)),
            volume: Math.floor(Math.random() * 50000000) + 5000000,
            marketCap: Math.floor(mock.price * (Math.random() * 5000000000 + 1000000000)),
            currency: 'USD',
            exchange: 'NASDAQ'
        };
    }

    static getMockHistoricalData(symbol, range) {
        const days = range === '1w' ? 7 : range === '1mo' ? 30 : range === '3mo' ? 90 : range === '6mo' ? 180 : range === '1y' ? 365 : 30;
        const basePrice = StockService.getMockQuote(symbol).price;
        const data = [];

        for (let i = days; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const variance = (Math.random() - 0.48) * basePrice * 0.03;
            const close = basePrice + variance * (days - i) / days;

            data.push({
                date: date.toISOString(),
                open: parseFloat((close - Math.random() * 2).toFixed(2)),
                high: parseFloat((close + Math.random() * 3).toFixed(2)),
                low: parseFloat((close - Math.random() * 3).toFixed(2)),
                close: parseFloat(close.toFixed(2)),
                volume: Math.floor(Math.random() * 50000000) + 5000000
            });
        }

        return data;
    }

    static getMockSearchResults(query) {
        const allStocks = [
            { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
            { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', type: 'EQUITY' },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
            { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
            { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
            { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
            { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', type: 'EQUITY' },
            { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', type: 'EQUITY' },
            { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', type: 'EQUITY' },
            { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', type: 'EQUITY' }
        ];

        const q = query.toLowerCase();
        return allStocks.filter(s =>
            s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
        );
    }

    // RAG - retrieve relevant financial knowledge
    static retrieveFinancialKnowledge(query) {
        const queryLower = query.toLowerCase();
        // Remove noise words
        const noiseWords = ['the', 'a', 'is', 'what', 'how', 'to', 'in', 'of', 'for', 'about', 'can', 'explain', 'me', 'tell'];
        const queryWords = queryLower.split(/\W+/).filter(w => w.length > 2 && !noiseWords.includes(w));

        const results = financialKnowledgeBase
            .map(item => {
                const topicLower = item.topic.toLowerCase();
                const contentLower = item.content.toLowerCase();
                let score = 0;

                // Exact topic match (Highest priority)
                if (topicLower === queryLower) score += 100;

                // Partial topic match
                if (topicLower.includes(queryLower) || queryLower.includes(topicLower)) score += 20;

                queryWords.forEach(word => {
                    // Check topic words
                    if (topicLower.includes(word)) score += 10;

                    // Count occurrences in content
                    const regex = new RegExp(`\\b${word}\\b`, 'gi');
                    const matches = contentLower.match(regex);
                    if (matches) score += matches.length * 2;

                    // Boost for technical terms
                    const technicalTerms = ['rsi', 'macd', 'pe', 'eps', 'avg', 'yield', 'cap', 'bear', 'bull'];
                    if (technicalTerms.includes(word)) score *= 1.5;
                });

                return { ...item, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5); // Return top 5 most relevant items

        return results;
    }
}

module.exports = StockService;
