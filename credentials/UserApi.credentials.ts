import type {
    ICredentialType,
    INodeProperties,
    IAuthenticateGeneric,
    ICredentialTestRequest,
} from 'n8n-workflow';

export class UserApi implements ICredentialType {
    name = 'userApi';
    displayName = 'UserAPI';
    documentationUrl = 'https://userapi.ai/first-steps';

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'api-key': '={{$credentials.apiKey}}',
            },
        },
    };

    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
        },
    ];

    test: ICredentialTestRequest = {
        request: {
            url: '/user/whoami',
            method: 'GET',
            baseURL: 'https://api.userapi.ai',
        },
    };
}