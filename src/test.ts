import { sendTest } from "merlmovie-sdk";
import { fetch_info, get_year } from "./utils/tmdb";

function getActualIpv4(ip: string) {
    return ip.split(":").join(".").split(".").filter(e => parseInt(e)).join(".");
}

(async () => {
    const result = await sendTest("ws://192.168.100.9:8080?provider=vidsrc.cc", {
        mediaId: "693134",
    });

    console.log(JSON.stringify(result));

    // const data = await fetch_info("movie", "693134");
    // console.log(data);
    

})();