import { getGenreIdentity } from './brand/genreIdentity.js';
import { useState } from 'react';
import { artworkOptions } from './trackArtwork.js';

const SHAPES = {
  calm: [[4, 19], [10, 15], [17, 17], [24, 8], [30, 5]],
  uplift: [[4, 23], [10, 9], [17, 15], [24, 4], [30, 12]],
  familiar: [[4, 14], [11, 6], [21, 8], [28, 17], [17, 24]],
};

export function MoodGlyph({ mood = 'calm' }) {
  const points = SHAPES[mood] || SHAPES.calm;
  return <svg className="mood-glyph" viewBox="0 0 34 30" fill="none" aria-hidden="true"><polyline points={points.map(point => point.join(',')).join(' ')} stroke="currentColor" strokeWidth=".8" />{points.map(([x, y], index) => <circle key={index} cx={x} cy={y} r={index === 2 ? 1.9 : 1.2} fill="currentColor" />)}</svg>;
}

export function TrackArtwork({ track }) {
  return <ArtworkImage key={`${track?.id || track?.name}:${track?.coverUrl || ''}`} track={track} />;
}

function ArtworkImage({ track }) {
  const [failed, setFailed] = useState([]);
  const color = getGenreIdentity(track?.tags?.[0]).tone.text;
  const { candidates, fallback } = artworkOptions(track, color);
  const src = [...candidates, fallback].find(url => !failed.includes(url));
  return <span className={`track-art ${src ? 'has-artwork' : ''}`} style={{ '--track-color': color }} aria-hidden="true" data-artwork-kind={candidates.includes(src) ? 'cover' : 'generated'}>
    {src ? <img src={src} alt="" decoding="async" draggable="false" onError={() => setFailed(previous => [...previous, src])} /> : <><span className="vinyl-ring" /><span className="vinyl-core" /><span className="vinyl-spark" /></>}
  </span>;
}
