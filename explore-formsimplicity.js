const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
}

// Findings log
const findings = {
    timestamp: new Date().toISOString(),
    steps: [],
    selectors: {},
    navigation: {}
};

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
    findings.steps.push({ time: new Date().toISOString(), message });
}

async function explore() {
    log('Starting Form Simplicity exploration...');

    const browser = await chromium.launch({
        headless: false,  // Show browser so we can see what's happening
        slowMo: 500       // Slow down actions so we can follow along
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();

    try {
        // Step 1: Navigate to login page
        log('Step 1: Navigating to login page...');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
        await page.screenshot({ path: path.join(screenshotsDir, '01-login-page.png'), fullPage: true });
        log('Screenshot saved: 01-login-page.png');

        // Capture login page structure
        const loginPageUrl = page.url();
        log(`Login page URL: ${loginPageUrl}`);
        findings.navigation.loginUrl = loginPageUrl;

        // Find login form elements
        log('Step 2: Identifying login form elements...');

        // Try common selectors for username field
        const usernameSelectors = [
            'input[name="username"]',
            'input[name="user"]',
            'input[name="email"]',
            'input[name="login"]',
            'input[type="text"]',
            'input[id*="user"]',
            'input[id*="login"]',
            'input[id*="email"]',
            '#username',
            '#user',
            '#email'
        ];

        let usernameField = null;
        for (const selector of usernameSelectors) {
            const element = await page.$(selector);
            if (element) {
                const isVisible = await element.isVisible();
                if (isVisible) {
                    usernameField = selector;
                    log(`Found username field: ${selector}`);
                    findings.selectors.username = selector;
                    break;
                }
            }
        }

        // Try common selectors for password field
        const passwordSelectors = [
            'input[name="password"]',
            'input[name="pass"]',
            'input[type="password"]',
            '#password',
            '#pass'
        ];

        let passwordField = null;
        for (const selector of passwordSelectors) {
            const element = await page.$(selector);
            if (element) {
                const isVisible = await element.isVisible();
                if (isVisible) {
                    passwordField = selector;
                    log(`Found password field: ${selector}`);
                    findings.selectors.password = selector;
                    break;
                }
            }
        }

        // Try common selectors for submit button
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Login")',
            'button:has-text("Sign In")',
            'button:has-text("Log In")',
            '#login-button',
            '.login-button',
            'button.btn-primary'
        ];

        let submitButton = null;
        for (const selector of submitSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    const isVisible = await element.isVisible();
                    if (isVisible) {
                        submitButton = selector;
                        log(`Found submit button: ${selector}`);
                        findings.selectors.submit = selector;
                        break;
                    }
                }
            } catch (e) {
                // Some selectors may not work, continue
            }
        }

        // Step 3: Attempt login
        log('Step 3: Attempting login...');

        if (usernameField && passwordField) {
            await page.fill(usernameField, USERNAME);
            await page.fill(passwordField, PASSWORD);
            await page.screenshot({ path: path.join(screenshotsDir, '02-credentials-entered.png'), fullPage: true });
            log('Screenshot saved: 02-credentials-entered.png');

            // Click submit or press Enter
            if (submitButton) {
                await page.click(submitButton);
            } else {
                await page.press(passwordField, 'Enter');
            }

            // Wait for navigation
            log('Waiting for login to complete...');
            await page.waitForLoadState('networkidle', { timeout: 30000 });
            await page.waitForTimeout(3000); // Extra wait for any redirects

            await page.screenshot({ path: path.join(screenshotsDir, '03-after-login.png'), fullPage: true });
            log('Screenshot saved: 03-after-login.png');

            const dashboardUrl = page.url();
            log(`After login URL: ${dashboardUrl}`);
            findings.navigation.dashboardUrl = dashboardUrl;

            // Check if login was successful
            const pageContent = await page.content();
            if (pageContent.toLowerCase().includes('invalid') ||
                pageContent.toLowerCase().includes('error') ||
                pageContent.toLowerCase().includes('incorrect')) {
                log('WARNING: Login may have failed - check screenshots');
                findings.loginSuccess = false;
            } else {
                log('Login appears successful');
                findings.loginSuccess = true;
            }

            // Step 4: Explore dashboard/main page
            log('Step 4: Exploring main page after login...');

            // Look for navigation elements
            const navElements = await page.$$('nav a, .nav a, .menu a, .sidebar a, [role="navigation"] a');
            log(`Found ${navElements.length} navigation links`);

            // Look for "New" or "Create" buttons
            const createButtons = [
                'button:has-text("New")',
                'button:has-text("Create")',
                'a:has-text("New Form")',
                'a:has-text("Create Form")',
                'a:has-text("New Transaction")',
                '.new-form',
                '#new-form'
            ];

            for (const selector of createButtons) {
                try {
                    const element = await page.$(selector);
                    if (element && await element.isVisible()) {
                        log(`Found create button: ${selector}`);
                        findings.selectors.createButton = selector;
                        break;
                    }
                } catch (e) {
                    // Continue
                }
            }

            // Look for form/contract links
            const formLinks = await page.$$('a');
            for (const link of formLinks) {
                const text = await link.textContent();
                if (text && (
                    text.toLowerCase().includes('contract') ||
                    text.toLowerCase().includes('form') ||
                    text.toLowerCase().includes('residential')
                )) {
                    const href = await link.getAttribute('href');
                    log(`Found relevant link: "${text.trim()}" -> ${href}`);
                }
            }

            // Get page title and main headings
            const title = await page.title();
            log(`Page title: ${title}`);
            findings.navigation.pageTitle = title;

            // Take a screenshot of any visible menus
            await page.screenshot({ path: path.join(screenshotsDir, '04-dashboard-overview.png'), fullPage: true });
            log('Screenshot saved: 04-dashboard-overview.png');

            // Step 5: Try to find the forms/contracts section
            log('Step 5: Looking for forms/contracts section...');

            // Try clicking on common menu items
            const menuItems = [
                'a:has-text("Forms")',
                'a:has-text("Contracts")',
                'a:has-text("Transactions")',
                'a:has-text("Documents")',
                'a:has-text("Library")',
                '[data-menu="forms"]',
                '#forms-menu'
            ];

            for (const selector of menuItems) {
                try {
                    const element = await page.$(selector);
                    if (element && await element.isVisible()) {
                        log(`Found menu item: ${selector}`);
                        findings.selectors.formsMenu = selector;

                        // Click it to see what happens
                        await element.click();
                        await page.waitForTimeout(2000);
                        await page.screenshot({ path: path.join(screenshotsDir, '05-after-menu-click.png'), fullPage: true });
                        log('Screenshot saved: 05-after-menu-click.png');
                        log(`URL after menu click: ${page.url()}`);
                        break;
                    }
                } catch (e) {
                    // Continue
                }
            }

            // Step 6: Look for Real Estate Contract form
            log('Step 6: Searching for Real Estate Contract...');

            // Check for search functionality
            const searchInputs = await page.$$('input[type="search"], input[placeholder*="search"], input[name*="search"], .search-input');
            if (searchInputs.length > 0) {
                log('Found search input - trying to search for contract');
                findings.selectors.searchInput = 'input[type="search"]';

                try {
                    await searchInputs[0].fill('Real Estate Contract');
                    await page.waitForTimeout(2000);
                    await page.screenshot({ path: path.join(screenshotsDir, '06-search-results.png'), fullPage: true });
                    log('Screenshot saved: 06-search-results.png');
                } catch (e) {
                    log(`Search failed: ${e.message}`);
                }
            }

            // Get all visible text for analysis
            const bodyText = await page.innerText('body');
            const relevantText = bodyText.split('\n')
                .filter(line => line.trim())
                .filter(line =>
                    line.toLowerCase().includes('contract') ||
                    line.toLowerCase().includes('form') ||
                    line.toLowerCase().includes('residential') ||
                    line.toLowerCase().includes('real estate')
                )
                .slice(0, 20); // First 20 relevant lines

            log('Relevant text found on page:');
            relevantText.forEach(line => log(`  - ${line.trim().substring(0, 100)}`));
            findings.relevantText = relevantText;

            // Final overview screenshot
            await page.screenshot({ path: path.join(screenshotsDir, '07-final-state.png'), fullPage: true });
            log('Screenshot saved: 07-final-state.png');

        } else {
            log('ERROR: Could not find login form elements');
            findings.error = 'Login form elements not found';
        }

    } catch (error) {
        log(`ERROR: ${error.message}`);
        findings.error = error.message;
        await page.screenshot({ path: path.join(screenshotsDir, 'error-screenshot.png'), fullPage: true });
    } finally {
        // Save findings to file
        fs.writeFileSync(
            path.join(__dirname, 'exploration-findings.json'),
            JSON.stringify(findings, null, 2)
        );
        log('Findings saved to exploration-findings.json');

        // Keep browser open for 10 seconds so user can see final state
        log('Browser will close in 10 seconds...');
        await page.waitForTimeout(10000);

        await browser.close();
        log('Exploration complete!');
    }
}

// Run exploration
explore().catch(console.error);
