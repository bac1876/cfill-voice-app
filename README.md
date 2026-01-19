# CFill Voice App

Arkansas Real Estate Contract Auto-Filler - A voice-powered Progressive Web App (PWA) that helps fill out real estate contracts using natural speech.

## Features

- **Voice Input**: Speak your answers naturally using Deepgram Flux for conversational speech recognition
- **Smart Detection**: Automatically detects end of turn and processes responses
- **Natural Voice Output**: Uses ElevenLabs for natural text-to-speech prompts
- **AI Review Agent**: Claude Sonnet reviews answers before form filling to catch errors
- **PWA**: Works offline and can be installed on mobile devices
- **Playwright Integration**: Automatically fills PDF forms in the browser

## Tech Stack

- **Frontend**: Vanilla JavaScript PWA
- **Backend**: Node.js/Express
- **Speech Recognition**: Deepgram Flux API
- **Text-to-Speech**: ElevenLabs API
- **AI Review**: Anthropic Claude API
- **Form Filling**: Playwright

## Setup

1. Clone the repository:
```bash
git clone https://github.com/bac1876/cfill-voice-app.git
cd cfill-voice-app
```

2. Install dependencies:
```bash
cd voice-app
npm install
```

3. Create a `.env` file in the `voice-app` directory:
```
DEEPGRAM_API_KEY=your_deepgram_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

4. Start the server:
```bash
npm start
```

5. Open http://localhost:3000 in your browser

## API Keys

- **Deepgram**: Get a free API key at https://console.deepgram.com/signup
- **ElevenLabs**: Get an API key at https://elevenlabs.io
- **Anthropic**: Get an API key at https://console.anthropic.com

## Usage

1. Click "Start" to begin the questionnaire
2. Answer questions by speaking naturally
3. The app will automatically detect when you're done speaking
4. Review your answers at the end
5. Click "Fill Contract" to auto-fill the PDF form

## Project Structure

```
cfill-voice-app/
├── voice-app/
│   ├── public/           # Frontend PWA files
│   │   ├── index.html
│   │   ├── app.js
│   │   ├── styles.css
│   │   ├── manifest.json
│   │   └── service-worker.js
│   ├── server/           # Backend server
│   │   ├── index.js
│   │   └── review-agent.js
│   ├── questions.json    # Contract questions
│   └── package.json
└── fill-from-voice.js    # Playwright form filler
```

## License

MIT
