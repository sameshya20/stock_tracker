import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => {
        console.log(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    try {
        await page.goto('http://localhost:5173/login');
        await page.waitForSelector('input[type="email"]');
        await page.type('input[type="email"]', 'demo@demo.com');
        await page.type('input[type="password"]', 'password123'); // Assume this was the login
        await page.click('button[type="submit"]');

        await new Promise(r => setTimeout(r, 2000));

        await page.goto('http://localhost:5173/chat');
        console.log('On Chat page');

        await new Promise(r => setTimeout(r, 2000));

        await page.screenshot({ path: 'chat-blank.png' });
        console.log('Screenshot saved');

    } catch (err) {
        console.log('Script Error:', err);
    } finally {
        await browser.close();
    }
})();
