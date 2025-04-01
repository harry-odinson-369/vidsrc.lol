import { DirectLink, ProgressFunction } from "merlmovie-sdk";
import RealBrowser from "../utils/browser";
import { delay } from "../utils/timer";
import fs from "fs";
import path from "path";
import { CookiesDir, diceCoefficient, random, unused_auth_filename } from "../utils/helper";
import RequestClient from "../utils/axios";
import { fetch_info, get_title, get_year } from "../utils/tmdb";

function BASE_URL(path?: string) {
    return `https://netfree.cc/${path || ""}`;
}

type HeadersModel = {
    "User-Agent": string,
    "Cookies": Record<any, any>[],
}

type LocalHeadersModel = {
    filename: string,
    headers: HeadersModel,
}

type SearchItem = {
    id: string,
    t: string,
    y: string,
    r: string
};

const DefaultAuthPath = path.join(CookiesDir, "netfree_cc");

function __parse_headers(headers: HeadersModel) {
    return {
        "User-Agent": headers["User-Agent"],
        "Cookie": headers.Cookies.map(e => `${e.name}=${e.value}`).join("; "),
    }
}

async function save_headers(headers: HeadersModel, filename?: string) {
    if (!fs.existsSync(DefaultAuthPath)) fs.mkdirSync(DefaultAuthPath, { recursive: true });

    const file = path.join(DefaultAuthPath, filename || unused_auth_filename(DefaultAuthPath));
    const data = JSON.stringify(headers);
    if (typeof data === "string" && data.length) {
        await new Promise(resolve => {
            fs.writeFile(file, data, (err) => {
                if (err) console.error(err);
                resolve(undefined);
            });
        });
    }
}

function get_local_headers(filename?: string): Promise<LocalHeadersModel | undefined> {
    return new Promise(async resolve => {
        const index = random(1, 10);
        const __filename = filename || `${index}.json`;
        const file = path.join(DefaultAuthPath, __filename);
        if (!fs.existsSync(file)) {
            resolve(undefined);
        } else {
            const data: string | undefined = await new Promise(res => {
                fs.readFile(file, "utf-8", (err, data) => {
                    if (err) {
                        console.error(err);
                        res(undefined);
                    } else {
                        res(data);
                    }
                });
            });

            if (!data) {
                resolve(undefined);
            } else {
                resolve({
                    headers: JSON.parse(data),
                    filename: __filename,
                });
            }
        }
    });
}

async function get_headers(progress: ProgressFunction, filename?: string, renew?: boolean): Promise<LocalHeadersModel> {
    const local = await get_local_headers(filename);
    if (local && !renew) {
        progress(40);
        return local;
    } else {

        let prog = 20;

        progress(prog);

        const { browser, page } = await RealBrowser();

        await page.goto(BASE_URL("mobile/home"));

        await page.waitForNetworkIdle({ timeout: 5000 }).catch((_) => { });

        await page.realClick("body > div.app > div.single-item > div.info2 > button.open-support.checker").catch(e => console.error(e));

        let Cookies: Array<Record<any, any>> = [];

        while (true) {
            const cookies = await page.cookies().catch(() => { });
            if (Array.isArray(cookies)) {
                Cookies = cookies.map(e => JSON.parse(JSON.stringify(e)));
                const hash = cookies.find(e => e.name === "t_hash_t");
                if (typeof hash !== "undefined" && hash.value) {
                    break;
                }
            }
            if (prog < 40) {
                prog = prog + 1;
                progress(prog);
            }
            await delay(2000);
        }

        const agent = await browser.userAgent();

        const newHeaders = {
            "User-Agent": agent,
            "Cookies": [{ name: "hd", value: "on" }, ...Cookies],
        };

        const __filename = filename || unused_auth_filename(DefaultAuthPath);

        await save_headers(newHeaders, __filename);

        await browser.close();

        progress(40);

        return {
            filename: __filename,
            headers: newHeaders,
        }
    }
}

async function __get_final_links(id: string, progress: ProgressFunction, axios: RequestClient, ott?: string) {
    let result: DirectLink | undefined;
    
    const __BASE = (p?: string) => {
        return BASE_URL(`mobile/${ott ? `${ott}/` : ""}${p || ""}`);
    }

    const playlist_api = __BASE(`playlist.php?id=${id}`);
    const resp3 = await axios.client.get(playlist_api);

    progress(90);

    if (resp3.status === 200 && resp3.data.length) {
        result = {
            qualities: [],
            subtitles: [],
        };

        resp3.data.forEach((e: any) => {
            if (e.sources.length) {
                result.qualities = [...result.qualities, ...e.sources.map((x: any) => {
                    return {
                        name: x.label,
                        link: new URL(x.file, BASE_URL()),
                        headers: {
                            referer: BASE_URL(),
                        }
                    };
                })];
            }
        });
    }

    return result;
}

async function __get_direct_links(id: string, progress: ProgressFunction, raw: LocalHeadersModel, s?: string, e?: string, ott?: string): Promise<DirectLink | undefined | null> {

    const __BASE = (p?: string) => {
        return BASE_URL(`mobile/${ott ? `${ott}/` : ""}${p || ""}`);
    }

    const headers = __parse_headers(raw.headers);

    const axios = new RequestClient(headers);

    const info = await fetch_info(s && e ? "tv" : "movie", id);
    const title = get_title(info);
    const year = get_year(info);

    const search_api = __BASE(`search.php?s=${encodeURIComponent(title)}`);

    const resp = await axios.client.get(search_api);

    if (resp.status === 200 && resp.data.searchResult && resp.data.searchResult.length) {
        progress(60);
        const results = (resp.data.searchResult as SearchItem[]).filter(e => {
            if (e.r) {
                if (s && e) {
                    return e.r === "Series";
                } else {
                    return e.r !== "Series";
                }
            } else {
                return e.t;
            }
        });

        let searchItem: SearchItem | undefined;

        let rated = 0;

        let detail: any = undefined;

        for (const item of results) {
            const compareRate = diceCoefficient(title, item.t);
            if (compareRate > rated) {

                rated = compareRate;
                searchItem = item;

                const respx = await axios.client.get(__BASE(`post.php?id=${item.id}`));
                if (respx.status === 200) {
                    if (respx.data.year === year) {
                        detail = respx.data;
                    }
                }
            }
        }

        if (detail) {
            if (detail.season && detail.season.length) {
                let season = detail.season.find((e: any) => e.s === s);

                if (!season) {
                    season = detail.season.find((e: any) => e.s === `S${s}`);
                }

                if (season) {

                    const episode_api = __BASE(`episodes.php?s=${season.id}&series=${searchItem.id}`);
                    const resp2 = await axios.client.get(episode_api);

                    progress(80);

                    if (resp2.status === 200) {

                        const episodes = resp2.data.episodes as Array<{ ep: string }>;
                        const ep = episodes.find(x => x.ep === `E${e}`);
                        if (ep) {
                            return await __get_final_links((ep as any).id, progress, axios, ott);
                        }
                    }
                }
            } else {
                return await __get_final_links(searchItem.id, progress, axios, ott);
            }
        } else {
            return null;
        }
    } else {
        return null;
    }
}


const netfree_cc = async (id: string, progress: ProgressFunction, s?: string, e?: string): Promise<DirectLink | undefined> => {
    let raw = await get_headers(progress);
    let res = await __get_direct_links(id, progress, raw, s, e);
    if (typeof res === "undefined") {
        raw = await get_headers(progress, raw.filename, true);
        res = await __get_direct_links(id, progress, raw, s, e);
    }

    if (res === null) {
        res = await __get_direct_links(id, progress, raw, s, e, "pv");
    }

    if (res) progress(100);

    return res;
};

export default netfree_cc;