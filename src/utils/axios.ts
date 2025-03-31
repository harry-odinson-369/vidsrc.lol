import axios, { AxiosInstance } from "axios";

export default class RequestClient {
    constructor(headers?: Record<any, any>) {
        this.headers = headers;
    };

    headers: Record<any, any> | undefined;

    get client(): AxiosInstance {
        if (this.headers) return axios.create({ headers: this.headers, validateStatus: () => true, });
        return axios.create({ validateStatus: () => true, });
    }

    setHeaders(headers: Record<any, any>) {
        this.headers = headers;
    }
}