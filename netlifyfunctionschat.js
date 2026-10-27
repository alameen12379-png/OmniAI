
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
        error: "OPENAI_API_KEY is missing from Netlify. Add it to the site's environment variables and redeploy."
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

  if (!input.model || !Array.isArray(input.messages) || input.messages.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: "Choose a model and enter a message."
      })
    };
  }

  const baseUrl = (
    process.env.OPENAI_BASE_URL ||
    "https://api.openai.com/v1"
  ).replace(/\/+$/, "");

  try {
    const response = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: 0.7
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: payload.error?.message ||
            "The provider rejected this chat request. Check model access and API billing."
        })
      };
    }

    const content = payload.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "The provider returned an unexpected response."
        })
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
      body: JSON.stringify({
        error: "Could not reach the AI provider. Check your provider URL and connection."
      })
    };
  }
};
