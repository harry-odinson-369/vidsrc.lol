import { DirectLink, FetchFunction, ProgressFunction } from "merlmovie-sdk";

function BASE_URL(path?: string) {
    return `https://vidsrc.vip/${path || ""}`;
}

type SubtitleResponseItem = { label: string, file: string };

function __encode_tmdb(id: string, s?: string, e?: string) {
    if (s && e) {
        const formattedString = `${id}-${s}-${e}`;
        const reversedString = formattedString.split('').reverse().join('');
        const A = Buffer.from(reversedString).toString("base64");
        const B = Buffer.from(A).toString("base64");
        return B;
    } else {
        const A = id.split("")
            .map((digit) => {
                const encoding = "abcdefghij";
                return encoding[parseInt(digit)];
            })
            .join("");

        const B = A.split("").reverse().join("");
        const C = Buffer.from(B).toString("base64");
        const D = Buffer.from(C).toString("base64");

        return D;
    }
}

export async function get_movie_direct_links(id: string, request: FetchFunction, progress: ProgressFunction): Promise<DirectLink | undefined> {
    const encoded_tmdb = __encode_tmdb(id);

    const target = `https://api.vid3c.site/allmvse2.php?id=${encoded_tmdb}`;

    progress(20);

    const resp = await request(target, "get", {
        "referer": BASE_URL(),
    });

    if (resp.status === 200) {
        progress(50);
        const links = Object.entries(resp.data).map((e, i: number) => {
            const item: any = e[1];
            if (item) {
                return {
                    name: `Video ${i + 1} - ${item.language || ""}`,
                    link: item.url || "",
                    headers: {
                        referer: BASE_URL(),
                        origin: BASE_URL().substring(0, BASE_URL().length - 1),
                    }
                }
            } else {
                return {
                    name: "",
                    link: "",
                }
            }
        }).filter(e => e.link);

        if (links.length) {
            progress(70);
            const resp0 = await request(`https://vid3c.site/s.php?id=${id}`, "get", {
                "referer": BASE_URL(),
            });
            let subs = [];

            if (resp0.status === 200) {
                subs = resp0.data.map((e: SubtitleResponseItem) => {
                    return {
                        name: e.label,
                        link: e.file,
                    }
                });
            }

            progress(100);

            await new Promise(resolve => setTimeout(resolve, 2000));

            return {
                qualities: links,
                subtitles: subs,
            }
        }

    }

    return undefined;

}

export async function get_tv_direct_links(id: string, season: string, episode: string, request: FetchFunction, progress: ProgressFunction): Promise<DirectLink | undefined> {
    const encoded_tmdb = __encode_tmdb(id, season, episode);

    const target = `https://api.vid3c.site/alltvse2.php?id=${encoded_tmdb}`;

    progress(20);

    const resp = await request(target, "get", {
        "referer": BASE_URL(),
    });

    if (resp.status === 200) {
        progress(50);
        const links = Object.entries(resp.data).map((e, i: number) => {
            const item: any = e[1];
            if (item) {
                return {
                    name: `Video ${i + 1} - ${item.language || ""}`,
                    link: item.url || "",
                    headers: {
                        referer: BASE_URL(),
                        origin: BASE_URL().substring(0, BASE_URL().length - 1),
                    }
                }
            } else {
                return {
                    name: "",
                    link: "",
                }
            }
        }).filter(e => e.link);

        if (links.length) {
            progress(70);
            const resp0 = await request(`https://vid3c.site/st.php?id=${id}&s=${season}&e=${episode}`, "get", {
                "referer": BASE_URL(),
            });

            let subs = [];

            if (resp0.status === 200) {
                subs = resp0.data.map((e: SubtitleResponseItem) => {
                    return {
                        name: e.label,
                        link: e.file,
                    }
                });
            }

            progress(100);

            await new Promise(resolve => setTimeout(resolve, 2000));

            return {
                qualities: links,
                subtitles: subs,
            }
        }
    }

    return undefined;
}

export default async function get_direct_links(id: string, request: FetchFunction, progress: ProgressFunction, s?: string, e?: string): Promise<DirectLink | undefined> {
    if (s && e) return await get_tv_direct_links(id, s, e, request, progress);
    return await get_movie_direct_links(id, request, progress);
}