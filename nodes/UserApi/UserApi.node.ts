import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

const webhookTypeOptions = [
	{ name: 'Progress', value: 'progress' },
	{ name: 'Result', value: 'result' },
];
const API_BASE_URL = 'https://api.userapi.ai';

const operationOptions = [
	{ name: 'Imagine', value: 'imagine', description: 'POST /midjourney/v2/imagine' },
	{ name: 'Imagine Instant', value: 'imagineInstant', description: 'POST /midjourney/v2/imagine-instant' },
	{ name: 'Describe', value: 'describe', description: 'POST /midjourney/v2/describe' },
	{ name: 'Info', value: 'info', description: 'POST /midjourney/v2/info' },
	{ name: 'Upscale', value: 'upscale', description: 'POST /midjourney/v2/upscale' },
	{ name: 'Pan', value: 'pan', description: 'POST /midjourney/v2/pan' },
	{ name: 'Variation', value: 'variation', description: 'POST /midjourney/v2/variation' },
	{ name: 'Vary Subtle', value: 'varySubtle', description: 'POST /midjourney/v2/vary-subtle' },
	{ name: 'Vary Strong', value: 'varyStrong', description: 'POST /midjourney/v2/vary-strong' },
	{ name: 'Reroll', value: 'reroll', description: 'POST /midjourney/v2/reroll' },
	{ name: 'Upsample', value: 'upsample', description: 'POST /midjourney/v2/upsample' },
	{ name: 'Animate', value: 'animate', description: 'POST /midjourney/v2/animate' },
	{ name: 'Inpaint', value: 'inpaint', description: 'POST /midjourney/v2/inpaint' },
	{ name: 'Zoom', value: 'zoom', description: 'POST /midjourney/v2/zoom' },
	{ name: 'Blend', value: 'blend', description: 'POST /midjourney/v2/blend' },
	{ name: 'Toggle Remix Mode', value: 'prefer', description: 'POST /midjourney/v2/prefer' },
	{ name: 'Speed', value: 'speed', description: 'POST /midjourney/v2/speed' },
	{ name: 'Upload', value: 'upload', description: 'POST /midjourney/v2/upload' },
	{ name: 'Seed', value: 'seed', description: 'POST /midjourney/v2/seed' },
	{ name: 'Status', value: 'status', description: 'GET /midjourney/v2/status?hash=...' },
];

function withDisplay(operation: string, properties: INodeProperties[]): INodeProperties[] {
	return properties.map((p) => ({
		...p,
		displayOptions: {
			show: {
				...(p.displayOptions?.show ?? {}),
				operation: [operation],
			},
		},
	}));
}

const commonWebhookFields: INodeProperties[] = [
	{ displayName: 'Webhook URL', name: 'webhook_url', type: 'string', default: '', description: 'Optional callback URL' },
	{
		displayName: 'Webhook Type',
		name: 'webhook_type',
		type: 'options',
		default: 'result',
		description: 'Allowed values: progress, result',
		options: webhookTypeOptions,
	},
];

const uuidHashField: INodeProperties = {
	displayName: 'Hash',
	name: 'hash',
	type: 'string',
	required: true,
	default: '',
	description: 'Required UUID hash',
};

const optionalAccountHashDescription =
	'Optional Discord account hash. If omitted, available accounts are rotated to distribute load.';
const requiredAccountHashDescription =
	'Required Discord account hash from your UserAPI dashboard.';

export class UserApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'UserAPI',
		name: 'userApi',
		icon: 'file:userapi.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'UserApi.Ai - API layer to Midjourney (unofficial)',
		defaults: { name: 'UserAPI' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'userApi', required: true }],
		properties: [
			{ displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'imagine', options: operationOptions },
			...withDisplay('imagine', [
				{ displayName: 'Prompt', name: 'prompt', type: 'string', required: true, default: '', description: 'Required prompt text' },
				...commonWebhookFields,
				{ displayName: 'Callback ID', name: 'callback_id', type: 'string', default: '', description: 'Optional callback identifier (max 72 chars)' },
				{
					displayName: 'Account Hash',
					name: 'account_hash',
					type: 'string',
					default: '',
					description: optionalAccountHashDescription,
				},
				{ displayName: 'Disable Prefilter', name: 'is_disable_prefilter', type: 'boolean', default: false },
			]),
			...withDisplay('imagineInstant', [
				{ displayName: 'Prompt', name: 'prompt', type: 'string', required: true, default: '', description: 'Required prompt text' },
				{
					displayName: 'Choice', name: 'choice', type: 'options', required: true, default: 'nothing',
					options: [{ name: 'Nothing', value: 'nothing' }, { name: 'Random', value: 'random' }, { name: 'All (Seed)', value: 'all' }, { name: '1', value: '1' }, { name: '2', value: '2' }, { name: '3', value: '3' }, { name: '4', value: '4' }],
				},
				{ displayName: 'Account Hash', name: 'account_hash', type: 'string', default: '', description: optionalAccountHashDescription },
			]),
			...withDisplay('describe', [
				{ displayName: 'URL', name: 'url', type: 'string', required: true, default: '', description: 'Required image URL (http/https)' },
				...commonWebhookFields,
				{ displayName: 'Account Hash', name: 'account_hash', type: 'string', default: '', description: optionalAccountHashDescription },
			]),
			...withDisplay('info', [
				{ displayName: 'Account Hash', name: 'account_hash', type: 'string', required: true, default: '', description: requiredAccountHashDescription },
				{ displayName: 'Webhook URL', name: 'webhook_url', type: 'string', default: '' },
				{ displayName: 'Callback ID', name: 'callback_id', type: 'string', default: '', description: 'Optional callback identifier (max 72 chars)' },
			]),
			...withDisplay('upscale', [
				uuidHashField,
				{
					displayName: 'Choice',
					name: 'choice',
					type: 'options',
					required: true,
					default: 1,
					options: [{ name: '1', value: 1 }, { name: '2', value: 2 }, { name: '3', value: 3 }, { name: '4', value: 4 }],
				},
				...commonWebhookFields,
			]),
			...withDisplay('pan', [
				uuidHashField,
				{ displayName: 'Direction', name: 'choice', type: 'options', required: true, default: 'right', options: [{ name: 'Right', value: 'right' }, { name: 'Left', value: 'left' }, { name: 'Up', value: 'up' }, { name: 'Down', value: 'down' }] },
				{ displayName: 'Prompt', name: 'prompt', type: 'string', default: '', description: 'Optional. Used in Remix mode.' },
				...commonWebhookFields,
			]),
			...withDisplay('variation', [
				uuidHashField,
				{
					displayName: 'Choice',
					name: 'choice',
					type: 'options',
					required: true,
					default: 1,
					options: [{ name: '1', value: 1 }, { name: '2', value: 2 }, { name: '3', value: 3 }, { name: '4', value: 4 }],
				},
				{ displayName: 'Prompt', name: 'prompt', type: 'string', default: '', description: 'Optional. Used in Remix mode.' },
				...commonWebhookFields,
			]),
			...withDisplay('varySubtle', [uuidHashField, { displayName: 'Prompt', name: 'prompt', type: 'string', default: '', description: 'Optional. Used in Remix mode.' }, ...commonWebhookFields]),
			...withDisplay('varyStrong', [uuidHashField, { displayName: 'Prompt', name: 'prompt', type: 'string', default: '', description: 'Optional. Used in Remix mode.' }, ...commonWebhookFields]),
			...withDisplay('reroll', [uuidHashField, { displayName: 'Prompt', name: 'prompt', type: 'string', default: '', description: 'Optional. Used in Remix mode.' }, ...commonWebhookFields]),
			...withDisplay('upsample', [
				uuidHashField,
				{
					displayName: 'Choice', name: 'choice', type: 'options', required: true, default: 'v6_2x_subtle',
					options: [{ name: 'v6_2x_subtle', value: 'v6_2x_subtle' }, { name: 'v6_2x_creative', value: 'v6_2x_creative' }, { name: 'v6r1_2x_subtle', value: 'v6r1_2x_subtle' }, { name: 'v6r1_2x_creative', value: 'v6r1_2x_creative' }, { name: 'v5_2x', value: 'v5_2x' }, { name: 'v5_4x', value: 'v5_4x' }, { name: 'v7_2x_subtle', value: 'v7_2x_subtle' }, { name: 'v7_2x_creative', value: 'v7_2x_creative' }],
				},
				...commonWebhookFields,
			]),
			...withDisplay('animate', [
				uuidHashField,
				{ displayName: 'Choice', name: 'choice', type: 'options', required: true, default: 'high', options: [{ name: 'High', value: 'high' }, { name: 'Low', value: 'low' }] },
				...commonWebhookFields,
			]),
			...withDisplay('inpaint', [uuidHashField, { displayName: 'Mask (Base64)', name: 'mask', type: 'string', required: true, default: '' }, { displayName: 'Prompt', name: 'prompt', type: 'string', required: true, default: '' }, ...commonWebhookFields]),
			...withDisplay('zoom', [
				uuidHashField,
				{ displayName: 'Zoom Mode', name: 'zoom_mode', type: 'options', default: 'choice', options: [{ name: 'By Choice', value: 'choice' }, { name: 'By Prompt', value: 'prompt' }] },
				{ displayName: 'Choice', name: 'choice', type: 'options', required: true, default: 50, options: [{ name: '50', value: 50 }, { name: '75', value: 75 }], displayOptions: { show: { operation: ['zoom'], zoom_mode: ['choice'] } } },
				{ displayName: 'Prompt', name: 'prompt', type: 'string', required: true, default: '', displayOptions: { show: { operation: ['zoom'], zoom_mode: ['prompt'] } } },
				...commonWebhookFields,
			]),
			...withDisplay('blend', [
				{
					displayName: 'URLs',
					name: 'urls',
					type: 'fixedCollection',
					typeOptions: { multipleValues: true },
					default: { values: [{ url: '' }, { url: '' }] },
					options: [{ displayName: 'URL Entry', name: 'values', values: [{ displayName: 'URL', name: 'url', type: 'string', required: true, default: '' }] }],
					description: 'From 2 to 5 image URLs',
				},
				...commonWebhookFields,
				{ displayName: 'Account Hash', name: 'account_hash', type: 'string', default: '', description: optionalAccountHashDescription },
			]),
			...withDisplay('prefer', [
				{ displayName: 'Account Hash', name: 'account_hash', type: 'string', required: true, default: '', description: requiredAccountHashDescription },
				{ displayName: 'Webhook URL', name: 'webhook_url', type: 'string', default: '' },
				{ displayName: 'Callback ID', name: 'callback_id', type: 'string', default: '', description: 'Optional callback identifier (max 72 chars)' },
				{ displayName: 'Is Async', name: 'is_async', type: 'boolean', default: false, description: 'On: return hash immediately. Off: wait for final result.' },
			]),
			...withDisplay('speed', [
				{ displayName: 'Account Hash', name: 'account_hash', type: 'string', required: true, default: '', description: requiredAccountHashDescription },
				{
					displayName: 'Choice',
					name: 'choice',
					type: 'options',
					required: true,
					default: 'relax',
					options: [
						{ name: 'relax', value: 'relax' },
						{ name: 'fast', value: 'fast' },
						{ name: 'turbo', value: 'turbo' },
					],
					description: 'Speed mode',
				},
				{ displayName: 'Webhook URL', name: 'webhook_url', type: 'string', default: '' },
				{ displayName: 'Callback ID', name: 'callback_id', type: 'string', default: '', description: 'Optional callback identifier (max 72 chars)' },
				{ displayName: 'Is Async', name: 'is_async', type: 'boolean', default: false, description: 'On: return hash immediately. Off: wait for final result.' },
			]),
			...withDisplay('upload', [
				{
					displayName: 'Image URL',
					name: 'url',
					type: 'string',
					required: true,
					default: '',
				},
				{ displayName: 'Account Hash', name: 'account_hash', type: 'string', default: '', description: optionalAccountHashDescription },
			]),
			...withDisplay('seed', [
				uuidHashField,
				{ displayName: 'Is Async', name: 'is_async', type: 'boolean', default: false, description: 'On: return hash immediately. Off: wait for final result.' },
				{ displayName: 'Webhook URL', name: 'webhook_url', type: 'string', default: '' },
				{ displayName: 'Callback ID', name: 'callback_id', type: 'string', default: '', description: 'Optional callback identifier (max 72 chars)' },
			]),
			...withDisplay('status', [uuidHashField]),
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const requestOptions: IHttpRequestOptions = { method: 'GET', url: '/', json: true };
				let body: IDataObject = {};
				let query: IDataObject = {};

				switch (operation) {
					case 'imagine':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/imagine';
						body = { prompt: this.getNodeParameter('prompt', i) as string, is_disable_prefilter: this.getNodeParameter('is_disable_prefilter', i) as boolean };
						addWebhookFields(this, i, body);
						addOptionalString(body, 'callback_id', this.getNodeParameter('callback_id', i) as string);
						addOptionalString(body, 'account_hash', this.getNodeParameter('account_hash', i) as string);
						break;
					case 'imagineInstant':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/imagine-instant';
						body = { prompt: this.getNodeParameter('prompt', i) as string, choice: this.getNodeParameter('choice', i) as string };
						addOptionalString(body, 'account_hash', this.getNodeParameter('account_hash', i) as string);
						break;
					case 'describe':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/describe';
						body = { url: this.getNodeParameter('url', i) as string };
						if (!isValidHttpUrl(body.url as string)) {
							throw new NodeApiError(this.getNode(), { message: 'URL must be a valid http/https image URL' });
						}
						addWebhookFields(this, i, body);
						addOptionalString(body, 'account_hash', this.getNodeParameter('account_hash', i) as string);
						break;
					case 'info':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/info';
						body = { account_hash: this.getNodeParameter('account_hash', i) as string };
						{
							const webhookUrl = this.getNodeParameter('webhook_url', i) as string;
							if (webhookUrl !== '') {
								if (!isValidHttpUrl(webhookUrl)) {
									throw new NodeApiError(this.getNode(), { message: 'Webhook URL must be a valid http/https URL' });
								}
								body.webhook_url = webhookUrl;
							}
						}
						addOptionalString(body, 'callback_id', this.getNodeParameter('callback_id', i) as string);
						break;
					case 'upscale':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/upscale';
						body = { hash: this.getNodeParameter('hash', i) as string, choice: this.getNodeParameter('choice', i) as number };
						if (!isUuidV4Like(body.hash as string)) throw new NodeApiError(this.getNode(), { message: 'Hash must be a valid UUID' });
						addWebhookFields(this, i, body);
						break;
					case 'pan':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/pan';
						body = { hash: this.getNodeParameter('hash', i) as string, choice: this.getNodeParameter('choice', i) as string };
						if (!isUuidV4Like(body.hash as string)) throw new NodeApiError(this.getNode(), { message: 'Hash must be a valid UUID' });
						addOptionalString(body, 'prompt', this.getNodeParameter('prompt', i) as string);
						addWebhookFields(this, i, body);
						break;
					case 'variation':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/variation';
						body = { hash: this.getNodeParameter('hash', i) as string, choice: this.getNodeParameter('choice', i) as number };
						if (!isUuidV4Like(body.hash as string)) throw new NodeApiError(this.getNode(), { message: 'Hash must be a valid UUID' });
						addOptionalString(body, 'prompt', this.getNodeParameter('prompt', i) as string);
						addWebhookFields(this, i, body);
						break;
					case 'varySubtle':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/vary-subtle'; body = { hash: this.getNodeParameter('hash', i) as string };
						if (!isUuidV4Like(body.hash as string)) throw new NodeApiError(this.getNode(), { message: 'Hash must be a valid UUID' });
						addOptionalString(body, 'prompt', this.getNodeParameter('prompt', i) as string);
						addWebhookFields(this, i, body);
						break;
					case 'varyStrong':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/vary-strong'; body = { hash: this.getNodeParameter('hash', i) as string };
						if (!isUuidV4Like(body.hash as string)) throw new NodeApiError(this.getNode(), { message: 'Hash must be a valid UUID' });
						addOptionalString(body, 'prompt', this.getNodeParameter('prompt', i) as string);
						addWebhookFields(this, i, body);
						break;
					case 'reroll':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/reroll'; body = { hash: this.getNodeParameter('hash', i) as string };
						if (!isUuidV4Like(body.hash as string)) throw new NodeApiError(this.getNode(), { message: 'Hash must be a valid UUID' });
						addOptionalString(body, 'prompt', this.getNodeParameter('prompt', i) as string);
						addWebhookFields(this, i, body);
						break;
					case 'upsample':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/upsample';
						body = { hash: this.getNodeParameter('hash', i) as string, choice: this.getNodeParameter('choice', i) as string };
						if (!isUuidV4Like(body.hash as string)) throw new NodeApiError(this.getNode(), { message: 'Hash must be a valid UUID' });
						addWebhookFields(this, i, body);
						break;
					case 'animate':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/animate';
						body = { hash: this.getNodeParameter('hash', i) as string, choice: this.getNodeParameter('choice', i) as string };
						if (!isUuidV4Like(body.hash as string)) throw new NodeApiError(this.getNode(), { message: 'Hash must be a valid UUID' });
						addWebhookFields(this, i, body);
						break;
					case 'inpaint':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/inpaint';
						body = { hash: this.getNodeParameter('hash', i) as string, mask: this.getNodeParameter('mask', i) as string, prompt: this.getNodeParameter('prompt', i) as string };
						if (!isUuidV4Like(body.hash as string)) throw new NodeApiError(this.getNode(), { message: 'Hash must be a valid UUID' });
						addWebhookFields(this, i, body);
						break;
					case 'zoom': {
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/zoom'; body = { hash: this.getNodeParameter('hash', i) as string };
						if (!isUuidV4Like(body.hash as string)) throw new NodeApiError(this.getNode(), { message: 'Hash must be a valid UUID' });
						const mode = this.getNodeParameter('zoom_mode', i) as string;
						if (mode === 'choice') body.choice = this.getNodeParameter('choice', i) as number; else body.prompt = this.getNodeParameter('prompt', i) as string;
						addWebhookFields(this, i, body);
						break;
					}
					case 'blend': {
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/blend';
						const urlsRaw = this.getNodeParameter('urls.values', i, []) as Array<{ url: string }>;
						if (urlsRaw.length < 2 || urlsRaw.length > 5) throw new NodeApiError(this.getNode(), { message: 'Blend requires 2 to 5 URLs' });
						for (const entry of urlsRaw) {
							if (!isValidHttpUrl(entry.url)) {
								throw new NodeApiError(this.getNode(), { message: 'Each Blend URL must be a valid http/https URL' });
							}
						}
						body = { urls: urlsRaw.map((u) => ({ url: u.url })) };
						addWebhookFields(this, i, body);
						addOptionalString(body, 'account_hash', this.getNodeParameter('account_hash', i) as string);
						break;
					}
					case 'prefer':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/prefer';
						body = { account_hash: this.getNodeParameter('account_hash', i) as string, choice: 'remix', is_async: this.getNodeParameter('is_async', i) as boolean };
						{
							const webhookUrl = this.getNodeParameter('webhook_url', i) as string;
							if (webhookUrl !== '') {
								if (!isValidHttpUrl(webhookUrl)) {
									throw new NodeApiError(this.getNode(), { message: 'Webhook URL must be a valid http/https URL' });
								}
								body.webhook_url = webhookUrl;
							}
						}
						addOptionalString(body, 'callback_id', this.getNodeParameter('callback_id', i) as string);
						break;
					case 'speed':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/speed';
						body = {
							account_hash: this.getNodeParameter('account_hash', i) as string,
							choice: this.getNodeParameter('choice', i) as string,
							is_async: this.getNodeParameter('is_async', i) as boolean,
						};
						{
							const webhookUrl = this.getNodeParameter('webhook_url', i) as string;
							if (webhookUrl !== '') {
								if (!isValidHttpUrl(webhookUrl)) {
									throw new NodeApiError(this.getNode(), { message: 'Webhook URL must be a valid http/https URL' });
								}
								body.webhook_url = webhookUrl;
							}
						}
						addOptionalString(body, 'callback_id', this.getNodeParameter('callback_id', i) as string);
						break;
					case 'upload':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/upload';
						{
							const url = this.getNodeParameter('url', i) as string;
							if (!isValidHttpUrl(url)) {
								throw new NodeApiError(this.getNode(), { message: 'Image URL must be a valid http/https URL' });
							}
							body = { url };
							addOptionalString(body, 'account_hash', this.getNodeParameter('account_hash', i) as string);
						}
						break;
					case 'seed':
						requestOptions.method = 'POST'; requestOptions.url = '/midjourney/v2/seed';
						body = { hash: this.getNodeParameter('hash', i) as string, is_async: this.getNodeParameter('is_async', i) as boolean };
						if (!isUuidV4Like(body.hash as string)) throw new NodeApiError(this.getNode(), { message: 'Hash must be a valid UUID' });
						{
							const webhookUrl = this.getNodeParameter('webhook_url', i) as string;
							if (webhookUrl !== '') {
								if (!isValidHttpUrl(webhookUrl)) {
									throw new NodeApiError(this.getNode(), { message: 'Webhook URL must be a valid http/https URL' });
								}
								body.webhook_url = webhookUrl;
							}
						}
						break;
					case 'status':
						requestOptions.method = 'GET'; requestOptions.url = '/midjourney/v2/status'; query = { hash: this.getNodeParameter('hash', i) as string };
						if (!isUuidV4Like(query.hash as string)) throw new NodeApiError(this.getNode(), { message: 'Hash must be a valid UUID' });
						break;
					default:
						throw new NodeApiError(this.getNode(), { message: `Unsupported operation: ${operation}` });
				}

				if (requestOptions.json !== false) {
					requestOptions.headers = { ...(requestOptions.headers ?? {}), 'Content-Type': 'application/json' };
				}
				if (typeof requestOptions.url === 'string' && requestOptions.url.startsWith('/')) {
					requestOptions.url = `${API_BASE_URL}${requestOptions.url}`;
				}
				if (Object.keys(body).length > 0) requestOptions.body = body;
				if (Object.keys(query).length > 0) requestOptions.qs = query;
				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'userApi', requestOptions);
				const json: IDataObject = typeof response === 'object' && response !== null ? (response as IDataObject) : { value: response as string | number | boolean | null };
				returnData.push({ json, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}

function addOptionalString(target: IDataObject, key: string, value: string): void {
	if (value !== '') target[key] = value;
}

function addWebhookFields(context: IExecuteFunctions, itemIndex: number, target: IDataObject): void {
	const webhookUrl = context.getNodeParameter('webhook_url', itemIndex) as string;
	if (webhookUrl === '') return;
	if (!isValidHttpUrl(webhookUrl)) {
		throw new NodeApiError(context.getNode(), { message: 'Webhook URL must be a valid http/https URL' });
	}
	target.webhook_url = webhookUrl;
	target.webhook_type = context.getNodeParameter('webhook_type', itemIndex) as string;
}

function isValidHttpUrl(value: string): boolean {
	try {
		const u = new URL(value);
		return u.protocol === 'http:' || u.protocol === 'https:';
	} catch {
		return false;
	}
}

function isUuidV4Like(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
