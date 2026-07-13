import app from '../server.js';

export default function discoverHandler(req, res) {
    const queryIndex = req.url.indexOf('?');
    const query = queryIndex >= 0 ? req.url.slice(queryIndex) : '';
    req.url = `/api/discover${query}`;
    return app(req, res);
}
