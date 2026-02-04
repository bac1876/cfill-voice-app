
const puppeteer = require('puppeteer');

// Realistic human answers with hesitations, pauses, filler words
const testScenarios = [
    {
        name: 'Currency with go-back',
        steps: [
            { action: 'wait', ms: 2000 },
            { action: 'answer', text: 'four hundred fifty thousand dollars' },
            { action: 'wait', ms: 4000 }, // Wait for readback
            { action: 'answer', text: 'go back' }, // Test go-back
            { action: 'wait', ms: 2000 },
            { action: 'answer', text: 'five hundred thousand dollars' }, // Correct answer
            { action: 'wait', ms: 5000 } // Let it proceed
        ]
    },
    {
        name: 'Address with missing zip',
        steps: [
            { action: 'wait', ms: 2000 },
            { action: 'answer', text: '123 Main Street Boulder Colorado' },
            { action: 'wait', ms: 3000 }, // Should ask for zip
            { action: 'answer', text: 'eight zero three zero one' }, // Say zip
            { action: 'wait', ms: 3000 }
        ]
    },
    {
        name: 'Name with umms',
        steps: [
            { action: 'wait', ms: 2000 },
            { action: 'answer', text: 'umm... Brian... uh... Johnson' },
            { action: 'wait', ms: 3000 }
        ]
    }
];

class BrowserVoiceTest {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async init() {
        console.log('Launching browser...');
        this.browser = await puppeteer.launch({
            headless: false, // Show the browser so we can see/hear
            args: [
                '--use-fake-ui-for-media-stream', // Auto-approve mic
                '--use-fake-device-for-media-stream',
                '--autoplay-policy=no-user-gesture-required',
                '--ignore-certificate-errors'
            ]
        });
        this.page = await this.browser.newPage();
        
        // Log console messages
        this.page.on('console', msg => {
            if (msg.type() === 'log') {
                console.log('[PAGE]', msg.text());
            }
        });
    }

    async navigateToApp() {
        console.log('Navigating to voice app...');
        await this.page.goto('http://localhost:3000', { 
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        await this.page.waitForSelector('#start-btn');
        console.log('App loaded!');
    }

    async startQuestionnaire() {
        console.log('Starting questionnaire...');
        await this.page.click('#start-btn');
        await new Promise(r => setTimeout(r, 3000)); // Wait for welcome
    }

    // Simulate voice input by injecting transcript directly
    async simulateVoiceInput(text) {
        console.log('Simulating voice: "' + text + '"');
        
        // Inject the transcript directly into the app
        await this.page.evaluate((transcript) => {
            if (window.app) {
                window.app.currentTranscript = transcript;
                window.app.processTranscript(transcript);
            }
        }, text);
    }

    async runScenario(scenario) {
        console.log('\n=== Running: ' + scenario.name + ' ===');
        
        for (const step of scenario.steps) {
            if (step.action === 'wait') {
                console.log('Waiting ' + step.ms + 'ms...');
                await new Promise(r => setTimeout(r, step.ms));
            } else if (step.action === 'answer') {
                await this.simulateVoiceInput(step.text);
            }
        }
        
        console.log('Scenario complete!');
    }

    async runAllTests() {
        try {
            await this.init();
            await this.navigateToApp();
            await this.startQuestionnaire();
            
            // Just run first scenario for now
            await this.runScenario(testScenarios[0]);
            
            console.log('\nTest complete! Browser will stay open so you can hear/see results.');
            console.log('Press Ctrl+C to close.');
            
            // Keep browser open
            await new Promise(() => {});
            
        } catch (err) {
            console.error('Test error:', err);
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Run
const test = new BrowserVoiceTest();
test.runAllTests();
