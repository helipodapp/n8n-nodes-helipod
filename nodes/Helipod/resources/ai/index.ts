import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { projectSelect } from '../../shared/descriptions';
import { dryRunOption, idempotencyKey, itemsFrom, unwrapData } from '../../shared/utils';

const showOnlyForAi = { resource: ['ai'] };

type ChatOptions = {
	systemMessage?: string;
	maxTokens?: number;
	temperature?: number;
	projectId?: string;
};

/** Chat body: { model, messages: [system?, user], maxTokens?, temperature?, projectId? }. */
async function chatBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const options = this.getNodeParameter('chatOptions', {}) as ChatOptions;
	const messages: IDataObject[] = [];
	if (options.systemMessage) messages.push({ role: 'system', content: options.systemMessage });
	messages.push({ role: 'user', content: this.getNodeParameter('prompt') as string });
	requestOptions.body = {
		model: this.getNodeParameter('model') as string,
		messages,
		...(options.maxTokens ? { maxTokens: options.maxTokens } : {}),
		...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
		...(options.projectId ? { projectId: options.projectId } : {}),
	};
	return requestOptions;
}

/** Get Models: one item per chat model or per image model. */
async function modelItems(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const kind = this.getNodeParameter('modelType', 'chat') as string;
	return itemsFrom(kind === 'image' ? 'imageModels' : 'models').call(this, items);
}

export const aiDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForAi },
		options: [
			{
				name: 'Generate Image',
				value: 'generateImage',
				action: 'Generate an image',
				description:
					'Start generating images from a prompt, billed to the AI balance. Use "Get Image" with the returned ID for the links.',
				routing: {
					send: { preSend: [idempotencyKey] },
					request: { method: 'POST', url: '/ai/images' },
					...unwrapData,
				},
			},
			{
				name: 'Get Balance',
				value: 'getBalance',
				action: 'Get the AI balance',
				description:
					'Get the AI balance, free credit and auto top-up settings (needs a whole-account key)',
				routing: { request: { method: 'GET', url: '/ai/overview' }, ...unwrapData },
			},
			{
				name: 'Get Image',
				value: 'getImage',
				action: 'Get an image request',
				description: 'Get the status of an image request and, when it is done, links to the images',
				routing: {
					request: { method: 'GET', url: '=/ai/images/{{$parameter.requestId}}' },
					...unwrapData,
				},
			},
			{
				name: 'Get Models',
				value: 'getModels',
				action: 'Get AI models',
				description: 'Get the chat or image models with the price this account pays',
				routing: {
					request: { method: 'GET', url: '/ai/models' },
					output: { postReceive: [...unwrapData.output.postReceive, modelItems] },
				},
			},
			{
				name: 'Get Usage',
				value: 'getUsage',
				action: 'Get AI usage',
				description: "Get this month's AI spend by model and the latest requests",
				routing: { request: { method: 'GET', url: '/ai/usage' }, ...unwrapData },
			},
			{
				name: 'Message a Model',
				value: 'chat',
				action: 'Message a model',
				description: 'Send a prompt to a chat model and get its reply, billed to the AI balance',
				routing: {
					send: { preSend: [chatBody] },
					request: { method: 'POST', url: '/ai/chat', timeout: 100000 },
					...unwrapData,
				},
			},
		],
		default: 'chat',
	},

	// ── Message a Model ──
	{
		displayName: 'Model Name or ID',
		name: 'model',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getChatModels' },
		displayOptions: { show: { ...showOnlyForAi, operation: ['chat'] } },
		default: 'deepseek-v4.1-flash',
		description:
			'The chat model. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		required: true,
		typeOptions: { rows: 4 },
		displayOptions: { show: { ...showOnlyForAi, operation: ['chat'] } },
		default: '',
		placeholder: 'e.g. Summarize this error log in one sentence',
	},
	{
		displayName: 'Options',
		name: 'chatOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: { show: { ...showOnlyForAi, operation: ['chat'] } },
		default: {},
		options: [
			{
				displayName: 'Maximum Tokens',
				name: 'maxTokens',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 64000 },
				default: 1024,
				description: 'The longest reply, in tokens. Long replies take longer and cost more.',
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				placeholder: 'e.g. 3f0c2a8e-5b1d-4c7a-9e2f-1a2b3c4d5e6f',
				description:
					"The project the usage is recorded under. Empty: the key's own project, or the first project of the account.",
			},
			{
				displayName: 'System Message',
				name: 'systemMessage',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				placeholder: 'e.g. You are a helpful assistant. Answer in English.',
				description: 'Instructions for the model that come before the prompt',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
				default: 0.7,
				description: 'Higher values give more varied replies, lower values more focused ones',
			},
		],
	},

	// ── Generate Image ──
	{
		...projectSelect,
		description: 'The project the images belong to',
		displayOptions: { show: { ...showOnlyForAi, operation: ['generateImage'] } },
		routing: { send: { type: 'body', property: 'projectId' } },
	},
	{
		displayName: 'Model Name or ID',
		name: 'imageModel',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getImageModels' },
		displayOptions: { show: { ...showOnlyForAi, operation: ['generateImage'] } },
		default: '',
		description:
			'The image model. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		routing: { send: { type: 'body', property: 'model' } },
	},
	{
		displayName: 'Prompt',
		name: 'imagePrompt',
		type: 'string',
		required: true,
		typeOptions: { rows: 4 },
		displayOptions: { show: { ...showOnlyForAi, operation: ['generateImage'] } },
		default: '',
		placeholder: 'e.g. A lighthouse on a cliff at sunset, watercolor',
		routing: { send: { type: 'body', property: 'prompt' } },
	},
	{
		displayName: 'Options',
		name: 'imageOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: { show: { ...showOnlyForAi, operation: ['generateImage'] } },
		default: {},
		options: [
			{
				displayName: 'Number of Images',
				name: 'n',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 10 },
				default: 1,
				description: 'Up to the maximum of the model',
				routing: { send: { type: 'body', property: 'n' } },
			},
			{
				displayName: 'Size',
				name: 'size',
				type: 'string',
				default: '',
				placeholder: 'e.g. 1024x1024',
				description: 'One of the sizes of the model. Empty: its default size.',
				routing: { send: { type: 'body', property: 'size', value: '={{ $value || undefined }}' } },
			},
		],
	},
	dryRunOption({ resource: ['ai'], operation: ['generateImage'] }, 'generating images'),

	// ── Get Image ──
	{
		displayName: 'Request ID',
		name: 'requestId',
		type: 'string',
		required: true,
		displayOptions: { show: { ...showOnlyForAi, operation: ['getImage'] } },
		default: '',
		placeholder: 'e.g. req_3f0c2a8e-5b1d-4c7a-9e2f-1a2b3c4d5e6f',
		description: 'The ID returned by "Generate Image"',
	},

	// ── Get Models ──
	{
		displayName: 'Type',
		name: 'modelType',
		type: 'options',
		displayOptions: { show: { ...showOnlyForAi, operation: ['getModels'] } },
		options: [
			{ name: 'Chat Models', value: 'chat' },
			{ name: 'Image Models', value: 'image' },
		],
		default: 'chat',
	},

	// ── Get Usage ──
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { ...showOnlyForAi, operation: ['getUsage'] } },
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		description: 'Max number of results to return',
		routing: { send: { type: 'query', property: 'limit' } },
	},
];
