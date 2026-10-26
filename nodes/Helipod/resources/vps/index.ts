import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { projectSelect, vpsSelect } from '../../shared/descriptions';
import {
	dryRunOption,
	idempotencyKey,
	returnAllOrLimit,
	simplifyOption,
	simplifyTo,
	unwrapData,
} from '../../shared/utils';

/** Get Backup answers null while backups are off: output { enabled: false } instead of an empty item. */
async function backupState(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	return items.map((item) =>
		Object.keys(item.json).length
			? { json: { enabled: true, ...item.json } }
			: { json: { enabled: false } },
	);
}

const showOnlyForVps = { resource: ['vps'] };

const SIMPLE_FIELDS = [
	'id',
	'name',
	'hostname',
	'status',
	'publicIp',
	'sshPort',
	'cpuCores',
	'ramMb',
	'diskGb',
	'location',
	'expiresAt',
	'autoRenew',
];
const simplified = {
	output: {
		postReceive: [...unwrapData.output.postReceive, simplifyTo(SIMPLE_FIELDS)],
	},
};

/** Create: simplified like before, except a dry run, whose answer is the price (kept whole). */
const simplifyTheVps = simplifyTo(SIMPLE_FIELDS);
const createOutput = {
	output: {
		postReceive: [
			...unwrapData.output.postReceive,
			async function (this: IExecuteSingleFunctions, items: INodeExecutionData[]) {
				return this.getNodeParameter('dryRun', false) ? items : simplifyTheVps.call(this, items);
			},
		],
	},
};

/** Create body: the OS template "ubuntu-24.04" is sent as osType "ubuntu" and osVersion "24.04". */
async function createVpsBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const template = this.getNodeParameter('osTemplate') as string;
	const dash = template.indexOf('-');
	requestOptions.body = {
		...((requestOptions.body as object) ?? {}),
		osType: dash > 0 ? template.slice(0, dash) : template,
		osVersion: dash > 0 ? template.slice(dash + 1) : '',
	};
	return requestOptions;
}

export const vpsDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForVps },
		options: [
			{
				name: 'Add Port Forward',
				value: 'addPort',
				action: 'Add a port forward to a VPS',
				description:
					'Forward a public port to the VPS (servers on a shared IP address), or route a domain over HTTP/HTTPS',
				routing: {
					request: { method: 'POST', url: '=/vps/{{$parameter.vps}}/ports' },
					...unwrapData,
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a VPS',
				description:
					'Order a VPS. The whole billing period is charged from the wallet at once (refunded if setup fails).',
				routing: {
					send: { preSend: [createVpsBody, idempotencyKey] },
					request: { method: 'POST', url: '/vps' },
					...createOutput,
				},
			},
			{
				name: 'Create Snapshot',
				value: 'createSnapshot',
				action: 'Create a snapshot of a VPS',
				description: 'Take a snapshot of the VPS disk that can be restored later',
				routing: {
					request: { method: 'POST', url: '=/vps/{{$parameter.vps}}/snapshots' },
					...unwrapData,
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a VPS',
				description: 'Get a VPS with its status, IP address and plan',
				routing: {
					request: { method: 'GET', url: '=/vps/{{$parameter.vps}}' },
					...simplified,
				},
			},
			{
				name: 'Get Backup',
				value: 'getBackup',
				action: 'Get the backup status of a VPS',
				description:
					'Get the backup plan, storage used, last and next backup of a VPS (empty when backups are off)',
				routing: {
					request: { method: 'GET', url: '=/vps/{{$parameter.vps}}/backup' },
					output: { postReceive: [...unwrapData.output.postReceive, backupState] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many VPS',
				description: 'Get many VPS of the account',
				routing: { request: { method: 'GET', url: '/vps' }, ...simplified },
			},
			{
				name: 'Get Metrics',
				value: 'getMetrics',
				action: 'Get metrics of a VPS',
				description: 'Get the CPU, memory, disk and network usage of a VPS',
				routing: {
					request: { method: 'GET', url: '=/vps/{{$parameter.vps}}/metrics' },
					...unwrapData,
				},
			},
			{
				name: 'Get Plans',
				value: 'getPlans',
				action: 'Get VPS plans',
				description:
					'Get the VPS plans with their size, OS templates and the monthly price this account pays',
				routing: { request: { method: 'GET', url: '/vps/plans' }, ...unwrapData },
			},
			{
				name: 'Get Port Forwards',
				value: 'getPorts',
				action: 'Get the port forwards of a VPS',
				description: 'Get the public port range of a VPS and each of its port forwards',
				routing: {
					request: { method: 'GET', url: '=/vps/{{$parameter.vps}}/ports' },
					...unwrapData,
				},
			},
			{
				name: 'Get Restore Points',
				value: 'getRestorePoints',
				action: 'Get the restore points of a VPS',
				description: 'Get the backups kept for a VPS (daily, weekly, monthly and manual)',
				routing: {
					request: { method: 'GET', url: '=/vps/{{$parameter.vps}}/backup/points' },
					...unwrapData,
				},
			},
			{
				name: 'Remove Port Forward',
				value: 'removePort',
				action: 'Remove a port forward from a VPS',
				description: 'Remove a port forward. Whatever reaches the VPS through it stops working.',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/vps/{{$parameter.vps}}/ports/{{$parameter.allocationId}}',
					},
					...unwrapData,
				},
			},
			{
				name: 'Renew',
				value: 'renew',
				action: 'Renew a VPS',
				description:
					'Pay for another period from the wallet and move the expiry date forward. Turn on Dry Run to get the price first.',
				routing: {
					send: { preSend: [idempotencyKey] },
					request: { method: 'POST', url: '=/vps/{{$parameter.vps}}/renew' },
					...unwrapData,
				},
			},
			{
				name: 'Restart',
				value: 'restart',
				action: 'Restart a VPS',
				description: 'Reboot a running VPS',
				routing: {
					request: { method: 'POST', url: '=/vps/{{$parameter.vps}}/restart' },
					...unwrapData,
				},
			},
			{
				name: 'Run Backup',
				value: 'runBackup',
				action: 'Back up a VPS now',
				description:
					'Start a backup now, on top of the daily one (a few per day). Backups must be on.',
				routing: {
					request: { method: 'POST', url: '=/vps/{{$parameter.vps}}/backup/run' },
					...unwrapData,
				},
			},
			{
				name: 'Set Auto-Renew',
				value: 'setAutoRenew',
				action: 'Turn auto renew of a VPS on or off',
				description:
					'With auto-renew off, the VPS is only renewed by the Renew operation and expires otherwise',
				routing: {
					request: { method: 'POST', url: '=/vps/{{$parameter.vps}}/auto-renew' },
					...unwrapData,
				},
			},
			{
				name: 'Start',
				value: 'start',
				action: 'Start a VPS',
				description: 'Start a stopped VPS',
				routing: {
					request: { method: 'POST', url: '=/vps/{{$parameter.vps}}/start' },
					...unwrapData,
				},
			},
			{
				name: 'Stop',
				value: 'stop',
				action: 'Stop a VPS',
				description: 'Shut down a running VPS',
				routing: {
					request: { method: 'POST', url: '=/vps/{{$parameter.vps}}/stop' },
					...unwrapData,
				},
			},
		],
		default: 'getAll',
	},
	{
		...vpsSelect,
		displayOptions: {
			show: {
				...showOnlyForVps,
				operation: [
					'addPort',
					'createSnapshot',
					'get',
					'getBackup',
					'getMetrics',
					'getPorts',
					'getRestorePoints',
					'removePort',
					'renew',
					'restart',
					'runBackup',
					'setAutoRenew',
					'start',
					'stop',
				],
			},
		},
	},
	...returnAllOrLimit({ resource: ['vps'], operation: ['getAll'] }),
	simplifyOption({ resource: ['vps'], operation: ['get', 'getAll'] }),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: { show: { ...showOnlyForVps, operation: ['getAll'] } },
		default: {},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'running',
				options: [
					{ name: 'Error', value: 'error' },
					{ name: 'Pending', value: 'pending' },
					{ name: 'Provisioning', value: 'provisioning' },
					{ name: 'Restarting', value: 'restarting' },
					{ name: 'Running', value: 'running' },
					{ name: 'Stopped', value: 'stopped' },
					{ name: 'Suspended', value: 'suspended' },
					{ name: 'Terminated', value: 'terminated' },
				],
				routing: { send: { type: 'query', property: 'status' } },
			},
		],
	},
	{
		displayName: 'Range',
		name: 'range',
		type: 'options',
		displayOptions: { show: { ...showOnlyForVps, operation: ['getMetrics'] } },
		default: '1h',
		description: 'The period the usage covers (for VPS that keep a history)',
		options: [
			{ name: 'Last 24 Hours', value: '24h' },
			{ name: 'Last 30 Days', value: '30d' },
			{ name: 'Last 6 Hours', value: '6h' },
			{ name: 'Last 7 Days', value: '7d' },
			{ name: 'Last Hour', value: '1h' },
		],
		routing: { send: { type: 'query', property: 'range' } },
	},
	{
		displayName: 'Snapshot Name',
		name: 'snapshotName',
		type: 'string',
		displayOptions: { show: { ...showOnlyForVps, operation: ['createSnapshot'] } },
		default: '',
		placeholder: 'e.g. before-upgrade',
		description: 'Optional. A name is generated when empty.',
		routing: {
			send: { type: 'body', property: 'name', value: '={{ $value || undefined }}' },
		},
	},

	// ── Create ──
	{
		...projectSelect,
		description: 'The project the VPS belongs to',
		displayOptions: { show: { ...showOnlyForVps, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'projectId' } },
	},
	{
		displayName: 'Plan Name or ID',
		name: 'planId',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getVpsPlans' },
		displayOptions: { show: { ...showOnlyForVps, operation: ['create'] } },
		default: '',
		description:
			'The size, location and price. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		routing: { send: { type: 'body', property: 'planId' } },
	},
	{
		displayName: 'OS Template Name or ID',
		name: 'osTemplate',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getVpsOsTemplates', loadOptionsDependsOn: ['planId'] },
		displayOptions: { show: { ...showOnlyForVps, operation: ['create'] } },
		default: '',
		description:
			'The operating system or app image of the plan, for example ubuntu-24.04. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Name',
		name: 'vpsName',
		type: 'string',
		required: true,
		displayOptions: { show: { ...showOnlyForVps, operation: ['create'] } },
		default: '',
		placeholder: 'e.g. web-server',
		description: '3 to 50 characters',
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Root Password',
		name: 'rootPassword',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		displayOptions: { show: { ...showOnlyForVps, operation: ['create'] } },
		default: '',
		description:
			'12 to 30 characters with upper and lower case letters, a digit and one of ! @ # $ % ^ *',
		routing: { send: { type: 'body', property: 'rootPassword' } },
	},
	{
		displayName: 'Billing Period',
		name: 'billingPeriod',
		type: 'options',
		displayOptions: { show: { ...showOnlyForVps, operation: ['create', 'renew'] } },
		options: [
			{ name: '3 Months', value: '3month' },
			{ name: '6 Months', value: '6month' },
			{ name: 'Monthly', value: 'monthly' },
			{ name: 'Yearly', value: 'yearly' },
		],
		default: 'monthly',
		description: 'The whole period is charged at once',
		routing: { send: { type: 'body', property: 'billingPeriod' } },
	},
	{
		displayName: 'Auto-Renew',
		name: 'autoRenew',
		type: 'boolean',
		displayOptions: { show: { ...showOnlyForVps, operation: ['create'] } },
		default: true,
		description:
			'Whether the VPS renews itself from the wallet before it expires. Off: renew it with the Renew operation.',
		routing: {
			send: {
				type: 'body',
				property: 'autoRenew',
				value: '={{ $value === false ? false : undefined }}',
			},
		},
	},
	{
		displayName: 'Auto-Renew',
		name: 'autoRenewValue',
		type: 'boolean',
		displayOptions: { show: { ...showOnlyForVps, operation: ['setAutoRenew'] } },
		default: false,
		description: 'Whether the VPS renews itself from the wallet before it expires',
		routing: { send: { type: 'body', property: 'autoRenew' } },
	},
	dryRunOption({ resource: ['vps'], operation: ['create', 'renew'] }, 'buying'),

	// ── Port forwards ──
	{
		displayName: 'Public Port',
		name: 'port',
		type: 'number',
		required: true,
		typeOptions: { minValue: 1, maxValue: 65535 },
		displayOptions: { show: { ...showOnlyForVps, operation: ['addPort'] } },
		default: 80,
		description:
			'TCP/UDP: a port inside the port range of the VPS (see Get Port Forwards). HTTP: 80, HTTPS: 443.',
		routing: { send: { type: 'body', property: 'port' } },
	},
	{
		displayName: 'Protocol',
		name: 'portProtocol',
		type: 'options',
		displayOptions: { show: { ...showOnlyForVps, operation: ['addPort'] } },
		options: [
			{ name: 'HTTP (Domain)', value: 'http' },
			{ name: 'HTTPS (Domain)', value: 'https' },
			{ name: 'TCP', value: 'tcp' },
			{ name: 'TCP and UDP', value: 'both' },
			{ name: 'UDP', value: 'udp' },
		],
		default: 'tcp',
		routing: { send: { type: 'body', property: 'protocol' } },
	},
	{
		displayName: 'Domain',
		name: 'portDomain',
		type: 'string',
		required: true,
		displayOptions: {
			show: { ...showOnlyForVps, operation: ['addPort'], portProtocol: ['http', 'https'] },
		},
		default: '',
		placeholder: 'e.g. app.example.com',
		description: "The domain to route. Point its DNS at the VPS's IP address first.",
		routing: { send: { type: 'body', property: 'domain' } },
	},
	{
		displayName: 'Options',
		name: 'portOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: { show: { ...showOnlyForVps, operation: ['addPort'] } },
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				routing: {
					send: { type: 'body', property: 'description', value: '={{ $value || undefined }}' },
				},
			},
			{
				displayName: 'Internal Port',
				name: 'internalPort',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 65535 },
				default: 8080,
				description: 'The port on the VPS. Default: the same as the public port.',
				routing: { send: { type: 'body', property: 'internalPort' } },
			},
		],
	},
	{
		displayName: 'Port Forward ID',
		name: 'allocationId',
		type: 'string',
		required: true,
		displayOptions: { show: { ...showOnlyForVps, operation: ['removePort'] } },
		default: '',
		placeholder: 'e.g. 3f0c2a8e-5b1d-4c7a-9e2f-1a2b3c4d5e6f',
		description: 'The ID of the port forward, from Get Port Forwards',
	},
];
