import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { environmentSelect, serviceSelect } from '../../shared/descriptions';
import {
	dryRunOption,
	idempotencyKey,
	returnAllOrLimit,
	simplifyOption,
	simplifyTo,
	unwrapData,
} from '../../shared/utils';

const showOnlyForServices = { resource: ['service'] };

const SIMPLE_FIELDS = [
	'id',
	'name',
	'status',
	'projectId',
	'environmentId',
	'source',
	'domains',
	'latestDeployment',
	'dailyCost',
];
const simplified = {
	output: {
		postReceive: [...unwrapData.output.postReceive, simplifyTo(SIMPLE_FIELDS)],
	},
};

type Variable = { name?: string; value?: string; secret?: boolean };

/** Set Variables body: { variables: { KEY: value }, secrets: [KEY] }. */
async function variablesBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const list = (
		(this.getNodeParameter('variables', {}) as { variable?: Variable[] }).variable ?? []
	).filter((v) => v.name);
	if (!list.length) {
		throw new NodeOperationError(this.getNode(), 'Add at least one variable with a name', {
			description: 'Open "Variables" and click "Add Variable"',
		});
	}
	requestOptions.body = {
		variables: Object.fromEntries(list.map((v) => [v.name, v.value ?? ''])),
		secrets: list.filter((v) => v.secret).map((v) => v.name),
	};
	return requestOptions;
}

type Port = { port?: number; protocol?: string; public?: boolean };
type CreateOptions = {
	branch?: string;
	rootDirectory?: string;
	registryUsername?: string;
	registryPassword?: string;
	cpu?: number;
	ram?: number;
	startCommand?: string;
	healthcheckPath?: string;
	deploy?: boolean;
};

/** Create body: { name, source: { image | repo | dockerfile }, ports, variables, cpu, ram, ..., deploy }. */
async function createServiceBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const sourceType = this.getNodeParameter('sourceType') as string;
	const options = this.getNodeParameter('createOptions', {}) as CreateOptions;
	let source: IDataObject;
	if (sourceType === 'image') {
		source = { image: this.getNodeParameter('image') as string };
		if (options.registryUsername) {
			source.registryUsername = options.registryUsername;
			source.registryPassword = options.registryPassword ?? '';
		}
	} else if (sourceType === 'repo') {
		source = { repo: this.getNodeParameter('repo') as string };
		if (options.branch) source.branch = options.branch;
		if (options.rootDirectory) source.rootDirectory = options.rootDirectory;
	} else {
		source = { dockerfile: this.getNodeParameter('dockerfile') as string };
	}
	const ports = ((this.getNodeParameter('ports', {}) as { port?: Port[] }).port ?? [])
		.filter((p) => p.port)
		.map((p) => ({ port: p.port, protocol: p.protocol ?? 'http', public: p.public ?? true }));
	const variables = (
		(this.getNodeParameter('serviceVariables', {}) as { variable?: Variable[] }).variable ?? []
	).filter((v) => v.name);
	requestOptions.body = {
		name: this.getNodeParameter('serviceName') as string,
		source,
		...(ports.length ? { ports } : {}),
		...(variables.length
			? { variables: Object.fromEntries(variables.map((v) => [v.name, v.value ?? ''])) }
			: {}),
		...(options.cpu ? { cpu: options.cpu } : {}),
		...(options.ram ? { ram: options.ram } : {}),
		...(options.startCommand ? { startCommand: options.startCommand } : {}),
		...(options.healthcheckPath ? { healthcheck: { path: options.healthcheckPath } } : {}),
		...(options.deploy === false ? { deploy: false } : {}),
	};
	return requestOptions;
}

/** Deploy Template body: { inputs: { NAME: value } }. */
async function templateBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const inputs = (
		(
			this.getNodeParameter('templateInputs', {}) as {
				input?: Array<{ name?: string; value?: string }>;
			}
		).input ?? []
	).filter((i) => i.name);
	requestOptions.body = inputs.length
		? { inputs: Object.fromEntries(inputs.map((i) => [i.name, i.value ?? ''])) }
		: {};
	return requestOptions;
}

/** Create Stack body: { spec, inputs?, deploy? } from JSON parameters. */
async function stackBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const parse = (name: string, label: string) => {
		const raw = this.getNodeParameter(name, '') as string | IDataObject;
		if (typeof raw !== 'string') return raw;
		if (!raw.trim()) return undefined;
		try {
			return JSON.parse(raw) as IDataObject;
		} catch {
			throw new NodeOperationError(this.getNode(), `${label} is not valid JSON`);
		}
	};
	const spec = parse('stackSpec', 'Spec');
	if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
		throw new NodeOperationError(this.getNode(), 'Spec must be a JSON object', {
			description: 'For example { "version": 1, "services": [ ... ] }',
		});
	}
	const inputs = parse('stackInputs', 'Inputs');
	requestOptions.body = {
		spec,
		...(inputs ? { inputs } : {}),
		...(this.getNodeParameter('stackDeploy', true) === false ? { deploy: false } : {}),
	};
	return requestOptions;
}

export const serviceDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForServices },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a service',
				description:
					'Create a service from a container image, a Git repository or a Dockerfile, and deploy it. Billed daily once deployed.',
				routing: {
					send: { preSend: [createServiceBody, idempotencyKey] },
					request: {
						method: 'POST',
						url: '=/containers/environments/{{$parameter.environment}}/services',
					},
					...unwrapData,
				},
			},
			{
				name: 'Create Stack',
				value: 'createStack',
				action: 'Create a stack of services',
				description:
					'Create several connected services from a template spec and deploy them in order. Billed daily once deployed.',
				routing: {
					send: { preSend: [stackBody, idempotencyKey] },
					request: {
						method: 'POST',
						url: '=/containers/environments/{{$parameter.environment}}/stacks',
					},
					...unwrapData,
				},
			},
			{
				name: 'Delete Variable',
				value: 'deleteVariable',
				action: 'Delete a variable of a service',
				description: 'Delete one environment variable of a service. It applies on the next deploy.',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/containers/services/{{$parameter.service}}/variables/{{encodeURIComponent($parameter.variableName)}}',
					},
					...unwrapData,
				},
			},
			{
				name: 'Deploy',
				value: 'deploy',
				action: 'Deploy a service',
				description:
					"Build and deploy the latest source of a service. A deploy charges the service's cost for today.",
				routing: {
					request: {
						method: 'POST',
						url: '=/containers/services/{{$parameter.service}}/deployments',
					},
					...unwrapData,
				},
			},
			{
				name: 'Deploy Template',
				value: 'deployTemplate',
				action: 'Deploy a template',
				description:
					'Create and deploy every service of a one-click template (n8n, WordPress, Postgres, ...). Billed daily.',
				routing: {
					send: { preSend: [templateBody, idempotencyKey] },
					request: {
						method: 'POST',
						url: '=/containers/environments/{{$parameter.environment}}/templates/{{$parameter.template}}',
					},
					...unwrapData,
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a service',
				description: 'Get a service with its status, domains and latest deployment',
				routing: {
					request: { method: 'GET', url: '=/containers/services/{{$parameter.service}}' },
					...simplified,
				},
			},
			{
				name: 'Get Deployments',
				value: 'getDeployments',
				action: 'Get deployments of a service',
				description: 'Get the latest deployments of a service, newest first',
				routing: {
					request: {
						method: 'GET',
						url: '=/containers/services/{{$parameter.service}}/deployments',
					},
					...unwrapData,
				},
			},
			{
				name: 'Get Logs',
				value: 'getLogs',
				action: 'Get logs of a service',
				description: 'Get the recent runtime logs of a service, newest first',
				routing: {
					request: { method: 'GET', url: '=/containers/services/{{$parameter.service}}/logs' },
					...unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many services',
				description: 'Get many services of a project environment',
				routing: {
					request: {
						method: 'GET',
						url: '=/containers/environments/{{$parameter.environment}}/services',
					},
					...simplified,
				},
			},
			{
				name: 'Get Templates',
				value: 'getTemplates',
				action: 'Get templates',
				description: 'Get the one-click templates that can be deployed',
				routing: { request: { method: 'GET', url: '/containers/templates' }, ...unwrapData },
			},
			{
				name: 'Restart',
				value: 'restart',
				action: 'Restart a service',
				description: 'Restart the running containers of a service without a new build',
				routing: {
					request: { method: 'POST', url: '=/containers/services/{{$parameter.service}}/restart' },
					...unwrapData,
				},
			},
			{
				name: 'Set Variables',
				value: 'setVariables',
				action: 'Set variables of a service',
				description:
					'Create or update environment variables of a service (other variables are kept). They apply on the next deploy.',
				routing: {
					send: { preSend: [variablesBody] },
					request: {
						method: 'PUT',
						url: '=/containers/services/{{$parameter.service}}/variables',
					},
					...unwrapData,
				},
			},
		],
		default: 'get',
	},
	{
		...environmentSelect,
		displayOptions: {
			show: {
				...showOnlyForServices,
				operation: ['create', 'createStack', 'deployTemplate', 'getAll'],
			},
		},
	},
	{
		...serviceSelect,
		displayOptions: {
			show: {
				...showOnlyForServices,
				operation: [
					'deleteVariable',
					'deploy',
					'get',
					'getDeployments',
					'getLogs',
					'restart',
					'setVariables',
				],
			},
		},
	},
	...returnAllOrLimit({ resource: ['service'], operation: ['getAll'] }),
	simplifyOption({ resource: ['service'], operation: ['get', 'getAll'] }),
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { ...showOnlyForServices, operation: ['getDeployments'] } },
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		description: 'Max number of results to return',
		routing: { send: { type: 'query', property: 'limit' } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { ...showOnlyForServices, operation: ['getLogs'] } },
		typeOptions: { minValue: 1, maxValue: 1000 },
		default: 50,
		description: 'Max number of results to return',
		routing: { send: { type: 'query', property: 'limit' } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: { show: { ...showOnlyForServices, operation: ['getLogs'] } },
		default: {},
		options: [
			{
				displayName: 'Since',
				name: 'since',
				type: 'string',
				default: '1h',
				placeholder: 'e.g. 30m',
				description:
					'How far back to read: minutes (m), hours (h) or days (d), for example 30m, 6h or 2d',
				routing: { send: { type: 'query', property: 'since' } },
			},
			{
				displayName: 'Contains Text',
				name: 'filter',
				type: 'string',
				default: '',
				placeholder: 'e.g. error',
				description: 'Return only log lines that contain this text',
				routing: { send: { type: 'query', property: 'filter' } },
			},
		],
	},
	{
		displayName: 'Variables',
		name: 'variables',
		type: 'fixedCollection',
		placeholder: 'Add Variable',
		required: true,
		typeOptions: { multipleValues: true },
		displayOptions: { show: { ...showOnlyForServices, operation: ['setVariables'] } },
		default: {},
		options: [
			{
				displayName: 'Variable',
				name: 'variable',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: 'e.g. DATABASE_URL',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Secret',
						name: 'secret',
						type: 'boolean',
						default: false,
						description:
							'Whether the value is hidden after saving. A secret cannot be read back or made visible again.',
					},
				],
			},
		],
	},
	{
		displayName: 'Variable Name',
		name: 'variableName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. DATABASE_URL',
		displayOptions: { show: { ...showOnlyForServices, operation: ['deleteVariable'] } },
	},

	// ── Create ──
	{
		displayName: 'Service Name',
		name: 'serviceName',
		type: 'string',
		required: true,
		displayOptions: { show: { ...showOnlyForServices, operation: ['create'] } },
		default: '',
		placeholder: 'e.g. web',
		description: 'Letters, digits, _ and -, starting with a letter (up to 40)',
	},
	{
		displayName: 'Source',
		name: 'sourceType',
		type: 'options',
		displayOptions: { show: { ...showOnlyForServices, operation: ['create'] } },
		options: [
			{ name: 'Container Image', value: 'image' },
			{ name: 'Dockerfile', value: 'dockerfile' },
			{ name: 'Git Repository', value: 'repo' },
		],
		default: 'image',
	},
	{
		displayName: 'Image',
		name: 'image',
		type: 'string',
		required: true,
		displayOptions: {
			show: { ...showOnlyForServices, operation: ['create'], sourceType: ['image'] },
		},
		default: '',
		placeholder: 'e.g. nginx:alpine',
	},
	{
		displayName: 'Repository',
		name: 'repo',
		type: 'string',
		required: true,
		displayOptions: {
			show: { ...showOnlyForServices, operation: ['create'], sourceType: ['repo'] },
		},
		default: '',
		placeholder: 'e.g. https://github.com/acme/web',
		description:
			'A Git URL, or owner/name for GitHub. Private repositories need GitHub or GitLab connected in Helipod.',
	},
	{
		displayName: 'Dockerfile',
		name: 'dockerfile',
		type: 'string',
		required: true,
		typeOptions: { rows: 6 },
		displayOptions: {
			show: { ...showOnlyForServices, operation: ['create'], sourceType: ['dockerfile'] },
		},
		default: '',
		placeholder: 'e.g. FROM nginx:alpine',
	},
	{
		displayName: 'Ports',
		name: 'ports',
		type: 'fixedCollection',
		placeholder: 'Add Port',
		typeOptions: { multipleValues: true },
		displayOptions: { show: { ...showOnlyForServices, operation: ['create'] } },
		default: {},
		description: 'Each public HTTP port gets an HTTPS *.helipod.app domain',
		options: [
			{
				displayName: 'Port',
				name: 'port',
				values: [
					{ displayName: 'Port', name: 'port', type: 'number', default: 80 },
					{
						displayName: 'Protocol',
						name: 'protocol',
						type: 'options',
						options: [
							{ name: 'HTTP', value: 'http' },
							{ name: 'TCP', value: 'tcp' },
						],
						default: 'http',
					},
					{
						displayName: 'Public',
						name: 'public',
						type: 'boolean',
						default: true,
						description: 'Whether an HTTP port gets a public *.helipod.app domain',
					},
				],
			},
		],
	},
	{
		displayName: 'Variables',
		name: 'serviceVariables',
		type: 'fixedCollection',
		placeholder: 'Add Variable',
		typeOptions: { multipleValues: true },
		displayOptions: { show: { ...showOnlyForServices, operation: ['create'] } },
		default: {},
		description:
			'Environment variables. Values may reference other services, e.g. ${{Postgres.DATABASE_URL}}.',
		options: [
			{
				displayName: 'Variable',
				name: 'variable',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: 'e.g. NODE_ENV',
					},
					{ displayName: 'Value', name: 'value', type: 'string', default: '' },
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'createOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: { show: { ...showOnlyForServices, operation: ['create'] } },
		default: {},
		options: [
			{
				displayName: 'Branch',
				name: 'branch',
				type: 'string',
				default: 'main',
				description: 'Git repository only',
			},
			{
				displayName: 'CPU (Millicores)',
				name: 'cpu',
				type: 'number',
				typeOptions: { minValue: 125, maxValue: 4000 },
				default: 250,
				description: 'A multiple of 125 (1000 = one vCPU)',
			},
			{
				displayName: 'Deploy',
				name: 'deploy',
				type: 'boolean',
				default: true,
				description: 'Whether to deploy right away. Off: only create it (nothing is charged).',
			},
			{
				displayName: 'Health Check Path',
				name: 'healthcheckPath',
				type: 'string',
				default: '',
				placeholder: 'e.g. /health',
				description: 'An HTTP path that answers 2xx when the service is ready',
			},
			{
				displayName: 'Memory (MB)',
				name: 'ram',
				type: 'number',
				typeOptions: { minValue: 128, maxValue: 8192 },
				default: 512,
				description: 'A multiple of 128',
			},
			{
				displayName: 'Registry Password',
				name: 'registryPassword',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Private image only, with Registry Username',
			},
			{
				displayName: 'Registry Username',
				name: 'registryUsername',
				type: 'string',
				default: '',
				description: 'Private image only',
			},
			{
				displayName: 'Root Directory',
				name: 'rootDirectory',
				type: 'string',
				default: '',
				placeholder: 'e.g. apps/web',
				description: 'Git repository only: the folder to build in a monorepo',
			},
			{
				displayName: 'Start Command',
				name: 'startCommand',
				type: 'string',
				default: '',
				placeholder: 'e.g. node server.js',
			},
		],
	},
	dryRunOption({ resource: ['service'], operation: ['create'] }, 'creating the service'),

	// ── Deploy Template ──
	{
		displayName: 'Template Name or ID',
		name: 'template',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getTemplates' },
		displayOptions: { show: { ...showOnlyForServices, operation: ['deployTemplate'] } },
		default: '',
		description:
			'The one-click template. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Inputs',
		name: 'templateInputs',
		type: 'fixedCollection',
		placeholder: 'Add Input',
		typeOptions: { multipleValues: true },
		displayOptions: { show: { ...showOnlyForServices, operation: ['deployTemplate'] } },
		default: {},
		description: "Answers to the template's inputs, if it has any",
		options: [
			{
				displayName: 'Input',
				name: 'input',
				values: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Value', name: 'value', type: 'string', default: '' },
				],
			},
		],
	},

	// ── Create Stack ──
	{
		displayName: 'Spec',
		name: 'stackSpec',
		type: 'json',
		required: true,
		displayOptions: { show: { ...showOnlyForServices, operation: ['createStack'] } },
		default:
			'{\n  "version": 1,\n  "services": [\n    {\n      "key": "web",\n      "name": "web",\n      "source": { "image": "nginx:alpine" },\n      "ports": [{ "port": 80 }]\n    }\n  ]\n}',
		description:
			'The template spec: { version: 1, inputs?, services: [...] }. See https://docs.helipod.io/docs/container-api/templates-and-stacks.',
	},
	{
		displayName: 'Inputs',
		name: 'stackInputs',
		type: 'json',
		displayOptions: { show: { ...showOnlyForServices, operation: ['createStack'] } },
		default: '',
		placeholder: 'e.g. { "DOMAIN": "app.example.com" }',
		description: "A JSON object with answers to the spec's inputs",
	},
	{
		displayName: 'Deploy',
		name: 'stackDeploy',
		type: 'boolean',
		displayOptions: { show: { ...showOnlyForServices, operation: ['createStack'] } },
		default: true,
		description: 'Whether to deploy right away. Off: only create the services.',
	},
	dryRunOption({ resource: ['service'], operation: ['createStack'] }, 'creating the stack'),

	// ── Get Templates ──
	{
		displayName: 'Filters',
		name: 'templateFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: { show: { ...showOnlyForServices, operation: ['getTemplates'] } },
		default: {},
		options: [
			{
				displayName: 'Category',
				name: 'category',
				type: 'string',
				default: '',
				placeholder: 'e.g. Automation',
				routing: {
					send: { type: 'query', property: 'category', value: '={{ $value || undefined }}' },
				},
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				placeholder: 'e.g. wordpress',
				routing: {
					send: { type: 'query', property: 'search', value: '={{ $value || undefined }}' },
				},
			},
		],
	},
];
