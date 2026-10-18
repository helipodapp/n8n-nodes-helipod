import type { INodeProperties } from 'n8n-workflow';
import { vpsSelect } from '../../shared/descriptions';
import { returnAllOrLimit, simplifyOption, simplifyTo, unwrapData } from '../../shared/utils';

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

export const vpsDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForVps },
		options: [
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
				operation: ['createSnapshot', 'get', 'getMetrics', 'restart', 'start', 'stop'],
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
];
