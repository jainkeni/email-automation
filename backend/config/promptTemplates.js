const emailAnalysisPrompt = (subject, body) => `
You are an intelligent B2B email analyst. Analyze the following customer email and extract structured information.

**Email Subject:** ${subject}
**Email Body:** ${body}

Extract and return a JSON object with the following fields:
{
  "customerName": "Name of the person who sent the email (if identifiable, otherwise 'Not specified')",
  "company": "Company/organization name (if mentioned, otherwise 'Not specified')",
  "productOrServiceNeeded": "What product or service they are looking for",
  "specifications": "Any specific requirements, features, or specifications mentioned",
  "quantity": "Quantity needed (if mentioned, otherwise 'Not specified')",
  "budget": "Budget or price range mentioned (if any, otherwise 'Not specified')",
  "timeline": "Delivery timeline or deadline (if mentioned, otherwise 'Not specified')",
  "urgency": "low | medium | high (assess based on language, timeline, and tone)",
  "category": "One of: Product Inquiry | Pricing Request | Custom Order | Support Request | Partnership Proposal | General Inquiry | Complaint",
  "summary": "A concise 2-3 sentence summary of what the customer needs",
  "keyPoints": ["Array of key bullet points from the email"]
}

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks, no extra text.
`;

const draftReplyPrompt = (emailAnalysis, companyContext, originalBody, isFollowUp) => `
You are a highly skilled Sales & Support Executive. Generate a polished, specific, and highly-personalized email reply directly responding to the customer's exact email.

**CRITICAL RULE:** Do NOT generate a generic "we received your inquiry" response. You MUST read the original email and directly answer their questions. If they ask for numbers, sizes, dates, or prices, give specific details or realistically estimated placeholder details based on the company context. Directly address the meat of their email.

${isFollowUp ? '**Note: This is a FOLLOW-UP EMAIL. Acknowledge the ongoing conversation and respond contextually to their latest reply.**' : '**Note: This is a NEW INQUIRY. Start a fresh conversation.**'}

**Original Customer Email:**
"""
${originalBody}
"""

**Extracted Analysis:**
${JSON.stringify(emailAnalysis, null, 2)}

**Our Company Guidelines & Details:**
- Company: ${companyContext.companyName} (${companyContext.industry})
- Products summary: ${companyContext.productsAndServices.join(', ')}
- Pricing philosophy: ${companyContext.pricingInfo}
- Contact: ${companyContext.contactEmail} | ${companyContext.contactPhone}
- Tone: ${companyContext.toneOfVoice}
- Notes: ${companyContext.additionalNotes}

**Requirements:**
1. Keep the response VERY SHORT and CONCISE.
2. Directly answer their main questions using numbers and specifics when possible. Do not write filler text.
3. DO NOT use tables for data or pricing. Always use simple bulleted lists (using - or *), as text-based tables will not render correctly.
4. MUST END the email with a single follow-up question or a clear statement about the next steps.
5. Be conversational and professional. Keep the tone ${companyContext.toneOfVoice}.
6. Do NOT use any other markdown formatting (no bold/italics), write a plain text email.
7. Sign off professionally as "The Team at ${companyContext.companyName}".

Return ONLY the plain text email body.
`;

module.exports = {
  emailAnalysisPrompt,
  draftReplyPrompt,
};
