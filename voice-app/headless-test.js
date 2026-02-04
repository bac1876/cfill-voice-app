const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const results = [];
    results.push('=== VOICE APP TEST === ' + new Date().toLocaleTimeString());
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox']
    });
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
        results.push('1. Page loaded OK');
        
        await page.click('#start-btn');
        await new Promise(r => setTimeout(r, 2000));
        
        // Q1: Buyer name
        let q = await page.evaluate(() => document.getElementById('question-text')?.textContent);
        results.push('2. Q1: ' + q?.substring(0,30));
        await page.evaluate(() => window.app.processTranscript('Brian Johnson'));
        await new Promise(r => setTimeout(r, 2000));
        let a = await page.evaluate(() => document.getElementById('confirmed-answer')?.textContent);
        results.push('   Answer: ' + a);
        
        // Keep going until we hit a currency question (purchase price is around Q5-8)
        for (let i = 0; i < 10; i++) {
            q = await page.evaluate(() => document.getElementById('question-text')?.textContent);
            let qType = await page.evaluate(() => window.app.questions[window.app.currentIndex]?.type);
            results.push((i+3) + '. Q: ' + q?.substring(0,35) + ' [' + qType + ']');
            
            if (qType === 'currency') {
                // Test currency!
                await page.evaluate(() => window.app.processTranscript('four hundred fifty thousand dollars'));
                await new Promise(r => setTimeout(r, 3000));
                a = await page.evaluate(() => document.getElementById('confirmed-answer')?.textContent);
                results.push('   CURRENCY ANSWER: ' + a);
                
                // Now test go back
                await page.evaluate(() => window.app.processTranscript('go back'));
                await new Promise(r => setTimeout(r, 2000));
                q = await page.evaluate(() => document.getElementById('question-text')?.textContent);
                results.push('   After GO BACK: ' + q?.substring(0,35));
                break;
            } else if (qType === 'choice') {
                await page.evaluate(() => window.app.processTranscript('yes'));
            } else {
                await page.evaluate(() => window.app.processTranscript('test answer'));
            }
            await new Promise(r => setTimeout(r, 1500));
        }
        
    } catch (err) {
        results.push('ERROR: ' + err.message);
    }
    
    await browser.close();
    fs.writeFileSync('headless-test-results.txt', results.join('\n'));
})();
