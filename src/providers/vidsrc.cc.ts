import { DirectLink, ProgressFunction } from "merlmovie-sdk";
import { connect, ConnectResult } from "puppeteer-real-browser";

function BASE_URL(path?: string) {
    return `https://vidsrc.cc/${path || ""}`;
}

function EMBED_URL_V2(path?: string) {
    return BASE_URL(`v2/embed/${path || ""}`);
}

function EMBED_URL_V3(path?: string) {
    return BASE_URL(`v3/embed/${path || ""}`);
}

function tv_url(i: string, s: string, e: string) {
    return EMBED_URL_V2(`tv/${i}/${s}/${e}?autoPlay=true`);
}

function movie_url(i: string) {
    return EMBED_URL_V2(`movie/${i}?autoPlay=true`);
}

async function __get_direct_links(context: ConnectResult, id: string, progress: ProgressFunction, season?: string, episode?: string): Promise<DirectLink | undefined> {
    return new Promise(async resolve => {
        const { browser, page } = context;

        page.on("response", async (response) => {
            if (response.url().startsWith("https://vidsrc.cc/api/source/") && response.status() === 200) {

                let result = {
                    qualities: [],
                    subtitles: [],
                }

                const source = await response.json();
                if (source && source.data && source.data.source) {

                    result.qualities.push({
                        name: "VidPlay",
                        link: source.data.source,
                        headers: {
                            host: new URL(source.data.source).host,
                            referer: BASE_URL(),
                            origin: BASE_URL().substring(0, BASE_URL().length - 1),
                        }
                    });
                    if (source.data.subtitles && source.data.subtitles.length) {
                        result.subtitles = source.data.subtitles.map((e: any) => {
                            return {
                                name: e.label,
                                link: e.file,
                            }
                        });
                    }
                }
                
                progress(100);

                resolve(result);
            }
        });

        await page.goto(season && episode ? tv_url(id, season, episode) : movie_url(id)).catch(() => { });
        
        progress(60);
    });
}

export async function get_direct_links(id: string, progress: ProgressFunction, season?: string, episode?: string): Promise<DirectLink | undefined> {
    progress(20);
    const context = await connect({
        headless: false,
        turnstile: true,
        connectOption: { defaultViewport: null },
        disableXvfb: false,
    });
    progress(30);
    const result = await __get_direct_links(context, id, progress, season, episode);
    await context.browser.close();
    return result;
}

export default get_direct_links;