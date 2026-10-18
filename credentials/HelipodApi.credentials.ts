import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

/** A Helipod API key (hel_…) from Settings → API keys, with the products this workflow needs. */
export class HelipodApi implements ICredentialType {
	name = 'helipodApi';
	displayName = 'Helipod API Key';
	icon = 'file:helipod.svg' as const;
	documentationUrl = 'https://docs.helipod.io/docs/helipod/n8n';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			placeholder: 'hel_…',
			description: 'Create one in the Helipod dashboard: Settings → API keys. Tick the products the workflow uses.',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } },
	};
	test: ICredentialTestRequest = {
		request: { baseURL: 'https://api.helipod.io/api', url: '/containers/projects' },
	};
}
