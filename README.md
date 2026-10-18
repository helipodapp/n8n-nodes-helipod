# n8n-nodes-helipod

This is an n8n community node. It lets you use [Helipod](https://helipod.io) in your n8n workflows.

Helipod is a cloud platform for deploying apps, databases and workers, running VPS, registering domains and
sending email. With this node a workflow can redeploy a service when something changes, restart it, read its logs,
start or stop a VPS, check a domain or send an email.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. The package name is `n8n-nodes-helipod`.

## Operations

| Resource | Operations |
| --- | --- |
| Account | Get Wallet |
| Domain | Check Availability, Get DNS Records, Get Many |
| Email | Send |
| Project | Get, Get Many |
| Service | Delete Variable, Deploy, Get, Get Deployments, Get Logs, Get Many, Restart, Set Variables |
| Virtual Server (VPS) | Create Snapshot, Get, Get Many, Get Metrics, Restart, Start, Stop |

Projects, environments, services, VPS and domains can be picked from a searchable list or entered by ID.

The node can also be used as a tool by the n8n AI Agent.

## Credentials

The node supports two ways to sign in.

### API key

1. In the [Helipod dashboard](https://helipod.io), open **Settings → API keys** and create a key.
2. Tick the products the workflow uses (for example Containers and VPS). A key can also be limited to one project
   or to read-only access.
3. In n8n, create a **Helipod API** credential and paste the key.

### OAuth2 (Connect with Helipod)

Use this when you do not want to paste a key, or when several people connect their own Helipod accounts.

1. In the Helipod dashboard, open **Settings → Developer apps** and create an app.
2. Copy the **OAuth Redirect URL** shown on the n8n **Helipod OAuth2 API** credential and add it as the app's
   redirect URI.
3. Paste the app's Client ID and Client Secret into the credential and click **Connect my account**.
4. On the Helipod consent screen, choose the products, read-only access and an optional monthly spend limit.

The **Scope** field lists the products the workflow asks for, separated by spaces: `containers`, `vps`, `domains`,
`databases`, `email`, `ai`, `account`. Add `:read` for read-only access (for example `domains:read`), and `spend`
to allow purchases.

## Compatibility

Tested with n8n 2.x. Requires n8n 1.0 or later.

## Usage

- **Deploy on push:** a Webhook or GitHub Trigger node followed by **Service → Deploy**.
- **Restart when a health check fails:** a Schedule Trigger, an HTTP Request to your app, an If node and
  **Service → Restart**.
- **Watch for errors:** **Service → Get Logs** with *Contains Text* set to `error`, then Slack or Email.
- **Low balance alert:** **Account → Get Wallet** on a schedule, then notify when the balance is low.
- **Send email:** **Email → Send** from an address on a domain verified in Helipod Email.

A deploy charges the service's cost for today, and **Set Variables** and **Delete Variable** apply on the next deploy.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [Helipod n8n guide](https://docs.helipod.io/docs/helipod/n8n)
* [Helipod API documentation](https://docs.helipod.io)

## Version history

### 0.2.0

- Searchable pickers for projects, environments, services, VPS and domains.
- New operations: Service → Delete Variable, VPS metrics range, VPS status filter.
- Set Variables takes name and value pairs, with an option to save a value as secret.
- Email → Send: email format, CC, BCC, Reply To and Idempotency Key.
- Return All, Limit and Simplify on list operations.
- Built with the n8n node CLI and published from GitHub Actions with npm provenance.

### 0.1.0

First release.
