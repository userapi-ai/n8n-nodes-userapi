# n8n-nodes-userapi

Community node package for using UserApi.Ai: API layer to image generation tool endpoints in n8n workflows.

> Official package by UserApi.Ai.

## Overview

Official resources:

- [Website](https://userapi.ai)
- [First steps: get your API key](https://userapi.ai/first-steps)

## Features

- Supports all currently available UserApi.Ai methods in this node package.
- ✨ [Imagine](https://userapi.ai/docs#imagine)
- ⬆️ [Upscale](https://userapi.ai/docs#upscale)
- 🔄 [Variation](https://userapi.ai/docs#variation)
- 🔀 [Blend](https://userapi.ai/docs#blend)
- 📝 [Describe](https://userapi.ai/docs#describe)
- 🎬 [Animate](https://userapi.ai/docs#animate)
- 🖌️ [Inpaint](https://userapi.ai/docs#inpaint)
- And more: [See full docs](https://userapi.ai/docs)

## Installation

This node is **verified by n8n**, so it can be installed on n8n Cloud and on self-hosted n8n:

1. On the canvas, open the nodes panel (**+** or **N**).
2. Search for **UserAPI**. It is listed under **More from the community**.
3. Open it and select **Install** (instance owner or admin).

On self-hosted n8n you can also install it in **Settings → Community Nodes** with the package name `n8n-nodes-userapi`. See the [n8n guide to verified community nodes](https://docs.n8n.io/integrations/community-nodes/installation/verified-install/).

## Credentials

Follow the [First steps guide to get your API key](https://userapi.ai/first-steps).

Create `UserAPI API` credentials in n8n and set:

- `API Key`: your UserAPI key

The node sends required headers automatically:

- `api-key: <your_api_key>`
- `Content-Type: application/json` (for JSON requests)

## Example workflow

Basic generation flow:

1. `UserAPI` -> `Imagine` (provide prompt)
2. `UserAPI` -> `Status` (poll using returned hash)  
   or open **Additional Fields → Webhook URL** in `Imagine` and receive callbacks in an n8n `Webhook` node (or your own webhook endpoint)

Ready-to-import example workflows (generate and upscale, Telegram bot, bulk generation from Google Sheets): https://gist.github.com/nikoole/c284f7cbe7499a2ac9ac954904c399bb

Optional settings such as `Webhook URL`, `Account Hash` and `Callback ID` are under **Additional Fields** in each operation.

## Compatibility

- n8n version: `1.80.0` and above
- Node.js: `18.10` or higher

## Support

- Issues and bug reports: [GitHub Issues](https://github.com/userapi-ai/n8n-nodes-userapi/issues)
- Telegram support: [UserApi.Ai Telegram](https://t.me/userapiai)
- API onboarding and key setup: [First steps guide](https://userapi.ai/first-steps)
- UserAPI website: [UserApi.Ai Website](https://userapi.ai)

## Contributing

Contributions are welcome. Please open an issue first for major changes and include clear reproduction steps for bug reports.

## License

MIT

## Disclaimer

This is an official UserApi.Ai package for integrating UserAPI endpoints in n8n workflows.

