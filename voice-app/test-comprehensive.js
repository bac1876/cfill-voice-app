const puppeteer = require('puppeteer');

// REALISTIC SPEECH with umms, pauses, filler words
const TESTS = {
  currency: [
    { input: 'um four hundred fifty thousand', expected: 450000 },
    { input: 'uh... 325000', expected: 325000 },
    { input: 'let me think... one million two hundred thousand', expected: 1200000 },
    { input: 'its um seventy five thousand dollars', expected: 75000 },
    { input: 'the price is uh 5000', expected: 5000 },
    { input: '450000', expected: 450000 },
    { input: 'three hundred twenty five thousand', expected: 325000 },
    { input: 'um about 1.2 million', expected: 1200000 },
    { input: 'I think... seventy five thousand', expected: 75000 },
    { input: 'five thousand dollars', expected: 5000 }
  ],
  yesNo: [
    { input: 'um yes there is a second buyer', expected: 'yes' },
    { input: 'yeah there are two of us', expected: 'yes' },
    { input: 'yes my wife is also buying', expected: 'yes' },
    { input: 'uh no its just me', expected: 'no' },
    { input: 'no just one buyer', expected: 'no' },
    { input: 'nope only me', expected: 'no' },
    { input: 'um... no theres not', expected: 'no' },
    { input: 'yes we have a couple', expected: 'yes' },
    { input: 'no single buyer', expected: 'no' },
    { input: 'yeah both of us husband and wife', expected: 'yes' }
  ],
  names: [
    'um John Smith',
    'uh Maria Garcia Rodriguez',
    'its Robert James Wilson',
    'the name is Sarah Connor',
    'um Michael Chang',
    'uh Jennifer Lynn Matthews',
    'David Lee Johnson',
    'my name is Elizabeth Ann Thompson',
    'um William Henry Gates',
    'its Patricia Marie Anderson'
  ],
  addresses: [
    'um 123 Main Street Bentonville Arkansas 72712',
    'uh its 4567 Oak Ridge Drive Fayetteville AR 72701',
    'the address is 890 Walnut Creek Lane Rogers Arkansas 72756',
    '12 Highway 71 South Springdale AR 72764',
    'uh 555 Northwest Avenue Bella Vista Arkansas 72714',
    'um 789 Elm Street Siloam Springs AR 72761',
    '321 Pine Hollow Road Lowell Arkansas 72745',
    'its um 654 Mountain View Drive Cave Springs AR 72718',
    'uh 987 Country Club Lane Centerton Arkansas 72719',
    '246 Lake Shore Drive Rogers AR 72712'
  ],
  propertyType: [
    { input: 'um its a single family home', expected: 'single_family' },
    { input: 'uh just a house', expected: 'single_family' },
    { input: 'its a condo', expected: 'condo' },
    { input: 'um condominium', expected: 'condo' },
    { input: 'townhome', expected: 'condo' },
    { input: 'uh its a duplex', expected: 'one_to_four' },
    { input: 'multi unit property', expected: 'one_to_four' },
    { input: 'um manufactured home', expected: 'manufactured' },
    { input: 'its a mobile home', expected: 'manufactured' },
    { input: 'uh townhouse', expected: 'condo' }
  ],
  loanType: [
    { input: 'um conventional loan', expected: 'conventional' },
    { input: 'uh VA loan', expected: 'va' },
    { input: 'its a veterans loan', expected: 'va' },
    { input: 'military financing', expected: 'va' },
    { input: 'FHA loan', expected: 'fha' },
    { input: 'um federal housing', expected: 'fha' },
    { input: 'uh USDA loan', expected: 'usda' },
    { input: 'rural development loan', expected: 'usda' },
    { input: 'um other financing', expected: 'other' },
    { input: 'just a regular loan', expected: 'conventional' }
  ],
  purchaseMethod: [
    { input: 'um were getting financing', expected: 'new_financing' },
    { input: 'uh getting a loan', expected: 'new_financing' },
    { input: 'mortgage', expected: 'new_financing' },
    { input: 'um cash purchase', expected: 'cash' },
    { input: 'all cash no loan', expected: 'cash' },
    { input: 'um were paying cash', expected: 'cash' },
    { input: 'loan assumption', expected: 'loan_assumption' },
    { input: 'uh were assuming the loan', expected: 'loan_assumption' },
    { input: 'taking over the existing mortgage', expected: 'loan_assumption' },
    { input: 'um well be financing it', expected: 'new_financing' }
  ]
};

let passed = 0, failed = 0;

async function run() {
  console.log('=== REALISTIC SPEECH TEST v3 ===');
  console.log('Testing with umms, pauses, filler words');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  console.log('Page loaded\n');

  // Currency tests - reset app state each time
  console.log('--- CURRENCY (10 tests) ---');
  for (const t of TESTS.currency) {
    const r = await page.evaluate(async (inp) => {
      const idx = window.app.questions.findIndex(q => q.id === 'purchase_price');
      window.app.currentIndex = idx;
      window.app.conversationMode = false;
      window.app.isSpeaking = false;
      delete window.app.answers['purchase_price'];
      await window.app.processTranscript(inp);
      await new Promise(r => setTimeout(r, 300));
      return window.app.answers['purchase_price'];
    }, t.input);
    if (r?.value === t.expected) { console.log('OK:', t.input.substring(0,35)); passed++; }
    else { console.log('FAIL:', t.input.substring(0,35), '->', r?.value || 'undefined'); failed++; }
  }

  // Yes/No tests
  console.log('\n--- YES/NO (10 tests) ---');
  for (const t of TESTS.yesNo) {
    const r = await page.evaluate(async (inp) => {
      const idx = window.app.questions.findIndex(q => q.id === 'has_buyer_2');
      window.app.currentIndex = idx;
      window.app.conversationMode = false;
      window.app.isSpeaking = false;
      delete window.app.answers['has_buyer_2'];
      await window.app.processTranscript(inp);
      await new Promise(r => setTimeout(r, 300));
      return window.app.answers['has_buyer_2'];
    }, t.input);
    const val = typeof r === 'object' ? r?.value : r;
    if (val === t.expected) { console.log('OK:', t.input.substring(0,35), '->', val); passed++; }
    else { console.log('FAIL:', t.input.substring(0,35), '->', val || 'undefined'); failed++; }
  }

  // Name tests
  console.log('\n--- NAMES (10 tests) ---');
  for (const n of TESTS.names) {
    const r = await page.evaluate(async (inp) => {
      const idx = window.app.questions.findIndex(q => q.id === 'buyer_1_name');
      window.app.currentIndex = idx;
      window.app.conversationMode = false;
      window.app.isSpeaking = false;
      delete window.app.answers['buyer_1_name'];
      await window.app.processTranscript(inp);
      await new Promise(r => setTimeout(r, 300));
      return window.app.answers['buyer_1_name'];
    }, n);
    if (r?.value?.length > 0) { console.log('OK:', n.substring(0,25), '->', r.value.substring(0,20)); passed++; }
    else { console.log('FAIL:', n.substring(0,25), '-> not stored'); failed++; }
  }

  // Address tests
  console.log('\n--- ADDRESSES (10 tests) ---');
  for (const a of TESTS.addresses) {
    const r = await page.evaluate(async (inp) => {
      const idx = window.app.questions.findIndex(q => q.id === 'property_address');
      window.app.currentIndex = idx;
      window.app.conversationMode = false;
      window.app.isSpeaking = false;
      window.app.partialAddress = null;
      delete window.app.answers['property_address'];
      await window.app.processTranscript(inp);
      await new Promise(r => setTimeout(r, 300));
      return window.app.answers['property_address'];
    }, a);
    if (r?.value?.length > 0) { console.log('OK:', a.substring(0,30)); passed++; }
    else { console.log('FAIL:', a.substring(0,30), '-> not stored'); failed++; }
  }

  // Property type tests
  console.log('\n--- PROPERTY TYPE (10 tests) ---');
  for (const t of TESTS.propertyType) {
    const r = await page.evaluate(async (inp) => {
      const idx = window.app.questions.findIndex(q => q.id === 'property_type');
      window.app.currentIndex = idx;
      window.app.conversationMode = false;
      window.app.isSpeaking = false;
      delete window.app.answers['property_type'];
      await window.app.processTranscript(inp);
      await new Promise(r => setTimeout(r, 300));
      return window.app.answers['property_type'];
    }, t.input);
    const val = typeof r === 'object' ? r?.value : r;
    if (val === t.expected) { console.log('OK:', t.input.substring(0,30), '->', val); passed++; }
    else { console.log('FAIL:', t.input.substring(0,30), '->', val || 'undefined'); failed++; }
  }

  // Loan type tests
  console.log('\n--- LOAN TYPE (10 tests) ---');
  for (const t of TESTS.loanType) {
    const r = await page.evaluate(async (inp) => {
      const idx = window.app.questions.findIndex(q => q.id === 'loan_type');
      window.app.currentIndex = idx;
      window.app.conversationMode = false;
      window.app.isSpeaking = false;
      delete window.app.answers['loan_type'];
      await window.app.processTranscript(inp);
      await new Promise(r => setTimeout(r, 300));
      return window.app.answers['loan_type'];
    }, t.input);
    const val = typeof r === 'object' ? r?.value : r;
    if (val === t.expected) { console.log('OK:', t.input.substring(0,30), '->', val); passed++; }
    else { console.log('FAIL:', t.input.substring(0,30), '->', val || 'undefined'); failed++; }
  }

  // Purchase method tests
  console.log('\n--- PURCHASE METHOD (10 tests) ---');
  for (const t of TESTS.purchaseMethod) {
    const r = await page.evaluate(async (inp) => {
      const idx = window.app.questions.findIndex(q => q.id === 'purchase_method');
      window.app.currentIndex = idx;
      window.app.conversationMode = false;
      window.app.isSpeaking = false;
      delete window.app.answers['purchase_method'];
      await window.app.processTranscript(inp);
      await new Promise(r => setTimeout(r, 300));
      return window.app.answers['purchase_method'];
    }, t.input);
    const val = typeof r === 'object' ? r?.value : r;
    if (val === t.expected) { console.log('OK:', t.input.substring(0,30), '->', val); passed++; }
    else { console.log('FAIL:', t.input.substring(0,30), '->', val || 'undefined'); failed++; }
  }

  await browser.close();
  console.log('\n=== SUMMARY ===');
  console.log('Passed:', passed);
  console.log('Failed:', failed);
  console.log('Total:', passed + failed);
  console.log('Pass rate:', ((passed/(passed+failed))*100).toFixed(1) + '%');
}
run().catch(e => console.error('Error:', e.message));
