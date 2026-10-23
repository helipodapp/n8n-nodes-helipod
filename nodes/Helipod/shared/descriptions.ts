import type { INodeProperties } from 'n8n-workflow';

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

function uuidLocator(
	displayName: string,
	name: string,
	searchListMethod: string,
	description: string,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: `Select a ${displayName.toLowerCase()}...`,
				typeOptions: { searchListMethod, searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 3f0c2a8e-5b1d-4c7a-9e2f-1a2b3c4d5e6f',
				validation: [
					{
						type: 'regex',
						properties: { regex: `^${UUID}$`, errorMessage: `Not a valid ${displayName} ID` },
					},
				],
			},
		],
	};
}

export const projectSelect = uuidLocator(
	'Project',
	'project',
	'getProjects',
	'The Helipod project',
);

export const environmentSelect = uuidLocator(
	'Environment',
	'environment',
	'getEnvironments',
	'The environment of a project (for example production)',
);

export const serviceSelect = uuidLocator(
	'Service',
	'service',
	'getServices',
	'The service (an app, database or worker in a project environment)',
);

export const vpsSelect = uuidLocator('VPS', 'vps', 'getVpsList', 'The VPS');

export const databaseSelect = uuidLocator(
	'Database',
	'database',
	'getDatabases',
	'The managed Postgres database (one per project)',
);

export const domainSelect: INodeProperties = {
	displayName: 'Domain',
	name: 'domainId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'A domain registered in your Helipod account',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a domain...',
			typeOptions: { searchListMethod: 'getDomains', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 1024',
			validation: [
				{
					type: 'regex',
					properties: { regex: '^[0-9]+$', errorMessage: 'Not a valid domain ID' },
				},
			],
		},
	],
};
