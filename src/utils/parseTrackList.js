// Parse a pasted / uploaded track list into [{ artist, title, album, addedAt }].
//
// Accepts:
//  - CSV exported from TuneMyMusic, Exportify, Soundiiz, etc. (header auto-detected)
//  - Plain "Artist - Title" lines (one per line)

function parseCsvLine(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') { cur += '"'; i += 1; } else { inQuotes = false; }
            } else {
                cur += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            out.push(cur);
            cur = '';
        } else {
            cur += ch;
        }
    }
    out.push(cur);
    return out.map((c) => c.trim());
}

function findColumn(headers, patterns, exclude) {
    for (let i = 0; i < headers.length; i += 1) {
        const h = headers[i].toLowerCase();
        if (exclude && exclude.test(h)) continue;
        if (patterns.test(h)) return i;
    }
    return -1;
}

function splitDelimited(line) {
    // Prefer tab, then " - " / en/em dashes.
    if (line.includes('\t')) {
        const [artist, title] = line.split('\t');
        return { artist: (artist || '').trim(), title: (title || '').trim() };
    }
    const m = line.match(/^(.*?)\s+[-–—]\s+(.*)$/);
    if (m) return { artist: m[1].trim(), title: m[2].trim() };
    return null;
}

export function parseTrackList(raw) {
    const text = String(raw || '').replace(/\r\n?/g, '\n').trim();
    if (!text) return [];
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const results = [];
    const seen = new Set();
    const push = (artist, title, album, addedAt) => {
        const a = String(artist || '').trim();
        const t = String(title || '').trim();
        if (!a || !t) return;
        const key = `${a}|${t}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        results.push({ artist: a, title: t, album: (album || '').trim(), addedAt: addedAt || null });
    };

    // Detect a CSV header: first row has an artist-ish column and a title-ish column.
    const firstCells = parseCsvLine(lines[0]);
    const looksLikeCsv = firstCells.length >= 2;
    let artistCol = -1;
    let titleCol = -1;
    let albumCol = -1;
    let addedCol = -1;
    if (looksLikeCsv) {
        artistCol = findColumn(firstCells, /artist/i);
        titleCol = findColumn(firstCells, /track ?name|track ?title|^song|^title$|^name$|^track$/i, /artist|album/i);
        albumCol = findColumn(firstCells, /album/i);
        addedCol = findColumn(firstCells, /added|date/i);
    }

    const hasHeader = artistCol >= 0 && titleCol >= 0;
    if (hasHeader) {
        for (let i = 1; i < lines.length; i += 1) {
            const cells = parseCsvLine(lines[i]);
            push(
                cells[artistCol],
                cells[titleCol],
                albumCol >= 0 ? cells[albumCol] : '',
                addedCol >= 0 ? cells[addedCol] : null,
            );
        }
        return results;
    }

    // No header — treat each line as delimited "Artist - Title", or a 2-col CSV.
    for (const line of lines) {
        const delimited = splitDelimited(line);
        if (delimited) {
            push(delimited.artist, delimited.title);
            continue;
        }
        const cells = parseCsvLine(line);
        if (cells.length >= 2) {
            push(cells[0], cells[1], cells[2] || '');
        }
    }
    return results;
}
