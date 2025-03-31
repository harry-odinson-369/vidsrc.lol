import { FetchFunction, LinkModel, ProgressFunction } from "merlmovie-sdk";
import { fetch_info, get_imdb_id } from "../utils/tmdb";

function BASE_URL(path?: string) {
    return `https://rest.opensubtitles.org/${path || ""}`;
}

export default async function opensubtitles_org(id: string, request: FetchFunction, progress: ProgressFunction, s?: string, e?: string, lang?: string): Promise<Array<LinkModel>> {
    let __id = id;

    if (!__id.startsWith("tt")) {
        __id = get_imdb_id((await fetch_info(s && e ? "tv" : "movie", id)));
    }

    let arr = [];
    
    const resp = await request({ url: BASE_URL(`search/imdbid-${__id.replace("tt", "")}/sublanguageid-${lang || "eng"}`) });
    
    if (resp.status === 200) {
        
    }


    return arr;
}