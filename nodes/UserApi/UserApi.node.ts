import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const API_BASE_URL = 'https://api.userapi.ai';

const operationOptions = [
	{ name: 'Animate', value: 'animate', description: 'Turn an image into a short video', action: 'Animate image' },
	{ name: 'Blend', value: 'blend', description: 'Blend 2 to 5 images into one', action: 'Blend images' },
	{ name: 'Describe', value: 'describe', description: 'Get prompt suggestions that describe an image', action: 'Describe image' },
	{ name: 'Imagine', value: 'imagine', description: 'Generate four images from a text prompt', action: 'Generate images from prompt' },
	{ name: 'Imagine Instant', value: 'imagineInstant', description: 'Generate images from a prompt and pick the result in one call', action: 'Generate and pick image' },
	{ name: 'Info', value: 'info', description: 'Get the subscription and usage details of a Midjourney account', action: 'Get account info' },
	{ name: 'Inpaint', value: 'inpaint', description: 'Redraw a masked region of an image', action: 'Inpaint image' },
	{ name: 'Pan', value: 'pan', description: 'Extend an image in one direction', action: 'Pan image' },
	{ name: 'Reroll', value: 'reroll', description: 'Run the same prompt again', action: 'Reroll prompt' },
	{ name: 'Seed', value: 'seed', description: 'Get the seed of a generation', action: 'Get generation seed' },
	{ name: 'Speed', value: 'speed', description: 'Switch an account between Relax, Fast and Turbo modes', action: 'Set account speed' },
	{ name: 'Status', value: 'status', description: 'Get the status and result of a task', action: 'Get task status' },
	{ name: 'Toggle Remix Mode', value: 'prefer', description: 'Turn Remix mode on or off for an account', action: 'Toggle remix mode' },
	{ name: 'Upload', value: 'upload', description: 'Upload an image to get a Midjourney link for it', action: 'Upload image' },
	{ name: 'Upsample', value: 'upsample', description: 'Upscale an image with a chosen upscaler', action: 'Upsample image' },
	{ name: 'Upscale', value: 'upscale', description: 'Upscale one image from a grid', action: 'Upscale image' },
	{ name: 'Variation', value: 'variation', description: 'Create variations of one image from a grid', action: 'Create image variations' },
	{ name: 'Vary Strong', value: 'varyStrong', description: 'Create strong variations of an upscaled image', action: 'Create strong image variations' },
	{ name: 'Vary Subtle', value: 'varySubtle', description: 'Create subtle variations of an upscaled image', action: 'Create subtle image variations' },
	{ name: 'Zoom', value: 'zoom', description: 'Zoom out of an image', action: 'Zoom out image' },
];

// Request path of each operation. Every operation is a POST except Status.
const operationPaths: Record<string, string> = {
	animate: '/midjourney/v2/animate',
	blend: '/midjourney/v2/blend',
	describe: '/midjourney/v2/describe',
	imagine: '/midjourney/v2/imagine',
	imagineInstant: '/midjourney/v2/imagine-instant',
	info: '/midjourney/v2/info',
	inpaint: '/midjourney/v2/inpaint',
	pan: '/midjourney/v2/pan',
	prefer: '/midjourney/v2/prefer',
	reroll: '/midjourney/v2/reroll',
	seed: '/midjourney/v2/seed',
	speed: '/midjourney/v2/speed',
	status: '/midjourney/v2/status',
	upload: '/midjourney/v2/upload',
	upsample: '/midjourney/v2/upsample',
	upscale: '/midjourney/v2/upscale',
	variation: '/midjourney/v2/variation',
	varyStrong: '/midjourney/v2/vary-strong',
	varySubtle: '/midjourney/v2/vary-subtle',
	zoom: '/midjourney/v2/zoom',
};

// Operations that take the hash of an earlier task.
const hashOperations = ['animate', 'inpaint', 'pan', 'reroll', 'seed', 'status', 'upsample', 'upscale', 'variation', 'varyStrong', 'varySubtle', 'zoom'];

function show(operations: string[], extra: IDataObject = {}): INodeProperties['displayOptions'] {
	return { show: { operation: operations, ...extra } };
}

// ---------------------------------------------------------------- optional fields

const accountHashField: INodeProperties = {
	displayName: 'Account Hash',
	name: 'account_hash',
	type: 'string',
	default: '',
	description: 'Discord account to run the task on. If empty, the accounts linked to your API key take turns.',
};
const callbackIdField: INodeProperties = {
	displayName: 'Callback ID',
	name: 'callback_id',
	type: 'string',
	default: '',
	description: 'Your own identifier, returned with the task (up to 72 characters)',
};
const isAsyncField: INodeProperties = {
	displayName: 'Is Async',
	name: 'is_async',
	type: 'boolean',
	default: false,
	description: 'Whether to return the task hash at once instead of waiting for the final result',
};
const prefilterField: INodeProperties = {
	displayName: 'Disable Prefilter',
	name: 'is_disable_prefilter',
	type: 'boolean',
	default: false,
	description: 'Whether to skip the prompt check that runs before the prompt is sent to Midjourney',
};
const remixPromptField: INodeProperties = {
	displayName: 'Prompt',
	name: 'prompt',
	type: 'string',
	default: '',
	description: 'New prompt for the result. Used when Remix mode is on.',
};
const webhookTypeField: INodeProperties = {
	displayName: 'Webhook Type',
	name: 'webhook_type',
	type: 'options',
	default: 'result',
	description: 'Which updates are sent to the webhook',
	options: [
		{ name: 'Progress', value: 'progress', description: 'Every progress update and the result' },
		{ name: 'Result', value: 'result', description: 'Only the final result' },
	],
};
const webhookUrlField: INodeProperties = {
	displayName: 'Webhook URL',
	name: 'webhook_url',
	type: 'string',
	default: '',
	placeholder: 'e.g. https://example.com/webhook',
	description: 'URL that receives the task result as a POST request',
};

const byName = (a: INodeProperties, b: INodeProperties) => a.displayName.localeCompare(b.displayName);

function additionalFields(operations: string[], fields: INodeProperties[]): INodeProperties {
	return {
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(operations),
		options: [...fields].sort(byName),
	};
}

const webhook = [webhookUrlField, webhookTypeField];

const choiceOneToFour = [
	{ name: '1', value: 1 },
	{ name: '2', value: 2 },
	{ name: '3', value: 3 },
	{ name: '4', value: 4 },
];

// ---------------------------------------------------------------- node

export class UserApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'UserAPI',
		name: 'userApi',
		icon: { light: 'file:userapi.svg', dark: 'file:userapi.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Generate Midjourney images and videos through the UserAPI.ai REST API',
		defaults: { name: 'UserAPI' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'userApi', required: true }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'imagine',
				options: operationOptions,
			},

			// Required inputs.
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. a red fox in a snowy forest, cinematic light --ar 3:2',
				description: 'Text prompt. Midjourney parameters such as --ar 3:2 go at the end.',
				displayOptions: show(['imagine', 'imagineInstant', 'inpaint']),
			},
			{
				displayName: 'Hash',
				name: 'hash',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. 2b9f1c4e-7d3a-4f6b-9c1d-5e8a7b6c4d3f',
				description: 'Hash of the task to work with, returned when the task was created',
				displayOptions: show(hashOperations),
			},
			{
				displayName: 'Account Hash',
				name: 'account_hash',
				type: 'string',
				required: true,
				default: '',
				description: 'Discord account hash from your UserAPI dashboard',
				displayOptions: show(['info', 'prefer', 'speed']),
			},
			{
				displayName: 'Image URL',
				name: 'url',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. https://example.com/image.png',
				description: 'Public http or https link to the image',
				displayOptions: show(['describe', 'upload']),
			},
			{
				displayName: 'Choice',
				name: 'choice',
				type: 'options',
				required: true,
				default: 'nothing',
				description: 'Which result to return after the grid is ready',
				options: [
					{ name: '1', value: '1' },
					{ name: '2', value: '2' },
					{ name: '3', value: '3' },
					{ name: '4', value: '4' },
					{ name: 'All (Seed)', value: 'all' },
					{ name: 'Nothing', value: 'nothing' },
					{ name: 'Random', value: 'random' },
				],
				displayOptions: show(['imagineInstant']),
			},
			{
				displayName: 'Choice',
				name: 'choice',
				type: 'options',
				required: true,
				default: 1,
				description: 'Image of the grid, counted from the top left',
				options: choiceOneToFour,
				displayOptions: show(['upscale', 'variation']),
			},
			{
				displayName: 'Direction',
				name: 'choice',
				type: 'options',
				required: true,
				default: 'right',
				options: [
					{ name: 'Down', value: 'down' },
					{ name: 'Left', value: 'left' },
					{ name: 'Right', value: 'right' },
					{ name: 'Up', value: 'up' },
				],
				displayOptions: show(['pan']),
			},
			{
				displayName: 'Upscaler',
				name: 'choice',
				type: 'options',
				required: true,
				default: 'v6_2x_subtle',
				options: [
					{ name: 'V5 2x', value: 'v5_2x' },
					{ name: 'V5 4x', value: 'v5_4x' },
					{ name: 'V6 2x Creative', value: 'v6_2x_creative' },
					{ name: 'V6 2x Subtle', value: 'v6_2x_subtle' },
					{ name: 'V6r1 2x Creative', value: 'v6r1_2x_creative' },
					{ name: 'V6r1 2x Subtle', value: 'v6r1_2x_subtle' },
					{ name: 'V7 2x Creative', value: 'v7_2x_creative' },
					{ name: 'V7 2x Subtle', value: 'v7_2x_subtle' },
				],
				displayOptions: show(['upsample']),
			},
			{
				displayName: 'Motion',
				name: 'choice',
				type: 'options',
				required: true,
				default: 'high',
				options: [
					{ name: 'High', value: 'high' },
					{ name: 'Low', value: 'low' },
				],
				displayOptions: show(['animate']),
			},
			{
				displayName: 'Mask (Base64)',
				name: 'mask',
				type: 'string',
				required: true,
				default: '',
				description: 'Region to redraw, as a Base64-encoded image',
				displayOptions: show(['inpaint']),
			},
			{
				displayName: 'Zoom Mode',
				name: 'zoom_mode',
				type: 'options',
				default: 'choice',
				options: [
					{ name: 'By Choice', value: 'choice' },
					{ name: 'By Prompt', value: 'prompt' },
				],
				displayOptions: show(['zoom']),
			},
			{
				displayName: 'Zoom',
				name: 'choice',
				type: 'options',
				required: true,
				default: 50,
				options: [
					{ name: '50', value: 50 },
					{ name: '75', value: 75 },
				],
				displayOptions: show(['zoom'], { zoom_mode: ['choice'] }),
			},
			{
				displayName: 'Zoom Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				default: '',
				description: 'Custom zoom, for example "--zoom 1.8" with an optional new prompt',
				displayOptions: show(['zoom'], { zoom_mode: ['prompt'] }),
			},
			{
				displayName: 'Image URLs',
				name: 'urls',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: { values: [{ url: '' }, { url: '' }] },
				description: 'From 2 to 5 image URLs',
				options: [
					{
						displayName: 'Image',
						name: 'values',
						values: [{ displayName: 'URL', name: 'url', type: 'string', required: true, default: '' }],
					},
				],
				displayOptions: show(['blend']),
			},
			{
				displayName: 'Speed',
				name: 'choice',
				type: 'options',
				required: true,
				default: 'relax',
				options: [
					{ name: 'Fast', value: 'fast' },
					{ name: 'Relax', value: 'relax' },
					{ name: 'Turbo', value: 'turbo' },
				],
				displayOptions: show(['speed']),
			},

			// Optional inputs, one collection per group of operations with the same fields.
			additionalFields(['imagine'], [...webhook, callbackIdField, accountHashField, prefilterField]),
			additionalFields(['imagineInstant', 'upload'], [accountHashField]),
			additionalFields(['describe', 'blend'], [...webhook, accountHashField]),
			additionalFields(['info'], [webhookUrlField, callbackIdField]),
			additionalFields(['prefer', 'speed', 'seed'], [webhookUrlField, callbackIdField, isAsyncField]),
			additionalFields(['upscale', 'upsample', 'animate', 'inpaint', 'zoom'], webhook),
			additionalFields(['pan', 'variation', 'varySubtle', 'varyStrong', 'reroll'], [remixPromptField, ...webhook]),
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const path = operationPaths[operation];
				if (!path) {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, { itemIndex: i });
				}
				const param = (name: string) => this.getNodeParameter(name, i);
				const fail = (message: string, description?: string) =>
					new NodeOperationError(this.getNode(), message, { itemIndex: i, description });

				let body: IDataObject = {};
				let qs: IDataObject = {};

				if (hashOperations.includes(operation)) {
					const hash = String(param('hash') ?? '').trim();
					if (!isUuid(hash)) throw fail("'Hash' must be a valid UUID", "Use the 'hash' returned by the operation that created the task");
					if (operation === 'status') qs = { hash };
					else body.hash = hash;
				}

				switch (operation) {
					case 'imagine':
						body.prompt = param('prompt');
						break;
					case 'imagineInstant':
						body.prompt = param('prompt');
						body.choice = param('choice');
						break;
					case 'describe':
					case 'upload': {
						const url = String(param('url') ?? '').trim();
						if (!isValidHttpUrl(url)) throw fail("'Image URL' must be a valid http or https URL", 'Use a public link to the image, for example https://example.com/image.png');
						body.url = url;
						break;
					}
					case 'info':
						body.account_hash = param('account_hash');
						break;
					case 'prefer':
						body.account_hash = param('account_hash');
						body.choice = 'remix';
						body.is_async = false;
						break;
					case 'speed':
						body.account_hash = param('account_hash');
						body.choice = param('choice');
						body.is_async = false;
						break;
					case 'seed':
						body.is_async = false;
						break;
					case 'upscale':
					case 'variation':
					case 'pan':
					case 'upsample':
					case 'animate':
						body.choice = param('choice');
						break;
					case 'inpaint':
						body.mask = param('mask');
						body.prompt = param('prompt');
						break;
					case 'zoom':
						if (param('zoom_mode') === 'choice') body.choice = param('choice');
						else body.prompt = param('prompt');
						break;
					case 'blend': {
						const urls = this.getNodeParameter('urls.values', i, []) as Array<{ url: string }>;
						if (urls.length < 2 || urls.length > 5) throw fail("'Image URLs' must contain 2 to 5 images", "Add or remove entries in 'Image URLs'");
						if (urls.some((u) => !isValidHttpUrl(u.url))) throw fail("Each entry in 'Image URLs' must be a valid http or https URL", 'Use public links to the images, for example https://example.com/image.png');
						body.urls = urls.map((u) => ({ url: u.url }));
						break;
					}
				}

				if (operation !== 'status') {
					body = { ...body, ...optionalFields(this.getNodeParameter('additionalFields', i, {}) as IDataObject, fail) };
				}

				const method: IHttpRequestMethods = operation === 'status' ? 'GET' : 'POST';
				const options: IHttpRequestOptions = { method, url: `${API_BASE_URL}${path}`, json: true };
				if (method === 'POST') options.body = body;
				if (Object.keys(qs).length > 0) options.qs = qs;

				let response: unknown;
				try {
					response = await this.helpers.httpRequestWithAuthentication.call(this, 'userApi', options);
				} catch (error) {
					// Show the API's own reason ("not enough balance", "banned prompt") instead of a generic HTTP text.
					const reason = apiErrorReason(error);
					throw new NodeApiError(this.getNode(), error as JsonObject, reason ? { itemIndex: i, message: reason } : { itemIndex: i });
				}
				const json: IDataObject =
					typeof response === 'object' && response !== null
						? (response as IDataObject)
						: { value: response as string | number | boolean | null };
				returnData.push({ json, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				// Both constructors return the error unchanged when it is already of their type.
				if (error instanceof NodeApiError) throw new NodeApiError(this.getNode(), error as unknown as JsonObject);
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}
		return [returnData];
	}
}

// Copies the filled optional fields into the request body. The webhook type is sent only with a webhook URL.
function optionalFields(fields: IDataObject, fail: (message: string, description?: string) => Error): IDataObject {
	const out: IDataObject = {};
	for (const key of ['account_hash', 'callback_id', 'prompt']) {
		const value = typeof fields[key] === 'string' ? (fields[key] as string).trim() : '';
		if (value !== '') out[key] = value;
	}
	for (const key of ['is_async', 'is_disable_prefilter']) {
		if (typeof fields[key] === 'boolean') out[key] = fields[key];
	}
	const webhookUrl = typeof fields.webhook_url === 'string' ? fields.webhook_url.trim() : '';
	if (webhookUrl !== '') {
		if (!isValidHttpUrl(webhookUrl)) throw fail("'Webhook URL' must be a valid http or https URL", "Fix 'Webhook URL' in 'Additional Fields' or remove it");
		out.webhook_url = webhookUrl;
		if (fields.webhook_type) out.webhook_type = fields.webhook_type;
	}
	return out;
}

// The UserAPI error body is {"error": "..."}; returns that text when present.
function apiErrorReason(error: unknown): string | undefined {
	const data = (error as { response?: { data?: unknown; body?: unknown } })?.response;
	const body = data?.data ?? data?.body;
	if (body && typeof body === 'object') {
		const reason = (body as IDataObject).error ?? (body as IDataObject).message;
		if (typeof reason === 'string' && reason.trim() !== '') return reason.trim();
	}
	return undefined;
}

function isValidHttpUrl(value: string): boolean {
	try {
		const u = new URL(value);
		return u.protocol === 'http:' || u.protocol === 'https:';
	} catch {
		return false;
	}
}

function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
