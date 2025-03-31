import { connect, ConnectResult } from "puppeteer-real-browser";

export type ProxyModel = {
    username?: string,
    password?: string,
    host: string,
    port: number,
}

async function create_browser(proxy?: ProxyModel): Promise<ConnectResult> {
    return await connect({
        headless: false,
        turnstile: true,
        connectOption: { defaultViewport: null },
        disableXvfb: false,
        proxy: proxy,
    });
}

const RealBrowser = create_browser;

export default RealBrowser;