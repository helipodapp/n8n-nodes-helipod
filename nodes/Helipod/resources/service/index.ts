import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { environmentSelect, serviceSelect } from '../../shared/descriptions';
import { returnAllOrLimit, simplifyOption, simplifyTo, unwrapData } from '../../shared/utils';

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

export const serviceDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForServices },
		options: [
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
		displayOptions: { show: { ...showOnlyForServices, operation: ['getAll'] } },
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
];
