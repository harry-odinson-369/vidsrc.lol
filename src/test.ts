import { sendTest } from "merlmovie-sdk";
import { parseHLS } from "./utils/hls";
import { MasterPlaylist, MediaPlaylist } from "hls-parser/types";
import fs from "fs";
import path from "path";
import { finished } from "stream/promises";
import { Readable } from "stream";
import { ReadableStream } from "stream/web";

async function save(filename: string, res: Response) {
    if (!fs.existsSync("downloads")) fs.mkdirSync("downloads");
    const destination = path.resolve("./downloads", filename);
    const fileStream = fs.createWriteStream(destination, { flags: 'wx' });
    await finished(Readable.fromWeb(res.body as ReadableStream<any>).pipe(fileStream));
}

(async () => {
    const result = await sendTest("ws://localhost:8080?provider=filmxy.vip&log=true", {
        mediaId: "tt1190634",
        season: "1",
        episode: "1",
    });
    if (result) {
        // const resp = await fetch(result.qualities[0].link, { headers: result.qualities[0].headers });
        // const text = await resp.text();

        // const parsed = parseHLS(text);

        // if (parsed.isMasterPlaylist) {
        //     for (let variant of (parsed as MasterPlaylist).variants) {
        //         const resp1 = await fetch(variant.uri, { headers: result.qualities[0].headers });
        //         const text1 = await resp1.text();
        //         const parsed1 = parseHLS(text1);
        //         const list = parsed1 as MediaPlaylist;
        //         let counter = 0;
        //         for (let seg of list.segments) {
        //             const resp2 = await fetch(seg.uri, { headers: result.qualities[0].headers });
        //             await save(`${counter}.ts`, resp2);
        //             counter++;
        //         }
        //     }
        // }

        console.log(result);
        
    }
})();