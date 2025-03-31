import RequestClient from "./axios";
import { random } from "./helper";

function BASE_API(path?: string) {
    return `https://api.themoviedb.org/3/${path}`;
}

export const API_KEYS = [
    "fb7bb23f03b6994dafc674c074d01761",
    "e55425032d3d0f371fc776f302e7c09b",
    "8301a21598f8b45668d5711a814f01f6",
    "8cf43ad9c085135b9479ad5cf6bbcbda",
    "da63548086e399ffc910fbc08526df05",
    "13e53ff644a8bd4ba37b3e1044ad24f3",
    "269890f657dddf4635473cf4cf456576",
    "a2f888b27315e62e471b2d587048f32e",
    "8476a7ab80ad76f0936744df0430e67c",
    "5622cafbfe8f8cfe358a29c53e19bba0",
    "ae4bd1b6fce2a5648671bfc171d15ba4",
    "257654f35e3dff105574f97fb4b97035",
    "2f4038e83265214a0dcd6ec2eb3276f5",
    "9e43f45f94705cc8e1d5a0400d19a7b7",
    "af6887753365e14160254ac7f4345dd2",
    "06f10fc8741a672af455421c239a1ffc",
    "fb7bb23f03b6994dafc674c074d01761",
    "09ad8ace66eec34302943272db0e8d2c",
    "87a1e3590b0d9a457aafc2335f066768",
    "7ec5fa8ca102e3ace8942a5f662bb94b"
];

export function get_any_api_key() {
    const index = random(0, API_KEYS.length - 1);
    return API_KEYS[index];
}

export function get_title(data: Record<any, any>) {
    return data.title || data.name;
}

export function get_imdb_id(data: Record<any, any>) {
    return data.external_ids.imdb_id;
}

export function get_year(data: Record<any, any>) {
    const date = data.release_date || data.first_air_date;
    const year = date.split("-").find((e: string) => e.length === 4);
    return year;
}

export async function fetch_info(type: "movie" | "tv", id: string): Promise<Record<any, any> | undefined> {
    const endpoint = BASE_API(`${type}/${id}?api_key=${get_any_api_key()}&append_to_response=external_ids`);
    const request = new RequestClient();
    const response = await request.client.get(endpoint);
    if (response.status !== 200) return undefined;
    return response.data;
}