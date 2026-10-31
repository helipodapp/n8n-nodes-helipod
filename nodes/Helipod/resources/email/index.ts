import type { INodeProperties } from 'n8n-workflow';
import { unwrapData } from '../../shared/utils';

const showOnlyForEmailSend = { resource: ['email'], operation: ['send'] };
const addressList = '={{ String($value).split(",").map(s => s.trim()).filter(Boolean) }}';

/** Name / value pairs sent as a JSON object (templateData, variables, metadata, headers). */
function pairs(
	displayName: string,
	name: string,
	property: string,
	description: string,
	extra: Partial<INodeProperties> = {},
): INodeProperties {
	return {
		displayName,
		name,
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Value',
		default: {},
		description,
		options: [
			{
				name: 'pair',
				displayName: 'Value',
				values: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Value', name: 'value', type: 'string', default: '' },
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property,
				value:
					'={{ ($value.pair || []).filter(p => p.name).length ? Object.fromEntries(($value.pair || []).filter(p => p.name).map(p => [p.name, String(p.value ?? "")])) : undefined }}',
			},
		},
		...extra,
	} as INodeProperties;
}

export const emailDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['email'] } },
		options: [
			{
				name: 'Send',
				value: 'send',
				action: 'Send an email',
				description: 'Send an email from a domain verified in Helipod Email',
				routing: {
					request: { method: 'POST', baseURL: 'https://mail.helipod.io/api/email', url: '/send' },
					...unwrapData,
				},
			},
		],
		default: 'send',
	},
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Shop <hello@example.com>',
		description: 'An address on a domain verified in Helipod Email',
		displayOptions: { show: showOnlyForEmailSend },
		routing: { send: { type: 'body', property: 'from' } },
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. nathan@example.com',
		description: 'One or more addresses, separated by commas',
		displayOptions: { show: showOnlyForEmailSend },
		routing: { send: { type: 'body', property: 'to', value: addressList } },
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Your order has shipped',
		displayOptions: { show: { ...showOnlyForEmailSend, emailFormat: ['html', 'text', 'both'] } },
		routing: { send: { type: 'body', property: 'subject' } },
	},
	{
		displayName: 'Email Format',
		name: 'emailFormat',
		type: 'options',
		default: 'html',
		displayOptions: { show: showOnlyForEmailSend },
		options: [
			{ name: 'HTML', value: 'html', description: 'Send the message as HTML' },
			{ name: 'Text', value: 'text', description: 'Send the message as plain text' },
			{ name: 'Both', value: 'both', description: 'Send both an HTML and a plain text version' },
			{
				name: 'Template',
				value: 'template',
				description: 'Use a template saved in Helipod Email (it has its own subject)',
			},
		],
	},
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 9476f67e-2b1c-4d3e-8f5a-6b7c8d9e0f1a',
		description: 'The ID of a template from Helipod Email (Email › Templates)',
		displayOptions: { show: { ...showOnlyForEmailSend, emailFormat: ['template'] } },
		routing: { send: { type: 'body', property: 'templateId' } },
	},
	pairs(
		'Template Data',
		'templateData',
		'templateData',
		'Values for the {{placeholders}} in the template',
		{ displayOptions: { show: { ...showOnlyForEmailSend, emailFormat: ['template'] } } },
	),
	{
		displayName: 'HTML',
		name: 'html',
		type: 'string',
		required: true,
		typeOptions: { rows: 5 },
		default: '',
		placeholder: 'e.g. <p>Hello!</p>',
		displayOptions: { show: { ...showOnlyForEmailSend, emailFormat: ['html', 'both'] } },
		routing: { send: { type: 'body', property: 'html' } },
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		typeOptions: { rows: 5 },
		default: '',
		placeholder: 'e.g. Hello!',
		displayOptions: { show: { ...showOnlyForEmailSend, emailFormat: ['text', 'both'] } },
		routing: { send: { type: 'body', property: 'text' } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: { show: showOnlyForEmailSend },
		default: {},
		options: [
			{
				displayName: 'BCC',
				name: 'bcc',
				type: 'string',
				default: '',
				placeholder: 'e.g. archive@example.com',
				description: 'One or more addresses, separated by commas',
				routing: { send: { type: 'body', property: 'bcc', value: addressList } },
			},
			{
				displayName: 'CC',
				name: 'cc',
				type: 'string',
				default: '',
				placeholder: 'e.g. team@example.com',
				description: 'One or more addresses, separated by commas',
				routing: { send: { type: 'body', property: 'cc', value: addressList } },
			},
			pairs(
				'Custom Headers',
				'headers',
				'headers',
				'Extra email headers (names: letters, digits, hyphens). Not with a template.',
			),
			{
				displayName: 'Idempotency Key',
				name: 'idempotencyKey',
				type: 'string',
				default: '',
				placeholder: 'e.g. order-1042-shipped',
				description:
					'A unique key for this message. Sending again with the same key does not send a second email.',
				routing: { send: { type: 'body', property: 'idempotencyKey' } },
			},
			pairs(
				'Metadata',
				'metadata',
				'metadata',
				'Your own values stored with the email (returned when you look the email up)',
			),
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				placeholder: 'e.g. 3f0c2a8e-5b1d-4c7a-9e2f-1a2b3c4d5e6f',
				description:
					'The project to send from. Needed only when the credential reaches several projects with email set up.',
				routing: { request: { headers: { 'X-Helipod-Project': '={{$value}}' } } },
			},
			{
				displayName: 'Reply To',
				name: 'replyTo',
				type: 'string',
				default: '',
				placeholder: 'e.g. support@example.com',
				routing: { send: { type: 'body', property: 'replyTo' } },
			},
			{
				displayName: 'Sensitive',
				name: 'sensitive',
				type: 'boolean',
				default: false,
				description:
					'Whether the template data or variables hold a secret (a password, a one-time code): their values are wiped from the job record after the send',
				routing: { send: { type: 'body', property: 'sensitive' } },
			},
			pairs(
				'Variables',
				'variables',
				'variables',
				'Values for {{placeholders}} written in the HTML, text or subject above',
			),
		],
	},
];
