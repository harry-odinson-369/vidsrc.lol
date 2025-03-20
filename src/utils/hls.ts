import { parse } from "hls-parser";
import { MasterPlaylist, MediaPlaylist } from "hls-parser/types";

export function parseHLS(content: string): MasterPlaylist | MediaPlaylist | undefined {
    try {
        return parse(content);
    } catch(err) {
        console.error(err);
        return undefined;
    }
}