
exports.handler = async function () {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "OPENAI_API_KEY is missing from Netlify."
      })
    };
  }

  const base = (
    process.env.OPENAI_BASE_URL ||
    "https://api.openai.com/v1"
  ).replace(/\/+$/, "");

  try {
    const response = await fetch(base + "/models", {
      headers: {
        Authorization: "Bearer " + key
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: data.error?.message || "Could not load models."
        })
      };
    }

    const models = (data.data || []).map(model => ({
      id: model.id,
      name: model.id
    }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({ models })
    };
  } catch {
    return {
      statusCode: 502,
      body: JSON.stringify({
        error: "Could not connect to the AI provider."
      })
    };
  }
};
