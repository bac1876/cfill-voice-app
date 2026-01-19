const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function debugDatePicker() {
    log('=== DEBUG DATE PICKER ===');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 200
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();

    try {
        // Step 1: Login
        log('Step 1: Logging in...');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
        await page.fill('input[type="text"]', USERNAME);
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/users/started', { timeout: 30000 });
        log('Login successful!');
        await page.waitForTimeout(2000);

        // Step 2: Navigate to Forms Library
        log('Step 2: Navigating to Forms Library...');
        await page.goto('https://ara.formsimplicity.com/formslibrary/formslibrary', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Step 3: Open contract
        log('Step 3: Opening Real Estate Contract Residential...');
        await page.click('a[data-form-id="60014"]');
        await page.waitForTimeout(5000);

        // Step 4: Scroll INCREMENTALLY to page 7 area (form uses lazy loading - needs incremental scroll)
        log('Step 4: Scrolling incrementally to load all pages...');

        let calendarIcons = [];
        for (let scrollPos = 0; scrollPos <= 10000; scrollPos += 1500) {
            await page.evaluate((pos) => window.scrollTo(0, pos), scrollPos);
            await page.waitForTimeout(400);

            // Check for calendar icons at each scroll position
            calendarIcons = await page.$$('.datepicker-calendar-icon');
            if (calendarIcons.length > 0) {
                log(`Found ${calendarIcons.length} datepicker icons at scroll position ${scrollPos}`);
                break;
            }
        }

        log(`\nStep 5: Total date picker icons found: ${calendarIcons.length}`);

        if (calendarIcons.length > 0) {
            // Use the first one
            const icon = calendarIcons[0];

            // Scroll to it
            log('Step 6: Scrolling to first date picker icon...');
            await icon.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);

            // Get its position
            const box = await icon.boundingBox();
            log(`Icon position: (${Math.round(box.x)}, ${Math.round(box.y)}) size=${box.width}x${box.height}`);

            // Click it
            log('Step 7: Clicking date picker icon...');
            await icon.click();
            await page.waitForTimeout(1000);

            // Check if calendar opened - search ENTIRE document for calendar popup
            log('Step 8: Searching entire DOM for calendar popup...');

            const calendarSearch = await page.evaluate(() => {
                const results = {
                    tables: [],
                    popups: [],
                    dayElements: [],
                    allWithCalendar: []
                };

                // Search for any tables that might be the calendar
                const tables = document.querySelectorAll('table');
                for (const table of tables) {
                    // Check if visible and contains day numbers
                    const rect = table.getBoundingClientRect();
                    if (rect.width > 100 && rect.height > 100) {
                        const tds = table.querySelectorAll('td');
                        const texts = [];
                        for (const td of tds) {
                            const text = td.textContent.trim();
                            if (text && text.length <= 2 && /^\d+$/.test(text)) {
                                texts.push(text);
                            }
                        }
                        if (texts.length > 20) { // Likely a calendar with day numbers
                            results.tables.push({
                                className: table.className,
                                id: table.id,
                                parentClass: table.parentElement?.className,
                                parentId: table.parentElement?.id,
                                dayNumbers: texts.slice(0, 10).join(',') + '...',
                                rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
                            });
                        }
                    }
                }

                // Search for elements with "calendar", "picker", "popup" in class
                const allElements = document.querySelectorAll('*');
                for (const el of allElements) {
                    const cls = (el.className || '').toString().toLowerCase();
                    const id = (el.id || '').toLowerCase();
                    if ((cls.includes('calendar') || cls.includes('picker') || cls.includes('popup') || cls.includes('dropdown'))
                        && !cls.includes('icon')) {
                        const rect = el.getBoundingClientRect();
                        if (rect.width > 50 && rect.height > 50) {
                            results.allWithCalendar.push({
                                tagName: el.tagName,
                                className: el.className,
                                id: el.id,
                                rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) }
                            });
                        }
                    }
                }

                // Look for any visible popup/overlay that appeared recently (high z-index, position:absolute/fixed)
                for (const el of allElements) {
                    const style = window.getComputedStyle(el);
                    const zIndex = parseInt(style.zIndex) || 0;
                    const position = style.position;
                    const rect = el.getBoundingClientRect();

                    if (zIndex > 100 && (position === 'absolute' || position === 'fixed')
                        && rect.width > 150 && rect.height > 150 && rect.width < 500) {
                        // Check if it has day-like content
                        const text = el.textContent || '';
                        if (/\b(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31)\b/.test(text)) {
                            results.popups.push({
                                tagName: el.tagName,
                                className: el.className,
                                id: el.id,
                                zIndex: zIndex,
                                position: position,
                                rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
                                innerHTML: el.innerHTML.substring(0, 500)
                            });
                        }
                    }
                }

                return results;
            });

            log(`Found ${calendarSearch.tables.length} potential calendar tables`);
            for (const t of calendarSearch.tables) {
                log(`  Table: class="${t.className}" parent="${t.parentClass}" days=${t.dayNumbers}`);
            }

            log(`\nFound ${calendarSearch.allWithCalendar.length} elements with calendar/picker in class`);
            for (const el of calendarSearch.allWithCalendar) {
                log(`  ${el.tagName}: class="${el.className}" id="${el.id}" at (${el.rect.x},${el.rect.y}) ${el.rect.w}x${el.rect.h}`);
            }

            log(`\nFound ${calendarSearch.popups.length} high z-index popups with day numbers`);
            for (const p of calendarSearch.popups) {
                log(`  ${p.tagName}: class="${p.className}" z=${p.zIndex} at (${p.rect.x},${p.rect.y})`);
            }

            await page.screenshot({ path: path.join(__dirname, 'screenshots', 'calendar-open.png') });
            log('Screenshot saved');

            // Save HTML of the datetimepicker element specifically
            const datetimepickerHTML = await page.evaluate(() => {
                const picker = document.querySelector('.datetimepicker');
                return picker ? picker.outerHTML : null;
            });

            if (datetimepickerHTML) {
                fs.writeFileSync(path.join(__dirname, 'datetimepicker-full-html.txt'), datetimepickerHTML);
                log('Saved full datetimepicker HTML to datetimepicker-full-html.txt');
            }

            // Analyze datetimepicker structure in detail
            log('\nStep 9a: Analyzing datetimepicker structure...');
            const pickerAnalysis = await page.evaluate(() => {
                const picker = document.querySelector('.datetimepicker');
                if (!picker) return null;

                const result = {
                    className: picker.className,
                    childElements: [],
                    dayElements: [],
                    navElements: [],
                    monthYear: null
                };

                // Get all direct children
                for (const child of picker.children) {
                    result.childElements.push({
                        tag: child.tagName,
                        class: child.className,
                        text: child.textContent.substring(0, 50)
                    });
                }

                // Find day elements (likely have specific class for days)
                const allElements = picker.querySelectorAll('*');
                for (const el of allElements) {
                    const cls = (el.className || '').toString();
                    const text = el.textContent.trim();

                    // Look for month/year header
                    if (cls.includes('switch') || cls.includes('title') || cls.includes('month') || cls.includes('year')) {
                        if (text.length > 3 && text.length < 30) {
                            result.monthYear = { class: cls, text: text };
                        }
                    }

                    // Look for navigation arrows
                    if (cls.includes('prev') || cls.includes('next') || text === '<' || text === '>' || text === '‹' || text === '›') {
                        const rect = el.getBoundingClientRect();
                        result.navElements.push({
                            tag: el.tagName,
                            class: cls,
                            text: text,
                            rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) }
                        });
                    }

                    // Look for day numbers (single or double digit numbers)
                    if (/^\d{1,2}$/.test(text)) {
                        const rect = el.getBoundingClientRect();
                        // Only include if it's a reasonable size for a day cell
                        if (rect.width >= 20 && rect.height >= 20 && rect.width <= 60 && rect.height <= 60) {
                            result.dayElements.push({
                                tag: el.tagName,
                                class: cls,
                                text: text,
                                rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) }
                            });
                        }
                    }
                }

                return result;
            });

            if (pickerAnalysis) {
                log(`Datetimepicker class: "${pickerAnalysis.className}"`);
                log(`Month/Year: ${pickerAnalysis.monthYear ? pickerAnalysis.monthYear.text : 'not found'}`);
                log(`Navigation elements: ${pickerAnalysis.navElements.length}`);
                for (const nav of pickerAnalysis.navElements) {
                    log(`  ${nav.tag} class="${nav.class}" text="${nav.text}" at (${nav.rect.x},${nav.rect.y})`);
                }
                log(`Day elements: ${pickerAnalysis.dayElements.length}`);
                // Show first 10 days
                for (const day of pickerAnalysis.dayElements.slice(0, 10)) {
                    log(`  ${day.tag} class="${day.class}" text="${day.text}" at (${day.rect.x},${day.rect.y})`);
                }
            }

            // Analyze the calendar structure
            log('\nStep 9: Analyzing calendar structure...');

            const calendarStructure = await page.evaluate(() => {
                // Look for visible table with day numbers
                const tables = document.querySelectorAll('table');
                for (const table of tables) {
                    const rect = table.getBoundingClientRect();
                    if (rect.width > 100 && rect.height > 100) {
                        const tds = table.querySelectorAll('td');
                        let hasDays = false;
                        for (const td of tds) {
                            if (td.textContent.trim() === '15') {
                                hasDays = true;
                                break;
                            }
                        }

                        if (hasDays) {
                            const result = {
                                tagName: table.tagName,
                                className: table.className,
                                rows: []
                            };

                            const rows = table.querySelectorAll('tr');
                            for (let i = 0; i < rows.length && i < 10; i++) {
                                const row = rows[i];
                                const cells = row.querySelectorAll('td, th');
                                const cellData = [];
                                for (const cell of cells) {
                                    cellData.push({
                                        tag: cell.tagName,
                                        text: cell.textContent.trim().substring(0, 20),
                                        class: cell.className,
                                        colspan: cell.getAttribute('colspan') || '',
                                        clickable: window.getComputedStyle(cell).cursor === 'pointer'
                                    });
                                }
                                result.rows.push(cellData);
                            }
                            return result;
                        }
                    }
                }
                return null;
            });

                if (calendarStructure) {
                    log(`Calendar is a ${calendarStructure.tagName} with class="${calendarStructure.className}"`);
                    for (let i = 0; i < calendarStructure.rows.length; i++) {
                        const row = calendarStructure.rows[i];
                        const rowDesc = row.map(c => `${c.text}${c.clickable ? '*' : ''}`).join(' | ');
                        log(`  Row ${i}: ${rowDesc}`);
                    }
                }

                // Try to click on day 15
                log('\nStep 10: Trying to click on day 15...');

                // Search specifically within the datetimepicker for day 15
                const day15Info = await page.evaluate(() => {
                    const picker = document.querySelector('.datetimepicker');
                    if (!picker) return { found: false, error: 'no datetimepicker' };

                    // Look for all elements with text "15"
                    const allElements = picker.querySelectorAll('*');
                    for (const el of allElements) {
                        const text = el.textContent.trim();
                        if (text === '15') {
                            const rect = el.getBoundingClientRect();
                            // Must be a reasonable size for a day cell
                            if (rect.width >= 20 && rect.height >= 20 && rect.width <= 60 && rect.height <= 60) {
                                return {
                                    found: true,
                                    tagName: el.tagName,
                                    className: el.className,
                                    rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
                                    center: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
                                };
                            }
                        }
                    }
                    return { found: false, error: 'day 15 not found in datetimepicker' };
                });

                if (day15Info.found) {
                    log(`Found day 15 at (${Math.round(day15Info.center.x)}, ${Math.round(day15Info.center.y)})`);
                    log(`  Tag: ${day15Info.tagName}`);
                    log(`  Class: "${day15Info.className}"`);

                    // Click using Playwright's mouse at the center of the cell
                    await page.mouse.click(day15Info.center.x, day15Info.center.y);
                    log('Clicked on day 15 using page.mouse.click()');
                } else {
                    log(`Day 15 not found: ${day15Info.error}`);
                    // Try alternative: look for TDs or SPANs with "day" in class
                    const altClick = await page.evaluate(() => {
                        const picker = document.querySelector('.datetimepicker');
                        if (!picker) return { success: false, error: 'no picker' };

                        // Try clicking any element containing "15"
                        const elements = picker.querySelectorAll('td, span, div');
                        for (const el of elements) {
                            if (el.textContent.trim() === '15' && el.children.length === 0) {
                                // Click it via JS
                                el.click();
                                return {
                                    success: true,
                                    tag: el.tagName,
                                    class: el.className
                                };
                            }
                        }
                        return { success: false, error: 'no clickable 15 found' };
                    });
                    log(`Alternative click result: ${JSON.stringify(altClick)}`);
                }

                await page.waitForTimeout(500);
                await page.screenshot({ path: path.join(__dirname, 'screenshots', 'after-day-click.png') });
                log('Screenshot after click saved');

                // Check if calendar is still open or closed
                const stillOpen = await page.evaluate(() => {
                    // Check if any calendar table is still visible
                    const tables = document.querySelectorAll('table');
                    for (const table of tables) {
                        const rect = table.getBoundingClientRect();
                        if (rect.width > 100 && rect.height > 100) {
                            const tds = table.querySelectorAll('td');
                            for (const td of tds) {
                                if (td.textContent.trim() === '15') {
                                    return true;
                                }
                            }
                        }
                    }
                    return false;
                });
                log(`Calendar still open: ${stillOpen}`);

                if (stillOpen) {
                    // Try clicking outside to close
                    log('Clicking outside to close calendar...');
                    await page.mouse.click(100, 100);
                    await page.waitForTimeout(500);
                }

                // Check the date field value
                const dateFieldValue = await page.evaluate(() => {
                    // Look for input fields near the date picker
                    const inputs = document.querySelectorAll('input[type="text"]');
                    const dateInputs = [];
                    for (const input of inputs) {
                        const value = input.value;
                        // Check if it looks like a date
                        if (value && (value.includes('-') || value.includes('/'))) {
                            dateInputs.push({ name: input.name, value: value });
                        }
                    }
                    return dateInputs;
                });

                log('\nDate-like field values after click:');
                for (const field of dateFieldValue) {
                    log(`  ${field.name}: ${field.value}`);
                }

                await page.screenshot({ path: path.join(__dirname, 'screenshots', 'final-state.png') });

        } else {
            log('No date picker icons found. Taking full page screenshot...');
            await page.screenshot({ path: path.join(__dirname, 'screenshots', 'no-icons.png'), fullPage: true });
        }

        log('\n=== DEBUG COMPLETE ===');
        log('Browser will stay open for manual inspection.');
        log('Press Ctrl+C when done.');

        // Keep browser open
        await new Promise(() => {});

    } catch (error) {
        log(`ERROR: ${error.message}`);
        console.error(error);
    }
}

debugDatePicker().catch(console.error);
