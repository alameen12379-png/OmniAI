# OmniAI — Netlify-ready AI workspace

A responsive, dependency-free AI workspace with chat, live model discovery, a comparison view, and an AI tool directory. It uses Netlify Functions so your provider API key stays server-side.

## Deploy on Netlify

1. Extract this ZIP on your computer.
2. Open Netlify and choose **Add new site → Deploy manually**. Drag the extracted folder into the deploy area, or upload the ZIP if the interface accepts ZIP uploads.
3. Open **Site configuration → Environment variables** and add:
   - `OPENAI_API_KEY` — your API key from a supported OpenAI-compatible provider.
   - `OPENAI_BASE_URL` — optional; defaults to `https://api.openai.com/v1`. For another compatible provider, set its API base URL, usually ending in `/v1`.
4. Redeploy the site after setting variables.
5. Open the site and check **Discover models**. Only models returned by your provider are marked connected.

## Important notes

- The API key is used only by server-side Netlify Functions; do not paste it into `app.js` or any public HTML.
- GPT-6 is featured in the interface, but it is only marked connected if your provider's `/models` endpoint actually lists a matching model and grants API access. The website does not create access to a model by itself.
- Chat requires an OpenAI-compatible `/chat/completions` endpoint. Image, video, and audio cards are clearly labelled as requiring separate integrations.
- A provider API account may have its own billing, quotas, and model-access restrictions.
- To test locally, install the Netlify CLI and run `netlify dev` from this folder after setting the environment variables.
