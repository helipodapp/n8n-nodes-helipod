import type { INodeProperties } from 'n8n-workflow';
import { unwrapData } from '../../shared/utils';

export const accountDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['account'] } },
		options: [
			{
				name: 'Get Wallet',
				value: 'getWallet',
				action: 'Get the wallet balance',
				description: 'Get the balance of the account wallet',
				routing: { request: { method: 'GET', url: '/account/wallet' }, ...unwrapData },
			},
		],
		default: 'getWallet',
	},
];
