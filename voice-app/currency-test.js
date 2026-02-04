const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const r = ['=== CURRENCY TEST (TTS-aware) ==='];
    const browser = await puppeteer.launch({ headless: true, args: ['--use-fake-ui-for-media-stream', '--no-sandbox'] });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page.click('#start-btn');
    await new Promise(x => setTimeout(x, 2000));
    
    // Skip to purchase price
    await page.evaluate(() => { window.app.currentIndex = 4; window.app.showQuestion(); });
    await new Promise(x => setTimeout(x, 1000));
    
    // Wait for TTS to finish (or force it)
    await page.evaluate(() => { window.app.isSpeaking = false; });
    await new Promise(x => setTimeout(x, 500));
    
    r.push('Sending: 450000');
    await page.evaluate(() => window.app.processTranscript('450000'));
    await new Promise(x => setTimeout(x, 4000));
    
    let state = await page.evaluate(() => ({
        answer: document.getElementById('confirmed-answer')?.textContent,
        purchasePrice: window.app.answers.purchase_price,
        idx: window.app.currentIndex
    }));
    r.push('Answer displayed: ' + state.answer);
    r.push('Answer stored: ' + JSON.stringify(state.purchasePrice));
    r.push('Moved to index: ' + state.idx);
    
    // Test go-back
    await page.evaluate(() => { window.app.isSpeaking = false; });
    await page.evaluate(() => window.app.processTranscript('go back'));
    await new Promise(x => setTimeout(x, 2000));
    
    let afterGoBack = await page.evaluate(() => window.app.currentIndex);
    r.push('After go-back, index: ' + afterGoBack);
    
    await browser.close();
    fs.writeFileSync('currency-test-results.txt', r.join('\n'));
})();
