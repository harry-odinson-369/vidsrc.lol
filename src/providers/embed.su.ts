import { DirectLink, FetchFunction, ProgressFunction } from "merlmovie-sdk";

function BASE_URL(path?: string) {
    return `https://embed.su/${path || ""}`;
}

export type ServerModel = {
    name: string,
    hash: string,
}

export type VConfig = {
    title: string,
    server: string,
    ref: string,
    xid: string,
    uwuId: string,
    episodeId: string,
    hash: string,
    poster: string,
}

function __decode_hash(hash: string): Array<ServerModel> {
    let b: any = Buffer.from(hash, "base64").toString("utf-8").split(".").map(a => {
        return a.split("").reverse().join("");
    });
    b = JSON.parse(Buffer.from(b.join("").split("").reverse().join(""), "base64").toString("latin1"));
    return b;
}

function __parseVConfig(html: string): VConfig | null {
    const hashRegex = /atob\(`([^`]+)`\)/;
    const hashMatch = html.match(hashRegex);
    if (hashMatch && hashMatch[1]) {
        const source = Buffer.from(hashMatch[1], "base64").toString("latin1");
        return JSON.parse(source);
    }

    return null;
}


export default async function get_direck_links(id: string, request: FetchFunction, progress: ProgressFunction, s?: string, e?: string): Promise<DirectLink | undefined> {
    const target = BASE_URL(`embed/${s && e ? "tv" : "movie"}/${id}${s && e ? `/${s}/${e}` : ""}`);

    let headers = {
        "referer": BASE_URL(),
    }

    progress(20);

    const resp = await request(target, "get", headers);

    if (resp.status === 200) {
        progress(50);
        const vConfig = __parseVConfig(resp.data);

        if (vConfig) {
            const servers = __decode_hash(vConfig.hash);

            let links = await Promise.all<DirectLink | undefined>(servers.map(s => {
                return new Promise(async resolve => {

                    const next_url = BASE_URL(`api/e/${s.hash}`);
                    const resp0 = await request(next_url, "get", headers);

                    if (resp0.status === 200 && typeof resp0.data === "object") {
                        progress((50 + (40 / servers.length)));

                        let data = {
                            qualities: [],
                            subtitles: [],
                        };

                        data.qualities.push({
                            name: s.name.split("").map((e, i) => (`${i === 0 ? e.toUpperCase() : e}`)).join(""),
                            link: resp0.data.source,
                            headers: {
                                ...headers,
                                origin: BASE_URL().substring(0, BASE_URL().length - 1),
                            },
                        });
                        
                        resolve(data);
                    } else {
                        resolve(undefined);
                    }
                });
            }));

            links = links.filter(e => typeof e !== "undefined");


            if (links.length) {

                let data: DirectLink = {
                    qualities: [],
                    subtitles: [],
                };

                links.forEach(e => {
                    data.qualities = [
                        ...data.qualities,
                        ...e.qualities,
                    ];
                    data.subtitles = [
                        ...data.subtitles,
                        ...e.subtitles,
                    ];
                });

                progress(100);
                return data;
            }
        }
    }

    return undefined;
}