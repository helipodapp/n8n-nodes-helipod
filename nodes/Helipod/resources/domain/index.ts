import type { INodeProperties } from 'n8n-workflow';
import { domainSelect } from '../../shared/descriptions';
import { returnAllOrLimit, unwrapData } from '../../shared/utils';

const showOnlyForDomains = { resource: ['domain'] };

export const domainDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForDomains },
		options: [
			{
				name: 'Check Availability',
				value: 'checkAvailability',
				action: 'Check if a domain is available',
				description: 'Check if a domain name can be registered, with its price',
				routing: { request: { method: 'GET', url: '/domains/search' }, ...unwrapData },
			},
			{
				name: 'Get DNS Records',
				value: 'getDnsRecords',
				action: 'Get DNS records of a domain',
				description: 'Get the DNS records of a domain registered in Helipod',
				routing: {
					request: { method: 'GET', url: '=/domains/{{$parameter.domainId}}/dns' },
					...unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many domains',
				description: 'Get many domains registered in the account',
				routing: { request: { method: 'GET', url: '/domains/mine' }, ...unwrapData },
			},
		],
		default: 'checkAvailability',
	},
	{
		displayName: 'Domain Name',
		name: 'domainName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. example.com',
		displayOptions: { show: { ...showOnlyForDomains, operation: ['checkAvailability'] } },
		routing: { send: { type: 'query', property: 'domain' } },
	},
	{
		...domainSelect,
		displayOptions: { show: { ...showOnlyForDomains, operation: ['getDnsRecords'] } },
	},
	...returnAllOrLimit({ resource: ['domain'], operation: ['getAll'] }),
];
