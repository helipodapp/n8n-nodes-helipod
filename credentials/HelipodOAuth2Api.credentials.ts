import type { ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * "Connect with Helipod": sign in instead of pasting a key. Register an app in Settings → Developer apps with this
 * n8n's OAuth callback URL as its redirect URI (shown on this credential), then paste its Client ID and Secret.
 * The scope asks for products (vps, containers, domains, databases, email, ai, account), "<product>:read" for
 * read-only, and "spend" to allow purchases; the account owner can still change all of it on the consent screen.
 */
export class HelipodOAuth2Api implements ICredentialType {
	name = 'helipodOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'Helipod OAuth2 API';
	icon = 'file:helipod.svg' as const;
	documentationUrl = 'https://docs.helipod.io/docs/helipod/n8n';
	properties: INodeProperties[] = [
		{ displayName: 'Grant Type', name: 'grantType', type: 'hidden', default: 'pkce' },
		{ displayName: 'Authorization URL', name: 'authUrl', type: 'hidden', default: 'https://helipod.io/oauth/authorize' },
		{ displayName: 'Access Token URL', name: 'accessTokenUrl', type: 'hidden', default: 'https://api.helipod.io/oauth/token' },
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: 'containers vps domains:read email',
			description: 'Space separated. Add "spend" to let workflows make purchases; "<product>:read" asks for read-only access.',
		},
		{ displayName: 'Auth URI Query Parameters', name: 'authQueryParameters', type: 'hidden', default: '' },
		{ displayName: 'Authentication', name: 'authentication', type: 'hidden', default: 'header' },
	];
}
