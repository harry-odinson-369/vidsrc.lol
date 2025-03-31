import axios from "axios";
import { parse } from "hls-parser";
import { MasterPlaylist, MediaPlaylist } from "hls-parser/types";
import { LinkModel } from "merlmovie-sdk";

export function parseHLS(content: string): MasterPlaylist | MediaPlaylist | undefined {
    try {
        return parse(content);
    } catch(err) {
        console.error(err);
        return undefined;
    }
}

export async function extractVariants(link: string, headers?: Record<any, any>): Promise<LinkModel[]> {

    const resp = await axios.get(link, { headers: headers, validateStatus: () => true });

    const parsed = parseHLS(resp.data);

    if (parsed.isMasterPlaylist) {
        const master = parsed as MasterPlaylist;
        return master.variants.map(e => {
            return {
                name: `${e.resolution.height}p`,
                link: (e.uri.startsWith("http") ? e.uri : (new URL(e.uri, link)).toString()),
                headers: headers,
            };
        });
    } else {
        return [
            {
                link: link,
                name: "Auto",
                headers: headers,
            }
        ];
    }

}