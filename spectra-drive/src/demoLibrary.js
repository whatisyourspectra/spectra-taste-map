// Illustrative metadata, not measured audio features or a user's listening history.
export const demoLibrary = [
  ['밤의 산책', 'SPECTRA Sessions', ['ambient'], 0.12, 0.32],
  ['Slow Window', 'SPECTRA Sessions', ['acoustic'], 0.22, 0.48],
  ['집으로 가는 길', 'SPECTRA Sessions', ['indie'], 0.32, 0.56],
  ['Warm Afterglow', 'SPECTRA Sessions', ['soul'], 0.4, 0.72],
  ['익숙한 거리', 'SPECTRA Sessions', ['indie pop'], 0.5, 0.55],
  ['Sidewalk', 'SPECTRA Sessions', ['jazz'], 0.44, 0.4],
  ['Golden Hour', 'SPECTRA Sessions', ['funk'], 0.65, 0.82],
  ['City Lights', 'SPECTRA Sessions', ['disco'], 0.76, 0.78],
  ['Open Road', 'SPECTRA Sessions', ['house'], 0.88, 0.7],
  ['Blue Horizon', 'SPECTRA Sessions', ['ambient'], 0.18, 0.62],
  ['New Morning', 'SPECTRA Sessions', ['pop'], 0.6, 0.92],
  ['Quiet Motion', 'SPECTRA Sessions', ['downtempo'], 0.36, 0.3],
].map(([name, artists, genres, energy, valence]) => ({ name, artists, genres, energy, valence }));
