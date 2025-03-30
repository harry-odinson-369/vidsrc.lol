import { sendTest } from "merlmovie-sdk";
import { parseHLS } from "./utils/hls";
import { MasterPlaylist, MediaPlaylist } from "hls-parser/types";
import fs from "fs";
import path from "path";
import { finished } from "stream/promises";
import { Readable } from "stream";
import { ReadableStream } from "stream/web";

function getActualIpv4(ip: string) {
    return ip.split(":").join(".").split(".").filter(e => parseInt(e)).join(".");
}

(async () => {
    const result = await sendTest("ws://localhost:8080?provider=netmirror.cc", {
        mediaId: "76479",
        season: "1",
        episode: "1",
    });

})();