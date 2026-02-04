const fs = require("fs");
let content = fs.readFileSync("public/app.js", "utf8");

// Find and replace the loadQuestions function using regex
const regex = /async loadQuestions\(\)\s*\{[\s\S]*?^    \}/m;

const newFunc = `async loadQuestions() {
        const startBtn = document.getElementById("start-btn");
        try {
            if (startBtn) { startBtn.disabled = true; startBtn.textContent = "Loading..."; }
            
            const response = await fetch('/api/questions');
            const data = await response.json();
            this.questions = data.questions;

            // Update question count on start screen
            const questionCountEl = document.getElementById('question-count');
            if (questionCountEl) {
                questionCountEl.textContent = \`\${this.questions.length} questions\`;
            }
            
            if (startBtn) { startBtn.disabled = false; startBtn.textContent = "Start Contract Fill"; }
            console.log("Questions loaded:", this.questions.length);
        } catch (error) {
            console.error('Failed to load questions:', error);
            this.showToast('Failed to load questions', true);
            if (startBtn) { startBtn.disabled = false; startBtn.textContent = "Retry"; }
        }
    }`;

if (regex.test(content)) {
    content = content.replace(regex, newFunc);
    fs.writeFileSync("public/app.js", content);
    console.log("SUCCESS: Replaced loadQuestions function");
} else {
    console.log("FAILED: Could not match function");
}
