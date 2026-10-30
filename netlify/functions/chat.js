
exports.handler = async function (event) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed." })
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "OPENAI_API_KEY is missing from Netlify."
      })
    };
  }

  let input;

  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid request body." })
    };
  }

  if (!input.model || !Array.isArray(input.messages) || !input.messages.length) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Choose a model and enter a message." })
    };
  }

  const base = (
    process.env.OPENAI_BASE_URL ||
    "https://api.openai.com/v1"
  ).replace(/\/+$/, "");

  try {
    const response = await fetch(base + "/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: data.error?.message || "The AI provider rejected the request."
        })
      };
    }

    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Unexpected response from AI provider." })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ content })
    };
  } catch {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "Could not connect to the AI provider." })
    };
  }
};
