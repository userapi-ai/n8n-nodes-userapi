# n8n-nodes-userapi

Community node package for using UserApi.Ai: API layer to image generation tool endpoints in n8n workflows.

> Official package by UserApi.Ai.

## Overview

Official resources:

- [Website](https://userapi.ai)
- [First steps: get your API key](https://userapi.ai/first-steps)

## Features

- Supports all currently available UserApi.Ai methods in this node package.
- ✨ [Imagine](https://userapi.ai/doc#imagine)
- ⬆️ [Upscale](https://userapi.ai/doc#upscale)
- 🔄 [Variation](https://userapi.ai/doc#variation)
- 🔀 [Blend](https://userapi.ai/doc#blend)
- 📝 [Describe](https://userapi.ai/doc#describe)
- 🎬 [Animate](https://userapi.ai/doc#animate)
- 🖌️ [Inpaint](https://userapi.ai/doc#inpaint)
- And more: [See full docs](https://userapi.ai/doc)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Quick Install

```text
# In n8n
# Go to Settings > Community Nodes
# Install: n8n-nodes-userapi
```

## Credentials

Follow the [First steps guide to get your API key](https://userapi.ai/first-steps).

Create `UserAPI` credentials in n8n and set:

- `API Key`: your UserAPI key

The node sends required headers automatically:

- `api-key: <your_api_key>`
- `Content-Type: application/json` (for JSON requests)

## Example workflow

Basic generation flow:

1. `UserAPI` -> `Imagine` (provide prompt)
2. `UserAPI` -> `Status` (poll using returned hash)  
   or set `webhook_url` in `Imagine` and receive callbacks in an n8n `Webhook` node (or your own webhook endpoint)

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

