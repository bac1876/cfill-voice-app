/**
 * Re-test the problem questions with fixes
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

const RUNS_PER_QUESTION = 5;

// Problem questions from comprehensive test
const PROBLEM_QUESTIONS = [
    {
        id: 'nonrefundable_deposit_days',
        type: 'number',
        answers: ['three', 'five', 'seven', 'three days', 'five days']
    },
    {
        id: 'contingency_removal_hours',
        type: 'number',
        answers: ['forty eight', 'seventy two', 'twenty four', 'forty eight hours', 'seventy two hours']
    },
    {
        id: 'contingency_closing_days',
        type: 'number',
        answers: ['forty five', 'thirty', 'sixty', 'forty five days', 'thirty days']
    },
    {
        id: 'warranty_cost_max',
        type: 'currency',
        answers: ['five hundred dollars', 'seven fifty', 'six hundred', 'four hundred fifty', 'eight hundred dollars']
    },
    {
        id: 'purchase_price',
        type: 'currency',
        answers: ['four hundred fifty thousand dollars', 'three hundred seventy five thousand', 'five hundred twenty five thousand dollars', 'two hundred ninety thousand', 'six hundred thousand dollars']
    },
    {
        id: 'loan_type',
        type: 'choice',
        answers: ['FHA', 'VA', 'conventional', 'USDA', 'FHA loan']
    }
];

const VOICES = ['21m00Tcm4TlvDq8ikWAM', '29vD33N1CtxCmqQRPOHJ', 'AZnzlk1XvdvUeBnXmlld'];

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
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
    });
    return Buffer.from(await response.arrayBuffer());
}

async function transcribe(audioBuffer) {
    const params = new URLSearchParams({
        model: 'nova-2',
        punctuate: 'true',
        smart_format: 'true',
        numerals: 'true'
    });

    // New reduced keywords
    const keyterms = [
        'buyer', 'seller', 'FHA loan', 'VA loan', 'USDA loan',
        'conventional loan', 'cash purchase',
        'days', 'hours', 'contingency', 'earnest', 'closing',
        'Arkansas', 'Bentonville', 'Rogers', 'Fayetteville', 'Springdale'
    ];
    keyterms.forEach(term => params.append('keywords', term + ':2'));

    const response = await fetch('https://api.deepgram.com/v1/listen?' + params, {
        method: 'POST',
        headers: {
            'Authorization': `Token ${DEEPGRAM_API_KEY}`,
            'Content-Type': 'audio/mpeg'
        },
        body: audioBuffer
    });

    const result = await response.json();
    return result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
}

function evaluate(type, input, transcript) {
    const clean = transcript.toLowerCase().trim().replace(/[.,!?]/g, '');

    switch (type) {
        case 'number':
            // Check if we got a number
            const numMatch = clean.match(/\d+/);
            if (numMatch) return { passed: true, value: numMatch[0] };
            return { passed: false };

        case 'currency':
            const currMatch = clean.match(/[\d,]+/);
            if (currMatch) return { passed: true, value: currMatch[0] };
            return { passed: false };

        case 'choice':
            // For loan types
            const loanTypes = ['fha', 'va', 'usda', 'conventional'];
            for (const lt of loanTypes) {
                if (input.toLowerCase().includes(lt) && clean.includes(lt)) {
                    return { passed: true, matched: lt };
                }
            }
            return { passed: false };

        default:
            return { passed: true };
    }
}

async function runRetest() {
    console.log('='.repeat(60));
    console.log('RE-TEST OF PROBLEM QUESTIONS WITH FIXES');
    console.log('='.repeat(60));

    let totalTests = 0;
    let totalPassed = 0;

    for (const question of PROBLEM_QUESTIONS) {
        console.log(`\n${question.id} (${question.type})`);
        let qPassed = 0;

        for (let i = 0; i < question.answers.length; i++) {
            const answer = question.answers[i];
            try {
                const audio = await generateAudio(answer, i);
                const transcript = await transcribe(audio);
                const result = evaluate(question.type, answer, transcript);

                totalTests++;
                if (result.passed) {
                    totalPassed++;
                    qPassed++;
                    console.log(`  ✓ "${answer}" → "${transcript.substring(0, 40)}"`);
                } else {
                    console.log(`  ✗ "${answer}" → "${transcript.substring(0, 40)}"`);
                }

                await new Promise(r => setTimeout(r, 400));
            } catch (err) {
                console.log(`  ✗ "${answer}" → ERROR: ${err.message}`);
            }
        }

        console.log(`  Summary: ${qPassed}/${question.answers.length} passed`);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`TOTAL: ${totalPassed}/${totalTests} passed (${(totalPassed/totalTests*100).toFixed(1)}%)`);
    console.log('='.repeat(60));
}

runRetest().catch(console.error);
