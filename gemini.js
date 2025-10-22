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
export async function summarizeMessages(
  apiKey,
  model = MODEL,
  messages,
  summaryLength = "standard"
) {
  console.log("[Gemini] Starting message summarization", {
    messageCount: messages?.length,
  });

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
    const prompt = createPrompt(messages, summaryLength);
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
        temperature: 0.5,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
        stopSequences: [],
      },
      // safetySettings: [
      //   {
      //     category: "HARM_CATEGORY_HARASSMENT",
      //     threshold: "BLOCK_MEDIUM_AND_ABOVE",
      //   },
      //   {
      //     category: "HARM_CATEGORY_HATE_SPEECH",
      //     threshold: "BLOCK_MEDIUM_AND_ABOVE",
      //   },
      //   {
      //     category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      //     threshold: "BLOCK_MEDIUM_AND_ABOVE",
      //   },
      //   {
      //     category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      //     threshold: "BLOCK_MEDIUM_AND_ABOVE",
      //   },
      // ],
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

    // Return the raw text response from the LLM
    return summaryText;
  } catch (error) {
    console.error("[Gemini] Error in summarizeMessages:", error);
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Creates a prompt for the Gemini API from message history
 * @private
 */
function createPrompt(messages, summaryLength = "standard") {
  console.log("[Gemini] Creating prompt from messages");

  // Tune the instruction text based on the requested summary length
  let tldrGuidance = "";
  let bulletsGuidance = "";
  if (summaryLength === "concise") {
    tldrGuidance =
      "TL;DR (1-2 sentences): very concise overview focusing only on the main outcome.";
    bulletsGuidance =
      "Key Points (2-4 bullet points): only the most important facts or decisions.";
  } else if (summaryLength === "comprehensive") {
    tldrGuidance =
      "TL;DR (3-5 sentences): more detailed overview covering nuances.";
    bulletsGuidance =
      "Key Points (8-12 bullet points): include details, action items, and notable media or links.";
  } else {
    tldrGuidance =
      "TL;DR (2-4 sentences): A concise overview of the main discussion, capturing the key themes, tone, and outcomes.";
    bulletsGuidance =
      "Key Points (5-8 bullet points): highlight the most important details such as who raised ideas, agreements, decisions, and action items.";
  }

  let prompt = `You are a helpful assistant that summarizes WhatsApp group chats.\nYou will be given a list of messages, each containing:\n- sender name\n- text content\n- whether it is a quoted reply\n- whether it is forwarded\n- whether it contains media (image, video, audio)\n- timestamp\n\nYour task:\n1. **${tldrGuidance}**\n2. **${bulletsGuidance}**\n3. **Links (if any)**: List all links shared in the conversation. For each link, provide a brief context and the link itself in the format: "[About the link, some small context] - https://example.com".\n\nGuidelines:\n- Be specific and context-aware. Avoid generic responses like \u201cpeople discussed various things.\u201d\n- If multiple people shared similar views, group them together.\n- If the conversation is casual (e.g., jokes, greetings), capture the overall vibe briefly.\n- If there are any links, create a "Links:" section and list them with context.\n- Always write the output in **English**.\n\nMessages to summarize:\n`;

  // take last 300 messages, then reverse them
  messages
    .slice(-300)
    .reverse()
    .forEach((msg) => {
      const timestamp = msg.timestamp || new Date().toISOString();
      const senderName = msg.sender?.name || "Unknown";
      const senderNumber = msg.sender?.number ? ` (${msg.sender.number})` : "";
      const sender = `${senderName}${senderNumber}`;

      let line = `[${timestamp}] ${sender}: `;

      if (msg.isForwarded) {
        line += "(Forwarded) ";
      }

      if (msg.isQuoted && msg.quotedMessage) {
        const qmSender = msg.quotedMessage.sender || "Unknown";
        const qmText = msg.quotedMessage.text || "";
        line += `Quoted ${qmSender}: \"${qmText}\" → `;
      }

      if (msg.text) {
        line += msg.text;
      }

      if (msg.hasMedia) {
        line += " [Media attached]";
      }

      prompt += line.trim() + "\n";
    });

  prompt +=
    '\nPlease provide the summary now, starting with "tl;dr:" followed by the key points in bullet points after "Key Points:". If there are any links, add a "Links:" section at the end.';

  console.log("[Gemini] Prompt: ", prompt);

  return prompt;
}

/**
 * Parses the raw text response from Gemini into structured format
 * @private
 */
// function parseSummary(text) {
//   console.log("[Gemini] Parsing summary response");

//   if (!text) {
//     console.warn("[Gemini] Empty response text received");
//     return { tldr: "No summary available", bullets: [] };
//   }

//   // Extract TLDR section
//   const tldrMatch = text.match(
//     /tl;dr:?\s*([\s\S]*?)(?=\n\s*\n|\s*Key Points:|$)/i
//   );
//   let tldr = tldrMatch ? tldrMatch[1].trim() : "";

//   // If no TLDR found, try to extract first paragraph
//   if (!tldr) {
//     const firstPara = text.split("\n\n")[0] || "";
//     tldr = firstPara.trim();
//   }

//   // Extract bullet points
//   const bulletsMatch = text.match(/Key Points:([\s\S]*?)(?=\n\s*\n|$)/i);
//   let bulletsText = bulletsMatch ? bulletsMatch[1] : "";

//   // If no bullet points section found, try to extract list items
//   if (!bulletsText) {
//     const listItems = text.match(/^[-•*]\s*(.+)$/gim) || [];
//     bulletsText = listItems.join("\n");
//   }

//   // Clean and format bullets
//   const bullets = bulletsText
//     .split("\n")
//     .map((item) =>
//       item
//         .trim()
//         .replace(/^[-•*]\s*/, "")
//         .trim()
//     )
//     .filter((item) => item.length > 0);

//   console.debug("[Gemini] Parsed summary:", {
//     tldrLength: tldr?.length,
//     bulletCount: bullets?.length,
//   });
//   return { tldr, bullets };
// }
