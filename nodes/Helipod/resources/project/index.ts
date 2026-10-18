import type { INodeProperties } from 'n8n-workflow';
import { projectSelect } from '../../shared/descriptions';
import { returnAllOrLimit, unwrapData } from '../../shared/utils';

const showOnlyForProjects = { resource: ['project'] };

export const projectDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForProjects },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a project',
				description: 'Get a project with its environments',
				routing: {
					request: { method: 'GET', url: '=/containers/projects/{{$parameter.project}}' },
					...unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many projects',
				description: 'Get many projects with their environments',
				routing: { request: { method: 'GET', url: '/containers/projects' }, ...unwrapData },
			},
		],
		default: 'getAll',
	},
	{ ...projectSelect, displayOptions: { show: { ...showOnlyForProjects, operation: ['get'] } } },
	...returnAllOrLimit({ resource: ['project'], operation: ['getAll'] }),
];
