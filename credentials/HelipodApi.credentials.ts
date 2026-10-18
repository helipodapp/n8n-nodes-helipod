import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/** A Helipod API key (hel_...) from Settings → API keys, with the products the workflow uses. */
export class HelipodApi implements ICredentialType {
	name = 'helipodApi';

	displayName = 'Helipod API';

	icon: Icon = { light: 'file:../icons/helipod.svg', dark: 'file:../icons/helipod.dark.svg' };

	documentationUrl = 'https://docs.helipod.io/docs/helipod/n8n';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Create one in the Helipod dashboard under Settings → API keys, and tick the products the workflow uses',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.helipod.io/api',
			url: '/containers/projects',
			method: 'GET',
		},
	};
}
