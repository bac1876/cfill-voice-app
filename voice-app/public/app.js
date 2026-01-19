// CFill Voice App - Main Application

class CFillApp {
    constructor() {
        this.questions = [];
        this.currentIndex = 0;
        this.answers = {};
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.ws = null;
        this.currentTranscript = '';
        this.isSpeaking = false;
        this.audioPlayer = new Audio();
        this.useElevenLabs = true;  // Use natural voice
        this.eagerEndOfTurn = false;  // Flux turn detection state

        this.init();
    }

    // Text-to-speech using ElevenLabs for natural voice
    speak(text) {
        return new Promise(async (resolve) => {
            // Stop any current audio
            this.audioPlayer.pause();
            this.audioPlayer.currentTime = 0;

            if (!text) {
                resolve();
                return;
            }

            this.isSpeaking = true;

            try {
                // Call server endpoint for ElevenLabs TTS
                const response = await fetch('/api/speak', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });

                if (!response.ok) {
                    throw new Error('TTS request failed');
                }

                // Get audio blob and play it
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);

                this.audioPlayer.src = audioUrl;
                this.audioPlayer.onended = () => {
                    this.isSpeaking = false;
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };
                this.audioPlayer.onerror = () => {
                    this.isSpeaking = false;
                    URL.revokeObjectURL(audioUrl);
                    console.error('Audio playback error');
                    resolve();
                };

                await this.audioPlayer.play();

            } catch (error) {
                console.error('ElevenLabs TTS error:', error);
                this.isSpeaking = false;
                // Fallback to browser speech if ElevenLabs fails
                await this.speakFallback(text);
                resolve();
            }
        });
    }

    // Fallback to browser speech synthesis
    speakFallback(text) {
        return new Promise((resolve) => {
            const synth = window.speechSynthesis;
            synth.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.05;

            const voices = synth.getVoices();
            const preferredVoice = voices.find(v =>
                v.name.includes('Samantha') ||
                v.name.includes('Google US English') ||
                v.name.includes('Microsoft Zira')
            ) || voices.find(v => v.lang.startsWith('en'));

            if (preferredVoice) utterance.voice = preferredVoice;

            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();

            synth.speak(utterance);
        });
    }

    // Short confirmation phrases for variety
    getConfirmation() {
        const confirmations = [
            "Got it.",
            "Okay.",
            "Perfect.",
            "Great.",
            "Alright."
        ];
        return confirmations[Math.floor(Math.random() * confirmations.length)];
    }

    async init() {
        console.log('CFillApp initializing...');

        // Load questions
        await this.loadQuestions();
        console.log('Questions loaded:', this.questions.length);

        // Bind UI elements
        this.bindElements();
        console.log('Elements bound');

        this.bindEvents();
        console.log('Events bound');

        // Register service worker for PWA
        this.registerServiceWorker();
        console.log('CFillApp ready!');
    }

    async loadQuestions() {
        try {
            const response = await fetch('/api/questions');
            const data = await response.json();
            this.questions = data.questions;

            // Update question count on start screen
            const questionCountEl = document.getElementById('question-count');
            if (questionCountEl) {
                questionCountEl.textContent = `${this.questions.length} questions`;
            }
        } catch (error) {
            console.error('Failed to load questions:', error);
            this.showToast('Failed to load questions', true);
        }
    }

    bindElements() {
        // Screens
        this.screens = {
            start: document.getElementById('start-screen'),
            question: document.getElementById('question-screen'),
            review: document.getElementById('review-screen'),
            complete: document.getElementById('complete-screen')
        };

        // Start screen
        this.startBtn = document.getElementById('start-btn');

        // Question screen
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.questionText = document.getElementById('question-text');
        this.questionHint = document.getElementById('question-hint');
        this.choiceOptions = document.getElementById('choice-options');
        this.transcriptInterim = document.getElementById('transcript-interim');
        this.transcriptFinal = document.getElementById('transcript-final');
        this.answerDisplay = document.getElementById('answer-display');
        this.confirmedAnswer = document.getElementById('confirmed-answer');
        this.micBtn = document.getElementById('mic-btn');
        this.micStatus = document.getElementById('mic-status');
        this.backBtn = document.getElementById('back-btn');
        this.nextBtn = document.getElementById('next-btn');

        // Text input
        this.textInputBox = document.getElementById('text-input-box');
        this.textInput = document.getElementById('text-input');
        this.submitTextBtn = document.getElementById('submit-text-btn');

        // Review screen
        this.answersList = document.getElementById('answers-list');
        this.editBtn = document.getElementById('edit-btn');
        this.submitBtn = document.getElementById('submit-btn');

        // Complete screen
        this.restartBtn = document.getElementById('restart-btn');

        // Toast
        this.toast = document.getElementById('toast');
        this.toastMessage = document.getElementById('toast-message');
    }

    bindEvents() {
        console.log('Binding start button:', this.startBtn);
        this.startBtn.addEventListener('click', () => {
            console.log('Start button clicked!');
            this.startQuestionnaire();
        });
        this.micBtn.addEventListener('click', () => this.toggleRecording());
        this.backBtn.addEventListener('click', () => this.previousQuestion());
        this.nextBtn.addEventListener('click', () => this.nextQuestion());
        this.editBtn.addEventListener('click', () => this.editAnswers());
        this.submitBtn.addEventListener('click', () => this.submitAnswers());
        this.restartBtn.addEventListener('click', () => this.restart());

        // Text input events
        this.submitTextBtn.addEventListener('click', () => this.submitTextAnswer());
        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitTextAnswer();
            }
        });
    }

    submitTextAnswer() {
        const text = this.textInput.value.trim();
        if (text) {
            this.processTranscript(text);
            this.textInput.value = '';
        }
    }

    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        this.screens[screenName].classList.add('active');
    }

    async startQuestionnaire() {
        this.currentIndex = 0;
        this.answers = {};
        this.conversationMode = true;  // Enable auto-advance
        this.showScreen('question');

        // Speak welcome first, then show question
        await this.speak("Let's fill out your contract.");
        this.showQuestion();
    }

    async showQuestion() {
        const question = this.questions[this.currentIndex];

        // Small delay to let UI render and user process the transition
        await new Promise(resolve => setTimeout(resolve, 100));

        // Skip questions with showIf conditions that aren't met
        if (question.showIf) {
            const dependentAnswer = this.answers[question.showIf.question];
            let shouldShow = false;

            // Check if condition uses "values" (array) or "value" (single)
            if (question.showIf.values) {
                // Multiple values - show if answer matches ANY of them
                shouldShow = question.showIf.values.includes(dependentAnswer?.value);
            } else {
                // Single value - show if answer matches exactly
                shouldShow = dependentAnswer?.value === question.showIf.value;
            }

            if (!shouldShow) {
                // Skip this question
                if (this.currentIndex < this.questions.length - 1) {
                    this.currentIndex++;
                    this.showQuestion();
                } else {
                    this.showReview();
                }
                return;
            }
        }

        // Check if we have pending items from smart detection for this question
        if (this.pendingItems && this.pendingItems.forQuestion === question.id) {
            // Auto-fill this question with the items the user already provided
            const items = this.pendingItems.items;
            this.answers[question.id] = {
                value: items,
                display: items,
                fieldName: question.fieldName
            };
            this.pendingItems = null; // Clear pending items

            // Show confirmation and auto-advance
            await this.speak(`Got it, I'll use: ${items}`);
            this.currentIndex++;
            this.showQuestion();
            return;
        }

        // Update progress
        const progress = ((this.currentIndex + 1) / this.questions.length) * 100;
        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = `Question ${this.currentIndex + 1} of ${this.questions.length}`;

        // Update question text
        this.questionText.textContent = question.question;
        this.questionHint.textContent = question.hint || '';

        // Reset transcript
        this.transcriptInterim.textContent = '';
        this.transcriptFinal.textContent = '';
        this.currentTranscript = '';

        // Start recording IMMEDIATELY - don't wait for speech
        if (this.conversationMode && !this.isRecording) {
            this.startRecording();
        }

        // Speak the question (user can respond anytime)
        this.speak(question.question);

        // Handle choice questions - show choice buttons for tapping OR voice
        if (question.type === 'choice') {
            this.showChoiceOptions(question);
        } else {
            this.choiceOptions.classList.add('hidden');
        }

        // Hide text input - we're using voice mode
        this.textInputBox.classList.add('hidden');

        // Show transcript box for voice feedback
        const transcriptBox = document.getElementById('transcript-box');
        if (transcriptBox) {
            transcriptBox.classList.remove('hidden');
        }

        // Show previous answer if exists
        const existingAnswer = this.answers[question.id];
        if (existingAnswer) {
            this.showAnswer(existingAnswer.display);
            this.nextBtn.disabled = false;
        } else {
            this.answerDisplay.classList.add('hidden');
            this.nextBtn.disabled = true;
        }

        // Update back button state
        this.backBtn.disabled = this.currentIndex === 0;
    }

    showChoiceOptions(question) {
        this.choiceOptions.innerHTML = '';
        this.choiceOptions.classList.remove('hidden');

        question.options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = option.label;
            btn.dataset.value = option.value;

            // Check if already selected
            const existingAnswer = this.answers[question.id];
            if (existingAnswer && existingAnswer.value === option.value) {
                btn.classList.add('selected');
            }

            btn.addEventListener('click', () => {
                this.selectChoice(question, option);
            });

            this.choiceOptions.appendChild(btn);
        });
    }

    selectChoice(question, option) {
        // Update UI
        const buttons = this.choiceOptions.querySelectorAll('.choice-btn');
        buttons.forEach(btn => btn.classList.remove('selected'));
        const selectedBtn = this.choiceOptions.querySelector(`[data-value="${option.value}"]`);
        if (selectedBtn) selectedBtn.classList.add('selected');

        // Save answer
        this.answers[question.id] = {
            value: option.value,
            display: option.label,
            fieldName: option.fieldName
        };

        this.showAnswer(option.label);
        this.nextBtn.disabled = false;
    }

    async showAnswer(text, autoAdvance = true) {
        this.confirmedAnswer.textContent = text;
        this.answerDisplay.classList.remove('hidden');
        this.nextBtn.disabled = false;

        // Stop recording if still going
        if (this.isRecording) {
            this.stopRecording();
        }

        // In conversation mode: quick confirmation then auto-advance
        if (this.conversationMode && autoAdvance) {
            await this.speak(this.getConfirmation());
            // Add a small delay before advancing to let user see the confirmed answer
            // This helps especially with conditional questions that follow
            await new Promise(resolve => setTimeout(resolve, 300));
            // Auto-advance to next question
            this.nextQuestion();
        } else {
            // Manual mode: full confirmation
            await this.speak(`${this.getConfirmation()} ${text}.`);
        }
    }

    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // Connect to WebSocket
            this.connectWebSocket();

            // Set up audio processing
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });

            const source = this.audioContext.createMediaStreamSource(stream);
            const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

            source.connect(processor);
            processor.connect(this.audioContext.destination);

            processor.onaudioprocess = (e) => {
                if (this.isRecording && this.ws && this.ws.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Convert to 16-bit PCM
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                    }
                    this.ws.send(pcmData.buffer);
                }
            };

            this.stream = stream;
            this.processor = processor;
            this.isRecording = true;

            // Update UI
            this.micBtn.classList.add('recording');
            this.micStatus.textContent = 'Listening...';
            this.micStatus.classList.add('recording');

        } catch (error) {
            console.error('Failed to start recording:', error);
            this.showToast('Microphone access denied', true);
        }
    }

    stopRecording() {
        this.isRecording = false;

        // Stop audio processing
        if (this.processor) {
            this.processor.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        // Close WebSocket
        if (this.ws) {
            this.ws.close();
        }

        // Update UI
        this.micBtn.classList.remove('recording');
        this.micStatus.textContent = 'Tap to answer';
        this.micStatus.classList.remove('recording');

        // Process final transcript
        if (this.currentTranscript) {
            this.processTranscript(this.currentTranscript);
        }
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/transcribe`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            // Send initial message to trigger Deepgram connection
            this.ws.send('start');
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.status === 'ready') {
                    console.log('Deepgram ready');
                    return;
                }

                if (data.error) {
                    console.error('Server error:', data.error);
                    this.showToast(data.error, true);
                    return;
                }

                if (data.type === 'transcript') {
                    if (data.isFinal) {
                        // Accumulate final transcripts (user might pause mid-sentence)
                        if (this.currentTranscript && !this.currentTranscript.endsWith(data.text)) {
                            // Append if it's new content
                            this.currentTranscript = (this.currentTranscript + ' ' + data.text).trim();
                        } else {
                            this.currentTranscript = data.text;
                        }
                        this.transcriptFinal.textContent = this.currentTranscript;
                        this.transcriptInterim.textContent = '';
                        // Clear stability timer on final transcript
                        if (this.stabilityTimer) {
                            clearTimeout(this.stabilityTimer);
                            this.stabilityTimer = null;
                        }
                    } else {
                        // For interim (non-final) transcripts, also update currentTranscript
                        // This ensures short words like "yes"/"no" are captured even if
                        // Flux doesn't send EndOfTurn before the user stops speaking
                        if (data.text) {
                            this.currentTranscript = data.text;
                            this.lastTranscriptText = data.text;
                            this.lastTranscriptTime = Date.now();

                            // Start/reset stability timer - if transcript stays the same for 2s, process it
                            // This is a fallback in case Flux doesn't send EndOfTurn
                            if (this.stabilityTimer) {
                                clearTimeout(this.stabilityTimer);
                            }
                            this.stabilityTimer = setTimeout(() => {
                                // Check if transcript is still the same and we're still recording
                                if (this.isRecording && this.currentTranscript &&
                                    this.currentTranscript === this.lastTranscriptText) {
                                    console.log('Stability timeout: processing transcript after 2s of no change');
                                    this.stopRecording();
                                }
                            }, 2000);
                        }
                        this.transcriptInterim.textContent = data.text;
                    }
                }

                // Flux turn detection - smarter than silence-based detection
                if (data.type === 'end_of_turn' && this.currentTranscript) {
                    // Flux confidently detected user finished speaking
                    console.log('Flux: End of turn detected');
                    // Clear stability timer since we got proper end of turn
                    if (this.stabilityTimer) {
                        clearTimeout(this.stabilityTimer);
                        this.stabilityTimer = null;
                    }
                    if (this.isRecording) {
                        this.stopRecording();
                    }
                }

                if (data.type === 'eager_end_of_turn' && this.currentTranscript) {
                    // Flux thinks user might be done - start preparing response
                    console.log('Flux: Eager end of turn - user may be done');
                    // Don't stop yet, but could start processing early
                    this.eagerEndOfTurn = true;
                }

                if (data.type === 'turn_resumed') {
                    // User continued speaking after eager end of turn
                    console.log('Flux: Turn resumed - user is still speaking');
                    this.eagerEndOfTurn = false;
                }

                // Fallback for utterance_end (older behavior)
                if (data.type === 'utterance_end' && this.currentTranscript) {
                    // Auto-process when user stops speaking
                    setTimeout(() => {
                        if (this.isRecording) {
                            this.stopRecording();
                        }
                    }, 500);
                }

            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showToast('Connection error', true);
        };

        this.ws.onclose = () => {
            console.log('WebSocket closed');
        };
    }

    async processTranscript(transcript) {
        const question = this.questions[this.currentIndex];
        const text = transcript.toLowerCase().trim();

        // Check for voice commands FIRST before processing as an answer
        const command = this.checkForCommand(text);
        if (command) {
            this.handleCommand(command, text);
            return;
        }

        if (question.type === 'choice') {
            // SMART DETECTION: Check if user gave a detailed answer that implies "yes"
            // e.g., "fridge, washer, dryer" for "Are there additional items?"
            const smartResult = this.detectSmartAnswer(question, text, transcript);
            if (smartResult) {
                // User gave details that imply yes - select yes AND store the details
                this.selectChoice(question, smartResult.option);
                // Store the extracted items for the follow-up question
                if (smartResult.extractedItems) {
                    this.pendingItems = {
                        forQuestion: smartResult.followUpQuestion,
                        items: smartResult.extractedItems
                    };
                }
                return;
            }

            // Standard matching: Match transcript to choice options
            let bestMatch = null;
            let bestScore = 0;

            question.options.forEach(option => {
                // Check keywords
                const matchCount = option.keywords.filter(keyword =>
                    text.includes(keyword.toLowerCase())
                ).length;

                if (matchCount > bestScore) {
                    bestScore = matchCount;
                    bestMatch = option;
                }
            });

            if (bestMatch) {
                this.selectChoice(question, bestMatch);
            } else {
                this.showToast('Could not understand. Please try again or tap an option.', false);
                // Restart recording so user can try again
                if (this.conversationMode && !this.isRecording) {
                    this.startRecording();
                }
            }

        } else if (question.type === 'currency') {
            // Extract number from transcript
            const number = this.extractNumber(transcript);
            if (number) {
                this.answers[question.id] = {
                    value: number,
                    display: `$${number.toLocaleString()}`,
                    fieldName: question.fieldName
                };
                this.showAnswer(`$${number.toLocaleString()}`);
                this.nextBtn.disabled = false;
            } else {
                this.showToast('Please say a number', false);
            }

        } else if (question.type === 'datetime') {
            // Parse combined date and time (e.g., "January 25th at 5pm")
            const parsed = this.parseDateTimeFromSpeech(transcript);
            if (parsed) {
                this.answers[question.id] = {
                    value: parsed.value,
                    display: parsed.display,
                    date: parsed.date,
                    time: parsed.time,
                    ampm: parsed.ampm
                };
                this.showAnswer(parsed.display);
                this.nextBtn.disabled = false;
            } else {
                this.showToast('Please say a date and time, like January 25th at 5pm', false);
                // Restart recording
                if (this.conversationMode && !this.isRecording) {
                    this.startRecording();
                }
            }

        } else if (question.type === 'date') {
            // Parse date only (e.g., "April 30" or "April 30th")
            const parsed = this.parseDateFromSpeech(transcript);
            if (parsed) {
                this.answers[question.id] = {
                    value: parsed.value,
                    display: parsed.display,
                    fieldName: question.fieldName
                };
                this.showAnswer(parsed.display);
                this.nextBtn.disabled = false;
            } else {
                this.showToast('Please say a date, like April 30th', false);
                // Restart recording
                if (this.conversationMode && !this.isRecording) {
                    this.startRecording();
                }
            }

        } else {
            // Text answer - check for spelling first (especially for names)
            let finalText = transcript;

            // Check if user is spelling out a name
            const spellInfo = this.detectSpelling(transcript);
            if (spellInfo) {
                const spelled = this.convertSpelling(spellInfo);
                if (spelled) {
                    // Format as a proper name
                    finalText = this.formatName(spelled);
                    console.log(`Converted spelled "${transcript}" to "${finalText}"`);
                }
            }

            // Clean up the text
            const cleanedText = this.cleanTextAnswer(finalText);

            // Check if the answer appears incomplete (user is still talking)
            // Common incomplete patterns: ends with preposition, article, or trailing word
            const incompletePatterns = /\b(of|at|in|on|the|a|an|to|for|with|and|or|sale|buyer's|seller's|my|their|current|located)\s*$/i;
            if (incompletePatterns.test(cleanedText)) {
                console.log(`Answer appears incomplete: "${cleanedText}" - waiting for more...`);
                this.showToast('Keep going... I\'m listening', false);
                // Don't save yet - keep recording for more input
                if (this.conversationMode && !this.isRecording) {
                    this.startRecording();
                }
                return; // Don't process as complete answer
            }

            // For address fields, check if zip code is missing
            if (question.id === 'property_address' || question.id.includes('address')) {
                const hasZipCode = /\b\d{5}(-\d{4})?\b/.test(cleanedText);
                const looksLikeAddress = /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|court|ct|boulevard|blvd|circle|cir)/i.test(cleanedText);

                if (looksLikeAddress && !hasZipCode) {
                    console.log(`Address missing zip code: "${cleanedText}"`);
                    // Store the partial address and prompt for zip
                    this.partialAddress = cleanedText;
                    this.showToast('Please add the zip code', false);
                    await this.speak('I noticed there\'s no zip code. Please add the zip code.');
                    if (this.conversationMode && !this.isRecording) {
                        this.startRecording();
                    }
                    return; // Wait for zip code
                }

                // If we have a partial address stored and user just said a zip code
                if (this.partialAddress && /^\d{5}(-\d{4})?$/.test(cleanedText.trim())) {
                    // Combine partial address with zip code
                    const fullAddress = `${this.partialAddress} ${cleanedText.trim()}`;
                    this.partialAddress = null;
                    this.answers[question.id] = {
                        value: fullAddress,
                        display: fullAddress,
                        fieldName: question.fieldName
                    };
                    this.showAnswer(fullAddress);
                    this.nextBtn.disabled = false;
                    return;
                }
            }

            this.answers[question.id] = {
                value: cleanedText,
                display: cleanedText,
                fieldName: question.fieldName
            };
            this.showAnswer(cleanedText);
            this.nextBtn.disabled = false;
        }
    }

    // Parse date and time from natural speech like "January 25th at 5pm" or "January twenty-fifth at 5pm"
    parseDateTimeFromSpeech(text) {
        const lowerText = text.toLowerCase();

        // Month names
        const months = {
            'january': '01', 'february': '02', 'march': '03', 'april': '04',
            'may': '05', 'june': '06', 'july': '07', 'august': '08',
            'september': '09', 'october': '10', 'november': '11', 'december': '12',
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
            'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'sept': '09',
            'oct': '10', 'nov': '11', 'dec': '12'
        };

        // Ordinal words to numbers mapping
        const ordinalWords = {
            'first': 1, '1st': 1,
            'second': 2, '2nd': 2,
            'third': 3, '3rd': 3,
            'fourth': 4, '4th': 4,
            'fifth': 5, '5th': 5,
            'sixth': 6, '6th': 6,
            'seventh': 7, '7th': 7,
            'eighth': 8, '8th': 8,
            'ninth': 9, '9th': 9,
            'tenth': 10, '10th': 10,
            'eleventh': 11, '11th': 11,
            'twelfth': 12, '12th': 12,
            'thirteenth': 13, '13th': 13,
            'fourteenth': 14, '14th': 14,
            'fifteenth': 15, '15th': 15,
            'sixteenth': 16, '16th': 16,
            'seventeenth': 17, '17th': 17,
            'eighteenth': 18, '18th': 18,
            'nineteenth': 19, '19th': 19,
            'twentieth': 20, '20th': 20,
            'twenty first': 21, 'twenty-first': 21, '21st': 21,
            'twenty second': 22, 'twenty-second': 22, '22nd': 22,
            'twenty third': 23, 'twenty-third': 23, '23rd': 23,
            'twenty fourth': 24, 'twenty-fourth': 24, '24th': 24,
            'twenty fifth': 25, 'twenty-fifth': 25, '25th': 25,
            'twenty sixth': 26, 'twenty-sixth': 26, '26th': 26,
            'twenty seventh': 27, 'twenty-seventh': 27, '27th': 27,
            'twenty eighth': 28, 'twenty-eighth': 28, '28th': 28,
            'twenty ninth': 29, 'twenty-ninth': 29, '29th': 29,
            'thirtieth': 30, '30th': 30,
            'thirty first': 31, 'thirty-first': 31, '31st': 31
        };

        // Year words mapping for spoken years like "twenty twenty six"
        const yearWords = {
            'twenty twenty': 2020,
            'twenty twenty one': 2021,
            'twenty twenty two': 2022,
            'twenty twenty three': 2023,
            'twenty twenty four': 2024,
            'twenty twenty five': 2025,
            'twenty twenty six': 2026,
            'twenty twenty seven': 2027,
            'twenty twenty eight': 2028,
            'twenty twenty nine': 2029,
            'twenty thirty': 2030,
            '2024': 2024,
            '2025': 2025,
            '2026': 2026,
            '2027': 2027,
            '2028': 2028,
            '2029': 2029,
            '2030': 2030
        };

        // Find month
        let month = null;
        let monthName = null;
        for (const [name, num] of Object.entries(months)) {
            if (lowerText.includes(name)) {
                month = num;
                monthName = name.charAt(0).toUpperCase() + name.slice(1);
                if (monthName.length <= 4) {
                    // Convert short form to full name
                    const fullNames = { 'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
                        'Jun': 'June', 'Jul': 'July', 'Aug': 'August', 'Sep': 'September', 'Sept': 'September',
                        'Oct': 'October', 'Nov': 'November', 'Dec': 'December' };
                    monthName = fullNames[monthName] || monthName;
                }
                break;
            }
        }

        if (!month) return null;

        // Extract year first (so we can exclude it from day parsing)
        let year = null;
        let textWithoutYear = lowerText;

        // Check for spoken years (longer patterns first)
        const sortedYearWords = Object.keys(yearWords).sort((a, b) => b.length - a.length);
        for (const yearWord of sortedYearWords) {
            if (lowerText.includes(yearWord)) {
                year = yearWords[yearWord];
                // Remove the year from text so it doesn't interfere with day parsing
                textWithoutYear = lowerText.replace(yearWord, ' ').replace(/\s+/g, ' ');
                break;
            }
        }

        // Find day number (1-31) - try ordinal words first, then digits
        // Use textWithoutYear to avoid matching year parts as days
        let day = null;

        // Check for ordinal words (longer phrases first to match "twenty first" before "first")
        const sortedOrdinals = Object.keys(ordinalWords).sort((a, b) => b.length - a.length);
        for (const ordinal of sortedOrdinals) {
            if (textWithoutYear.includes(ordinal)) {
                day = String(ordinalWords[ordinal]).padStart(2, '0');
                break;
            }
        }

        // Fallback to digit pattern if no ordinal word found
        if (!day) {
            const dayMatch = textWithoutYear.match(/(\d{1,2})(st|nd|rd|th)?/);
            if (!dayMatch) return null;
            day = dayMatch[1].padStart(2, '0');
        }

        // Find time - look for patterns like "5pm", "5:00pm", "5 pm", "at 5"
        let time = null;
        let ampm = null;

        // First try to match time with explicit am/pm (most reliable)
        // Look for patterns like "5pm", "5:00 pm", "5 p.m."
        let timeMatch = lowerText.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i);

        // If no explicit am/pm, look for "at X" or "at X o'clock" pattern (time-specific context)
        if (!timeMatch) {
            timeMatch = lowerText.match(/at\s+(\d{1,2})(?::(\d{2}))?(?:\s*o'?clock)?/i);
        }

        if (timeMatch) {
            let hour = timeMatch[1];
            const hourNum = parseInt(hour);

            // Validate hour is reasonable (1-12)
            if (hourNum < 1 || hourNum > 12) {
                // Invalid hour, try to find a better match
                const betterMatch = lowerText.match(/at\s+([1-9]|1[0-2])(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i);
                if (betterMatch) {
                    hour = betterMatch[1];
                    timeMatch = betterMatch;
                }
            }

            const minutes = timeMatch[2] || '00';
            const meridiem = timeMatch[3];

            if (meridiem) {
                ampm = meridiem.replace(/\./g, '').toLowerCase().startsWith('a') ? 'am' : 'pm';
            } else {
                // Default to PM for typical business hours (1-7)
                const hourNumFinal = parseInt(hour);
                ampm = (hourNumFinal >= 1 && hourNumFinal <= 7) ? 'pm' : 'am';
            }

            time = `${hour}:${minutes}`;
        }

        if (!time) {
            // If no time found, ask for clarification
            return null;
        }

        // If no year found, determine from current date
        if (!year) {
            const now = new Date();
            year = now.getFullYear();
            const testDate = new Date(year, parseInt(month) - 1, parseInt(day));
            if (testDate < now) {
                year = year + 1;
            }
        }

        const dateStr = `${month}/${day}/${year}`;
        const displayStr = `${monthName} ${parseInt(day)}, ${year} at ${time} ${ampm.toUpperCase()}`;

        return {
            value: `${dateStr} ${time} ${ampm}`,
            display: displayStr,
            date: dateStr,
            time: time,
            ampm: ampm
        };
    }

    // Parse date only from natural speech like "April 30" or "April 30th" or "April thirtieth"
    parseDateFromSpeech(text) {
        const lowerText = text.toLowerCase();

        // Month names
        const months = {
            'january': '01', 'february': '02', 'march': '03', 'april': '04',
            'may': '05', 'june': '06', 'july': '07', 'august': '08',
            'september': '09', 'october': '10', 'november': '11', 'december': '12',
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
            'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'sept': '09',
            'oct': '10', 'nov': '11', 'dec': '12'
        };

        // Ordinal words to numbers mapping
        const ordinalWords = {
            'first': 1, '1st': 1,
            'second': 2, '2nd': 2,
            'third': 3, '3rd': 3,
            'fourth': 4, '4th': 4,
            'fifth': 5, '5th': 5,
            'sixth': 6, '6th': 6,
            'seventh': 7, '7th': 7,
            'eighth': 8, '8th': 8,
            'ninth': 9, '9th': 9,
            'tenth': 10, '10th': 10,
            'eleventh': 11, '11th': 11,
            'twelfth': 12, '12th': 12,
            'thirteenth': 13, '13th': 13,
            'fourteenth': 14, '14th': 14,
            'fifteenth': 15, '15th': 15,
            'sixteenth': 16, '16th': 16,
            'seventeenth': 17, '17th': 17,
            'eighteenth': 18, '18th': 18,
            'nineteenth': 19, '19th': 19,
            'twentieth': 20, '20th': 20,
            'twenty first': 21, 'twenty-first': 21, '21st': 21,
            'twenty second': 22, 'twenty-second': 22, '22nd': 22,
            'twenty third': 23, 'twenty-third': 23, '23rd': 23,
            'twenty fourth': 24, 'twenty-fourth': 24, '24th': 24,
            'twenty fifth': 25, 'twenty-fifth': 25, '25th': 25,
            'twenty sixth': 26, 'twenty-sixth': 26, '26th': 26,
            'twenty seventh': 27, 'twenty-seventh': 27, '27th': 27,
            'twenty eighth': 28, 'twenty-eighth': 28, '28th': 28,
            'twenty ninth': 29, 'twenty-ninth': 29, '29th': 29,
            'thirtieth': 30, '30th': 30,
            'thirty first': 31, 'thirty-first': 31, '31st': 31
        };

        // Year words mapping for spoken years like "twenty twenty six"
        const yearWords = {
            'twenty twenty': 2020,
            'twenty twenty one': 2021,
            'twenty twenty two': 2022,
            'twenty twenty three': 2023,
            'twenty twenty four': 2024,
            'twenty twenty five': 2025,
            'twenty twenty six': 2026,
            'twenty twenty seven': 2027,
            'twenty twenty eight': 2028,
            'twenty twenty nine': 2029,
            'twenty thirty': 2030,
            '2024': 2024,
            '2025': 2025,
            '2026': 2026,
            '2027': 2027,
            '2028': 2028,
            '2029': 2029,
            '2030': 2030
        };

        // Find month and its position
        let month = null;
        let monthName = null;
        let monthEndPos = 0;
        for (const [name, num] of Object.entries(months)) {
            const idx = lowerText.indexOf(name);
            if (idx !== -1) {
                month = num;
                monthName = name.charAt(0).toUpperCase() + name.slice(1);
                monthEndPos = idx + name.length;
                if (monthName.length <= 4) {
                    const fullNames = { 'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
                        'Jun': 'June', 'Jul': 'July', 'Aug': 'August', 'Sep': 'September', 'Sept': 'September',
                        'Oct': 'October', 'Nov': 'November', 'Dec': 'December' };
                    monthName = fullNames[monthName] || monthName;
                }
                break;
            }
        }

        if (!month) return null;

        // Extract year first (so we can exclude it from day parsing)
        // Look for year patterns after the month
        let year = null;
        let textWithoutYear = lowerText;

        // Check for spoken years (longer patterns first)
        const sortedYearWords = Object.keys(yearWords).sort((a, b) => b.length - a.length);
        for (const yearWord of sortedYearWords) {
            if (lowerText.includes(yearWord)) {
                year = yearWords[yearWord];
                // Remove the year from text so it doesn't interfere with day parsing
                textWithoutYear = lowerText.replace(yearWord, ' ').replace(/\s+/g, ' ');
                break;
            }
        }

        // Find day number (1-31) - try ordinal words first, then digits
        // Use textWithoutYear to avoid matching year parts as days
        let day = null;

        // Check for ordinal words (longer phrases first to match "twenty first" before "first")
        const sortedOrdinals = Object.keys(ordinalWords).sort((a, b) => b.length - a.length);
        for (const ordinal of sortedOrdinals) {
            if (textWithoutYear.includes(ordinal)) {
                day = String(ordinalWords[ordinal]).padStart(2, '0');
                break;
            }
        }

        // Fallback to digit pattern if no ordinal word found
        if (!day) {
            const dayMatch = textWithoutYear.match(/(\d{1,2})(st|nd|rd|th)?/);
            if (!dayMatch) return null;
            day = dayMatch[1].padStart(2, '0');
        }

        // If no year found, determine from current date
        if (!year) {
            const now = new Date();
            year = now.getFullYear();
            const testDate = new Date(year, parseInt(month) - 1, parseInt(day));
            if (testDate < now) {
                year = year + 1;
            }
        }

        const dateStr = `${month}/${day}/${year}`;
        const displayStr = `${monthName} ${parseInt(day)}, ${year}`;

        return {
            value: dateStr,
            display: displayStr
        };
    }

    // Convert spoken number words to digits
    // "seven two seven six two" -> "72762"
    // "fifty eight zero five" -> "5805"
    // "one two three" -> "123"
    convertSpokenNumbersToDigits(text) {
        // Single digit words
        const singleDigits = {
            'zero': '0', 'oh': '0', 'o': '0',
            'one': '1',
            'two': '2', 'to': '2', 'too': '2',
            'three': '3',
            'four': '4', 'for': '4',
            'five': '5',
            'six': '6',
            'seven': '7',
            'eight': '8',
            'nine': '9'
        };

        // Compound number words (tens)
        const tens = {
            'ten': '10',
            'eleven': '11',
            'twelve': '12',
            'thirteen': '13',
            'fourteen': '14',
            'fifteen': '15',
            'sixteen': '16',
            'seventeen': '17',
            'eighteen': '18',
            'nineteen': '19',
            'twenty': '20',
            'thirty': '30',
            'forty': '40',
            'fifty': '50',
            'sixty': '60',
            'seventy': '70',
            'eighty': '80',
            'ninety': '90'
        };

        // First pass: convert compound numbers like "fifty eight" -> "58"
        // Match patterns like "fifty eight", "twenty one", etc.
        let processed = text;

        // Handle "X-ty Y" patterns (twenty one, fifty eight, etc.)
        const compoundPattern = /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(one|two|three|four|five|six|seven|eight|nine)\b/gi;
        processed = processed.replace(compoundPattern, (match, tensWord, onesWord) => {
            const tensVal = parseInt(tens[tensWord.toLowerCase()]);
            const onesVal = parseInt(singleDigits[onesWord.toLowerCase()] || '0');
            return String(tensVal + onesVal);
        });

        // Handle standalone tens (twenty, thirty, etc.)
        for (const [word, val] of Object.entries(tens)) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            processed = processed.replace(regex, val);
        }

        // Second pass: convert sequences of single digit words
        // Look for sequences of number words (like zip codes)
        const words = processed.split(/\s+/);
        let result = [];
        let numberSequence = [];
        let sequenceStartIndex = -1;

        for (let i = 0; i < words.length; i++) {
            const word = words[i].toLowerCase().replace(/[.,]/g, '');

            // Check if it's a digit or single digit word
            if (singleDigits[word]) {
                if (sequenceStartIndex === -1) sequenceStartIndex = i;
                numberSequence.push(singleDigits[word]);
            } else if (/^\d+$/.test(word)) {
                // Already a number (from compound conversion)
                if (sequenceStartIndex === -1) sequenceStartIndex = i;
                numberSequence.push(word);
            } else {
                // End of number sequence
                if (numberSequence.length >= 2) {
                    // Convert sequence to combined digits
                    result.push(numberSequence.join(''));
                } else if (numberSequence.length === 1) {
                    // Single number, keep as is
                    result.push(numberSequence[0]);
                } else if (sequenceStartIndex !== -1) {
                    // Too short with words, keep original
                    for (let j = sequenceStartIndex; j < i; j++) {
                        result.push(words[j]);
                    }
                }
                result.push(words[i]);
                numberSequence = [];
                sequenceStartIndex = -1;
            }
        }

        // Handle trailing number sequence
        if (numberSequence.length >= 2) {
            result.push(numberSequence.join(''));
        } else if (numberSequence.length === 1) {
            result.push(numberSequence[0]);
        } else if (sequenceStartIndex !== -1) {
            for (let j = sequenceStartIndex; j < words.length; j++) {
                result.push(words[j]);
            }
        }

        return result.join(' ');
    }

    // Clean up text answers - remove trailing periods, clean formatting
    cleanTextAnswer(text) {
        if (!text) return text;

        // Remove trailing period (speech recognition often adds one)
        let cleaned = text.trim();
        if (cleaned.endsWith('.')) {
            cleaned = cleaned.slice(0, -1);
        }

        // Remove leading period if any
        if (cleaned.startsWith('.')) {
            cleaned = cleaned.slice(1);
        }

        // Convert spoken numbers to digits (for zip codes, addresses)
        cleaned = this.convertSpokenNumbersToDigits(cleaned);

        return cleaned.trim();
    }

    // NATO phonetic alphabet mapping
    getPhoneticAlphabet() {
        return {
            'alpha': 'A', 'alfa': 'A',
            'bravo': 'B',
            'charlie': 'C',
            'delta': 'D',
            'echo': 'E',
            'foxtrot': 'F',
            'golf': 'G',
            'hotel': 'H',
            'india': 'I',
            'juliet': 'J', 'juliett': 'J',
            'kilo': 'K',
            'lima': 'L',
            'mike': 'M',
            'november': 'N',
            'oscar': 'O',
            'papa': 'P',
            'quebec': 'Q',
            'romeo': 'R',
            'sierra': 'S',
            'tango': 'T',
            'uniform': 'U',
            'victor': 'V',
            'whiskey': 'W', 'whisky': 'W',
            'x-ray': 'X', 'xray': 'X',
            'yankee': 'Y',
            'zulu': 'Z'
        };
    }

    // Check if text appears to be spelled out (phonetically or letter-by-letter)
    detectSpelling(text) {
        const words = text.toLowerCase().split(/[\s,]+/).filter(w => w.length > 0);
        const phonetic = this.getPhoneticAlphabet();

        // Check for NATO phonetic alphabet
        const phoneticMatches = words.filter(w => phonetic[w]);
        if (phoneticMatches.length >= 2 && phoneticMatches.length === words.length) {
            return { type: 'phonetic', words };
        }

        // Check for letter-by-letter spelling (A B C D or A, B, C, D)
        const letterPattern = /^[a-z]$/;
        const letterMatches = words.filter(w => letterPattern.test(w));
        if (letterMatches.length >= 2 && letterMatches.length === words.length) {
            return { type: 'letters', words };
        }

        // Check for mixed or partial spelling (e.g., "B R I A N" or "B as in Bravo, R as in Romeo")
        // Look for "as in" pattern
        if (text.toLowerCase().includes(' as in ')) {
            return { type: 'as_in', text };
        }

        return null;
    }

    // Convert spelled text to the actual word
    convertSpelling(spellInfo) {
        const phonetic = this.getPhoneticAlphabet();

        if (spellInfo.type === 'phonetic') {
            // NATO phonetic: "Bravo Romeo India Alpha November" -> "BRIAN"
            return spellInfo.words.map(w => phonetic[w] || w.charAt(0).toUpperCase()).join('');
        }

        if (spellInfo.type === 'letters') {
            // Letter-by-letter: "b r i a n" -> "BRIAN"
            return spellInfo.words.map(w => w.toUpperCase()).join('');
        }

        if (spellInfo.type === 'as_in') {
            // "B as in Bravo, R as in Romeo" pattern
            const matches = spellInfo.text.matchAll(/([a-z])\s+as\s+in\s+\w+/gi);
            const letters = [];
            for (const match of matches) {
                letters.push(match[1].toUpperCase());
            }
            if (letters.length > 0) {
                return letters.join('');
            }
        }

        return null;
    }

    // Format a spelled name properly (capitalize first letter, lowercase rest)
    formatName(spelled) {
        if (!spelled) return spelled;
        return spelled.charAt(0).toUpperCase() + spelled.slice(1).toLowerCase();
    }

    // Check if current question is a name field that might need spelling
    isNameQuestion(questionId) {
        const nameQuestions = ['buyer_1_name', 'buyer_2_name', 'seller_1_name', 'seller_2_name'];
        return nameQuestions.includes(questionId);
    }

    // Smart detection: Check if user gave a detailed answer that implies "yes" for a yes/no question
    // e.g., "fridge, washer, dryer" for "Are there additional items to convey?"
    detectSmartAnswer(question, text, originalTranscript) {
        // Define questions that can have smart detection with item lists
        const smartQuestions = {
            'additional_items_convey': {
                yesValue: 'yes',
                followUpQuestion: 'additional_items_list',
                itemKeywords: ['fridge', 'refrigerator', 'washer', 'dryer', 'dishwasher', 'microwave',
                              'stove', 'oven', 'furniture', 'couch', 'table', 'chair', 'bed',
                              'tv', 'television', 'grill', 'mower', 'lawn', 'shed', 'swing',
                              'pool', 'hot tub', 'blinds', 'curtains', 'shelving', 'freezer']
            },
            'fixtures_not_convey': {
                yesValue: 'yes',
                followUpQuestion: 'fixtures_not_convey_list',
                itemKeywords: ['chandelier', 'light', 'fixture', 'mirror', 'shelving', 'curtain rod',
                              'blinds', 'tv mount', 'speaker', 'built-in', 'cabinet']
            }
        };

        const config = smartQuestions[question.id];
        if (!config) return null;

        // Check if the user mentioned any items
        const mentionedItems = config.itemKeywords.filter(item => text.includes(item));

        if (mentionedItems.length > 0) {
            // User mentioned specific items - this implies "yes"
            const yesOption = question.options.find(opt => opt.value === config.yesValue);
            if (yesOption) {
                // Clean up the transcript to remove "yes" prefix and leading punctuation
                let cleanedItems = originalTranscript
                    .replace(/^(yes|yeah|yep|yup|sure|ok|okay)\s*[.,!]?\s*/i, '') // Remove yes prefix
                    .replace(/^[.,!?:;\s]+/, '') // Remove leading punctuation/spaces
                    .trim();

                // If we ended up with nothing, use the original
                if (!cleanedItems) {
                    cleanedItems = originalTranscript;
                }

                return {
                    option: yesOption,
                    extractedItems: cleanedItems, // Store the cleaned items list
                    followUpQuestion: config.followUpQuestion
                };
            }
        }

        return null;
    }

    // Check if the transcript contains a voice command
    checkForCommand(text) {
        const commands = {
            'go_back': [
                'go back', 'previous', 'back', 'last question', 'previous question',
                'fix that', 'fix my answer', 'change that', 'change my answer',
                'wrong', 'that was wrong', 'not right', 'incorrect', 'redo',
                'let me fix', 'i need to fix', 'wait', 'hold on'
            ],
            'repeat': [
                'repeat', 'say again', 'what was the question', 'repeat the question',
                'say that again', 'one more time', 'again please', "didn't hear",
                "didn't catch", 'pardon', 'sorry'
            ],
            'options': [
                'what are my options', 'what are the options', 'read the options',
                'list the options', 'tell me the options', 'what can i choose',
                'what choices do i have', 'what are the choices'
            ],
            'skip': [
                'skip', 'skip this', 'next', 'move on', 'pass', 'skip question'
            ],
            'start_over': [
                'start over', 'start again', 'restart', 'begin again', 'from the beginning'
            ],
            'help': [
                'help', 'what can i say', 'commands'
            ],
            'spell_mode': [
                'let me spell', 'spell it', 'i want to spell', 'spell the name',
                'spell that', 'can i spell'
            ]
        };

        for (const [command, phrases] of Object.entries(commands)) {
            for (const phrase of phrases) {
                if (text.includes(phrase)) {
                    return command;
                }
            }
        }
        return null;
    }

    // Handle voice commands
    async handleCommand(command, originalText) {
        // Stop any current recording
        if (this.isRecording) {
            this.stopRecording();
        }

        switch (command) {
            case 'go_back':
                if (this.currentIndex > 0) {
                    await this.speak("Okay, going back.");
                    this.previousQuestion(true);  // true = clear answer
                } else {
                    await this.speak("This is the first question.");
                    this.showQuestion();
                }
                break;

            case 'repeat':
                const question = this.questions[this.currentIndex];
                await this.speak("Sure. " + question.question);
                // Restart recording after repeating
                if (this.conversationMode && !this.isRecording) {
                    this.startRecording();
                }
                break;

            case 'skip':
                await this.speak("Skipping this question.");
                this.nextQuestion();
                break;

            case 'start_over':
                await this.speak("Okay, starting over.");
                this.currentIndex = 0;
                this.answers = {};
                this.showQuestion();
                break;

            case 'options':
                const currentQuestion = this.questions[this.currentIndex];
                if (currentQuestion.type === 'choice' && currentQuestion.options) {
                    const optionLabels = currentQuestion.options.map(opt => opt.label).join(', or ');
                    await this.speak("Your options are: " + optionLabels);
                } else {
                    await this.speak("This is an open question. You can say any answer.");
                }
                // Clear transcript so options text doesn't get processed as answer
                this.currentTranscript = '';
                this.transcriptFinal.textContent = '';
                this.transcriptInterim.textContent = '';
                // Restart recording after reading options
                if (this.conversationMode && !this.isRecording) {
                    this.startRecording();
                }
                break;

            case 'help':
                await this.speak("You can say: what are my options, go back, repeat the question, skip, or start over. For names, you can spell using the phonetic alphabet like Bravo Romeo India Alpha November.");
                // Restart recording after help
                if (this.conversationMode && !this.isRecording) {
                    this.startRecording();
                }
                break;

            case 'spell_mode':
                await this.speak("Go ahead and spell it out. You can use letters like A B C, or the phonetic alphabet like Alpha Bravo Charlie.");
                // Restart recording for spelling
                if (this.conversationMode && !this.isRecording) {
                    this.startRecording();
                }
                break;
        }
    }

    extractNumber(text) {
        // First, try to find a numeric value directly (like "450000" or "450,000")
        const numericMatch = text.replace(/[,\s]/g, '').match(/\d+/);
        if (numericMatch) {
            return parseInt(numericMatch[0]);
        }

        // Convert words to numbers
        const wordNumbers = {
            'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
            'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
            'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
            'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90
        };

        const multipliers = {
            'hundred': 100,
            'thousand': 1000,
            'million': 1000000,
            'billion': 1000000000
        };

        // Clean and tokenize
        const words = text.toLowerCase()
            .replace(/dollars?/g, '')
            .replace(/[.,]/g, '')
            .replace(/\band\b/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 0);

        let result = 0;
        let current = 0;

        for (const word of words) {
            if (wordNumbers[word] !== undefined) {
                current += wordNumbers[word];
            } else if (word === 'hundred') {
                current *= 100;
            } else if (word === 'thousand') {
                current *= 1000;
                result += current;
                current = 0;
            } else if (word === 'million') {
                current *= 1000000;
                result += current;
                current = 0;
            } else if (word === 'billion') {
                current *= 1000000000;
                result += current;
                current = 0;
            }
        }

        result += current;
        return result > 0 ? result : null;
    }

    previousQuestion(clearAnswer = false) {
        if (this.currentIndex > 0) {
            this.currentIndex--;

            // Skip questions with unmet showIf conditions going backwards
            while (this.currentIndex > 0) {
                const question = this.questions[this.currentIndex];
                if (question.showIf) {
                    const dependentAnswer = this.answers[question.showIf.question];
                    if (dependentAnswer?.value !== question.showIf.value) {
                        this.currentIndex--;
                        continue;
                    }
                }
                break;
            }

            // Clear the answer for the question we're going back to (so user can re-answer)
            if (clearAnswer) {
                const question = this.questions[this.currentIndex];
                delete this.answers[question.id];
            }

            this.showQuestion();
        }
    }

    nextQuestion() {
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++;
            this.showQuestion();
        } else {
            this.showReview();
        }
    }

    async showReview() {
        this.showScreen('review');
        this.conversationMode = false;  // Disable auto-advance for review

        // Show loading state while agent reviews
        this.answersList.innerHTML = '<p style="text-align:center;color:#64748b;">Reviewing your answers...</p>';
        await this.speak("Let me review your answers for any issues.");

        // Call agent review BEFORE showing answers to user
        try {
            const reviewResponse = await fetch('/api/review-contract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: this.answers })
            });
            const reviewResult = await reviewResponse.json();
            console.log('Pre-review result:', reviewResult);
            this.reviewIssues = reviewResult.issues || [];
        } catch (error) {
            console.error('Pre-review failed:', error);
            this.reviewIssues = [];
        }

        // Populate answers list
        this.answersList.innerHTML = '';

        // Show issues at the top if any were found
        if (this.reviewIssues.length > 0) {
            const issuesBox = document.createElement('div');
            issuesBox.className = 'review-issues-inline';
            issuesBox.innerHTML = `
                <div style="background:#fef2f2;border:2px solid #ef4444;border-radius:12px;padding:16px;margin-bottom:20px;">
                    <h3 style="color:#ef4444;margin:0 0 12px 0;font-size:16px;">Found ${this.reviewIssues.length} Issue${this.reviewIssues.length > 1 ? 's' : ''} to Review</h3>
                    ${this.reviewIssues.map(issue => `
                        <div style="background:white;border-radius:8px;padding:12px;margin-bottom:8px;border-left:4px solid ${issue.severity === 'error' ? '#ef4444' : '#f59e0b'};">
                            <strong>${this.formatFieldName(issue.field)}</strong>
                            <p style="margin:4px 0 0 0;font-size:14px;color:#64748b;">${issue.description}</p>
                            ${issue.suggestion ? `<p style="margin:4px 0 0 0;font-size:13px;color:#22c55e;font-style:italic;">Suggestion: ${issue.suggestion}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            this.answersList.appendChild(issuesBox);

            await this.speak(`I found ${this.reviewIssues.length} issue${this.reviewIssues.length > 1 ? 's' : ''} you should review. Take a look at the highlighted items.`);
        } else {
            await this.speak("Everything looks good! Take a look at your answers. Tap Fill Contract when you're ready.");
        }

        this.questions.forEach(question => {
            const answer = this.answers[question.id];
            if (answer) {
                // Check if this field has an issue
                const hasIssue = this.reviewIssues.find(i => i.field === question.id);
                const item = document.createElement('div');
                item.className = 'answer-item' + (hasIssue ? ' has-issue' : '');
                item.innerHTML = `
                    <p class="question">${question.question}</p>
                    <p class="answer" style="${hasIssue ? 'color:#ef4444;font-weight:600;' : ''}">${answer.display}${hasIssue ? ' ⚠️' : ''}</p>
                `;
                this.answersList.appendChild(item);
            }
        });
    }

    editAnswers() {
        this.currentIndex = 0;
        this.showScreen('question');
        this.showQuestion();
    }

    async submitAnswers() {
        console.log('submitAnswers called');
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Launching...';

        // Review was already done in showReview() - just proceed to fill
        await this.speak("Filling your contract now.");
        await this.proceedToFill();
    }

    async showReviewIssues(issues, summary) {
        // Create modal overlay for review results
        const existingModal = document.getElementById('review-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'review-modal';
        modal.className = 'review-modal';
        modal.innerHTML = `
            <div class="review-content">
                <h2>Review Found ${issues.length} Issue${issues.length > 1 ? 's' : ''}</h2>
                <p class="review-summary">${summary}</p>
                <div class="issues-list">
                    ${issues.map(issue => `
                        <div class="issue-item ${issue.severity}">
                            <div class="issue-header">
                                <span class="issue-severity">${issue.severity === 'error' ? '!' : '?'}</span>
                                <span class="issue-field">${this.formatFieldName(issue.field)}</span>
                            </div>
                            <p class="issue-description">${issue.description}</p>
                            ${issue.suggestion ? `<p class="issue-suggestion">Suggestion: ${issue.suggestion}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="review-actions">
                    <button id="fix-issues-btn" class="btn secondary">Go Back & Fix</button>
                    <button id="proceed-anyway-btn" class="btn primary">Proceed Anyway</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Speak the summary
        const errorCount = issues.filter(i => i.severity === 'error').length;
        const warningCount = issues.filter(i => i.severity === 'warning').length;

        let spokenSummary = `I found ${issues.length} potential issue${issues.length > 1 ? 's' : ''}. `;
        if (errorCount > 0) {
            spokenSummary += `${errorCount} ${errorCount > 1 ? 'are' : 'is'} marked as errors. `;
        }
        spokenSummary += "Would you like to go back and fix them, or proceed anyway?";

        await this.speak(spokenSummary);

        // Bind button events
        document.getElementById('fix-issues-btn').addEventListener('click', () => {
            modal.remove();
            this.editAnswers();
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Fill Contract';
        });

        document.getElementById('proceed-anyway-btn').addEventListener('click', async () => {
            modal.remove();
            await this.speak("Okay, proceeding to fill the contract.");
            await this.proceedToFill();
        });

        this.submitBtn.disabled = false;
        this.submitBtn.textContent = 'Fill Contract';
    }

    formatFieldName(fieldId) {
        // Convert field IDs like "buyer_1_name" to "Buyer 1 Name"
        return fieldId
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    async proceedToFill() {
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Launching...';

        try {
            console.log('Sending answers to /api/fill-contract...');
            const response = await fetch('/api/fill-contract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ answers: this.answers })
            });

            console.log('Response received:', response.status);
            const result = await response.json();
            console.log('Result:', result);

            if (result.success) {
                this.showScreen('complete');
                this.speak("Opening browser to fill your contract.");
            } else {
                this.showToast('Failed to save answers', true);
            }
        } catch (error) {
            console.error('Failed to submit:', error);
            this.showToast('Failed to save answers', true);
        } finally {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Fill Contract';
        }
    }

    restart() {
        this.currentIndex = 0;
        this.answers = {};
        this.showScreen('start');
    }

    showToast(message, isError = false) {
        this.toastMessage.textContent = message;
        this.toast.classList.remove('hidden');
        this.toast.classList.toggle('error', isError);

        setTimeout(() => {
            this.toast.classList.add('hidden');
        }, 3000);
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker registered');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CFillApp();
});
