// Pre-Fill Review Agent using Claude Sonnet
// Reviews contract answers before form filling to catch errors

// Get API key at runtime (after dotenv has loaded)
function getAnthropicApiKey() {
    return process.env.ANTHROPIC_API_KEY || '';
}

async function reviewContractAnswers(answers) {
    const ANTHROPIC_API_KEY = getAnthropicApiKey();

    console.log('Review Agent called!');
    console.log('  ANTHROPIC_API_KEY present:', ANTHROPIC_API_KEY ? 'YES (' + ANTHROPIC_API_KEY.substring(0, 12) + '...)' : 'NO');

    if (!ANTHROPIC_API_KEY) {
        console.warn('No Anthropic API key - skipping review');
        return { success: true, issues: [], skipped: true };
    }

    console.log('Review Agent: Analyzing contract answers with Sonnet...');

    const prompt = buildReviewPrompt(answers);

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1500,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Anthropic API error:', errorText);
            return { success: false, error: 'API request failed', issues: [] };
        }

        const result = await response.json();
        const reviewText = result.content[0].text;

        console.log('Review Agent response:', reviewText);

        // Parse the response
        const parsedResult = parseReviewResponse(reviewText);

        return {
            success: true,
            issues: parsedResult.issues,
            summary: parsedResult.summary,
            rawResponse: reviewText
        };

    } catch (error) {
        console.error('Review Agent error:', error);
        return { success: false, error: error.message, issues: [] };
    }
}

function buildReviewPrompt(answers) {
    const answersJson = JSON.stringify(answers, null, 2);

    return `You are an expert real estate contract review assistant. Review the following contract answers collected via VOICE INPUT for a residential real estate contract in Arkansas.

CRITICAL CHECKS (these are ERRORS that MUST be caught):
1. **Invalid times** - Hours must be 1-12, not 13-59. "25:00" is INVALID (likely meant "5:00"). Flag ANY time where hour > 12 or hour = 0.
2. **Invalid dates** - Dates must be valid (month 1-12, day 1-31 appropriate for month). Future dates for closing.
3. **Missing critical fields** - buyer name, property address, purchase price are REQUIRED
4. **Impossible numbers** - Closing costs > purchase price, earnest money > purchase price, negative amounts
5. **Email transcription errors** - "at" should be "@", spaces in email addresses, "dot" should be "."
6. **DUPLICATE CONSECUTIVE WORDS** - "Arkansas Arkansas", "Rogers Rogers", "Street Street" - voice input sometimes duplicates words. Flag ANY instance of the same word appearing twice in a row. This is CRITICAL!

IMPORTANT CHECKS (these are WARNINGS):
7. **Spelling errors** - especially in names (Brian vs Bryan, Rogers vs Roger) and addresses
8. **Date logic** - closing date should be in the future, contingency deadline should be before closing
9. **Number sanity** - purchase price should be reasonable for residential ($50k-$5M typical)
10. **MISSING ZIP CODE** - Property addresses MUST have a 5-digit zip code (like 72712). If an address has street, city, state but NO zip code, flag this as a WARNING. Example: "123 Main Street, Bentonville, Arkansas" is MISSING the zip code.
11. **Address completeness** - should have street, city, state, zip code
12. **Logical consistency** - if there's a contingency, related fields should be filled
13. **Voice transcription artifacts** - numbers that look like they came from words (e.g., "4545" for closing days is likely wrong)

COMMON VOICE INPUT ERRORS TO WATCH FOR:
- "25:00" when user said "at 5:00" - the "25" is from a date like "January 25th"
- "4545" for number of days - unrealistic, likely transcription error
- Email addresses with "at" and "dot" spelled out
- Run-together words or split words
- Homophones (their/there, by/buy)
- **SPOKEN NUMBERS IN ADDRESSES** - "seven two seven six two" should be "72762". Any sequence of number words (zero/one/two/three/four/five/six/seven/eight/nine) in an address is an ERROR that needs to be converted to digits. Flag this as a CRITICAL error!
- **DUPLICATE CONSECUTIVE WORDS** - "Arkansas Arkansas" or "Rogers Rogers" or "Street Street" - voice transcription sometimes repeats words. This is a CRITICAL ERROR. Check ALL fields for duplicate consecutive words like "word word" patterns. The fix is to remove the duplicate.

CONTRACT ANSWERS:
${answersJson}

Respond in this EXACT format:

ISSUES_FOUND: [yes/no]

If yes, list each issue:
ISSUE: [field_name]
TYPE: [spelling|missing|date_logic|number|address|consistency|time|email|other]
SEVERITY: [error|warning]
DESCRIPTION: [what's wrong]
SUGGESTION: [how to fix it]

End with:
SUMMARY: [one sentence summary - either "No issues found" or "Found X issues that should be reviewed"]

Be thorough but practical. Flag real problems, especially invalid times (like 25:00) and impossible numbers. Arkansas addresses don't always need zip codes for the contract to be valid.`;
}

function parseReviewResponse(responseText) {
    const issues = [];
    let summary = 'Review complete';

    // Check if issues were found
    const issuesFoundMatch = responseText.match(/ISSUES_FOUND:\s*(yes|no)/i);
    const hasIssues = issuesFoundMatch && issuesFoundMatch[1].toLowerCase() === 'yes';

    if (hasIssues) {
        // Parse individual issues
        const issueBlocks = responseText.split(/ISSUE:/i).slice(1);

        for (const block of issueBlocks) {
            const fieldMatch = block.match(/^\s*(\S+)/);
            const typeMatch = block.match(/TYPE:\s*(\w+)/i);
            const severityMatch = block.match(/SEVERITY:\s*(\w+)/i);
            const descMatch = block.match(/DESCRIPTION:\s*(.+?)(?=SUGGESTION:|ISSUE:|SUMMARY:|$)/is);
            const suggestionMatch = block.match(/SUGGESTION:\s*(.+?)(?=ISSUE:|SUMMARY:|$)/is);

            if (fieldMatch) {
                issues.push({
                    field: fieldMatch[1].trim(),
                    type: typeMatch ? typeMatch[1].trim().toLowerCase() : 'other',
                    severity: severityMatch ? severityMatch[1].trim().toLowerCase() : 'warning',
                    description: descMatch ? descMatch[1].trim() : 'Issue detected',
                    suggestion: suggestionMatch ? suggestionMatch[1].trim() : ''
                });
            }
        }
    }

    // Extract summary
    const summaryMatch = responseText.match(/SUMMARY:\s*(.+?)$/is);
    if (summaryMatch) {
        summary = summaryMatch[1].trim();
    }

    return { issues, summary };
}

module.exports = { reviewContractAnswers };
