const COVERS = {
  "tame impala|the less i know the better": "/demo-covers/currents.jpg",
  "beach house|space song": "/demo-covers/depression-cherry.jpg",
  "cigarettes after sex|apocalypse": "/demo-covers/cigarettes-after-sex.jpg",
  "men i trust|show me how": "/demo-covers/show-me-how.jpg",
  "mac demarco|chamber of reflection": "/demo-covers/salad-days.jpg",
  "tame impala|breathe deeper": "/demo-covers/slow-rush.jpg",
  "daft punk|get lucky": "/demo-covers/random-access-memories.jpg",
  "kavinsky|nightcall": "/demo-covers/outrun.jpg",
  "justice|d.a.n.c.e.": "/demo-covers/justice.jpg",
  "the weeknd|blinding lights": "/demo-covers/after-hours.jpg",
  "daft punk|harder, better, faster, stronger": "/demo-covers/discovery.jpg",
  "the weeknd|starboy": "/demo-covers/starboy.jpg",
  "tom misch|south of the river": "/demo-covers/geography.jpg",
  "masego, fkj|tadow": "/demo-covers/lady-lady.jpg",
  "the black skirts|everything goes": "/demo-covers/team-baby.jpg",
  "the black skirts|everything": "/demo-covers/team-baby.jpg",
  "yerin baek|square": "/demo-covers/every-letter.jpg",
  "laufey|from the start": "/demo-covers/bewitched.jpg",
  "tom misch|disco yes": "/demo-covers/geography.jpg"
};

export function getDemoCover(artists, title) {
  return COVERS[`${String(artists || '').toLowerCase()}|${String(title || '').toLowerCase()}`] || null;
}
