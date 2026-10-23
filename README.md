# n8n-nodes-helipod

This is an n8n community node. It lets you use [Helipod](https://helipod.io) in your n8n workflows.

Helipod is a cloud platform for deploying apps, databases and workers, running VPS, registering domains,
sending email and calling AI models. With this node a workflow can create and redeploy services, run SQL on a
managed Postgres database, ask an AI model, generate images, order and back up VPS, manage DNS records, send email
and watch invoices and notifications.

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
| Account | Get Invoices, Get Notifications, Get Wallet, Get Wallet Transactions, Mark Notification as Read |
| AI | Generate Image, Get Balance, Get Image, Get Models, Get Usage, Message a Model |
| Database | Create, Execute Query, Get, Get Connection, Get Many, Get Tables |
| Domain | Check Availability, Delete DNS Record, Get DNS Records, Get Many, Register, Update DNS Record |
| Email | Send |
| Project | Get, Get Many |
| Service | Create, Create Stack, Delete Variable, Deploy, Deploy Template, Get, Get Deployments, Get Logs, Get Many, Get Templates, Restart, Set Variables |
| Virtual Server (VPS) | Add Port Forward, Create, Create Snapshot, Get, Get Backup, Get Many, Get Metrics, Get Plans, Get Port Forwards, Get Restore Points, Remove Port Forward, Restart, Run Backup, Start, Stop |

Operations that cost money (Service → Create, Create Stack, Deploy, Deploy Template; Domain → Register; VPS →
Create; AI → Message a Model, Generate Image) are paid from the Helipod wallet or AI balance. Service → Create,
Create Stack, Domain → Register and AI → Generate Image have a **Dry Run** switch that only returns the price.
Database → Execute Query is read-only unless **Allow Writes** is on.

Projects, environments, services, databases, VPS and domains can be picked from a searchable list or entered by
ID. Models, VPS plans, OS templates and templates are picked from a list.

When the Helipod API refuses a request, the node shows its own message (for example "This statement changes data
(CREATE). Send allowWrite: true to run it.") with its error code.

The node can also be used as a tool by the n8n AI Agent.

## Credentials

The node supports two ways to sign in.

### API key

1. In the [Helipod dashboard](https://helipod.io), open **Settings → API keys** and create a key.
2. Tick the products the workflow uses (for example Containers and VPS). The AI and Account products are only
   included when you tick them. A key can also be limited to one project or to read-only access.
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
to allow purchases. New credentials ask for every product; a credential made with 0.2 asks for fewer, so
reconnect it (or edit its Scope) to use databases, AI or DNS changes.

## Compatibility

Tested with n8n 2.44.6 and 1.110.1. Requires n8n 1.0 or later.

## Usage

- **Deploy on push:** a Webhook or GitHub Trigger node followed by **Service → Deploy**.
- **Restart when a health check fails:** a Schedule Trigger, an HTTP Request to your app, an If node and
  **Service → Restart**.
- **Watch for errors:** **Service → Get Logs** with *Contains Text* set to `error`, then Slack or Email.
- **Low balance alert:** **Account → Get Wallet** on a schedule, then notify when the balance is low.
- **Send email:** **Email → Send** from an address on a domain verified in Helipod Email.
- **Summarize with AI:** **Service → Get Logs**, then **AI → Message a Model** with the logs in the prompt.
- **Report from your database:** **Database → Execute Query** on a schedule, then Google Sheets or Slack.
- **Point a domain at a new server:** **VPS → Create**, then **Domain → Update DNS Record** with its IP address.
- **Unpaid invoice reminder:** **Account → Get Invoices** on a schedule, then notify on a pending one.

A deploy charges the service's cost for today, and **Set Variables** and **Delete Variable** apply on the next deploy.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [Helipod n8n guide](https://docs.helipod.io/docs/helipod/n8n)
* [Helipod API documentation](https://docs.helipod.io)

## Version history

### 0.3.0

- New resources: **AI** (message a model, generate images, models, usage, balance) and **Database** (create,
  execute SQL with parameters, connection string, tables).
- Service → Create (image, Git repository or Dockerfile), Create Stack, Deploy Template, Get Templates.
- Domain → Register (with Dry Run), Update DNS Record, Delete DNS Record.
- VPS → Create, Get Plans, Get Backup, Run Backup, Get Restore Points, port forwards (get, add, remove).
- Account → Get Invoices, Get Notifications, Mark Notification as Read, Get Wallet Transactions.
- Errors show the Helipod API's own message and code instead of a generic "Bad request".
- OAuth2: the default scope asks for every product.

### 0.2.1

- Service starts on Get instead of Deploy, so a new node or AI tool starts on a free, read-only action.

### 0.2.0

- Searchable pickers for projects, environments, services, VPS and domains.
- New operations: Service → Delete Variable, VPS metrics range, VPS status filter.
- Set Variables takes name and value pairs, with an option to save a value as secret.
- Email → Send: email format, CC, BCC, Reply To and Idempotency Key.
- Return All, Limit and Simplify on list operations.
- Built with the n8n node CLI and published from GitHub Actions with npm provenance.

### 0.1.0

First release.
