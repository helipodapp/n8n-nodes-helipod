import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { databaseSelect, projectSelect } from '../../shared/descriptions';
import { returnAllOrLimit, unwrapData } from '../../shared/utils';

const showOnlyForDatabases = { resource: ['database'] };

type QueryOptions = { environmentId?: string; allowWrite?: boolean };

/** Execute Query body: { sql, params?, environmentId?, allowWrite? }. Parameters are a JSON array or empty. */
async function queryBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const raw = this.getNodeParameter('queryParameters', '') as string | unknown[];
	let params: unknown[] | undefined;
	if (Array.isArray(raw)) params = raw;
	else if (typeof raw === 'string' && raw.trim()) {
		try {
			params = JSON.parse(raw) as unknown[];
		} catch {
			throw new NodeOperationError(this.getNode(), 'Query Parameters must be a JSON array', {
				description: 'For example ["alice", 42] for $1 and $2',
			});
		}
		if (!Array.isArray(params)) {
			throw new NodeOperationError(this.getNode(), 'Query Parameters must be a JSON array', {
				description: 'For example ["alice", 42] for $1 and $2',
			});
		}
	}
	const options = this.getNodeParameter('queryOptions', {}) as QueryOptions;
	requestOptions.body = {
		sql: this.getNodeParameter('sql') as string,
		...(params?.length ? { params } : {}),
		...(options.environmentId ? { environmentId: options.environmentId } : {}),
		...(options.allowWrite ? { allowWrite: true } : {}),
	};
	return requestOptions;
}

/** Execute Query: one item per row when "Output Rows" is on, else the whole result. */
async function queryOutput(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	if (!this.getNodeParameter('outputRows', true)) return items;
	return items.flatMap((item) => {
		const rows = item.json.rows;
		return Array.isArray(rows) && rows.length
			? rows.map((json) => ({ json: json as INodeExecutionData['json'] }))
			: [item];
	});
}

const environmentOption: INodeProperties = {
	displayName: 'Environment ID',
	name: 'environmentId',
	type: 'string',
	default: '',
	placeholder: 'e.g. 3f0c2a8e-5b1d-4c7a-9e2f-1a2b3c4d5e6f',
	description: 'The environment whose branch to use. Empty: the primary (production) branch.',
};

export const databaseDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForDatabases },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a database',
				description:
					'Create the managed Postgres database of a project (free plan). Returns the existing one if the project has it.',
				routing: { request: { method: 'POST', url: '/databases' }, ...unwrapData },
			},
			{
				name: 'Execute Query',
				value: 'executeQuery',
				action: 'Execute a SQL query',
				description:
					'Run a SQL statement. Read-only (SELECT, SHOW, EXPLAIN) unless "Allow Writes" is on. Up to 200 rows.',
				routing: {
					send: { preSend: [queryBody] },
					request: { method: 'POST', url: '=/databases/{{$parameter.database}}/query' },
					output: { postReceive: [...unwrapData.output.postReceive, queryOutput] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a database',
				description: 'Get a database with its plan, status and branches',
				routing: {
					request: { method: 'GET', url: '=/databases/{{$parameter.database}}' },
					...unwrapData,
				},
			},
			{
				name: 'Get Connection',
				value: 'getConnection',
				action: 'Get the connection string of a database',
				description:
					'Get the connection string (postgresql://..., pooled, SSL) and its parts. It contains the password.',
				routing: {
					request: { method: 'GET', url: '=/databases/{{$parameter.database}}/connection' },
					...unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many databases',
				description: 'Get many databases of the account',
				routing: { request: { method: 'GET', url: '/databases' }, ...unwrapData },
			},
			{
				name: 'Get Tables',
				value: 'getTables',
				action: 'Get the tables of a database',
				description: 'Get the tables and views in the public schema',
				routing: {
					request: { method: 'GET', url: '=/databases/{{$parameter.database}}/tables' },
					...unwrapData,
				},
			},
		],
		default: 'executeQuery',
	},
	{
		...projectSelect,
		description: 'The project to create the database in',
		displayOptions: { show: { ...showOnlyForDatabases, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'projectId' } },
	},
	{
		...databaseSelect,
		displayOptions: {
			show: {
				...showOnlyForDatabases,
				operation: ['executeQuery', 'get', 'getConnection', 'getTables'],
			},
		},
	},
	...returnAllOrLimit({ resource: ['database'], operation: ['getAll'] }),
	{
		displayName: 'SQL',
		name: 'sql',
		type: 'string',
		required: true,
		typeOptions: { rows: 5, editor: 'sqlEditor', sqlDialect: 'PostgreSQL' },
		displayOptions: { show: { ...showOnlyForDatabases, operation: ['executeQuery'] } },
		default: '',
		placeholder: 'e.g. SELECT * FROM orders WHERE status = $1 LIMIT 10',
		description: 'One SQL statement. Use $1, $2, ... for values and put them in Query Parameters.',
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'json',
		displayOptions: { show: { ...showOnlyForDatabases, operation: ['executeQuery'] } },
		default: '',
		placeholder: 'e.g. ["paid"]',
		description: 'A JSON array with the values for $1, $2, ... in the SQL.',
	},
	{
		displayName: 'Output Rows',
		name: 'outputRows',
		type: 'boolean',
		displayOptions: { show: { ...showOnlyForDatabases, operation: ['executeQuery'] } },
		default: true,
		description: 'Whether to output one item per row instead of one item with the whole result',
	},
	{
		displayName: 'Options',
		name: 'queryOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: { show: { ...showOnlyForDatabases, operation: ['executeQuery'] } },
		default: {},
		options: [
			{
				displayName: 'Allow Writes',
				name: 'allowWrite',
				type: 'boolean',
				default: false,
				description:
					'Whether statements that change data or schema (INSERT, UPDATE, DELETE, CREATE, DROP...) may run',
			},
			environmentOption,
		],
	},
	{
		displayName: 'Options',
		name: 'branchOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: { ...showOnlyForDatabases, operation: ['getConnection', 'getTables'] },
		},
		default: {},
		options: [
			{
				...environmentOption,
				routing: {
					send: { type: 'query', property: 'environmentId', value: '={{ $value || undefined }}' },
				},
			},
		],
	},
];
