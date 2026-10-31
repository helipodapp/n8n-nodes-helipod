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
				name: 'Renew',
				value: 'renew',
				action: 'Renew a domain',
				description:
					'Renew a domain for one more year, paid from the wallet. Turn on Dry Run to see the price first. Not retried automatically: running it twice renews twice.',
				routing: {
					request: { method: 'POST', url: '=/domains/{{$parameter.domainId}}/renew', body: { period: 1 } },
					...unwrapData,
				},
			},
			{
				name: 'Set Auto-Renew',
				value: 'setAutoRenew',
				action: 'Turn auto renew on or off for a domain',
				description:
					'On: the domain is renewed from the wallet before it expires. Off: it expires unless renewed. Nothing is charged now.',
				routing: {
					request: { method: 'PATCH', url: '=/domains/{{$parameter.domainId}}/auto-renew' },
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
				operation: ['deleteDnsRecord', 'getDnsRecords', 'renew', 'setAutoRenew', 'updateDnsRecord'],
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
	{
		displayName: 'Auto-Renew',
		name: 'autoRenew',
		type: 'boolean',
		required: true,
		default: true,
		description: 'Whether the domain renews itself from the wallet before it expires',
		displayOptions: { show: { ...showOnlyForDomains, operation: ['setAutoRenew'] } },
		routing: { send: { type: 'body', property: 'autoRenew' } },
	},
	{
		displayName: 'Nameservers',
		name: 'nameservers',
		type: 'string',
		default: '',
		placeholder: 'e.g. ns1.example.net, ns2.example.net',
		description:
			'Comma-separated, 2 to 5. Leave empty to use Helipod DNS (then Get/Update DNS Records work).',
		displayOptions: { show: { ...showOnlyForDomains, operation: ['register'] } },
		routing: {
			send: {
				type: 'body',
				property: 'nameservers',
				value:
					'={{ $value ? $value.split(",").map(s => s.trim()).filter(s => s) : undefined }}',
			},
		},
	},
	{
		displayName: 'Domain Owner',
		name: 'registrant',
		type: 'fixedCollection',
		placeholder: 'Add Owner',
		default: {},
		description:
			"Register this domain in someone else's name (for example a reseller's customer) instead of the account's owner details. Indonesian domains only (.ID, .CO.ID, .MY.ID, ...). The registry's verification email goes to the owner's email.",
		displayOptions: { show: { ...showOnlyForDomains, operation: ['register'] } },
		options: [
			{
				name: 'owner',
				displayName: 'Owner',
				values: [
					{
						displayName: 'Address Line 1',
						name: 'addressLine1',
						type: 'string',
						default: '',
							required:	true,
						description: 'At least 3 characters',
					},
					{
						displayName: 'Address Line 2',
						name: 'addressLine2',
						type: 'string',
						default: '',
					},
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
							required:	true,
						description: 'At least 3 characters',
					},
					{
						displayName: 'Country Code',
						name: 'countryCode',
						type: 'string',
						default: 'ID',
							required:	true,
						description: 'Two letters (ISO 3166-1), e.g. ID',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						default: '',
						placeholder: 'name@email.com',
						description: 'Gets the verification email. Empty:	the account email.',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
							required:	true,
						description: 'At least 3 characters',
					},
					{
						displayName: 'Organization',
						name: 'organization',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
							required:	true,
						placeholder: 'e.g.	+6281234567890',
					},
					{
						displayName: 'Postal Code',
						name: 'postalCode',
						type: 'string',
						default: '',
							required:	true,
					},
					{
						displayName: 'State	/	Province',
						name: 'state',
						type: 'string',
						default: '',
							required:	true,
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'registrant',
				value:
					'={{ $value.owner ? Object.fromEntries(Object.entries($value.owner).filter(([, v]) => v !== "")) : undefined }}',
			},
		},
	},
	dryRunOption({ resource: ['domain'], operation: ['register', 'renew'] }, 'registering or renewing the domain'),
	...returnAllOrLimit({ resource: ['domain'], operation: ['getAll'] }),
];
