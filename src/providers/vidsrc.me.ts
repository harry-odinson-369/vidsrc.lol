import { DirectLink, ProgressFunction } from "merlmovie-sdk";
import { connect, ConnectResult } from "puppeteer-real-browser";

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

        const agent = await browser.userAgent().catch(err => console.error(err));

        await page.goto(season && episode ? tv_url(id, season, episode) : movie_url(id)).catch(() => { });

        await page.waitForNetworkIdle({ timeout: 5000 }).catch((err) => console.log(err));

        let step = 1;

        page.on("response", async (response) => {
            const headers = response.headers();
            const content_type = headers["content-type"];
            if (content_type === "application/vnd.apple.mpegurl" && step < 2) {

                step = 2;

                const newHeaders = {
                    "host": new URL(response.url()).host,
                    "origin": "https://edgedeliverynetwork.com",
                    "referer": "https://edgedeliverynetwork.com/"
                };

                if (typeof agent === "string") {
                    newHeaders["user-agent"] = agent;
                }

                let result = {
                    qualities: [
                        {
                            name: "CloudStream",
                            link: `https://vidsrc.club/m3u8?d=${encodeURIComponent(response.url())}&h=${encodeURIComponent(JSON.stringify(newHeaders))}`,
                        }
                    ],
                    subtitles: [],
                };

                resolve(result);
            }
        });

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
        }

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