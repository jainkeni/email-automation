const { ImapFlow } = require('imapflow');
const { getSupabase } = require('../config/db');
const { analyzeEmail, generateDraftReply, shouldProcessEmail } = require('./aiService');
const { processQuotationInquiry } = require('./quotation.service');


/**
 * Connect to IMAP server and fetch emails from the last 7 days.
 * AI triage decides which emails are genuine business inquiries.
 */
const fetchNewEmails = async () => {
    const client = new ImapFlow({
        host: process.env.IMAP_HOST,
        port: parseInt(process.env.IMAP_PORT) || 993,
        secure: true,
        auth: {
            user: process.env.IMAP_USER,
            pass: process.env.IMAP_PASSWORD,
        },
        logger: false,
    });

    try {
        // Attach error handler to prevent unhandled ECONNRESET crashes
        client.on('error', (err) => {
            console.error('❌ IMAP connection error:', err.message);
        });

        await client.connect();
        console.log('📬 Connected to IMAP server');

        const lock = await client.getMailboxLock('INBOX');
        const supabase = getSupabase();

        try {
            // Fetch all UNREAD emails
            const messages = client.fetch(
                { seen: false },
                {
                    envelope: true,
                    source: true,
                    bodyStructure: true,
                }
            );

            let newCount = 0;
            let skippedCount = 0;

            const emailsToProcess = [];
            for await (const msg of messages) {
                emailsToProcess.push({
                    uid: msg.uid,
                    envelope: msg.envelope,
                    source: msg.source.toString(),
                });
            }

            for (const msg of emailsToProcess) {
                try {
                    const envelope = msg.envelope;
                    const messageId = envelope.messageId;
                    const emailDate = envelope.date ? new Date(envelope.date) : new Date();

                    // Skip if already processed (dedup by message_id)
                    const { data: existing } = await supabase
                        .from('email_requests')
                        .select('id')
                        .eq('message_id', messageId)
                        .limit(1)
                        .maybeSingle();

                    if (existing) {
                        await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
                        continue;
                    }

                    const fromAddress = envelope.from?.[0]?.address || 'unknown@email.com';
                    const fromName = envelope.from?.[0]?.name || '';
                    const body = extractPlainTextBody(msg.source);

                    // ── AI TRIAGE ──────────────────────────────────────────────
                    console.log(`🔍 Triaging email from: ${fromAddress} | Subject: ${envelope.subject}`);
                    const triage = await shouldProcessEmail(fromAddress, envelope.subject, body);

                    if (!triage.process) {
                        skippedCount++;
                        console.log(`⏭️  Skipped [AI]: ${triage.reason}`);
                        await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
                        continue;
                    }

                    console.log(`✅ AI approved: ${triage.reason}`);
                    // ─────────────────────────────────────────────────────────

                    console.log(`📧 Processing: ${fromAddress} | Subject: ${envelope.subject}`);
                    console.log('🤖 Running AI analysis...');
                    const aiAnalysis = await analyzeEmail(envelope.subject, body);

                    const isFollowUp = !!envelope.inReplyTo || /^re:/i.test(envelope.subject || '');

                    console.log('🤖 Generating draft reply...');
                    const aiDraftReply = await generateDraftReply(aiAnalysis, body, isFollowUp);

                    // Save to Supabase
                    const { data: savedEmail, error: insertError } = await supabase
                        .from('email_requests')
                        .insert({
                            from_email: fromAddress,
                            from_name: fromName,
                            subject: envelope.subject || '(No Subject)',
                            body: body,
                            message_id: messageId,
                            received_at: emailDate.toISOString(),
                            ai_analysis: aiAnalysis,
                            ai_draft_reply: aiDraftReply,
                            status: 'pending',
                        })
                        .select('id')
                        .single();

                    if (insertError) {
                        console.error(`❌ Failed to save email: ${insertError.message}`);
                        continue;
                    }

                    newCount++;
                    console.log(`✅ Saved & analyzed: ${envelope.subject}`);

                    // ── AUTOMATED QUOTATION GENERATION ───────────────────────
                    if (['Pricing Request', 'Product Inquiry', 'Custom Order'].includes(aiAnalysis.category)) {
                        console.log(`🤖 Auto-generating quotation for ${aiAnalysis.category}...`);
                        try {
                            const qtResult = await processQuotationInquiry(savedEmail.id);
                            console.log(`✅ Automated Quotation Created: ${qtResult.quotation?.quotation_number}`);
                        } catch (qtError) {
                            console.error(`❌ Failed to auto-generate quotation: ${qtError.message}`);
                        }
                    }
                    // ─────────────────────────────────────────────────────────

                    await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
                } catch (msgError) {
                    console.error(`❌ Error processing message: ${msgError.message}`);
                }
            }

            if (newCount > 0) {
                console.log(`📬 Processed ${newCount} new email(s)`);
            } else {
                console.log('📭 No new emails to process');
            }
            if (skippedCount > 0) {
                console.log(`⏭️  Skipped ${skippedCount} automated/irrelevant email(s) (AI decision)`);
            }
        } finally {
            lock.release();
        }

        await client.logout();
    } catch (error) {
        console.error('❌ IMAP Fetch Error:', error.message);
    }
};

/**
 * Extract plain text body from raw email source
 */
const extractPlainTextBody = (source) => {
    try {
        const lines = source.split('\n');
        let isBase64 = false;
        let isQuotedPrintable = false;
        let bodyLines = [];
        let foundPlainText = false;
        let boundary = '';

        for (const line of lines) {
            const boundaryMatch = line.match(/boundary="?([^";\s]+)"?/i);
            if (boundaryMatch) {
                boundary = boundaryMatch[1];
                break;
            }
        }

        if (boundary) {
            let inPlainTextPart = false;
            let pastHeaders = false;

            for (const line of lines) {
                if (line.includes(boundary)) {
                    if (inPlainTextPart && pastHeaders) break;
                    inPlainTextPart = false;
                    pastHeaders = false;
                    continue;
                }

                if (!pastHeaders) {
                    if (line.toLowerCase().includes('content-type: text/plain')) {
                        inPlainTextPart = true;
                        foundPlainText = true;
                    }
                    if (line.toLowerCase().includes('content-transfer-encoding: base64')) {
                        isBase64 = true;
                    }
                    if (line.toLowerCase().includes('content-transfer-encoding: quoted-printable')) {
                        isQuotedPrintable = true;
                    }
                    if (line.trim() === '' && inPlainTextPart) {
                        pastHeaders = true;
                    }
                    continue;
                }

                if (inPlainTextPart) {
                    bodyLines.push(line);
                }
            }
        }

        if (!foundPlainText) {
            let headersDone = false;
            for (const line of lines) {
                if (!headersDone) {
                    if (line.trim() === '') headersDone = true;
                    continue;
                }
                bodyLines.push(line);
            }
        }

        let body = bodyLines.join('\n').trim();

        if (isBase64 && body) {
            try {
                body = Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf-8');
            } catch (e) { /* use as-is */ }
        }

        if (isQuotedPrintable && body) {
            body = body.replace(/=\r?\n/g, '');
            const bytes = [];
            for (let i = 0; i < body.length; i++) {
                if (body[i] === '=' && i + 2 < body.length) {
                    const hex = body.substring(i + 1, i + 3);
                    if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
                        bytes.push(parseInt(hex, 16));
                        i += 2;
                        continue;
                    }
                }
                bytes.push(body.charCodeAt(i));
            }
            body = Buffer.from(bytes).toString('utf-8');
        }

        body = body.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
        return body || '(Empty email body)';
    } catch (error) {
        console.error('Error extracting email body:', error.message);
        return '(Could not parse email body)';
    }
};

module.exports = { fetchNewEmails };
