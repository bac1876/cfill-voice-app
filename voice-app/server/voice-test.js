/**
 * Voice Test Script
 * Uses ElevenLabs to generate spoken answers and tests transcription accuracy
 * Run: node server/voice-test.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

// Test data - realistic answers for each question type
const TEST_CASES = [
    // TEXT questions
    { id: 'buyer_1_name', type: 'text', answer: 'John Michael Smith', expected: 'John Michael Smith' },
    { id: 'buyer_2_name', type: 'text', answer: 'Sarah Elizabeth Smith', expected: 'Sarah Elizabeth Smith' },
    { id: 'property_address', type: 'text', answer: '457 Oak Street, Springdale, Arkansas 72762', expected: '457 Oak Street, Springdale, Arkansas 72762' },
    { id: 'contingency_description', type: 'text', answer: 'The sale of their house at 123 Main Street, Rogers, Arkansas', expected: 'The sale of their house at 123 Main Street, Rogers, Arkansas' },
    { id: 'additional_items_list', type: 'text', answer: 'Washer and dryer', expected: 'Washer and dryer' },
    { id: 'fixtures_not_convey_list', type: 'text', answer: 'Dining room chandelier', expected: 'Dining room chandelier' },
    { id: 'warranty_company_name', type: 'text', answer: 'American Home Shield', expected: 'American Home Shield' },
    { id: 'warranty_plan_name', type: 'text', answer: 'Shield Gold', expected: 'Shield Gold' },
    { id: 'other_terms', type: 'text', answer: 'Seller agrees to leave all window treatments', expected: 'Seller agrees to leave all window treatments' },

    // CURRENCY questions
    { id: 'purchase_price', type: 'currency', answer: 'four hundred fifty thousand dollars', expected: '450000' },
    { id: 'closing_costs_amount', type: 'currency', answer: 'five thousand dollars', expected: '5000' },
    { id: 'nonrefundable_deposit_amount', type: 'currency', answer: 'one thousand dollars', expected: '1000' },
    { id: 'warranty_cost_max', type: 'currency', answer: 'five hundred dollars', expected: '500' },

    // CHOICE questions - Yes/No
    { id: 'has_buyer_2', type: 'choice', answer: 'yes', expected: 'yes' },
    { id: 'has_buyer_2_no', type: 'choice', answer: 'no', expected: 'no' },
    { id: 'dual_agency', type: 'choice', answer: 'no', expected: 'no' },
    { id: 'seller_pay_closing_costs', type: 'choice', answer: 'yes', expected: 'yes' },
    { id: 'has_earnest_money', type: 'choice', answer: 'yes', expected: 'yes' },
    { id: 'has_nonrefundable_deposit', type: 'choice', answer: 'no', expected: 'no' },
    { id: 'buyer_requests_survey', type: 'choice', answer: 'yes', expected: 'yes' },
    { id: 'additional_items_convey', type: 'choice', answer: 'yes', expected: 'yes' },
    { id: 'fixtures_not_convey', type: 'choice', answer: 'no', expected: 'no' },
    { id: 'has_contingency', type: 'choice', answer: 'no', expected: 'no' },
    { id: 'has_home_warranty', type: 'choice', answer: 'yes', expected: 'yes' },
    { id: 'wants_home_inspection', type: 'choice', answer: 'yes', expected: 'yes' },
    { id: 'has_hoa', type: 'choice', answer: 'no', expected: 'no' },
    { id: 'seller_disclosure_received', type: 'choice', answer: 'yes', expected: 'yes' },
    { id: 'requests_termite_policy', type: 'choice', answer: 'no', expected: 'no' },
    { id: 'built_prior_1978', type: 'choice', answer: 'no', expected: 'no' },
    { id: 'has_real_estate_license', type: 'choice', answer: 'no', expected: 'no' },

    // CHOICE questions - specific options
    { id: 'property_type', type: 'choice', answer: 'single family home', expected: 'single_family' },
    { id: 'property_type_condo', type: 'choice', answer: 'condominium', expected: 'condo' },
    { id: 'purchase_method', type: 'choice', answer: 'financing', expected: 'new_financing' },
    { id: 'purchase_method_cash', type: 'choice', answer: 'cash', expected: 'cash' },
    { id: 'loan_type', type: 'choice', answer: 'FHA', expected: 'fha' },
    { id: 'loan_type_va', type: 'choice', answer: 'VA', expected: 'va' },
    { id: 'loan_type_conv', type: 'choice', answer: 'conventional', expected: 'conventional' },
    { id: 'title_insurance_payer', type: 'choice', answer: 'seller', expected: 'seller' },
    { id: 'survey_paid_by', type: 'choice', answer: 'buyer', expected: 'buyer' },
    { id: 'warranty_paid_by', type: 'choice', answer: 'seller', expected: 'Seller' },
    { id: 'possession_type', type: 'choice', answer: 'upon closing', expected: 'at_closing' },

    // DATE questions
    { id: 'closing_date', type: 'date', answer: 'April thirtieth twenty twenty six', expected: '04/30/2026' },
    { id: 'contingency_date', type: 'date', answer: 'March fifteenth twenty twenty six', expected: '03/15/2026' },

    // DATETIME questions
    { id: 'contract_expiration', type: 'datetime', answer: 'January twenty fifth at five pm', expected: '01/25' },

    // NUMBER questions
    { id: 'contingency_removal_hours', type: 'number', answer: 'forty eight', expected: '48' },
    { id: 'contingency_closing_days', type: 'number', answer: 'forty five', expected: '45' },
];

// Additional edge cases to test
const EDGE_CASES = [
    // Address with numbers spoken differently
    { id: 'address_spoken_numbers', type: 'text', answer: 'one twenty three Main Street, Bentonville, Arkansas seven two seven one two', expected: '123 Main Street, Bentonville, Arkansas 72712' },
    { id: 'address_mixed', type: 'text', answer: 'four fifty seven Oak Street, Springdale, Arkansas seven two seven six two', expected: '457 Oak Street, Springdale, Arkansas 72762' },

    // Currency edge cases
    { id: 'currency_formatted', type: 'currency', answer: 'four hundred fifty thousand', expected: '450000' },
    { id: 'currency_with_hundred', type: 'currency', answer: 'forty five hundred dollars', expected: '4500' },

    // Loan type recognition
    { id: 'loan_fha_spoken', type: 'choice', answer: 'F H A', expected: 'fha' },

    // Buyer/Seller confusion test
    { id: 'buyer_seller_test', type: 'choice', answer: 'buyer', expected: 'buyer' },
];

// Generate audio using ElevenLabs
async function generateAudio(text) {
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
        method: 'POST',
        headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
            }
        })
    });

    if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

// Save audio to file for inspection
async function saveAudioFile(buffer, filename) {
    const dir = path.join(__dirname, 'test-audio');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const filepath = path.join(dir, `${filename}.mp3`);
    fs.writeFileSync(filepath, buffer);
    return filepath;
}

// Convert MP3 to PCM for Deepgram (using simple approach)
async function convertToPCM(mp3Buffer) {
    // For simplicity, we'll use the server's transcription endpoint
    // which handles the audio format conversion
    return mp3Buffer;
}

// Transcribe audio using Deepgram directly
async function transcribeWithDeepgram(audioBuffer, questionType) {
    return new Promise((resolve, reject) => {
        // Determine which model to use based on question type
        const NOVA_TYPES = ['choice', 'currency', 'date', 'number'];
        const useNova = NOVA_TYPES.includes(questionType);

        let wsUrl;
        if (useNova) {
            const params = new URLSearchParams({
                model: 'nova-2',
                encoding: 'mp3',
                punctuate: 'true',
                smart_format: 'true'
            });
            wsUrl = 'wss://api.deepgram.com/v1/listen?' + params;
        } else {
            const params = new URLSearchParams({
                model: 'nova-2', // Use Nova for file transcription (Flux is for streaming)
                encoding: 'mp3',
                punctuate: 'true',
                smart_format: 'true'
            });
            wsUrl = 'wss://api.deepgram.com/v1/listen?' + params;
        }

        const ws = new WebSocket(wsUrl, {
            headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` }
        });

        let transcript = '';
        let resolved = false;

        ws.on('open', () => {
            ws.send(audioBuffer);
            // Signal end of audio
            setTimeout(() => {
                ws.send(JSON.stringify({ type: 'CloseStream' }));
            }, 100);
        });

        ws.on('message', (data) => {
            try {
                const response = JSON.parse(data.toString());
                if (response.channel?.alternatives?.[0]?.transcript) {
                    transcript = response.channel.alternatives[0].transcript;
                }
                if (response.is_final && !resolved) {
                    resolved = true;
                    ws.close();
                    resolve(transcript);
                }
            } catch (err) {
                // Ignore parse errors
            }
        });

        ws.on('error', (err) => {
            if (!resolved) {
                resolved = true;
                reject(err);
            }
        });

        ws.on('close', () => {
            if (!resolved) {
                resolved = true;
                resolve(transcript);
            }
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                ws.close();
                resolve(transcript);
            }
        }, 10000);
    });
}

// Use Deepgram's REST API instead (simpler for file transcription)
async function transcribeWithDeepgramREST(audioBuffer, questionType) {
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true', {
        method: 'POST',
        headers: {
            'Authorization': `Token ${DEEPGRAM_API_KEY}`,
            'Content-Type': 'audio/mpeg'
        },
        body: audioBuffer
    });

    if (!response.ok) {
        throw new Error(`Deepgram API error: ${response.status}`);
    }

    const result = await response.json();
    return result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
}

// Run a single test case
async function runTest(testCase, index, total) {
    console.log(`\n[${ index + 1}/${total}] Testing: ${testCase.id}`);
    console.log(`  Type: ${testCase.type}`);
    console.log(`  Input: "${testCase.answer}"`);

    try {
        // Generate audio
        const audioBuffer = await generateAudio(testCase.answer);

        // Save for inspection
        const audioPath = await saveAudioFile(audioBuffer, testCase.id);
        console.log(`  Audio saved: ${audioPath}`);

        // Transcribe
        const transcript = await transcribeWithDeepgramREST(audioBuffer, testCase.type);
        console.log(`  Transcript: "${transcript}"`);

        // Check result
        const passed = checkResult(testCase, transcript);
        if (passed) {
            console.log(`  ✓ PASSED`);
        } else {
            console.log(`  ✗ FAILED - Expected to match: "${testCase.expected}"`);
        }

        return {
            id: testCase.id,
            type: testCase.type,
            input: testCase.answer,
            expected: testCase.expected,
            transcript: transcript,
            passed: passed
        };

    } catch (error) {
        console.log(`  ✗ ERROR: ${error.message}`);
        return {
            id: testCase.id,
            type: testCase.type,
            input: testCase.answer,
            expected: testCase.expected,
            transcript: null,
            passed: false,
            error: error.message
        };
    }
}

// Check if transcript matches expected result
function checkResult(testCase, transcript) {
    const cleanTranscript = transcript.toLowerCase().trim().replace(/[.,!?]/g, '');
    const expected = testCase.expected.toLowerCase().trim();

    switch (testCase.type) {
        case 'choice':
            // For choice, check if the key words are present
            if (expected === 'yes' || expected === 'no') {
                return cleanTranscript.includes(expected);
            }
            // For other choices, check keyword presence
            return cleanTranscript.includes(expected) ||
                   expected.split('_').every(word => cleanTranscript.includes(word));

        case 'currency':
            // Extract numbers from transcript and compare
            const numbers = cleanTranscript.match(/\d+/g);
            if (numbers) {
                const transcriptNum = numbers.join('');
                return transcriptNum === expected || parseInt(transcriptNum) === parseInt(expected);
            }
            return false;

        case 'date':
        case 'datetime':
            // Check if month and day are present
            const expectedParts = expected.split('/');
            return expectedParts.some(part => cleanTranscript.includes(part));

        case 'number':
            const numMatch = cleanTranscript.match(/\d+/);
            return numMatch && numMatch[0] === expected;

        case 'text':
        default:
            // For text, check similarity
            const similarity = calculateSimilarity(cleanTranscript, expected.toLowerCase());
            return similarity > 0.7; // 70% similarity threshold
    }
}

// Simple string similarity (Levenshtein-based)
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2[i - 1] === str1[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

// Main test runner
async function runAllTests() {
    console.log('='.repeat(60));
    console.log('VOICE TEST - ElevenLabs TTS + Deepgram Transcription');
    console.log('='.repeat(60));

    if (!ELEVENLABS_API_KEY || !DEEPGRAM_API_KEY) {
        console.error('ERROR: Missing API keys. Check .env file.');
        process.exit(1);
    }

    const allTests = [...TEST_CASES, ...EDGE_CASES];
    const results = [];

    console.log(`\nRunning ${allTests.length} tests...\n`);

    for (let i = 0; i < allTests.length; i++) {
        const result = await runTest(allTests[i], i, allTests.length);
        results.push(result);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`\nTotal: ${results.length}`);
    console.log(`Passed: ${passed} (${Math.round(passed/results.length*100)}%)`);
    console.log(`Failed: ${failed} (${Math.round(failed/results.length*100)}%)`);

    if (failed > 0) {
        console.log('\n--- FAILED TESTS ---');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`\n${r.id} (${r.type}):`);
            console.log(`  Input: "${r.input}"`);
            console.log(`  Expected: "${r.expected}"`);
            console.log(`  Got: "${r.transcript}"`);
            if (r.error) console.log(`  Error: ${r.error}`);
        });
    }

    // Save results to file
    const resultsPath = path.join(__dirname, 'test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${resultsPath}`);

    return results;
}

// Run if called directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests, runTest, generateAudio, transcribeWithDeepgramREST };
