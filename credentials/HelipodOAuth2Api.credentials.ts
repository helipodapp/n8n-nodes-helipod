import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * "Connect with Helipod": sign in instead of pasting a key. Register an app in Settings → Developer apps with the
 * OAuth Redirect URL shown on this credential, then paste its Client ID and Client Secret. The account owner
 * chooses the products, read-only access and a monthly spend limit on the consent screen.
 */
export class HelipodOAuth2Api implements ICredentialType {
	name = 'helipodOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Helipod OAuth2 API';

	icon: Icon = { light: 'file:../icons/helipod.svg', dark: 'file:../icons/helipod.dark.svg' };

	documentationUrl = 'https://docs.helipod.io/docs/helipod/n8n';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'pkce',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://helipod.io/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.helipod.io/oauth/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: 'containers vps domains:read email account:read',
			description:
				'Space-separated products the workflow may use (containers, vps, domains, databases, email, ai, account). Add ":read" for read-only access, and "spend" to allow purchases.',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
