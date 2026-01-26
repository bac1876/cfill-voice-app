const express = require('express');
const { createServer } = require('http');
const { createServer: createHttpsServer } = require('https');
const { WebSocketServer, WebSocket } = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load .env from voice-app directory (not cwd) to ensure API keys are found
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Debug: Log if API keys are loaded
console.log('API Keys loaded:');
console.log('  DEEPGRAM_API_KEY:', process.env.DEEPGRAM_API_KEY ? 'SET (' + process.env.DEEPGRAM_API_KEY.substring(0, 8) + '...)' : 'NOT SET');
console.log('  ELEVENLABS_API_KEY:', process.env.ELEVENLABS_API_KEY ? 'SET (' + process.env.ELEVENLABS_API_KEY.substring(0, 8) + '...)' : 'NOT SET');
console.log('  ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'SET (' + process.env.ANTHROPIC_API_KEY.substring(0, 8) + '...)' : 'NOT SET');

const { reviewContractAnswers } = require('./review-agent');

const app = express();
const server = createServer(app);

// HTTPS server for mobile (iPhone requires HTTPS for microphone access)
let httpsServer = null;
const certsPath = path.join(__dirname, '../certs');
const keyPath = path.join(certsPath, 'key.pem');
const certPath = path.join(certsPath, 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
    httpsServer = createHttpsServer(httpsOptions, app);
    console.log('HTTPS server enabled (for mobile mic access)');
} else {
    console.log('HTTPS certs not found - mobile mic access may not work');
}

// API keys - set in .env file
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

if (!DEEPGRAM_API_KEY) {
    console.warn('WARNING: DEEPGRAM_API_KEY not set in .env file');
    console.warn('Voice transcription will not work without it.');
    console.warn('Get your free API key at: https://console.deepgram.com/signup');
}

if (!ELEVENLABS_API_KEY) {
    console.warn('WARNING: ELEVENLABS_API_KEY not set - using browser voice');
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint to get contract questions
app.get('/api/questions', (req, res) => {
    const questionsPath = path.join(__dirname, '../questions.json');
    if (fs.existsSync(questionsPath)) {
        const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
        res.json(questions);
    } else {
        res.status(404).json({ error: 'Questions not found' });
    }
});

// ElevenLabs Text-to-Speech endpoint with STREAMING for low latency
app.post('/api/speak', async (req, res) => {
    const { text } = req.body;

    if (!ELEVENLABS_API_KEY) {
        return res.status(400).json({ error: 'ElevenLabs API key not configured' });
    }

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    try {
        // Use Rachel voice - natural, conversational female voice
        const voiceId = '21m00Tcm4TlvDq8ikWAM';  // Rachel

        // Use streaming endpoint with flash model for 75ms latency
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_flash_v2_5',  // Fast model - 75ms latency
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.3,  // Slight expressiveness
                    use_speaker_boost: true
                },
                optimize_streaming_latency: 3  // 0-4, higher = faster
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs error:', errorText);
            return res.status(response.status).json({ error: 'TTS failed: ' + errorText });
        }

        // Stream audio chunks directly to client for lowest latency
        res.set({
            'Content-Type': 'audio/mpeg',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache'
        });

        // Pipe the stream directly
        const reader = response.body.getReader();
        const pump = async () => {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(Buffer.from(value));
            }
            res.end();
        };
        await pump();

    } catch (error) {
        console.error('TTS error:', error);
        res.status(500).json({ error: 'TTS failed: ' + error.message });
    }
});

// API endpoint to review contract answers with AI before filling
app.post('/api/review-contract', async (req, res) => {
    const { answers } = req.body;

    console.log('');
    console.log('=== REVIEW AGENT: Analyzing contract answers ===');

    try {
        const reviewResult = await reviewContractAnswers(answers);

        if (reviewResult.skipped) {
            console.log('Review skipped (no API key)');
            res.json({
                success: true,
                skipped: true,
                issues: [],
                summary: 'Review skipped - no Anthropic API key configured'
            });
            return;
        }

        console.log(`Review complete: ${reviewResult.issues.length} issues found`);
        if (reviewResult.issues.length > 0) {
            reviewResult.issues.forEach((issue, i) => {
                console.log(`  ${i + 1}. [${issue.severity}] ${issue.field}: ${issue.description}`);
            });
        }

        res.json({
            success: reviewResult.success,
            issues: reviewResult.issues,
            summary: reviewResult.summary,
            error: reviewResult.error
        });

    } catch (error) {
        console.error('Review error:', error);
        res.json({
            success: false,
            issues: [],
            error: error.message
        });
    }
});

// API endpoint to trigger form filling
app.post('/api/fill-contract', async (req, res) => {
    const { answers } = req.body;

    console.log('Received answers for form filling:', answers);

    // Save answers to file for the Playwright script
    const answersPath = path.join(__dirname, '../../contract-answers.json');
    fs.writeFileSync(answersPath, JSON.stringify(answers, null, 2));

    // Auto-launch the Playwright script to fill the form
    const scriptPath = path.join(__dirname, '../../fill-from-voice.js');

    console.log('');
    console.log('=== AUTO-LAUNCHING FORM FILLER ===');
    console.log(`Script: ${scriptPath}`);
    console.log('');

    // Spawn the script as a detached process so it continues after response
    const playwrightProcess = spawn('node', [scriptPath], {
        cwd: path.join(__dirname, '../..'),
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    // Log output from Playwright script
    playwrightProcess.stdout.on('data', (data) => {
        console.log(`[Playwright] ${data.toString().trim()}`);
    });

    playwrightProcess.stderr.on('data', (data) => {
        console.error(`[Playwright Error] ${data.toString().trim()}`);
    });

    playwrightProcess.on('error', (error) => {
        console.error('Failed to start Playwright script:', error.message);
    });

    // Don't wait for the script to complete - respond immediately
    playwrightProcess.unref();

    res.json({
        success: true,
        message: 'Form filling started! A browser window will open to fill the contract.',
        answersPath
    });
});

// WebSocket server for real-time voice transcription
// HYBRID MODE: Nova for short answers (choice, currency, date), Flux for long answers (text, addresses)
const wss = new WebSocketServer({ server, path: '/transcribe' });

// Also attach WebSocket to HTTPS server if available
let wssHttps = null;
if (httpsServer) {
    wssHttps = new WebSocketServer({ server: httpsServer, path: '/transcribe' });
}

// Question types that use Nova (short answers)
const NOVA_QUESTION_TYPES = ['choice', 'currency', 'date', 'number'];
// Question types that use Flux (long answers)
const FLUX_QUESTION_TYPES = ['text', 'datetime'];

wss.on('connection', (clientWs, req) => {
    const clientIP = req.socket.remoteAddress;
    console.log(`\n[WS] Client connected from ${clientIP} (HYBRID: Nova + Flux)`);

    let deepgramWs = null;
    let deepgramReady = false;
    let audioQueue = [];
    let currentModel = 'nova'; // Start with Nova, will switch based on question type

    // Keyterms to boost recognition
    // NOTE: Removed short words (VA, Drive, Lane, Street) that interfere with number recognition
    // "five" was being heard as "Drive", "seven" as "VA", "three" as "Street"
    // NOTE: Removed "Centerton" as it interferes with "entity" recognition
    // NOTE: Removed "Fort Smith" as "Fort" interferes with "forty" recognition
    const keyterms = [
        // Arkansas cities (longer words less likely to interfere)
        // Removed: Centerton (sounds like "entity"), Fort Smith ("Fort" sounds like "forty")
        'Arkansas', 'Bentonville', 'Rogers', 'Fayetteville', 'Springdale', 'Lowell',
        'Bella Vista', 'Siloam Springs', 'Little Rock',
        // Real estate terms
        'contingency', 'earnest', 'escrow', 'convey', 'fixtures', 'closing',
        'appraisal', 'inspection', 'mortgage', 'conventional', 'financing',
        // Loan types - use full names to avoid false matches
        'FHA loan', 'VA loan', 'USDA loan', 'conventional loan', 'cash purchase',
        // Common answer words (avoid "fire" instead of "buyer")
        'buyer', 'seller', 'both', 'neither',
        'refundable', 'nonrefundable', 'non-refundable',
        'dual agency', 'single agency',
        // Days and time units
        'days', 'hours', 'business days', 'calendar days',
        // Business entity types (for license questions)
        'entity', 'individual', 'LLC', 'corporation', 'company',
        // Number words that get misheard (boost to prevent "Fort" instead of "forty")
        'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
    ];

    // Connect to Nova (v1 endpoint) - fast for short answers
    const connectToNova = () => {
        if (!DEEPGRAM_API_KEY) {
            clientWs.send(JSON.stringify({ error: 'Deepgram API key not configured' }));
            return;
        }

        console.log('[NOVA] Connecting for short answers...');

        const params = new URLSearchParams({
            model: 'nova-2',
            encoding: 'linear16',
            sample_rate: '16000',
            punctuate: 'true',
            smart_format: 'true',
            numerals: 'true',  // Convert spoken numbers to digits
            interim_results: 'true',
            utterance_end_ms: '1000',  // Fast end detection for short answers
            vad_events: 'true'
        });

        // Add keywords for Nova - use moderate boost to avoid interference with numbers
        // Higher boost only for multi-word terms that won't be confused with numbers
        const highPriorityTerms = ['buyer', 'seller', 'FHA loan', 'VA loan', 'USDA loan'];
        keyterms.forEach(term => {
            const boost = highPriorityTerms.includes(term) ? ':3' : ':1';
            params.append('keywords', term + boost);
        });

        const novaUrl = 'wss://api.deepgram.com/v1/listen?' + params;

        deepgramWs = new WebSocket(novaUrl, {
            headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` }
        });

        deepgramWs.on('open', () => {
            console.log('[NOVA] Connected - ready for short answers');
            deepgramReady = true;
            currentModel = 'nova';
            clientWs.send(JSON.stringify({ status: 'ready', model: 'nova' }));

            while (audioQueue.length > 0) {
                deepgramWs.send(audioQueue.shift());
            }
        });

        deepgramWs.on('message', (data) => {
            try {
                const response = JSON.parse(data.toString());

                if (response.type === 'Results') {
                    const transcript = response.channel?.alternatives?.[0]?.transcript || '';
                    const isFinal = response.is_final;
                    const speechFinal = response.speech_final;

                    if (transcript) {
                        console.log(`[NOVA] ${isFinal ? 'Final' : 'Interim'}: "${transcript}"`);
                        clientWs.send(JSON.stringify({
                            type: 'transcript',
                            text: transcript,
                            isFinal,
                            speechFinal
                        }));
                    }

                    if (speechFinal) {
                        console.log('[NOVA] Speech final - end of utterance');
                        clientWs.send(JSON.stringify({ type: 'end_of_turn' }));
                    }
                }

                // Handle UtteranceEnd event
                if (response.type === 'UtteranceEnd') {
                    console.log('[NOVA] Utterance end detected');
                    clientWs.send(JSON.stringify({ type: 'utterance_end' }));
                }
            } catch (err) {
                console.error('[NOVA] Error parsing response:', err);
            }
        });

        deepgramWs.on('error', (err) => {
            console.error('[NOVA] WebSocket error:', err.message);
            clientWs.send(JSON.stringify({ error: 'Nova error: ' + err.message }));
        });

        deepgramWs.on('close', (code) => {
            console.log(`[NOVA] Connection closed: ${code}`);
            deepgramReady = false;
        });
    };

    // Connect to Flux (v2 endpoint) - better turn detection for long answers
    const connectToFlux = () => {
        if (!DEEPGRAM_API_KEY) {
            clientWs.send(JSON.stringify({ error: 'Deepgram API key not configured' }));
            return;
        }

        console.log('[FLUX] Connecting for long answers...');

        const params = new URLSearchParams({
            model: 'flux-general-en',
            encoding: 'linear16',
            sample_rate: '16000',
            eot_threshold: '0.6',
            eager_eot_threshold: '0.4',
            eot_timeout_ms: '3000'
        });

        keyterms.forEach(term => params.append('keyterm', term));

        const fluxUrl = 'wss://api.deepgram.com/v2/listen?' + params;

        deepgramWs = new WebSocket(fluxUrl, {
            headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` }
        });

        deepgramWs.on('open', () => {
            console.log('[FLUX] Connected - ready for long answers');
            deepgramReady = true;
            currentModel = 'flux';
            clientWs.send(JSON.stringify({ status: 'ready', model: 'flux' }));

            while (audioQueue.length > 0) {
                deepgramWs.send(audioQueue.shift());
            }
        });

        deepgramWs.on('message', (data) => {
            try {
                const response = JSON.parse(data.toString());

                if (response.event) {
                    const transcript = response.transcript || '';

                    if (transcript) {
                        const isEndOfTurn = response.event === 'EndOfTurn';
                        const isEagerEndOfTurn = response.event === 'EagerEndOfTurn';

                        console.log(`[FLUX] ${response.event}: "${transcript}"`);
                        clientWs.send(JSON.stringify({
                            type: 'transcript',
                            text: transcript,
                            isFinal: isEndOfTurn || isEagerEndOfTurn,
                            speechFinal: isEndOfTurn
                        }));
                    }

                    if (response.event === 'EndOfTurn') {
                        console.log('[FLUX] End of turn');
                        clientWs.send(JSON.stringify({ type: 'end_of_turn' }));
                    } else if (response.event === 'EagerEndOfTurn') {
                        clientWs.send(JSON.stringify({ type: 'eager_end_of_turn' }));
                    } else if (response.event === 'TurnResumed') {
                        clientWs.send(JSON.stringify({ type: 'turn_resumed' }));
                    } else if (response.event === 'StartOfTurn') {
                        clientWs.send(JSON.stringify({ type: 'start_of_turn' }));
                    }
                }
            } catch (err) {
                console.error('[FLUX] Error parsing response:', err);
            }
        });

        deepgramWs.on('error', (err) => {
            console.error('[FLUX] WebSocket error:', err.message);
            clientWs.send(JSON.stringify({ error: 'Flux error: ' + err.message }));
        });

        deepgramWs.on('close', (code) => {
            console.log(`[FLUX] Connection closed: ${code}`);
            deepgramReady = false;
        });
    };

    // Switch model based on question type
    const switchModel = (questionType) => {
        const needsFlux = FLUX_QUESTION_TYPES.includes(questionType);
        const targetModel = needsFlux ? 'flux' : 'nova';

        // If already using the right model and it's ready, do nothing
        if (currentModel === targetModel && deepgramReady) {
            console.log(`[HYBRID] Already using ${targetModel} for ${questionType}`);
            return;
        }

        // If we're switching from nothing (initial connection), just connect
        if (!deepgramWs) {
            console.log(`[HYBRID] Initial connection to ${targetModel.toUpperCase()} for question type: ${questionType}`);
            currentModel = targetModel;
            if (needsFlux) {
                connectToFlux();
            } else {
                connectToNova();
            }
            return;
        }

        console.log(`[HYBRID] Switching to ${targetModel.toUpperCase()} for question type: ${questionType}`);

        // Close existing connection gracefully
        const oldWs = deepgramWs;
        deepgramWs = null;
        deepgramReady = false;
        currentModel = targetModel;

        if (oldWs) {
            oldWs.close();
        }

        // Small delay to allow clean close before reconnecting
        setTimeout(() => {
            // Connect to appropriate model
            if (needsFlux) {
                connectToFlux();
            } else {
                connectToNova();
            }
        }, 100);
    };

    // DON'T auto-connect - wait for switch_model message with question type
    // This avoids race condition where Nova starts connecting then immediately switches to Flux
    console.log('[HYBRID] Waiting for question type to select model...');

    // Handle messages from client
    clientWs.on('message', (data) => {
        // Check if it's a control message (JSON)
        if (typeof data === 'string') {
            console.log(`[WS] Received string message: ${data.substring(0, 100)}`);
            try {
                const msg = JSON.parse(data);
                if (msg.type === 'switch_model' && msg.questionType) {
                    console.log(`[WS] Switching model for question type: ${msg.questionType}`);
                    switchModel(msg.questionType);
                    return;
                }
            } catch (e) {
                // Not JSON, might be 'start' message
                if (data === 'start') {
                    console.log('[WS] Received start message');
                    return;
                }
            }
            return;
        }

        // Check for Buffer that might be a string
        const dataStr = data.toString();
        if (dataStr === 'start') {
            console.log('Received start message');
            return;
        }

        // Try to parse as JSON control message
        try {
            const msg = JSON.parse(dataStr);
            if (msg.type === 'switch_model' && msg.questionType) {
                switchModel(msg.questionType);
                return;
            }
        } catch (e) {
            // Not JSON, treat as audio data
        }

        // Send audio data
        if (deepgramReady && deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
            deepgramWs.send(data);
        } else {
            audioQueue.push(data);
            console.log('Buffering audio, queue size:', audioQueue.length);
        }
    });

    clientWs.on('close', () => {
        console.log('Client disconnected');
        if (deepgramWs) deepgramWs.close();
    });

    clientWs.on('error', (err) => {
        console.error('Client WebSocket error:', err);
    });
});

// Attach same handler to HTTPS WebSocket server
if (wssHttps) {
    wssHttps.on('connection', (clientWs, req) => {
        console.log(`\n[WSS] HTTPS client connected from ${req.socket.remoteAddress}`);
        // Re-emit to main handler logic by copying the entire handler
        wss.emit('connection', clientWs, req);
    });
}

// Start servers
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Get local IP for display
const getLocalIP = () => {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'your-computer-ip';
};

const localIP = getLocalIP();

server.listen(PORT, () => {
    console.log('');
    console.log('===========================================');
    console.log('  CFILL Voice App - Contract Filler PWA');
    console.log('===========================================');
    console.log('');
    console.log(`HTTP Server:  http://localhost:${PORT}`);
    console.log(`              http://${localIP}:${PORT}`);
    console.log('');
});

// Start HTTPS server for mobile
if (httpsServer) {
    httpsServer.listen(HTTPS_PORT, () => {
        console.log(`HTTPS Server: https://localhost:${HTTPS_PORT}`);
        console.log(`              https://${localIP}:${HTTPS_PORT}`);
        console.log('');
        console.log('** FOR iPHONE: Use the HTTPS URL above **');
        console.log('   (You may need to accept the security warning)');
        console.log('');
        if (!DEEPGRAM_API_KEY) {
            console.log('!! IMPORTANT: Set DEEPGRAM_API_KEY in .env file');
            console.log('   Get free key: https://console.deepgram.com/signup');
        }
        console.log('===========================================');
    });
} else {
    console.log('');
    console.log('On your phone, open:');
    console.log(`  http://${localIP}:${PORT}`);
    console.log('');
    console.log('Note: Mobile mic requires HTTPS. Generate certs:');
    console.log('  openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes');
    console.log('');
    if (!DEEPGRAM_API_KEY) {
        console.log('!! IMPORTANT: Set DEEPGRAM_API_KEY in .env file');
        console.log('   Get free key: https://console.deepgram.com/signup');
    }
    console.log('===========================================');
}
