import type { INodeProperties } from 'n8n-workflow';
import { domainSelect } from '../../shared/descriptions';
import { dryRunOption, returnAllOrLimit, unwrapData } from '../../shared/utils';

const showOnlyForDomains = { resource: ['domain'] };
const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'MXE', 'SPF', 'TXT'].map((t) => ({
	name: t,
	value: t,
}));

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
				name: 'Delete DNS Record',
				value: 'deleteDnsRecord',
				action: 'Delete a DNS record',
				description: 'Delete one DNS record. Name, type and current content must match.',
				routing: {
					request: { method: 'DELETE', url: '=/domains/{{$parameter.domainId}}/dns' },
					...unwrapData,
				},
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
			{
				name: 'Register',
				value: 'register',
				action: 'Register a domain',
				description:
					'Register a domain for one year, paid from the wallet. Turn on Dry Run to see the price first.',
				routing: {
					request: { method: 'POST', url: '/domains/register', body: { period: 1 } },
					...unwrapData,
				},
			},
			{
				name: 'Update DNS Record',
				value: 'updateDnsRecord',
				action: 'Update a DNS record',
				description:
					'Set the content of one DNS record (by name and type), leaving the other records as they are',
				routing: {
					request: { method: 'PUT', url: '=/domains/{{$parameter.domainId}}/dns' },
					...unwrapData,
				},
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
		displayOptions: {
			show: {
				...showOnlyForDomains,
				operation: ['deleteDnsRecord', 'getDnsRecords', 'updateDnsRecord'],
			},
		},
	},
	{
		displayName: 'Record Name',
		name: 'recordName',
		type: 'string',
		required: true,
		displayOptions: {
			show: { ...showOnlyForDomains, operation: ['deleteDnsRecord', 'updateDnsRecord'] },
		},
		default: '@',
		placeholder: 'e.g. www',
		description:
			'"@" for the domain itself, or the part before the domain, for example "www" or "_dmarc"',
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Record Type',
		name: 'recordType',
		type: 'options',
		displayOptions: {
			show: { ...showOnlyForDomains, operation: ['deleteDnsRecord', 'updateDnsRecord'] },
		},
		options: RECORD_TYPES,
		default: 'A',
		routing: { send: { type: 'body', property: 'type' } },
	},
	{
		displayName: 'Content',
		name: 'recordContent',
		type: 'string',
		required: true,
		displayOptions: {
			show: { ...showOnlyForDomains, operation: ['deleteDnsRecord', 'updateDnsRecord'] },
		},
		default: '',
		placeholder: 'e.g. 203.0.113.10',
		description: 'TXT without surrounding quotes; MX as "10 mail.example.com"',
		routing: { send: { type: 'body', property: 'content' } },
	},
	{
		displayName: 'TTL',
		name: 'ttl',
		type: 'number',
		displayOptions: { show: { ...showOnlyForDomains, operation: ['updateDnsRecord'] } },
		typeOptions: { minValue: 60 },
		default: 3600,
		description: 'Time to live, in seconds',
		routing: { send: { type: 'body', property: 'ttl' } },
	},
	{
		displayName: 'Domain Name',
		name: 'registerDomainName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. example.com',
		description: 'The full domain to register. Check Availability tells whether it is free.',
		displayOptions: { show: { ...showOnlyForDomains, operation: ['register'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'WHOIS Privacy',
		name: 'whoisProtection',
		type: 'boolean',
		default: false,
		description: "Whether to hide the owner's details in WHOIS (charged yearly)",
		displayOptions: { show: { ...showOnlyForDomains, operation: ['register'] } },
		routing: { send: { type: 'body', property: 'whoisProtection' } },
	},
	dryRunOption({ resource: ['domain'], operation: ['register'] }, 'registering the domain'),
	...returnAllOrLimit({ resource: ['domain'], operation: ['getAll'] }),
];
