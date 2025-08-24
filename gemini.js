// chrome-extension/gemini.js

const MODEL = "gemini-2.0-flash-lite";
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/**
 * Fetches a summary of WhatsApp messages using Gemini API
 * @param {string} apiKey - Gemini API key
 * @param {string} model - Model to use (defaults to MODEL constant)
 * @param {Array} messages - Array of message objects with timestampISO, sender, and text
 * @returns {Promise<{tldr: string, bullets: string[]}>} Summary object with TLDR and bullet points
 */
export async function summarizeMessages(apiKey, model = MODEL, messages) {
  console.log("[Gemini] Starting message summarization", {
    messageCount: messages?.length,
  });

  console.log("[Gemini] Model:", model);
  console.log("[Gemini] Messages:", messages);

  if (!apiKey) {
    const errorMsg = "No API key provided for Gemini";
    console.error("[Gemini] Error:", errorMsg);
    throw new Error(errorMsg);
  }

  if (!messages?.length) {
    const errorMsg = "No messages provided for summarization";
    console.warn("[Gemini] Warning:", errorMsg);
    return { tldr: "No messages to summarize", bullets: [] };
  }

  try {
    const prompt = createPrompt(messages);
    console.debug(
      "[Gemini] Created prompt with character length:",
      prompt.length
    );

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
        stopSequences: [],
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    };

    console.log("[Gemini] Sending request to Gemini API...");
    const startTime = Date.now();

    const response = await fetch(`${API_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const responseTime = Date.now() - startTime;
    console.log(`[Gemini] Received API response in ${responseTime}ms`, {
      status: response.status,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error("[Gemini] API Error:", errorData);
      } catch (e) {
        console.error("[Gemini] Failed to parse error response:", e);
        throw new Error(`API request failed with status ${response.status}`);
      }
      throw new Error(
        `Gemini API error: ${errorData.error?.message || "Unknown error"}`
      );
    }

    const data = await response.json();
    console.debug("[Gemini] Raw API response:", data);

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("[Gemini] Unexpected response format:", data);
      throw new Error("Unexpected response format from Gemini API");
    }

    const summaryText = data.candidates[0].content.parts[0].text;
    console.log("[Gemini] Successfully received summary text");

    const summary = parseSummary(summaryText);
    console.log("[Gemini] Parsed summary:", {
      tldrLength: summary.tldr?.length,
      bulletCount: summary.bullets?.length,
    });

    return summary;
  } catch (error) {
    console.error("[Gemini] Error in summarizeMessages:", error);
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Creates a prompt for the Gemini API from message history
 * @private
 */
function createPrompt(messages) {
  console.log("[Gemini] Creating prompt from messages");

  let prompt = `You are a helpful assistant that summarizes WhatsApp group chats. 
The following is a list of messages from a group chat. 

Please provide:
1. A short summary (tl;dr) - 2-4 sentences
2. A list of 5-8 key points in bullet points

The entire response should be in English.

Messages to summarize:
`;

  messages.slice(0, 300).forEach((msg, index) => {
    const timestamp = msg.timestampISO || new Date().toISOString();
    const sender = msg.sender || "Unknown";
    const text = msg.text || "";
    prompt += `[${timestamp}] ${sender}: ${text}\n`;
  });

  prompt +=
    '\nPlease provide the summary now, starting with "tl;dr:" followed by the key points in bullet points after "Key Points:"';

  return prompt;
}

/**
 * Parses the raw text response from Gemini into structured format
 * @private
 */
function parseSummary(text) {
  console.log("[Gemini] Parsing summary response");

  if (!text) {
    console.warn("[Gemini] Empty response text received");
    return { tldr: "No summary available", bullets: [] };
  }

  // Extract TLDR section
  const tldrMatch = text.match(
    /tl;dr:?\s*([\s\S]*?)(?=\n\s*\n|\s*Key Points:|$)/i
  );
  let tldr = tldrMatch ? tldrMatch[1].trim() : "";

  // If no TLDR found, try to extract first paragraph
  if (!tldr) {
    const firstPara = text.split("\n\n")[0] || "";
    tldr = firstPara.trim();
  }

  // Extract bullet points
  const bulletsMatch = text.match(/Key Points:([\s\S]*?)(?=\n\s*\n|$)/i);
  let bulletsText = bulletsMatch ? bulletsMatch[1] : "";

  // If no bullet points section found, try to extract list items
  if (!bulletsText) {
    const listItems = text.match(/^[-•*]\s*(.+)$/gim) || [];
    bulletsText = listItems.join("\n");
  }

  // Clean and format bullets
  const bullets = bulletsText
    .split("\n")
    .map((item) =>
      item
        .trim()
        .replace(/^[-•*]\s*/, "")
        .trim()
    )
    .filter((item) => item.length > 0);

  console.debug("[Gemini] Parsed summary:", {
    tldrLength: tldr?.length,
    bulletCount: bullets?.length,
  });
  return { tldr, bullets };
}
