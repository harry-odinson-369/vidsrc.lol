import { DirectLink, FetchFunction, FetchFunctionParams, ProgressFunction } from "merlmovie-sdk";
import { ConnectResult } from "puppeteer-real-browser";
import RealBrowser from "../utils/browser";

function BASE_URL(path?: string) {
    return `https://vidsrc.me/${path || ""}`;
}

function movie_url(i: string) {
    return BASE_URL(`embed/movie/${i}`);
}

function tv_url(i: string, s: string, e: string) {
    return BASE_URL(`embed/tv/${i}/${s}-${e}`);
}

async function __get_direct_links(context: ConnectResult, id: string, progress: ProgressFunction, season?: string, episode?: string): Promise<DirectLink | undefined> {
    return new Promise(async resolve => {
        const { browser, page } = context;

        await page.goto(season && episode ? tv_url(id, season, episode) : movie_url(id)).catch(() => { });

        await page.waitForNetworkIdle({ timeout: 5000 }).catch((err) => console.log(err));

        let step = 1;

        let newHeaders: Record<any, any>;

        await page.setRequestInterception(true);

        page.on("request", async req => {
            newHeaders = req.headers();
            req.continue();
        });

        page.on("response", async (response) => {
            const headers = response.headers();
            const content_type = headers["content-type"];
            if (content_type === "application/vnd.apple.mpegurl" && step < 2) {

                step = 2;

                let result = {
                    qualities: [
                        {
                            name: "CloudStream",
                            link: response.url(),
                            headers: newHeaders,
                        }
                    ],
                    subtitles: [],
                };

                resolve(result);
            }
        });

        while (step < 2) {

            const pages = await browser.pages();

            if (pages.length > 1) {
                for (let i = 0; i < pages.length; i++) {
                    if (i !== 0) {
                        await pages[i].close();
                    } 
                }
            }

            if (step === 1) {
                const cor = await page.evaluate(() => {
                    return {
                        width: window.innerWidth,
                        height: window.innerHeight,
                    }
                }).catch(err => console.log(err));

                if (typeof cor === "object") {
                    await page.mouse.click(cor.width / 2, cor.height / 2).catch(err => console.error(err));
                }
            } else {
                break;
            }
        }

        progress(60);
    });
}

async function get_direct_links(id: string, progress: ProgressFunction, season?: string, episode?: string): Promise<DirectLink | undefined> {
    progress(20);
    const context = await RealBrowser();
    progress(30);
    const result = await __get_direct_links(context, id, progress, season, episode);
    await context.browser.close();
    return result;
}

const vidsrc_me = get_direct_links;

export default vidsrc_me;