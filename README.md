# n8n-nodes-helipod

An [n8n](https://n8n.io) community node for [Helipod](https://helipod.io): redeploy or restart a service when
something happens, start and stop VPS, check a domain, send an email from your own domain, or read your wallet.

## Install

In n8n: **Settings → Community nodes → Install**, enter `n8n-nodes-helipod`.

## Credentials

Pick one in the node's **Authentication** field.

**API key** (quickest): in the Helipod dashboard open **Settings → API keys**, create a key with the products the
workflow uses (Container API, VPS API, Domain API, Email API, Account API), and paste it into a *Helipod API Key*
credential.

**OAuth2 (Connect with Helipod)**: sign in instead of pasting a key, and choose on Helipod's own screen what n8n may
do (read only, purchases on or off, a monthly spending limit).

1. Create a *Helipod OAuth2 API* credential in n8n and copy its **OAuth Redirect URL**.
2. In Helipod open **Settings → Developer apps → Register app**, tick *It has a server that can keep a secret*, and
   paste that URL as the redirect URI.
3. Copy the app's **Client ID** and **Client secret** into the n8n credential and click **Connect**.

The **Scope** field asks for products (`containers vps domains databases email ai account`), `<product>:read` for
read-only access, and `spend` to allow purchases. The account owner can narrow all of it on the consent screen and
change it later in **Settings → API keys → Connected apps**.

## Operations

| Resource | Operations |
|---|---|
| Project | Get Many, Get (with its environments) |
| Service | Get Many, Get, Deploy, Restart, Get Deployments, Get Logs, Set Variables |
| VPS | Get Many, Get, Get Metrics, Start, Stop, Restart, Create Snapshot |
| Domain | Search, Get Many, Get DNS Records |
| Email | Send |
| Account | Get Wallet |

Every result is the API's `data`. Errors carry the API's `code` (for example `SCOPE_NOT_ALLOWED`,
`READ_ONLY_ACCESS`, `PURCHASE_NOT_ALLOWED`). The node can also be used as a tool by n8n's AI Agent.

Docs: https://docs.helipod.io/docs/helipod/n8n · API reference: https://docs.helipod.io

## License

MIT
