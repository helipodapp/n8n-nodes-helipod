import type { INodeProperties } from 'n8n-workflow';
import {
	dryRunOption,
	idempotencyKey,
	itemsFrom,
	returnAllOrLimit,
	unwrapData,
} from '../../shared/utils';

const showOnlyForAccount = { resource: ['account'] };

export const accountDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForAccount },
		options: [
			{
				name: 'Create Deposit',
				value: 'createDeposit',
				action: 'Create a deposit',
				description:
					'Create a wallet top-up and its payment link (paymentUrl) for a person to pay by QRIS or bank virtual account. Nothing is charged.',
				routing: {
					send: { preSend: [idempotencyKey] },
					request: { method: 'POST', url: '/account/deposits' },
					...unwrapData,
				},
			},
			{
				name: 'Get Deposit',
				value: 'getDeposit',
				action: 'Get a deposit',
				description: 'Get a deposit and whether it was paid (pending, paid or expired)',
				routing: {
					request: { method: 'GET', url: '=/account/deposits/{{$parameter.depositId}}' },
					...unwrapData,
				},
			},
			{
				name: 'Get Deposits',
				value: 'getDeposits',
				action: 'Get deposits',
				description: 'Get the deposits (wallet top-ups) of the account, newest first',
				routing: { request: { method: 'GET', url: '/account/deposits' }, ...unwrapData },
			},
			{
				name: 'Get Invoices',
				value: 'getInvoices',
				action: 'Get invoices',
				description: 'Get the invoices of the account with their status and amount',
				routing: { request: { method: 'GET', url: '/account/invoices' }, ...unwrapData },
			},
			{
				name: 'Get Notifications',
				value: 'getNotifications',
				action: 'Get notifications',
				description:
					'Get the notifications of the account, newest first (deploys, renewals, low balance, ...)',
				routing: { request: { method: 'GET', url: '/account/notifications' }, ...unwrapData },
			},
			{
				name: 'Get Wallet',
				value: 'getWallet',
				action: 'Get the wallet balance',
				description: 'Get the balance of the account wallet',
				routing: { request: { method: 'GET', url: '/account/wallet' }, ...unwrapData },
			},
			{
				name: 'Get Wallet Transactions',
				value: 'getTransactions',
				action: 'Get wallet transactions',
				description: 'Get the wallet history, newest first (negative amounts are charges)',
				routing: {
					request: { method: 'GET', url: '/account/wallet/transactions' },
					output: { postReceive: [...unwrapData.output.postReceive, itemsFrom('transactions')] },
				},
			},
			{
				name: 'Mark Notification as Read',
				value: 'markNotificationRead',
				action: 'Mark a notification as read',
				routing: {
					request: {
						method: 'POST',
						url: '=/account/notifications/{{$parameter.notificationId}}/read',
					},
					...unwrapData,
				},
			},
		],
		default: 'getWallet',
	},
	...returnAllOrLimit({ resource: ['account'], operation: ['getInvoices'] }),
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				...showOnlyForAccount,
				operation: ['getDeposits', 'getNotifications', 'getTransactions'],
			},
		},
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		description: 'Max number of results to return',
		routing: { send: { type: 'query', property: 'limit' } },
	},
	{
		displayName: 'Unread Only',
		name: 'unreadOnly',
		type: 'boolean',
		displayOptions: { show: { ...showOnlyForAccount, operation: ['getNotifications'] } },
		default: false,
		description: 'Whether to return only notifications that were not read yet',
		routing: {
			send: { type: 'query', property: 'unreadOnly', value: '={{ $value ? "true" : undefined }}' },
		},
	},
	{
		displayName: 'Notification ID',
		name: 'notificationId',
		type: 'string',
		required: true,
		displayOptions: { show: { ...showOnlyForAccount, operation: ['markNotificationRead'] } },
		default: '',
		placeholder: 'e.g. 3f0c2a8e-5b1d-4c7a-9e2f-1a2b3c4d5e6f',
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		required: true,
		typeOptions: { minValue: 10000, maxValue: 50000000 },
		displayOptions: { show: { ...showOnlyForAccount, operation: ['createDeposit'] } },
		default: 100000,
		description:
			'IDR, a whole number from 10,000 to 50,000,000. One unpaid deposit at a time, 10 minutes between deposits, 10 a day.',
		routing: { send: { type: 'body', property: 'amount' } },
	},
	dryRunOption({ resource: ['account'], operation: ['createDeposit'] }, 'creating the deposit'),
	{
		displayName: 'Deposit ID',
		name: 'depositId',
		type: 'string',
		required: true,
		displayOptions: { show: { ...showOnlyForAccount, operation: ['getDeposit'] } },
		default: '',
		placeholder: 'e.g. 3b0f6c2e-8f4a-4c55-9a51-2f1d0e7c9a10',
	},
];
