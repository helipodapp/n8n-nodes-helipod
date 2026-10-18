import type { INodeProperties, INodeType, INodeTypeDescription } from 'n8n-workflow';

// The Helipod public API (https://docs.helipod.io): every call is routed declaratively from the fields below.
// Responses are { success, data }: the node returns `data` (lists become one item per element).

const unwrap = { output: { postReceive: [{ type: 'rootProperty' as const, properties: { property: 'data' } }] } };
const ifAll = (resource: string, operation: string[]) => ({ show: { resource: [resource], operation } });

const id = (name: string, displayName: string, resource: string, operation: string[], description: string): INodeProperties => ({
	displayName, name, type: 'string', required: true, default: '', description, displayOptions: ifAll(resource, operation),
});

const operations: INodeProperties[] = [
	{
		displayName: 'Resource', name: 'resource', type: 'options', noDataExpression: true, default: 'service',
		options: [
			{ name: 'Account', value: 'account' },
			{ name: 'Domain', value: 'domain' },
			{ name: 'Email', value: 'email' },
			{ name: 'Project', value: 'project' },
			{ name: 'Service', value: 'service' },
			{ name: 'VPS', value: 'vps' },
		],
	},
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'getMany',
		displayOptions: { show: { resource: ['project'] } },
		options: [
			{ name: 'Get Many', value: 'getMany', action: 'List projects', routing: { request: { method: 'GET', url: '/containers/projects' }, ...unwrap } },
			{ name: 'Get', value: 'get', action: 'Get a project with its environments', routing: { request: { method: 'GET', url: '=/containers/projects/{{$parameter.projectId}}' }, ...unwrap } },
		],
	},
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'deploy',
		displayOptions: { show: { resource: ['service'] } },
		options: [
			{ name: 'Get Many', value: 'getMany', action: 'List services in an environment', routing: { request: { method: 'GET', url: '=/containers/environments/{{$parameter.environmentId}}/services' }, ...unwrap } },
			{ name: 'Get', value: 'get', action: 'Get a service', routing: { request: { method: 'GET', url: '=/containers/services/{{$parameter.serviceId}}' }, ...unwrap } },
			{ name: 'Deploy', value: 'deploy', action: 'Deploy a service', description: 'Build and deploy the latest source. A deploy charges today\'s cost of the service.', routing: { request: { method: 'POST', url: '=/containers/services/{{$parameter.serviceId}}/deployments' }, ...unwrap } },
			{ name: 'Restart', value: 'restart', action: 'Restart a service', routing: { request: { method: 'POST', url: '=/containers/services/{{$parameter.serviceId}}/restart' }, ...unwrap } },
			{ name: 'Get Deployments', value: 'getDeployments', action: 'List a service\'s deployments', routing: { request: { method: 'GET', url: '=/containers/services/{{$parameter.serviceId}}/deployments' }, ...unwrap } },
			{ name: 'Get Logs', value: 'getLogs', action: 'Get a service\'s recent logs', routing: { request: { method: 'GET', url: '=/containers/services/{{$parameter.serviceId}}/logs' }, ...unwrap } },
			{
				name: 'Set Variables', value: 'setVariables', action: 'Set environment variables',
				description: 'Create or update variables (others are kept). They apply on the next deploy.',
				routing: { request: { method: 'PUT', url: '=/containers/services/{{$parameter.serviceId}}/variables', body: { variables: '={{ JSON.parse($parameter.variables) }}' } }, ...unwrap },
			},
		],
	},
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'getMany',
		displayOptions: { show: { resource: ['vps'] } },
		options: [
			{ name: 'Get Many', value: 'getMany', action: 'List VPS', routing: { request: { method: 'GET', url: '/vps' }, ...unwrap } },
			{ name: 'Get', value: 'get', action: 'Get a VPS', routing: { request: { method: 'GET', url: '=/vps/{{$parameter.vpsId}}' }, ...unwrap } },
			{ name: 'Get Metrics', value: 'getMetrics', action: 'Get a VPS\'s CPU, memory and disk', routing: { request: { method: 'GET', url: '=/vps/{{$parameter.vpsId}}/metrics' }, ...unwrap } },
			{ name: 'Start', value: 'start', action: 'Start a VPS', routing: { request: { method: 'POST', url: '=/vps/{{$parameter.vpsId}}/start' }, ...unwrap } },
			{ name: 'Stop', value: 'stop', action: 'Stop a VPS', routing: { request: { method: 'POST', url: '=/vps/{{$parameter.vpsId}}/stop' }, ...unwrap } },
			{ name: 'Restart', value: 'restart', action: 'Restart a VPS', routing: { request: { method: 'POST', url: '=/vps/{{$parameter.vpsId}}/restart' }, ...unwrap } },
			{ name: 'Create Snapshot', value: 'snapshot', action: 'Create a VPS snapshot', routing: { request: { method: 'POST', url: '=/vps/{{$parameter.vpsId}}/snapshots', body: { name: '={{$parameter.snapshotName || undefined}}' } }, ...unwrap } },
		],
	},
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'search',
		displayOptions: { show: { resource: ['domain'] } },
		options: [
			{ name: 'Search', value: 'search', action: 'Check if a domain is available', routing: { request: { method: 'GET', url: '/domains/search', qs: { domain: '={{$parameter.domain}}' } }, ...unwrap } },
			{ name: 'Get Many', value: 'getMany', action: 'List my domains', routing: { request: { method: 'GET', url: '/domains/mine' }, ...unwrap } },
			{ name: 'Get DNS Records', value: 'getDns', action: 'List a domain\'s DNS records', routing: { request: { method: 'GET', url: '=/domains/{{$parameter.domainId}}/dns' }, ...unwrap } },
		],
	},
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'send',
		displayOptions: { show: { resource: ['email'] } },
		options: [
			{
				name: 'Send', value: 'send', action: 'Send an email',
				routing: {
					request: {
						method: 'POST', baseURL: 'https://mail.helipod.io/api/email', url: '/send',
						headers: { 'X-Helipod-Project': '={{$parameter.projectId || undefined}}' },
						body: {
							from: '={{$parameter.from}}',
							to: '={{ $parameter.to.split(",").map(s => s.trim()).filter(Boolean) }}',
							subject: '={{$parameter.subject}}',
							html: '={{$parameter.html || undefined}}',
							text: '={{$parameter.text || undefined}}',
						},
					},
					...unwrap,
				},
			},
		],
	},
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'getWallet',
		displayOptions: { show: { resource: ['account'] } },
		options: [
			{ name: 'Get Wallet', value: 'getWallet', action: 'Get the wallet balance', routing: { request: { method: 'GET', url: '/account/wallet' }, ...unwrap } },
		],
	},
];

const fields: INodeProperties[] = [
	id('projectId', 'Project ID', 'project', ['get'], 'The project ID (UUID). "Get Many" lists them.'),
	id('environmentId', 'Environment ID', 'service', ['getMany'], 'Environment ID (UUID): Project → Get lists the environments.'),
	id('serviceId', 'Service ID', 'service', ['get', 'deploy', 'restart', 'getDeployments', 'getLogs', 'setVariables'], 'Service ID (UUID)'),
	{
		displayName: 'Variables (JSON)', name: 'variables', type: 'json', required: true, default: '{\n  "KEY": "value"\n}',
		displayOptions: ifAll('service', ['setVariables']),
	},
	id('vpsId', 'VPS ID', 'vps', ['get', 'getMetrics', 'start', 'stop', 'restart', 'snapshot'], 'VPS ID (UUID)'),
	{ displayName: 'Snapshot Name', name: 'snapshotName', type: 'string', default: '', displayOptions: ifAll('vps', ['snapshot']) },
	id('domain', 'Domain', 'domain', ['search'], 'For example tokobudi.id'),
	id('domainId', 'Domain ID', 'domain', ['getDns'], 'From "Get Many"'),
	id('from', 'From', 'email', ['send'], 'An address on a domain verified in Helipod Email, e.g. "Toko <halo@tokobudi.id>"'),
	id('to', 'To', 'email', ['send'], 'One or more addresses, comma separated'),
	id('subject', 'Subject', 'email', ['send'], ''),
	{ displayName: 'HTML', name: 'html', type: 'string', typeOptions: { rows: 4 }, default: '', displayOptions: ifAll('email', ['send']) },
	{ displayName: 'Text', name: 'text', type: 'string', typeOptions: { rows: 3 }, default: '', displayOptions: ifAll('email', ['send']) },
	{
		displayName: 'Project ID', name: 'projectId', type: 'string', default: '', displayOptions: ifAll('email', ['send']),
		description: 'Needed when the credential reaches several projects with email set up',
	},
];

export class Helipod implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Helipod',
		name: 'helipod',
		icon: 'file:helipod.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Deploy and restart services, manage VPS, check domains, send email on Helipod',
		defaults: { name: 'Helipod' },
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [
			{ name: 'helipodApi', required: true, displayOptions: { show: { authentication: ['apiKey'] } } },
			{ name: 'helipodOAuth2Api', required: true, displayOptions: { show: { authentication: ['oAuth2'] } } },
		],
		requestDefaults: {
			baseURL: 'https://api.helipod.io/api',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		},
		properties: [
			{
				displayName: 'Authentication', name: 'authentication', type: 'options', default: 'apiKey',
				options: [
					{ name: 'API Key', value: 'apiKey' },
					{ name: 'OAuth2 (Connect with Helipod)', value: 'oAuth2' },
				],
			},
			...operations,
			...fields,
		],
	};
}
