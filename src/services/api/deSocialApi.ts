import { CLOUTFEED_API_KEY } from '@env';

const headers = {
    'content-type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.1 Safari/605.1.15',
    'x-api-key': CLOUTFEED_API_KEY
};

const host = 'https://cloutfeedapi.azurewebsites.net/desocial/';

async function handleResponse(p_response: Response) {
    if (p_response.ok) {
        return p_response.json();
    } else {
        let json = undefined;
        try {
            json = await p_response.json();
        } catch {
        }
        const error = new Error();
        (error as any).response = p_response;
        (error as any).json = json;
        (error as any).status = p_response.status;
        throw error;
    }
}

const get = (p_route: string, p_useHost = true) => {
    return fetch(
        p_useHost ? host + p_route : p_route,
        { headers: headers }
    ).then(p_response => handleResponse(p_response));
};

const post = (p_route: string, p_body: any) => {
    const headersCopy = JSON.parse(JSON.stringify(headers));

    return fetch(
        host + p_route,
        {
            headers: headersCopy,
            method: 'POST',
            body: JSON.stringify(p_body)
        }
    ).then(async p_response => await handleResponse(p_response));
};

const getNewbiesFeed = (numToFetch: number, lastPostHashHex: string, posterPublicKey: string) => {
    const route = 'newbies-feed';
    return post(
        route,
        {
            NumToFetch: numToFetch,
            LastPostHashHex: lastPostHashHex,
            PosterPublicKey: posterPublicKey
        }
    );
};

const getLanguageFeed = (language: string, numToFetch: number, lastPostHashHex: string, posterPublicKey: string) => {
    const route = 'language-feed?language=' + language;
    return post(
        route,
        {
            NumToFetch: numToFetch,
            LastPostHashHex: lastPostHashHex,
            PosterPublicKey: posterPublicKey
        }
    );
};

export const deSocialApi = {
    getNewbiesFeed,
    getLanguageFeed
};
