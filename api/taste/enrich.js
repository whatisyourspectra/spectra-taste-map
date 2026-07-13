import app from '../../server.js';

export default function enrichHandler(req, res) {
    const queryIndex = req.url.indexOf('?');
    const query = queryIndex >= 0 ? req.url.slice(queryIndex) : '';
    req.url = `/api/taste/enrich${query}`;
    return app(req, res);
}
