import app from '../../server.js';

export default function youtubeSearchHandler(req, res) {
    const queryIndex = req.url.indexOf('?');
    const query = queryIndex >= 0 ? req.url.slice(queryIndex) : '';
    req.url = `/api/youtube/search${query}`;
    return app(req, res);
}
