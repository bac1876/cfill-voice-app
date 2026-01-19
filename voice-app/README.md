# CFill - Voice Contract Filler PWA

A Progressive Web App that uses voice recognition to fill out Arkansas Real Estate Contracts.

## Quick Start

### 1. Get a Deepgram API Key (Free)

1. Go to https://console.deepgram.com/signup
2. Create a free account (no credit card required)
3. Copy your API key

### 2. Configure the App

Create a `.env` file in this directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Deepgram API key:

```
DEEPGRAM_API_KEY=your_api_key_here
```

### 3. Start the Server

```bash
npm start
```

The server will start at http://localhost:3000

### 4. Use on Your Phone

1. Find your computer's IP address:
   - Windows: Run `ipconfig` in Command Prompt
   - Mac/Linux: Run `ifconfig` in Terminal
   - Look for IPv4 address (e.g., 192.168.1.100)

2. On your phone, open the browser and go to:
   ```
   http://YOUR_COMPUTER_IP:3000
   ```

3. Add to Home Screen (optional):
   - iOS: Tap Share > Add to Home Screen
   - Android: Tap Menu > Install App or Add to Home Screen

## How It Works

1. **Start Voice Fill** - Opens the questionnaire
2. **Answer Questions** - Tap the microphone and speak your answers
3. **Review** - Check all answers before submitting
4. **Fill Contract** - Run the fill script on your computer

### Filling the Contract

After completing the voice questionnaire, run on your computer:

```bash
cd C:\Users\Owner\Claude Code Projects\cfill2026
node fill-from-voice.js
```

This will:
1. Open the Form Simplicity website
2. Log in automatically
3. Fill in all the fields from your voice answers
4. Keep the browser open for you to review and submit

## Questions Asked

The app collects:
- Buyer name(s)
- Property address
- Purchase price
- Property type (single family, condo, etc.)
- Purchase method (financing, cash, assumption)
- Loan type (if financing)
- Earnest money amount
- Title insurance payer
- Survey preference
- Home warranty
- HOA status
- Possession timing

## Troubleshooting

### Microphone Not Working

- Make sure you're using HTTPS or localhost
- Grant microphone permission when prompted
- Try a different browser (Chrome works best)

### Voice Not Recognized

- Speak clearly and pause between answers
- For numbers, say "four hundred fifty thousand" or "450000"
- If the app doesn't understand, tap the option buttons instead

### Cannot Connect from Phone

- Make sure both devices are on the same WiFi network
- Check your firewall allows port 3000
- Try using your computer's IP address, not "localhost"

## Files Structure

```
voice-app/
├── public/
│   ├── index.html      # Main PWA page
│   ├── app.js          # Voice and UI logic
│   ├── styles.css      # Mobile-friendly styles
│   ├── manifest.json   # PWA configuration
│   ├── service-worker.js # Offline support
│   └── icons/          # App icons
├── server/
│   └── index.js        # Express server + Deepgram proxy
├── questions.json      # Contract questions
├── package.json
└── .env                # Your API key (create this)
```

## Cost

Deepgram offers a free tier with:
- $200 in free credits
- Pay-as-you-go after that (~$0.0043/minute)
- One contract (~3-5 minutes of voice) costs about $0.02
