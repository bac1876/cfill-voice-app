
const WebSocket = require('ws');
const https = require('https');
const http = require('http');

// Realistic human answers with hesitations, pauses, filler words
const realisticAnswers = {
    // Names with spelling variations
    names: [
        'umm... Brian Johnson',
        'its uh... Sarah Mitchell',
        'John... no wait, Jonathan Smith',
        'Michael... umm... Williams',
        'uhh Emily Davis',
        'Robert... Brown',
        'Jessica... umm... Taylor',
        'David Anderson',
        'umm let me think... Jennifer Wilson',
        'Christopher... Martinez'
    ],
    
    // Addresses with realistic speech patterns
    addresses: [
        'umm... 123 Main Street, Boulder Colorado',
        'its uh... 456 Oak Avenue, Lafayette Colorado 80026',
        '789 Pine Road... umm... Denver Colorado 80202',
        'let me think... 321 Elm Drive, Louisville Colorado',
        'uh... 555 Maple Lane Boulder Colorado 80301',
        '999 Cedar Court... Lafayette... 80026',
        'umm 777 Birch Boulevard Denver 80203',
        '444 Walnut Street... uh... Boulder 80302',
        '222 Spruce Way Lafayette Colorado',
        '888 Aspen Circle... umm... Louisville 80027'
    ],
    
    // Currency with natural speech
    currency: [
        'umm... four hundred fifty thousand dollars',
        'uh... 500 thousand',
        'five hundred... no wait... four fifty thousand',
        'umm let me think... 425000',
        'its uh... three hundred seventy five thousand dollars',
        '450000... dollars',
        'four... hundred... fifty thousand',
        'uh about 475 thousand',
        'umm... $400,000',
        'five twenty five thousand... no sorry four fifty thousand'
    ],
    
    // Yes/No with human patterns  
    yesNo: [
        'umm... yes',
        'uh... no',
        'yeah',
        'nope',
        'umm... I think yes',
        'no... wait yes',
        'uh huh',
        'nah',
        'yes please',
        'no thanks'
    ],
    
    // Dates with natural speech
    dates: [
        'umm... January 15th',
        'uh... February 20 2026',
        'March... umm... the 10th',
        'April fifteenth twenty twenty six',
        'umm let me check... May 1st',
        'June... uh... 30th',
        'July 4th 2026',
        'umm August twentieth',
        'September... the 15th',
        'October 31st... 2026'
    ],
    
    // DateTime combinations
    dateTime: [
        'umm... January 25th at 5pm',
        'February 10th... uh... at 3 oclock',
        'March 15 at... umm... 2pm',
        'April 1st at noon',
        'umm... May 20th at 4 in the afternoon',
        'June 15th... at 10am',
        'July 4th at uh... 1pm',
        'August 10th at 11 in the morning',
        'umm September 5th at 9am',
        'October 1st at... 5 oclock pm'
    ],
    
    // Go-back test phrases
    goBack: [
        'go back',
        'wait... go back',
        'umm no thats wrong',
        'hold on... back',
        'redo that',
        'fix that',
        'no wait',
        'umm... wrong',
        'let me fix that',
        'back please'
    ]
};

class VoiceTestRunner {
    constructor(serverUrl = 'https://localhost:3456') {
        this.serverUrl = serverUrl;
        this.results = [];
    }
    
    // Simulate sending audio by sending text to the transcription endpoint
    async simulateVoiceInput(text) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.serverUrl.replace('https', 'wss') + '/transcribe', {
                rejectUnauthorized: false
            });
            
            ws.on('open', () => {
                // Send the model type
                ws.send(JSON.stringify({ type: 'switch_model', questionType: 'text' }));
                ws.send('start');
                
                // Simulate the transcript
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        type: 'transcript',
                        text: text,
                        isFinal: true
                    }));
                    
                    setTimeout(() => {
                        ws.close();
                        resolve({ success: true, input: text });
                    }, 500);
                }, 100);
            });
            
            ws.on('error', (err) => {
                reject(err);
            });
        });
    }
    
    // Test a specific question type
    async testQuestionType(type, answers, count = 10) {
        console.log('\n========================================');
        console.log('Testing: ' + type.toUpperCase());
        console.log('========================================');
        
        const results = [];
        for (let i = 0; i < Math.min(count, answers.length); i++) {
            const answer = answers[i];
            console.log('\nTest ' + (i+1) + ': "' + answer + '"');
            
            try {
                const result = await this.simulateVoiceInput(answer);
                results.push({ input: answer, success: true });
                console.log('  Result: OK');
            } catch (err) {
                results.push({ input: answer, success: false, error: err.message });
                console.log('  Result: FAILED - ' + err.message);
            }
            
            // Add delay between tests
            await new Promise(r => setTimeout(r, 1000));
        }
        
        return results;
    }
    
    // Run all tests
    async runAllTests() {
        console.log('\n?? VOICE APP REALISTIC TEST SUITE');
        console.log('==================================\n');
        console.log('Server: ' + this.serverUrl);
        console.log('Starting tests with realistic human speech patterns...\n');
        
        const allResults = {};
        
        // Test each question type
        allResults.names = await this.testQuestionType('Names', realisticAnswers.names);
        allResults.addresses = await this.testQuestionType('Addresses', realisticAnswers.addresses);
        allResults.currency = await this.testQuestionType('Currency', realisticAnswers.currency);
        allResults.yesNo = await this.testQuestionType('Yes/No', realisticAnswers.yesNo);
        allResults.dates = await this.testQuestionType('Dates', realisticAnswers.dates);
        allResults.dateTime = await this.testQuestionType('DateTime', realisticAnswers.dateTime);
        allResults.goBack = await this.testQuestionType('Go Back Commands', realisticAnswers.goBack);
        
        // Summary
        console.log('\n========================================');
        console.log('TEST SUMMARY');
        console.log('========================================');
        
        let totalPassed = 0;
        let totalFailed = 0;
        
        for (const [type, results] of Object.entries(allResults)) {
            const passed = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            totalPassed += passed;
            totalFailed += failed;
            console.log(type + ': ' + passed + '/' + results.length + ' passed');
        }
        
        console.log('\nTOTAL: ' + totalPassed + '/' + (totalPassed + totalFailed) + ' passed');
        
        return allResults;
    }
}

// Run if called directly
if (require.main === module) {
    const runner = new VoiceTestRunner();
    runner.runAllTests()
        .then(() => console.log('\nTests complete!'))
        .catch(err => console.error('Test error:', err));
}

module.exports = { VoiceTestRunner, realisticAnswers };
