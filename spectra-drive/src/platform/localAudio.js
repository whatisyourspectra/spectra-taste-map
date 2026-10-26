// Local files only. Object URLs live in memory and are revoked on replacement/unmount.
export function readAudioFiles(files, library, createUrl = file => URL.createObjectURL(file)) {
  const allowed = [...files].filter(file => (file.type || '').startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name));
  if (!allowed.length || allowed.length > 100) throw new Error('오디오 파일을 1~100개 선택해주세요.');
  const normalize = value => value.trim().toLowerCase().normalize('NFKC');
  const urls = new Map();
  const tracks = [];
  try {
    for (const file of allowed) {
      const stem = file.name.replace(/\.[^.]+$/, '');
      const exact = library.find(track => normalize(stem) === normalize(`${track.artist} - ${track.name}`));
      const titleMatches = library.filter(track => normalize(stem) === normalize(track.name));
      const match = exact || (titleMatches.length === 1 ? titleMatches[0] : null);
      if (!match || urls.has(match.id)) continue;
      urls.set(match.id, createUrl(file));
      tracks.push(match);
    }
    if (!tracks.length) throw new Error('가져온 곡과 파일명이 일치하지 않아요. “곡명.mp3” 또는 “아티스트 - 곡명.mp3”로 준비해주세요.');
    return { urls, matched: tracks.length, unmatched: allowed.length - tracks.length };
  } catch (error) {
    for (const url of urls.values()) URL.revokeObjectURL(url);
    throw error;
  }
}
