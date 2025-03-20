import MerlMovieSDK, { DirectLink } from "merlmovie-sdk";
import vidsrc_vip from "./providers/vidsrc.vip";
import filmxy_vip, { save_auth } from "./providers/filmxy.vip";
import embed_su from "./providers/embed.su";

const PORT: number = (process.env.PORT || 8080) as number;
const HOST: string | undefined = process.env.HOST;

const sdk = new MerlMovieSDK({ HOST: HOST, PORT: PORT });

function getFullUrl(path: string) {
    return new URL(`http://${HOST || `localhost:${PORT}`}${path}`);
}

const ProviderSite = {
    Filmxy_Vip: "filmxy.vip",  
    Vidsrc_Vip: "vidsrc.vip",
    Embed_Su: "embed.su",
}

sdk.socket({
    async onStream(data, controller, message) {
        const url = getFullUrl(message.url);

        let result: DirectLink | undefined;

        const provider = url.searchParams.get("provider") ?? ProviderSite.Filmxy_Vip;

        if (provider === ProviderSite.Filmxy_Vip) {

            result = await filmxy_vip({
                id: data.mediaId,
                season: data.season,
                episode: data.episode,
                onAuthUpdate(generated) {
                    save_auth(generated.auth, generated.filename);
                },
            }, controller.progress);
            
        } else if (provider === ProviderSite.Vidsrc_Vip) {

            result = await vidsrc_vip(data.mediaId, controller.fetch, controller.progress, data.season, data.episode);

        } else if (provider === ProviderSite.Embed_Su) {

            result = await embed_su(data.mediaId, controller.fetch, controller.progress, data.season, data.episode);

        }

        if (result) {
            controller.finish(result);
        } else {
            controller.failed();
        }

    },
    onListening() {
        console.log("Socket listening on port " + PORT + "...");
    },
    onConnection(ws, message) {
        console.log(`A new client has connected! Ip Address => ${message.socket.remoteAddress}`);
    },
    onClosed(code, reason) {
        console.log(`A client was disconnected with code => ${code}`);
    },
});