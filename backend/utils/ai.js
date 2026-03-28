import { createAgent, gemini } from "@inngest/agent-kit"

const analyzeTicket = async (ticket, availableSkills = []) => {
    // If we already know department skills, ask AI to choose only from them.
    const skillConstraint = availableSkills.length > 0
        ? `\nFor relatedSkills, you MUST only pick from this predefined list: ${JSON.stringify(availableSkills)}. Pick the ones most relevant to the ticket. If none of them are a good match, return an empty array [].`
        : ``;

    const supportAgent = createAgent({
        model: gemini({
            model: "gemini-2.5-flash",
            apiKey: process.env.GEMINI_API_KEY,
        }),
        name: "AI Ticket Triage Assistant",
        system: `You are an expert AI assistant that processes technical support tickets using ITIL best practices.

Your job is to:
1. Summarize the issue.
2. Provide helpful notes and resource links for human moderators.
3. List relevant technical skills required.
4. Classify the ticket type.
5. Assess impact and urgency levels.
${skillConstraint}

IMPORTANT:
- Respond with *only* valid raw JSON.
- Do NOT include markdown, code fences, comments, or any extra formatting.
- The format must be a raw JSON object.

Repeat: Do not wrap your output in markdown or code fences.`,
    });

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await supportAgent.run(`You are a ticket triage agent. Only return a strict JSON object with no extra text, headers, or markdown.

Analyze the following support ticket and provide a JSON object with:

- summary: A short 1-2 sentence summary of the issue.
- helpfulNotes: A detailed technical explanation that a moderator can use to solve this issue. Include useful external links or resources if possible.
- relatedSkills: An array of relevant skills required to solve the issue.${availableSkills.length > 0 ? ` You MUST only choose from these skills: ${JSON.stringify(availableSkills)}. If none match, return an empty array [].` : ` (e.g., ["React", "MongoDB", "Payroll", "Hardware"])`}
- suggestedTicketType: One of "service_request", "problem", "change_request", "access_request", "query", or "bug" based on:
  * service_request: Standard request for a service (e.g., new equipment, software installation)
  * problem: Root cause investigation for recurring issues
  * change_request: Request to modify or update existing systems/configurations
  * access_request: Permission, account access, or credential-related requests
  * query: General inquiry, question, or information request
  * bug: Software bug, defect, or error report
- suggestedImpact: A number 1, 2, or 3 based on scope of effect:
  * 1: Low - Affects only an individual user
  * 2: Moderate - Affects a team or department
  * 3: High - Affects the entire organization or critical business operations
- suggestedUrgency: A number 1, 2, or 3 based on time sensitivity:
  * 1: Low - Can wait, no immediate deadline
  * 2: Moderate - Needs attention soon but not immediately
  * 3: High - Needs immediate attention, time-critical

Respond only in this JSON format and do not include any other text or markdown in the answer:

{
"summary": "Short summary of the ticket",
"helpfulNotes": "Here are useful tips...",
"relatedSkills": ["React", "Node.js"],
"suggestedTicketType": "service_request",
"suggestedImpact": 2,
"suggestedUrgency": 2
}

---

Ticket information:

- Ticket: ${ticket.title}
- Description: ${ticket.description}`);

            const raw = response?.output?.[0]?.content;

            if (!raw) {
                console.log("AI response is empty or malformed. Response structure:", JSON.stringify(response).substring(0, 200));
                return null;
            }

            try {
                // Sometimes model sends fenced JSON, so strip it before parse.
                const match = raw.match(/```json\s*([\s\S]*?)\s*```/i);
                const jsonString = match ? match[1] : raw.trim()
                return JSON.parse(jsonString)
            } catch (e) {
                console.log("Failed to parse JSON from AI response: " + e.message)
                console.log("Raw content received:", raw.substring(0, 200));
                return null;
            }
        } catch (error) {
            if (error.message.includes("429") || error.message.includes("Quota exceeded") || error.message.includes("Resource exhausted")) {
                if (attempt < maxRetries) {
                    // Basic exponential backoff for rate limits.
                    const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
                    console.log(`Rate limit hit, waiting ${waitTime / 1000}s before retry (${attempt}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                console.error("Rate limit exceeded. Please wait before creating more tickets.");
            }
            console.error("AI Error:", error.message);
            throw error;
        }
    }
    return null;
};


export const clusterTickets = async (tickets) => {
    const supportAgent = createAgent({
        model: gemini({
            model: "gemini-2.5-flash",
            apiKey: process.env.GEMINI_API_KEY,
        }),
        name: "AI Incident Clustering Assistant",
        system: `You are an expert AI assistant that identifies clusters of semantically similar support tickets that likely stem from the same underlying issue or incident.

IMPORTANT:
- Respond with *only* valid raw JSON.
- Do NOT include markdown, code fences, comments, or any extra formatting.
- The format must be a raw JSON object.`,
    });

    const ticketList = tickets.map(t => `- ID: ${t._id}, Title: ${t.title}, Description: ${t.description}, Department: ${t.departmentName || 'Unknown'}`).join('\n');

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await supportAgent.run(`Analyze the following support tickets and identify clusters of tickets that are about the same underlying issue or incident.

Rules:
- A cluster must have at least 3 tickets to be valid.
- Tickets are "similar" if they describe the same root cause, same broken feature, same outage, or same systemic problem.
- A ticket can only belong to one cluster.
- If no valid clusters exist (fewer than 3 similar tickets), return an empty clusters array.

Return a JSON object in this exact format:
{
  "clusters": [
    {
      "title": "Short incident title describing the common issue",
      "description": "Detailed description of what the common underlying issue is",
      "ticketIds": ["id1", "id2", "id3"]
    }
  ]
}

If there are no valid clusters, return: { "clusters": [] }

Tickets:
${ticketList}`);

            const raw = response?.output?.[0]?.content;
            if (!raw) {
                console.log("AI clustering response is empty");
                return null;
            }

            try {
                const match = raw.match(/```json\s*([\s\S]*?)\s*```/i);
                const jsonString = match ? match[1] : raw.trim();
                return JSON.parse(jsonString);
            } catch (e) {
                console.log("Failed to parse clustering JSON:", e.message);
                return null;
            }
        } catch (error) {
            if (error.message.includes("429") || error.message.includes("Quota exceeded") || error.message.includes("Resource exhausted")) {
                if (attempt < maxRetries) {
                    const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
                    console.log(`Rate limit hit, waiting ${waitTime / 1000}s before retry (${attempt}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
            }
            console.error("AI Clustering Error:", error.message);
            throw error;
        }
    }
    return null;
};


export const analyzeTicketWithIncidentCheck = async (ticket, availableSkills = [], activeIncidents = []) => {
    const skillConstraint = availableSkills.length > 0
        ? `\nFor relatedSkills, you MUST only pick from this predefined list: ${JSON.stringify(availableSkills)}. Pick the ones most relevant to the ticket. If none of them are a good match, return an empty array [].`
        : ``;

    const incidentContext = activeIncidents.length > 0
        ? `\n\nAdditionally, check if this ticket matches any of these active incidents. If it does, include the matching incident's ID in matchedIncidentId. If it does not match any, set matchedIncidentId to null.\n\nActive Incidents:\n${activeIncidents.map(inc => `- ID: ${inc._id}, Title: ${inc.title}, Description: ${inc.description}`).join('\n')}`
        : '';

    const supportAgent = createAgent({
        model: gemini({
            model: "gemini-2.5-flash",
            apiKey: process.env.GEMINI_API_KEY,
        }),
        name: "AI Ticket Triage Assistant",
        system: `You are an expert AI assistant that processes technical support tickets using ITIL best practices.

Your job is to:
1. Summarize the issue.
2. Provide helpful notes and resource links for human moderators.
3. List relevant technical skills required.
4. Classify the ticket type.
5. Assess impact and urgency levels.
${skillConstraint}
${activeIncidents.length > 0 ? '6. Check if this ticket matches any known active incident.' : ''}

IMPORTANT:
- Respond with *only* valid raw JSON.
- Do NOT include markdown, code fences, comments, or any extra formatting.
- The format must be a raw JSON object.`,
    });

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await supportAgent.run(`Analyze the following support ticket and provide a JSON object with:

- summary: A short 1-2 sentence summary of the issue.
- helpfulNotes: A detailed technical explanation that a moderator can use to solve this issue. Include useful external links or resources if possible.
- relatedSkills: An array of relevant skills required to solve the issue.${availableSkills.length > 0 ? ` You MUST only choose from these skills: ${JSON.stringify(availableSkills)}. If none match, return an empty array [].` : ` (e.g., ["React", "MongoDB", "Payroll", "Hardware"])`}
- suggestedTicketType: One of "service_request", "problem", "change_request", "access_request", "query", or "bug" based on:
  * service_request: Standard request for a service (e.g., new equipment, software installation)
  * problem: Root cause investigation for recurring issues
  * change_request: Request to modify or update existing systems/configurations
  * access_request: Permission, account access, or credential-related requests
  * query: General inquiry, question, or information request
  * bug: Software bug, defect, or error report
- suggestedImpact: A number 1, 2, or 3 based on scope of effect:
  * 1: Low - Affects only an individual user
  * 2: Moderate - Affects a team or department
  * 3: High - Affects the entire organization or critical business operations
- suggestedUrgency: A number 1, 2, or 3 based on time sensitivity:
  * 1: Low - Can wait, no immediate deadline
  * 2: Moderate - Needs attention soon but not immediately
  * 3: High - Needs immediate attention, time-critical
- matchedIncidentId: ${activeIncidents.length > 0 ? 'The ID of the matching active incident, or null if no match.' : 'null (no active incidents to check)'}
${incidentContext}

Respond only in this JSON format:
{
  "summary": "Short summary of the ticket",
  "helpfulNotes": "Here are useful tips...",
  "relatedSkills": ["React", "Node.js"],
  "suggestedTicketType": "service_request",
  "suggestedImpact": 2,
  "suggestedUrgency": 2,
  "matchedIncidentId": null
}

---

Ticket information:

- Ticket: ${ticket.title}
- Description: ${ticket.description}`);

            const raw = response?.output?.[0]?.content;
            if (!raw) {
                console.log("AI response is empty or malformed.");
                return null;
            }

            try {
                const match = raw.match(/```json\s*([\s\S]*?)\s*```/i);
                const jsonString = match ? match[1] : raw.trim();
                return JSON.parse(jsonString);
            } catch (e) {
                console.log("Failed to parse JSON from AI response:", e.message);
                return null;
            }
        } catch (error) {
            if (error.message.includes("429") || error.message.includes("Quota exceeded") || error.message.includes("Resource exhausted")) {
                if (attempt < maxRetries) {
                    const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
                    console.log(`Rate limit hit, waiting ${waitTime / 1000}s before retry (${attempt}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
            }
            console.error("AI Error:", error.message);
            throw error;
        }
    }
    return null;
};

export default analyzeTicket;