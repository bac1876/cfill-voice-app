const WebSocket = require('ws');

// OpenAI Realtime API Handler
class OpenAIRealtimeHandler {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.sessions = new Map();
    }

    // Create a new Realtime session for a client
    async createSession(clientWs, questionContext) {
        const sessionId = Date.now().toString();
        
        // Connect to OpenAI Realtime API
        const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'OpenAI-Beta': 'realtime=v1'
            }
        });

        const session = {
            id: sessionId,
            clientWs,
            openaiWs,
            questionContext,
            transcript: '',
            audioChunks: []
        };

        openaiWs.on('open', () => {
            console.log(`[Realtime] Session ${sessionId} connected to OpenAI`);
            
            // Configure the session for contract filling
            this.sendToOpenAI(session, {
                type: 'session.update',
                session: {
                    modalities: ['text', 'audio'],
                    instructions: `You are a helpful assistant collecting information for a real estate contract.
Current question: ${questionContext.question}
Field hint: ${questionContext.hint || 'None'}

Your job:
1. Listen carefully to what the user says
2. Confirm what you heard by repeating it back naturally
3. If the answer seems unclear or implausible, ask for clarification
4. For names and addresses, spell them back letter by letter using everyday words (A as in Apple, B as in Boy)
5. For numbers and prices, say them clearly and ask "Is that correct?"
6. Be conversational but efficient

When you have a confirmed answer, end with: "CONFIRMED: [the answer]"`,
                    voice: 'nova',  // Natural female voice
                    input_audio_format: 'pcm16',
                    output_audio_format: 'pcm16',
                    turn_detection: {
                        type: 'semantic_vad',
                        eagerness: 'low',  // Patient for complex answers
                        create_response: true,
                        interrupt_response: true
                    }
                }
            });
        });

        openaiWs.on('message', (data) => {
            this.handleOpenAIMessage(session, JSON.parse(data.toString()));
        });

        openaiWs.on('error', (err) => {
            console.error(`[Realtime] Session ${sessionId} error:`, err.message);
            this.endSession(sessionId);
        });

        openaiWs.on('close', () => {
            console.log(`[Realtime] Session ${sessionId} closed`);
            this.endSession(sessionId);
        });

        this.sessions.set(sessionId, session);
        return sessionId;
    }

    // Send message to OpenAI
    sendToOpenAI(session, message) {
        if (session.openaiWs.readyState === WebSocket.OPEN) {
            session.openaiWs.send(JSON.stringify(message));
        }
    }

    // Send audio chunk from client to OpenAI
    sendAudio(sessionId, audioBase64) {
        const session = this.sessions.get(sessionId);
        if (session) {
            this.sendToOpenAI(session, {
                type: 'input_audio_buffer.append',
                audio: audioBase64
            });
        }
    }

    // Handle messages from OpenAI
    handleOpenAIMessage(session, message) {
        switch (message.type) {
            case 'response.audio.delta':
                // Stream audio back to client
                if (session.clientWs.readyState === WebSocket.OPEN) {
                    session.clientWs.send(JSON.stringify({
                        type: 'realtime_audio',
                        audio: message.delta
                    }));
                }
                break;

            case 'response.audio_transcript.delta':
                // AI's spoken text
                session.transcript += message.delta;
                break;

            case 'response.audio_transcript.done':
                console.log(`[Realtime] AI said: ${session.transcript}`);
                // Check for CONFIRMED marker
                const confirmMatch = session.transcript.match(/CONFIRMED:\s*(.+)/i);
                if (confirmMatch) {
                    session.clientWs.send(JSON.stringify({
                        type: 'realtime_confirmed',
                        answer: confirmMatch[1].trim()
                    }));
                }
                session.transcript = '';
                break;

            case 'input_audio_buffer.speech_started':
                // User started speaking
                session.clientWs.send(JSON.stringify({ type: 'realtime_listening' }));
                break;

            case 'input_audio_buffer.speech_stopped':
                // User stopped speaking
                session.clientWs.send(JSON.stringify({ type: 'realtime_processing' }));
                break;

            case 'error':
                console.error(`[Realtime] Error:`, message.error);
                session.clientWs.send(JSON.stringify({
                    type: 'realtime_error',
                    error: message.error.message
                }));
                break;
        }
    }

    // End a session
    endSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            if (session.openaiWs.readyState === WebSocket.OPEN) {
                session.openaiWs.close();
            }
            this.sessions.delete(sessionId);
        }
    }
}

module.exports = { OpenAIRealtimeHandler };
