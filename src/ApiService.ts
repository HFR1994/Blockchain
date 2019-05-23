import axios from 'axios';
import { AxiosInstance } from 'axios';

export interface Params {
    [ key: string ]: any;
}

export interface GetOptions {
    url: string;
    params?: Params;
}

export interface ErrorResponse {
    id: string;
    code: string;
    message: string;
}

export class ApiService {

    private axiosClient: AxiosInstance;
    private user = '';
    private secret = '';
    private host = '';

    // I initialize the ApiClient.
    constructor(user, secret, host = "https://ibp-sp.us-south.ibm-blockchain-5-prod.cloud.ibm.com") {
        this.user = user;
        this.secret = secret;
        this.host = host;
        // The ApiClient wraps calls to the underlying Axios client.
        this.axiosClient = axios.create({
            baseURL: this.host,
            auth: {
                username: this.user,
                password: this.secret
            },
        });
    }

    // I perform a GET request with the given options.
    public async get(options: GetOptions) {
        return this.axiosClient.request({
            method: 'get',
            url: options.url,
            params: options.params
        }).then((response) => {
            return response.data;
        }).catch(( err ) => {
            return (Promise.reject(this.normalizeError(err)));
        });
    }

    // I perform a POST request with the given options.
    public async post(options: GetOptions) {
        return await this.axiosClient.request({
            method: 'post',
            url: options.url,
            data: options.params
        }).then((response) => {
            return response.data;
        }).catch(( err ) => {
            return (Promise.reject(this.normalizeError(err)));
        });
    }

    // ---
    // PRIVATE METHODS.
    // ---

    // Errors can occur for a variety of reasons. I normalize the error response so that
    // the calling context can assume a standard error structure.
    private normalizeError( error: any ): ErrorResponse {
        // NOTE: Since I'm not really dealing with a production API, this doesn't really
        // normalize anything (ie, this is not the focus of this demo).
        return({
            id: '-1',
            code: 'UnknownError',
            message: error
        });

    }
}