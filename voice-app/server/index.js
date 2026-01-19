const express = require('express');
const { createServer } = require('http');
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
const wss = new WebSocketServer({ server, path: '/transcribe' });

wss.on('connection', (clientWs) => {
    console.log('Client connected for transcription');

    let deepgramWs = null;
    let deepgramReady = false;
    let audioQueue = []; // Buffer audio until Deepgram is ready

    // Connect to Deepgram Flux for conversational turn detection
    const connectToDeepgram = () => {
        if (!DEEPGRAM_API_KEY) {
            console.error('No Deepgram API key!');
            clientWs.send(JSON.stringify({
                error: 'Deepgram API key not configured'
            }));
            return;
        }

        console.log('Connecting to Deepgram Flux...');

        // Use Flux - Deepgram's conversational speech recognition model
        // Flux has built-in turn detection and is optimized for voice agents
        // Uses the /v2/listen endpoint - only supports specific parameters
        // See: https://developers.deepgram.com/reference/speech-to-text/listen-flux

        // Keyterms to boost recognition of real estate and Arkansas-specific terms
        const keyterms = [
            // Arkansas cities
            'Arkansas', 'Bentonville', 'Rogers', 'Fayetteville', 'Springdale', 'Lowell',
            'Bella Vista', 'Centerton', 'Siloam Springs', 'Little Rock', 'Fort Smith',
            // Real estate terms
            'contingency', 'earnest', 'escrow', 'convey', 'fixtures', 'closing',
            'appraisal', 'inspection', 'mortgage', 'conventional', 'financing',
            // Street types
            'Street', 'Avenue', 'Drive', 'Lane', 'Road', 'Boulevard', 'Court', 'Circle', 'Way'
        ];

        const params = new URLSearchParams({
            model: 'flux-general-en',     // English-only conversational model
            encoding: 'linear16',
            sample_rate: '16000',
            eot_threshold: '0.6',         // End-of-turn confidence threshold (0.5-0.9) - lowered for short responses
            eager_eot_threshold: '0.4',   // Eager end-of-turn for faster response (0.3-0.9) - lowered for short responses
            eot_timeout_ms: '3000'        // End-of-turn timeout (500-10000ms, default 5000) - shorter for responsiveness
        });

        // Add keyterms (each as separate parameter)
        keyterms.forEach(term => params.append('keyterm', term));

        const deepgramUrl = 'wss://api.deepgram.com/v2/listen?' + params;

        deepgramWs = new WebSocket(deepgramUrl, {
            headers: {
                Authorization: `Token ${DEEPGRAM_API_KEY}`
            }
        });

        deepgramWs.on('open', () => {
            console.log('Connected to Deepgram Flux - ready for audio');
            deepgramReady = true;
            clientWs.send(JSON.stringify({ status: 'ready' }));

            // Send any queued audio
            while (audioQueue.length > 0) {
                const audioData = audioQueue.shift();
                deepgramWs.send(audioData);
            }
        });

        deepgramWs.on('message', (data) => {
            try {
                const response = JSON.parse(data.toString());

                // Log raw Flux messages for debugging
                console.log('Flux event:', response.event || response.type, '| transcript:', response.transcript || '');

                // Handle Flux events (uses 'event' field instead of 'type')
                if (response.event) {
                    const transcript = response.transcript || '';

                    // Update, StartOfTurn, EagerEndOfTurn, EndOfTurn all have transcripts
                    if (transcript) {
                        const isEndOfTurn = response.event === 'EndOfTurn';
                        const isEagerEndOfTurn = response.event === 'EagerEndOfTurn';

                        console.log(`Flux ${response.event}: "${transcript}"`);
                        clientWs.send(JSON.stringify({
                            type: 'transcript',
                            text: transcript,
                            isFinal: isEndOfTurn || isEagerEndOfTurn,
                            speechFinal: isEndOfTurn
                        }));
                    }

                    // Handle turn events
                    if (response.event === 'EndOfTurn') {
                        console.log('Flux: End of turn detected');
                        clientWs.send(JSON.stringify({
                            type: 'end_of_turn'
                        }));
                    } else if (response.event === 'EagerEndOfTurn') {
                        console.log('Flux: Eager end of turn - user may be done');
                        clientWs.send(JSON.stringify({
                            type: 'eager_end_of_turn'
                        }));
                    } else if (response.event === 'TurnResumed') {
                        console.log('Flux: Turn resumed - user continued speaking');
                        clientWs.send(JSON.stringify({
                            type: 'turn_resumed'
                        }));
                    } else if (response.event === 'StartOfTurn') {
                        console.log('Flux: Start of turn');
                        clientWs.send(JSON.stringify({
                            type: 'start_of_turn'
                        }));
                    }
                }
                // Fallback for Nova-2 style responses (if using v1 endpoint)
                else if (response.type === 'Results') {
                    const transcript = response.channel?.alternatives?.[0]?.transcript || '';
                    const isFinal = response.is_final;
                    const speechFinal = response.speech_final;

                    if (transcript) {
                        console.log(`Transcript (final=${isFinal}): "${transcript}"`);
                        clientWs.send(JSON.stringify({
                            type: 'transcript',
                            text: transcript,
                            isFinal,
                            speechFinal
                        }));
                    }

                    if (speechFinal) {
                        console.log('Speech final detected');
                        clientWs.send(JSON.stringify({
                            type: 'end_of_turn'
                        }));
                    }
                }
            } catch (err) {
                console.error('Error parsing Deepgram response:', err);
            }
        });

        deepgramWs.on('error', (err) => {
            console.error('Deepgram WebSocket error:', err.message);
            clientWs.send(JSON.stringify({ error: 'Transcription error: ' + err.message }));
        });

        deepgramWs.on('close', (code, reason) => {
            console.log(`Deepgram connection closed: ${code} - ${reason}`);
            deepgramReady = false;
        });
    };

    // Connect to Deepgram immediately when client connects
    connectToDeepgram();

    // Handle messages from client (audio data)
    clientWs.on('message', (data) => {
        // Skip text messages like "start"
        if (typeof data === 'string' || data.toString() === 'start') {
            console.log('Received start message from client');
            return;
        }

        // Queue or send audio data
        if (deepgramReady && deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
            deepgramWs.send(data);
        } else {
            // Buffer audio until Deepgram is ready
            audioQueue.push(data);
            console.log('Buffering audio, queue size:', audioQueue.length);
        }
    });

    clientWs.on('close', () => {
        console.log('Client disconnected');
        if (deepgramWs) {
            deepgramWs.close();
        }
    });

    clientWs.on('error', (err) => {
        console.error('Client WebSocket error:', err);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('');
    console.log('===========================================');
    console.log('  CFILL Voice App - Contract Filler PWA');
    console.log('===========================================');
    console.log('');
    console.log(`Server running at: http://localhost:${PORT}`);
    console.log('');
    console.log('On your phone, open:');
    console.log(`  http://<your-computer-ip>:${PORT}`);
    console.log('');
    console.log('To find your IP, run: ipconfig (Windows) or ifconfig (Mac/Linux)');
    console.log('');
    if (!DEEPGRAM_API_KEY) {
        console.log('!! IMPORTANT: Set DEEPGRAM_API_KEY in .env file');
        console.log('   Get free key: https://console.deepgram.com/signup');
    }
    console.log('===========================================');
});
