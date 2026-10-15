import { importTrackKey } from './parseTrackList.js';
export function pendingImportTrack(track) {
    const key=importTrackKey(track);
    return {id:`import:${encodeURIComponent(key)}`,importKey:key,name:track.title || track.name,artists:track.artist || track.artists,
        album:track.album || '',addedAt:track.addedAt || null,spotifyId:track.spotifyId || null,
        valence:.5,energy:.5,danceability:.5,acousticness:.5,instrumentalness:.5,
        genres:[],spotifyGenres:[],featuresSource:'pending',metadataPending:true};
}
export function mergeImportedTracks(collected, tracks) {
    for(const track of tracks || []){
        if(!track?.id)continue;
        const key=track.importKey || importTrackKey(track);
        const previous=collected.get(key);
        collected.set(key,{...previous,...track,metadataPending:false});
    }
}
