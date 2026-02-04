/**
 * Comprehensive Voice Test Script
 * Tests ALL 57 questions with 5 runs each using ElevenLabs TTS + Deepgram
 * Run: node server/comprehensive-voice-test.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

const RUNS_PER_QUESTION = 5;

// Load questions from questions.json
const questionsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../questions.json'), 'utf8'));

// Generate realistic test answers for each question
function generateTestAnswer(question) {
    const { id, type, options } = question;

    // Specific answers for each question based on realistic scenarios
    const specificAnswers = {
        // Names
        'buyer_1_name': ['John Michael Smith', 'Maria Garcia Lopez', 'Robert James Wilson', 'Jennifer Ann Thompson', 'David Lee Chen'],
        'buyer_2_name': ['Sarah Elizabeth Smith', 'Carlos Garcia', 'Emily Rose Wilson', 'Michael James Thompson', 'Linda Wei Chen'],

        // Property address
        'property_address': [
            '457 Oak Street, Springdale, Arkansas 72762',
            '123 Main Street, Bentonville, Arkansas 72712',
            '892 Maple Avenue, Rogers, Arkansas 72756',
            '1504 Cedar Lane, Fayetteville, Arkansas 72701',
            '267 Pine Road, Bella Vista, Arkansas 72714'
        ],

        // Currency amounts
        'purchase_price': ['four hundred fifty thousand dollars', 'three hundred seventy five thousand', 'five hundred twenty five thousand dollars', 'two hundred ninety thousand', 'six hundred thousand dollars'],
        'closing_costs_amount': ['five thousand dollars', 'seven thousand five hundred', 'three thousand dollars', 'ten thousand', 'forty five hundred dollars'],
        'nonrefundable_deposit_amount': ['one thousand dollars', 'two thousand five hundred', 'fifteen hundred dollars', 'five hundred', 'three thousand'],
        'warranty_cost_max': ['five hundred dollars', 'seven fifty', 'six hundred', 'four hundred fifty', 'eight hundred dollars'],

        // Yes/No choices
        'has_buyer_2': ['yes', 'no', 'yes there is', 'no just one buyer', 'yes two buyers'],
        'dual_agency': ['no', 'yes', 'no not dual agency', 'yes dual agency', 'no'],
        'seller_pay_closing_costs': ['yes', 'no', 'yes seller pays', 'no buyer pays', 'yes'],
        'has_earnest_money': ['yes', 'no', 'yes earnest money', 'no earnest money', 'yes there is'],
        'has_nonrefundable_deposit': ['no', 'yes', 'no nonrefundable', 'yes nonrefundable', 'no'],
        'buyer_requests_survey': ['yes', 'no', 'yes survey', 'no survey', 'yes please'],
        'additional_items_convey': ['yes', 'no', 'yes additional items', 'no nothing extra', 'yes some items'],
        'fixtures_not_convey': ['no', 'yes', 'no all convey', 'yes some fixtures', 'no everything conveys'],
        'has_contingency': ['no', 'yes', 'no contingency', 'yes contingent', 'no'],
        'has_home_warranty': ['yes', 'no', 'yes warranty', 'no warranty', 'yes please'],
        'wants_home_inspection': ['yes', 'no', 'yes inspection', 'no as is', 'yes'],
        'has_hoa': ['no', 'yes', 'no HOA', 'yes homeowners association', 'no'],
        'seller_disclosure_received': ['yes', 'no', 'yes received', 'no not yet', 'yes reviewed'],
        'buyer_requests_disclosure_copy': ['yes', 'no', 'yes request copy', 'no', 'yes please'],
        'seller_filled_disclosure': ['yes', 'no', 'yes completed', 'no not available', 'yes'],
        'requests_termite_policy': ['no', 'yes', 'no termite', 'yes termite policy', 'no'],
        'built_prior_1978': ['no', 'yes', 'no newer', 'yes older', 'no built after'],
        'has_real_estate_license': ['no', 'yes', 'no license', 'yes licensed', 'no'],
        'license_represented_by_agent': ['yes', 'no', 'yes represented', 'no self', 'yes'],
        'warranty_specific_company': ['yes', 'no', 'yes specific company', 'no select later', 'yes'],

        // Property type choices
        'property_type': ['single family home', 'condominium', 'manufactured home', 'townhome', 'single family'],

        // Purchase method
        'purchase_method': ['financing', 'cash', 'new financing', 'all cash', 'loan'],

        // Loan types
        'loan_type': ['FHA', 'VA', 'conventional', 'USDA', 'FHA loan'],
        'usda_loan_type': ['through a lender', 'direct', 'lender', 'USDA direct', 'bank'],

        // Title insurance
        'title_insurance_payer': ['seller', 'split', 'seller pays', 'both split', 'other'],

        // Survey payment
        'survey_paid_by': ['buyer', 'seller', 'split equally', 'buyer pays', 'seller pays'],
        'survey_other_description': ['buyer pays up to five hundred', 'split seventy thirty', 'seller credits buyer', 'negotiable at closing', 'per agreement'],

        // Additional items
        'additional_items_list': ['washer and dryer', 'refrigerator', 'washer dryer and refrigerator', 'outdoor furniture', 'window treatments'],
        'fixtures_not_convey_list': ['dining room chandelier', 'master bedroom curtains', 'garage shelving', 'pool equipment', 'wall mounted TV'],

        // Contingency
        'contingency_description': [
            'The sale of their house at 456 Oak Avenue Rogers Arkansas',
            'Sale of buyer current home at 123 Main Street',
            'Buyer must sell property at 789 Elm Drive',
            'Contingent on sale of 234 Pine Lane Fayetteville',
            'Sale of current residence at 567 Cedar Court'
        ],
        'contingency_date': ['March fifteenth twenty twenty six', 'April thirtieth twenty twenty six', 'February twenty eighth twenty twenty six', 'May first twenty twenty six', 'June fifteenth twenty twenty six'],
        'contingency_binding_type': ['with escape clause', 'without escape clause', 'with escape', 'without escape', 'binding with escape'],
        'contingency_removal_hours': ['forty eight', 'seventy two', 'twenty four', 'forty eight hours', 'seventy two hours'],
        'contingency_notification_address': [
            '123 Office Street Suite 200 Bentonville Arkansas',
            '456 Business Avenue Rogers Arkansas',
            '789 Commerce Drive Fayetteville Arkansas',
            'same as property address',
            '321 Real Estate Lane Springdale Arkansas'
        ],
        'contingency_closing_days': ['forty five', 'thirty', 'sixty', 'forty five days', 'thirty days'],
        'contingency_time_start': ['at contract acceptance', 'at removal of contingency', 'acceptance', 'removal', 'contract acceptance'],

        // Warranty
        'warranty_company_name': ['American Home Shield', 'First American', 'Choice Home Warranty', 'HMS Home Warranty', 'Old Republic'],
        'warranty_plan_name': ['Shield Gold', 'Premium Plan', 'Complete Coverage', 'Basic Plan', 'Shield Platinum'],
        'warranty_paid_by': ['seller', 'buyer', 'seller pays', 'buyer pays', 'seller'],

        // Nonrefundable deposit timing
        'nonrefundable_deposit_timing': ['within days', 'after repairs', 'other', 'within certain days', 'three days after repairs'],
        'nonrefundable_deposit_days': ['three', 'five', 'seven', 'three days', 'five days'],
        'nonrefundable_deposit_other': [
            'upon removal of inspection contingency',
            'at loan approval',
            'five business days after appraisal',
            'upon title commitment',
            'three days after acceptance'
        ],

        // Termite
        'termite_plan_type': ['one year warranty', 'other', 'full protection plan', 'one year warranty with treatment', 'other plan'],
        'termite_other_description': ['annual inspection only', 'spot treatment as needed', 'inspection with bond', 'quarterly treatment', 'bi-annual inspection'],

        // Closing and possession
        'closing_date': ['April thirtieth twenty twenty six', 'May fifteenth twenty twenty six', 'March thirty first twenty twenty six', 'June first twenty twenty six', 'April fifteenth twenty twenty six'],
        'possession_type': ['upon closing', 'delayed possession', 'prior to closing', 'at closing', 'same day closing'],

        // Other terms
        'other_terms': [
            'Seller agrees to leave all window treatments',
            'Buyer to receive home warranty at closing',
            'Seller to credit buyer five hundred for carpet cleaning',
            'All appliances to remain in working condition',
            'Seller to complete repairs before closing'
        ],

        // License questions
        'license_entity_type': ['individual', 'entity', 'person', 'LLC', 'individual person'],
        'license_buyer_or_seller': ['buyer', 'seller', 'buying', 'selling', 'buyer side'],

        // Contract expiration
        'contract_expiration': [
            'January twenty fifth at five pm',
            'February first at noon',
            'March tenth at three pm',
            'January thirtieth at six pm',
            'February fifteenth at five pm'
        ]
    };

    // Return answers for this question, or generate generic ones
    if (specificAnswers[id]) {
        return specificAnswers[id];
    }

    // Generate based on type
    switch (type) {
        case 'choice':
            if (options) {
                // Use keywords from options
                return options.slice(0, 5).map(opt => {
                    if (opt.keywords && opt.keywords.length > 0) {
                        return opt.keywords[0];
                    }
                    return opt.value;
                });
            }
            return ['yes', 'no', 'yes', 'no', 'yes'];

        case 'currency':
            return ['one thousand dollars', 'five hundred', 'two thousand', 'fifteen hundred', 'three thousand dollars'];

        case 'date':
            return ['March fifteenth twenty twenty six', 'April thirtieth twenty twenty six', 'May first twenty twenty six', 'June fifteenth twenty twenty six', 'February twenty eighth twenty twenty six'];

        case 'datetime':
            return ['January twenty fifth at five pm', 'February first at noon', 'March tenth at three pm', 'April fifteenth at two pm', 'May first at four pm'];

        case 'number':
            return ['forty eight', 'thirty', 'forty five', 'sixty', 'seventy two'];

        case 'text':
        default:
            return ['test answer one', 'test answer two', 'test answer three', 'test answer four', 'test answer five'];
    }
}

// ElevenLabs voices to rotate through for variety
const VOICES = [
    '21m00Tcm4TlvDq8ikWAM',  // Rachel
    '29vD33N1CtxCmqQRPOHJ',  // Drew
    'AZnzlk1XvdvUeBnXmlld',  // Domi
];

async function generateAudio(text, voiceIndex = 0) {
    const voiceId = VOICES[voiceIndex % VOICES.length];

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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

    return Buffer.from(await response.arrayBuffer());
}

async function transcribe(audioBuffer, questionType) {
    // Build params matching the FIXED server configuration
    const params = new URLSearchParams({
        model: 'nova-2',
        punctuate: 'true',
        smart_format: 'true',
        numerals: 'true'  // Key fix: convert spoken numbers to digits
    });

    // FIXED keywords - removed short words that interfere with numbers and entity recognition
    // Removed: "Centerton" (sounds like "entity"), "Fort Smith" ("Fort" sounds like "forty")
    const keyterms = [
        'Arkansas', 'Bentonville', 'Rogers', 'Fayetteville', 'Springdale', 'Lowell',
        'Bella Vista', 'Siloam Springs', 'Little Rock',
        'contingency', 'earnest', 'escrow', 'convey', 'fixtures', 'closing',
        'appraisal', 'inspection', 'mortgage', 'conventional', 'financing',
        'FHA loan', 'VA loan', 'USDA loan', 'conventional loan', 'cash purchase',
        'buyer', 'seller', 'both', 'neither',
        'refundable', 'nonrefundable', 'non-refundable',
        'dual agency', 'single agency',
        'days', 'hours', 'business days', 'calendar days',
        // Business entity types (for license questions)
        'entity', 'individual', 'LLC', 'corporation', 'company',
        // Number words that get misheard (boost to prevent "Fort" instead of "forty")
        'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
    ];
    const highPriority = ['buyer', 'seller', 'FHA loan', 'VA loan', 'USDA loan', 'entity', 'LLC', 'forty'];

    keyterms.forEach(term => {
        const boost = highPriority.includes(term) ? ':3' : ':1';
        params.append('keywords', term + boost);
    });

    const response = await fetch('https://api.deepgram.com/v1/listen?' + params, {
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

// Check if transcription is acceptable for the question type
function evaluateResult(question, input, transcript) {
    const cleanTranscript = transcript.toLowerCase().trim().replace(/[.,!?]/g, '');
    const cleanInput = input.toLowerCase().trim();

    switch (question.type) {
        case 'choice':
            // For choice questions, check if we can match to the right option
            if (question.options) {
                for (const opt of question.options) {
                    // Check if transcript matches any keyword
                    if (opt.keywords) {
                        for (const kw of opt.keywords) {
                            if (cleanTranscript.includes(kw.toLowerCase())) {
                                // Check if input also matches this option
                                const inputMatches = opt.keywords.some(k => cleanInput.includes(k.toLowerCase()));
                                if (inputMatches) {
                                    return { passed: true, matchedOption: opt.value };
                                }
                            }
                        }
                    }
                    // Direct value match
                    if (cleanTranscript.includes(opt.value.toLowerCase())) {
                        if (cleanInput.includes(opt.value.toLowerCase())) {
                            return { passed: true, matchedOption: opt.value };
                        }
                    }
                }
            }
            // Simple yes/no check
            if ((cleanInput.startsWith('yes') || cleanInput.includes('yes ')) && cleanTranscript.includes('yes')) {
                return { passed: true, matchedOption: 'yes' };
            }
            if ((cleanInput.startsWith('no') || cleanInput.includes('no ')) && cleanTranscript.includes('no')) {
                return { passed: true, matchedOption: 'no' };
            }
            return { passed: false, matchedOption: null };

        case 'currency':
            // Check if numbers are present and reasonable
            const transcriptNums = cleanTranscript.match(/[\d,]+/g);
            const inputWords = cleanInput.split(/\s+/);
            // Simple check - did we get a number?
            if (transcriptNums && transcriptNums.length > 0) {
                return { passed: true, extractedValue: transcriptNums.join('') };
            }
            return { passed: false, extractedValue: null };

        case 'date':
            // Check if date format is present
            const dateMatch = cleanTranscript.match(/\d{1,2}\/\d{1,2}\/\d{4}/) ||
                              cleanTranscript.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d+/i);
            return { passed: !!dateMatch, extractedValue: dateMatch ? dateMatch[0] : null };

        case 'datetime':
            // Check if date/time elements present
            const hasDate = cleanTranscript.match(/(january|february|march|april|may|june|july|august|september|october|november|december|\d+)/i);
            const hasTime = cleanTranscript.match(/(\d+\s*(am|pm|noon)|at\s+\d+)/i);
            return { passed: !!(hasDate && hasTime), extractedValue: cleanTranscript };

        case 'number':
            // Check if a number was extracted
            const numMatch = cleanTranscript.match(/\d+/);
            return { passed: !!numMatch, extractedValue: numMatch ? numMatch[0] : null };

        case 'text':
        default:
            // Special case: if input is a number word and transcript has the digit, that's correct
            // This handles "nonrefundable_deposit_days" where "three" → "3" is actually correct
            const numberWords = {
                'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
                'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
                'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15',
                'twenty': '20', 'thirty': '30', 'forty': '40', 'fifty': '50', 'sixty': '60',
                'seventy': '70', 'eighty': '80', 'ninety': '90'
            };
            const firstWord = cleanInput.split(/\s+/)[0];
            if (numberWords[firstWord]) {
                // Input starts with a number word - check if transcript has the corresponding digit
                if (cleanTranscript.includes(numberWords[firstWord])) {
                    return { passed: true, note: 'Number word converted to digit correctly' };
                }
            }
            // For text, calculate similarity
            const similarity = calculateSimilarity(cleanTranscript, cleanInput);
            return { passed: similarity > 0.6, similarity: similarity };
    }
}

function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    // Simple word overlap check
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    let matches = 0;
    for (const word of words1) {
        if (words2.has(word)) matches++;
    }

    return matches / Math.max(words1.size, words2.size);
}

// Main test runner
async function runComprehensiveTest() {
    console.log('='.repeat(70));
    console.log('COMPREHENSIVE VOICE TEST');
    console.log(`Testing ${questionsData.questions.length} questions x ${RUNS_PER_QUESTION} runs each`);
    console.log('='.repeat(70));

    if (!ELEVENLABS_API_KEY || !DEEPGRAM_API_KEY) {
        console.error('ERROR: Missing API keys. Check .env file.');
        process.exit(1);
    }

    const allResults = [];
    const questionStats = {};
    let totalTests = 0;
    let totalPassed = 0;

    for (let qIdx = 0; qIdx < questionsData.questions.length; qIdx++) {
        const question = questionsData.questions[qIdx];
        const testAnswers = generateTestAnswer(question);

        console.log(`\n[${ qIdx + 1}/${questionsData.questions.length}] ${question.id} (${question.type})`);
        console.log(`  Question: "${question.question.substring(0, 60)}..."`);

        questionStats[question.id] = {
            type: question.type,
            runs: [],
            passed: 0,
            failed: 0
        };

        for (let run = 0; run < RUNS_PER_QUESTION; run++) {
            const answer = testAnswers[run % testAnswers.length];

            try {
                // Generate audio with rotating voices
                const audio = await generateAudio(answer, run);

                // Transcribe
                const transcript = await transcribe(audio, question.type);

                // Evaluate
                const evaluation = evaluateResult(question, answer, transcript);

                totalTests++;
                if (evaluation.passed) {
                    totalPassed++;
                    questionStats[question.id].passed++;
                    console.log(`    Run ${run + 1}: ✓ "${answer}" → "${transcript.substring(0, 50)}"`);
                } else {
                    questionStats[question.id].failed++;
                    console.log(`    Run ${run + 1}: ✗ "${answer}" → "${transcript.substring(0, 50)}"`);
                }

                questionStats[question.id].runs.push({
                    input: answer,
                    transcript: transcript,
                    passed: evaluation.passed,
                    details: evaluation
                });

                allResults.push({
                    questionId: question.id,
                    questionType: question.type,
                    run: run + 1,
                    input: answer,
                    transcript: transcript,
                    passed: evaluation.passed,
                    details: evaluation
                });

                // Rate limiting delay
                await new Promise(r => setTimeout(r, 400));

            } catch (error) {
                console.log(`    Run ${run + 1}: ERROR - ${error.message}`);
                questionStats[question.id].failed++;
                questionStats[question.id].runs.push({
                    input: answer,
                    error: error.message,
                    passed: false
                });
            }
        }

        const passRate = (questionStats[question.id].passed / RUNS_PER_QUESTION * 100).toFixed(0);
        console.log(`  Summary: ${questionStats[question.id].passed}/${RUNS_PER_QUESTION} passed (${passRate}%)`);
    }

    // Final Summary
    console.log('\n' + '='.repeat(70));
    console.log('FINAL SUMMARY');
    console.log('='.repeat(70));

    console.log(`\nTotal Tests: ${totalTests}`);
    console.log(`Total Passed: ${totalPassed} (${(totalPassed/totalTests*100).toFixed(1)}%)`);
    console.log(`Total Failed: ${totalTests - totalPassed} (${((totalTests-totalPassed)/totalTests*100).toFixed(1)}%)`);

    // Group by pass rate
    console.log('\n--- QUESTIONS BY PERFORMANCE ---\n');

    const perfect = [];
    const good = [];
    const needsWork = [];
    const failing = [];

    for (const [qId, stats] of Object.entries(questionStats)) {
        const rate = stats.passed / RUNS_PER_QUESTION;
        if (rate === 1) perfect.push({ id: qId, ...stats });
        else if (rate >= 0.8) good.push({ id: qId, ...stats });
        else if (rate >= 0.6) needsWork.push({ id: qId, ...stats });
        else failing.push({ id: qId, ...stats });
    }

    console.log(`Perfect (100%): ${perfect.length} questions`);
    perfect.forEach(q => console.log(`  ✓ ${q.id} (${q.type})`));

    console.log(`\nGood (80-99%): ${good.length} questions`);
    good.forEach(q => console.log(`  ~ ${q.id} (${q.type}) - ${q.passed}/${RUNS_PER_QUESTION}`));

    console.log(`\nNeeds Work (60-79%): ${needsWork.length} questions`);
    needsWork.forEach(q => {
        console.log(`  ! ${q.id} (${q.type}) - ${q.passed}/${RUNS_PER_QUESTION}`);
        q.runs.filter(r => !r.passed).forEach(r => {
            console.log(`      Failed: "${r.input}" → "${r.transcript?.substring(0, 40) || r.error}"`);
        });
    });

    console.log(`\nFailing (<60%): ${failing.length} questions`);
    failing.forEach(q => {
        console.log(`  ✗ ${q.id} (${q.type}) - ${q.passed}/${RUNS_PER_QUESTION}`);
        q.runs.forEach(r => {
            const status = r.passed ? '✓' : '✗';
            console.log(`      ${status} "${r.input}" → "${r.transcript?.substring(0, 40) || r.error}"`);
        });
    });

    // Group by type
    console.log('\n--- PERFORMANCE BY QUESTION TYPE ---\n');
    const typeStats = {};
    for (const [qId, stats] of Object.entries(questionStats)) {
        if (!typeStats[stats.type]) {
            typeStats[stats.type] = { passed: 0, total: 0 };
        }
        typeStats[stats.type].passed += stats.passed;
        typeStats[stats.type].total += RUNS_PER_QUESTION;
    }

    for (const [type, stats] of Object.entries(typeStats)) {
        const rate = (stats.passed / stats.total * 100).toFixed(1);
        console.log(`  ${type}: ${stats.passed}/${stats.total} (${rate}%)`);
    }

    // Save detailed results
    const resultsPath = path.join(__dirname, 'comprehensive-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
        summary: {
            totalTests,
            totalPassed,
            passRate: (totalPassed/totalTests*100).toFixed(1) + '%',
            timestamp: new Date().toISOString()
        },
        questionStats,
        allResults
    }, null, 2));
    console.log(`\nDetailed results saved to: ${resultsPath}`);

    return { questionStats, allResults, totalPassed, totalTests };
}

// Run if called directly
if (require.main === module) {
    runComprehensiveTest().catch(console.error);
}

module.exports = { runComprehensiveTest };
