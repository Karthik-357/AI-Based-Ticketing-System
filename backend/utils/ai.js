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
        system: `You are an expert AI assistant that processes technical support tickets,
        
Your job is to:
1. Summarize the issue.
2. Provide helpful notes and resource links for human moderators.
3. List relevant technical skills required.
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
        
Analyze the following support ticket and provide a JSON object with :

- summary: A short 1-2 sentence summary of the issue.
- helpfulNotes: A detailed technical explanation that a moderator can use to solve this issue. Include useful external links or resources if possible.
- relatedSkills: An array of relevant skills required to solve the issue.${availableSkills.length > 0 ? ` You MUST only choose from these skills: ${JSON.stringify(availableSkills)}. If none match, return an empty array [].` : ` (e.g., ["React", "MongoDB", "Payroll", "Hardware"])`}

Respond only in this JSON format and do not include any other text or markdown in the answer:

{
"summary": "Short summary of the ticket",
"helpfulNotes": "Here are useful tips...",
"relatedSkills": ["React", "Node.js"]
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


export default analyzeTicket;