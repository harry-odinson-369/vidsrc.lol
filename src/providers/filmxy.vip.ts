import { AxiosResponse } from "axios";
import { ConnectResult } from "puppeteer-real-browser";
import fs from "fs";
import path from "path";
import { ProgressFunction, DirectLink, LinkModel } from "merlmovie-sdk";
import RealBrowser from "../utils/browser";
import { CookiesDir, random } from "../utils/helper";
import RequestClient from "../utils/axios";
import { fetch_info, get_imdb_id } from "../utils/tmdb";

const Default_Agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";
const Default_Accept = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7";

export type AuthenticationModel = {
    credential: ResolvedCaptchaResult,
    username: string,
    email: string,
    password: string,
    redirect_to?: string,
}

export type HeadersModel = {
    "Cookies": Array<Record<any, any>>,
    "User-Agent": string,
    "Accept": string,
    "Referer"?: string,
}

export type ResolvedCaptchaResult = {
    headers: HeadersModel,
    userNonce: string,
    ajaxUrl: string,
}

function BASE_URL(path?: string) {
    return `https://www.filmxy.vip/${path || ""}`;
}

export function get_headers(credential: ResolvedCaptchaResult): Record<any, any> {
    return {
        "Cookie": credential.headers.Cookies.map(e => `${e.name}=${e.value}`).join("; "),
        "User-Agent": credential.headers["User-Agent"],
        "Referer": credential.headers.Referer,
        "Accept": credential.headers.Accept,
    }
}

export function get_usernonce(html: string): string | null {
    if (!html || typeof html !== "string") return null;
    const userNonceRegex = /var userNonce\s*=\s*"([^"]+)"/;
    const userNonceMatch = html.match(userNonceRegex);
    const nonce = userNonceMatch ? userNonceMatch[1] : null;
    return nonce;
}

export function get_c_poster(html: string): string | null {
    if (!html || typeof html !== "string") return null;
    const bannerRegex = /banner\s*=\s*"([^"]+)"/;
    const bannerMatch = html.match(bannerRegex);
    const c_poster = bannerMatch ? bannerMatch[1] : null;
    return c_poster;
}

export function get_ajaxurl(html: string): string | null {
    if (!html || typeof html !== "string") return null;
    const ajaxUrlRegex = /var ajaxurl\s*=\s*"([^"]+)"/;
    const ajaxUrlMatch = html.match(ajaxUrlRegex);
    const ajaxurl = ajaxUrlMatch ? ajaxUrlMatch[1] : null;
    return ajaxurl;
}

export function get_formatted_links(html: string): Array<LinkModel> | null {
    if (!html || typeof html !== "string") return null;
    const formattedLinksRegex = /var formattedLink\s*=\s*(\[.*?\]);/;
    const formattedLinksMatch = html.match(formattedLinksRegex);

    if (formattedLinksMatch && formattedLinksMatch[1]) {
        const formattedLinks = JSON.parse(formattedLinksMatch[1]);
        const arr = (formattedLinks as Array<{ src: string, size: string }>);
        return arr.sort((a, b) => parseInt(a.size) > parseInt(b.size) ? 1 : -1).map(e => {
            return {
                name: `${e.size}p`,
                link: e.src,
            };
        });
    }

    return null;
}

export function get_formatted_subs(html: string): Array<LinkModel> | null {

    if (!html || typeof html !== "string") return null;

    let subDomain = "https://www.mysubs.org/";

    const subDomainRegex = /var subtitleDomain\s*=\s*(\".*?\");/;
    const subDomainMatch = html.match(subDomainRegex);

    if (subDomainMatch && subDomainMatch[1]) {
        const newSubDomain = `${subDomainMatch[1]}`.replace(`"`, "").replace(`"`, "");
        subDomain = newSubDomain;
    }

    const formattedSubsRegex = /var formattedSub\s*=\s*(\{.*?\});/;
    const formattedSubsMatch = html.match(formattedSubsRegex);

    if (formattedSubsMatch && formattedSubsMatch[1]) {
        const formattedSubs = JSON.parse(formattedSubsMatch[1]);
        return Object.entries(formattedSubs).map(e => {
            return {
                name: (e[1] as { label: string }).label,
                link: `${subDomain}get-subtitle/${e[0]}/`
            };
        });
    }

    return null;
}

export function parse_cookies(cookies: Array<string>, domain?: string): Array<Record<any, any>> {

    let results: Array<Record<any, any>> = [];

    for (const cookie of cookies) {

        let obj: Record<any, any> = {};
        const arr = cookie.split("; ");

        let counter = 0;

        for (let item of arr) {

            const [name, value] = item.split("=");
            if (counter === 0) {
                obj["name"] = name;
                obj["value"] = value;
                if (domain) {
                    obj["domain"] = domain;
                }
            } else {
                if (value) {
                    obj[name] = value;
                } else {
                    obj[name] = true;
                }
            }

            counter++;
        }

        results = [...results, obj];
    }

    return results;
}

export function resolve_captcha(context: ConnectResult, url?: string): Promise<ResolvedCaptchaResult> {
    return new Promise(async resolve => {
        const { browser, page } = context;

        let userAgent = await browser.userAgent().catch(() => { });

        if (typeof userAgent !== "string") {
            userAgent = Default_Agent;
        }

        if (url) await page.goto(url).catch(() => { });

        await page.waitForNetworkIdle({ timeout: 10000 }).catch((_) => { });

        let Cookies: Array<Record<any, any>> = [];
        let content: string = "";

        while (true) {
            if (!Cookies.length) {
                const cookies = await page.cookies().catch(() => { });
                if (Array.isArray(cookies)) {
                    Cookies = cookies.map(e => JSON.parse(JSON.stringify(e)));
                }
            }

            if (!content) {
                const html = await page.content().catch(() => { });
                if (typeof html === "string") {
                    content = html;
                }
            }

            if (Cookies.length && content) {
                break;
            }
        }

        const userNonce = get_usernonce(content);
        const ajaxUrl = get_ajaxurl(content);

        resolve({
            headers: {
                "Cookies": Cookies,
                "User-Agent": userAgent,
                "Accept": Default_Accept,
            },
            ajaxUrl: ajaxUrl || "",
            userNonce: userNonce || "",
        });
    });
}

function validate_auth_response(resp: AxiosResponse | void, auth: AuthenticationModel, error?: (msg: any) => void) {

    if (typeof resp !== "object") return;

    if (typeof resp.data === "object" && resp.data.success === "Login Successful!") {

        const cookies = parse_cookies(resp.headers["set-cookie"] || []);

        let newAuth = auth;

        for (const cookie of cookies) {
            const index = newAuth.credential.headers.Cookies.findIndex(e => e.name === cookie.name);
            if (index !== -1) {
                newAuth.credential.headers.Cookies[index].value = cookie.value;
            } else {
                newAuth.credential.headers.Cookies = [cookie, ...newAuth.credential.headers.Cookies];
            }
        }

        return newAuth;

    } else {
        if (error) error(resp.data);
        if (!error) console.error("[Register] " + resp.status + " | " + resp.data);
    }
}

export async function register(auth: AuthenticationModel, error?: (msg: any) => void) {

    let headers = get_headers(auth.credential);
    headers["Referer"] = BASE_URL("login/");
    headers["Accept"] = "*/*";
    headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
    headers["X-Requested-With"] = "XMLHttpRequest";

    const payload = `username=${encodeURIComponent(auth.username)}&email=${encodeURIComponent(auth.email)}&pass=${encodeURIComponent(auth.password)}&confirm_pass=${encodeURIComponent(auth.password)}&action=x_register&nonce=${auth.credential.userNonce}&redirect_to=${auth.redirect_to || "https%3A%2F%2Fwww.filmxy.vip%2F"}`;

    const request = new RequestClient(headers);

    const resp = await request.client.post(auth.credential.ajaxUrl, payload);

    return validate_auth_response(resp, auth, error);
}

export async function login(auth: AuthenticationModel, error?: (msg: any) => void) {

    const headers = get_headers(auth.credential);
    headers["Referer"] = BASE_URL("login/");
    headers["Accept"] = "*/*";
    headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
    headers["X-Requested-With"] = "XMLHttpRequest";

    const payload = `login=${encodeURIComponent(auth.username)}&pass=${encodeURIComponent(auth.password)}&action=x_login&nonce=${auth.credential.userNonce}`;

    const request = new RequestClient(headers);

    const resp = await request.client.post(auth.credential.ajaxUrl, payload);

    return validate_auth_response(resp, auth, error);
}

export async function login_as_guest(captcha: ResolvedCaptchaResult, error?: (msg: any) => void) {

    const headers = get_headers(captcha);
    headers["Referer"] = BASE_URL("login/");
    headers["Accept"] = "*/*";
    headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
    headers["X-Requested-With"] = "XMLHttpRequest";

    const payload = `action=guest_login&nonce=${captcha.userNonce}`;

    const request = new RequestClient(headers);

    const resp = await request.client.post(captcha.ajaxUrl, payload).catch(() => { });

    let auth: AuthenticationModel = {
        credential: captcha,
        email: "",
        username: "",
        password: "",
    }

    return validate_auth_response(resp, auth, error);
}

export const DefaultAuthDir = path.join(CookiesDir, "filmxy_vip");

export function list_auth_files(): Array<string> {
    if (!fs.existsSync(DefaultAuthDir)) fs.mkdirSync(DefaultAuthDir, { recursive: true });
    const arr = fs.readdirSync(DefaultAuthDir);
    return arr;
}

export function save_auth(auth: AuthenticationModel, filename?: string) {
    return new Promise(resolve => {
        try {
            const data = JSON.stringify(auth);

            if (typeof data === "string" && data.length) {
                const ls = list_auth_files();

                let __filename: string = filename || (ls.length ? `${ls.length + 1}.json` : "1.json");

                fs.writeFile(path.join(DefaultAuthDir, __filename), data, (err) => {
                    if (err) console.error(err);
                    resolve(undefined);
                });
            } else {
                resolve(undefined);
            }


        } catch (err) {
            console.error(err);
            resolve(undefined);
        }
    });
}

function _get_auth(auth_dir: string): Promise<AuthenticationModel | undefined> {
    return new Promise(resolve => {
        fs.readFile(auth_dir.startsWith(DefaultAuthDir) ? auth_dir : path.join(DefaultAuthDir, auth_dir), "utf-8", (err, data) => {
            if (!err && data) {
                resolve(JSON.parse(data));
            } else {
                resolve(undefined);
            }
        });
    });
}

export async function get_auth(): Promise<AuthenticationModel | undefined> {
    const auth_files = list_auth_files();

    let auth: AuthenticationModel | undefined;

    let auth_filename: string | undefined;

    if (auth_files.length) {
        auth_filename = auth_files[random(0, auth_files.length - 1)];
        auth = await _get_auth(auth_filename);
    }

    return auth;
}

export async function generate_auth(progress: ProgressFunction, params?: { new_auth?: boolean, filename?: string, onError?: (msg: any) => void }): Promise<{ auth: AuthenticationModel | undefined, filename: string }> {
    const index = random(1, 10);
    const _filename = params?.filename || `${index}.json`;
    const _dir = path.join(DefaultAuthDir, _filename);

    if (!fs.existsSync(_dir) || params?.new_auth === true) {
        progress(5);
        const context = await RealBrowser();
        progress(10);
        const captcha = await resolve_captcha(context, BASE_URL(""));
        progress(15);
        await context.browser.close();
        const auth = await login_as_guest(captcha, params?.onError);
        progress(20);
        save_auth(auth, _filename);
        return {
            filename: _filename,
            auth: auth,
        };
    } else {
        const auth = await _get_auth(_filename);
        progress(20);
        return {
            filename: _filename,
            auth: auth,
        }
    }
}

function __logData(name: string, data: string) {
    return new Promise(resolve => {
        const __dir = path.join(process.cwd(), "logs");
        if (!fs.existsSync(__dir)) fs.mkdirSync(__dir, { recursive: true });
        fs.writeFile(path.join(__dir, name), data, (err) => {
            resolve(undefined);
        });
    });
}

export async function get_direct_links(auth: AuthenticationModel, id: any, progress: ProgressFunction, season?: any, episode?: any): Promise<DirectLink | undefined> {

    let s = season;
    let e = episode;

    if (s && e) {
        const se = parseInt(s.toString());
        if (se < 10) {
            s = "s0" + se;
        } else {
            s = "s" + se;
        }

        const ep = parseInt(e.toString());
        if (ep < 10) {
            e = "e0" + ep;
        } else {
            e = "e" + ep;
        }
    }

    const headers = get_headers(auth.credential);

    const url = BASE_URL(`${s && e ? "tv" : "movie"}/${id}`);

    headers["Referer"] = url;
    headers["X-Requested-With"] = "XMLHttpRequest";

    const request = new RequestClient(headers);

    progress(30);

    const resp = await request.client.get(url);

    const c_poster = get_c_poster(resp.data);

    const nonce = get_usernonce(resp.data);

    if (c_poster && nonce) {

        progress(70);

        const next_url = BASE_URL(`e/${id}${s && e ? `/${s}/${e}` : ""}/alpha/?nonce=${nonce}&c_poster=${c_poster}`);

        const resp0 = await request.client.get(next_url);

        const formatted_links = get_formatted_links(resp0.data);

        if (formatted_links && formatted_links.length) {
            progress(100);

            const formatted_subs = get_formatted_subs(resp0.data);
            return {
                qualities: formatted_links,
                subtitles: formatted_subs || [],
            }
        }
    }
}

export async function try_get_direct_links(params: {
    auth?: AuthenticationModel,
    id: any,
    progress: ProgressFunction,
    season?: any,
    episode?: any,
    onError?: (err: any) => void,
}): Promise<DirectLink | undefined> {

    let __id = params.id;

    if (!__id.startsWith("tt")) {
        __id = get_imdb_id((await fetch_info(params.season & params.episode ? "tv" : "movie", __id)));
    }

    let result: DirectLink | undefined;

    if (params.auth) {
        params.progress(20);
        result = await get_direct_links(params.auth, __id, params.progress, params.season, params.episode);
    }

    if (!result) {
        const generated_auth = await generate_auth(params.progress);

        if (generated_auth.auth) {
            result = await get_direct_links(generated_auth.auth, __id, params.progress, params.season, params.episode);

            if (!result) {
                const new_auth = await generate_auth(params.progress, { new_auth: true, filename: generated_auth.filename });
                if (new_auth.auth) {
                    result = await get_direct_links(new_auth.auth, __id, params.progress, params.season, params.episode);
                }
            }
        }
    }

    return result;
}

const filmxy_vip = try_get_direct_links;

export default filmxy_vip;