import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { getDomains } from './listSearch/getDomains';
import { getEnvironments } from './listSearch/getEnvironments';
import { getProjects } from './listSearch/getProjects';
import { getServices } from './listSearch/getServices';
import { getVpsList } from './listSearch/getVpsList';
import { accountDescription } from './resources/account';
import { domainDescription } from './resources/domain';
import { emailDescription } from './resources/email';
import { projectDescription } from './resources/project';
import { serviceDescription } from './resources/service';
import { vpsDescription } from './resources/vps';
import { API_BASE_URL } from './shared/transport';

export class Helipod implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Helipod',
		name: 'helipod',
		icon: { light: 'file:../../icons/helipod.svg', dark: 'file:../../icons/helipod.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Deploy and restart services, manage VPS, check domains and send email on Helipod',
		defaults: {
			name: 'Helipod',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'helipodApi',
				required: true,
				displayOptions: { show: { authentication: ['apiKey'] } },
			},
			{
				name: 'helipodOAuth2Api',
				required: true,
				displayOptions: { show: { authentication: ['oAuth2'] } },
			},
		],
		requestDefaults: {
			baseURL: API_BASE_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{ name: 'API Key', value: 'apiKey' },
					{ name: 'OAuth2', value: 'oAuth2' },
				],
				default: 'apiKey',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Domain', value: 'domain' },
					{ name: 'Email', value: 'email' },
					{ name: 'Project', value: 'project' },
					{ name: 'Service', value: 'service' },
					{ name: 'Virtual Server (VPS)', value: 'vps' },
				],
				default: 'service',
			},
			...accountDescription,
			...domainDescription,
			...emailDescription,
			...projectDescription,
			...serviceDescription,
			...vpsDescription,
		],
	};

	methods = {
		listSearch: {
			getDomains,
			getEnvironments,
			getProjects,
			getServices,
			getVpsList,
		},
	};
}
