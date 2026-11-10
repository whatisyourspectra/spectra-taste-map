import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { getCombinedDemoTracks } from '../src/taste/demoUniverses.js';
import { partitionGenreTracks } from '../src/taste/genreClustering.js';

const source = readFileSync(new URL('../src/workers/bubbleLayoutWorker.js', import.meta.url), 'utf8');
const width = 1440, height = 1000;
const tracks = getCombinedDemoTracks();
function layout(list = tracks, options = {}) {
  let result;
  const self = { postMessage: data => { result = structuredClone(data.nodes); } };
  vm.runInNewContext(source, { self });
  const count = list.filter(track => !track.tasteMapPlacement?.anchorId).length;
  const partition = partitionGenreTracks(list);
  self.onmessage({ data: {
    tracks: list.map((track, index) => ({ ...track, layoutArtist: track.artists, layoutGenreKey: partition.groups[partition.labels[index]]?.key })),
    fieldW: width, fieldH: height, worldScale: 5 * Math.max(1, Math.sqrt(count / 110)),
    xAxis: 'valence', yAxis: 'energy', layoutMode: 'exploratory',
    assignmentEntries: list.map((track, index) => [track.id, partition.labels[index]]),
    playWeightEntries: list.map(track => [track.id, { type: 'popularity', value: track.popularity }]),
    ...options,
  } });
  return result;
}

test('240-song browsing layout is deterministic, broad and keeps every song', () => {
  const nodes = layout();
  assert.deepEqual(nodes, layout());
  assert.equal(new Set(nodes.map(node => node.id)).size, 240);
  for (const node of nodes) {
    for (const key of ['nX', 'nY', 'nRawX', 'nRawY']) assert.ok(Number.isFinite(node[key]) && node[key] >= 0 && node[key] <= 1);
    assert.equal(node.nX, node.nRawX, 'Rendering must not pull separated songs back into old dense anchors');
    assert.equal(node.nY, node.nRawY);
  }
  const range = key => Math.max(...nodes.map(node => node[key])) - Math.min(...nodes.map(node => node[key]));
  assert.ok(range('nX') > .7, 'Use the horizontal field instead of one compact island');
  assert.ok(range('nY') > .6, 'Keep vertical paths and gaps to explore');
});

for (const [label, collection] of [
  ['demo', tracks],
  ['personal import', tracks.map((track, index) => ({ ...track, demoUniverseId: undefined, id: `personal-${index}` }))],
]) test(`${label} mixes dense neighborhoods with breathing room without burying covers`, () => {
  const nodes = layout(collection);
  const scale = 5 * Math.sqrt(240 / 110);
  const w = width * scale, h = height * scale;
  const spanX = Math.max(...nodes.map(node => node.nX)) - Math.min(...nodes.map(node => node.nX));
  const spanY = Math.max(...nodes.map(node => node.nY)) - Math.min(...nodes.map(node => node.nY));
  const zoom = Math.min((width - 64) / (spanX * w + 240), (height - 180) / (spanY * h + 240));
  const coverScale = Math.max(.3, Math.min(1.3, (zoom / 1.2) ** .4));
  const nearest = nodes.map((a, i) => Math.min(...nodes.filter((_, j) => j !== i).map(b =>
    Math.hypot((a.nX - b.nX) * w * zoom, (a.nY - b.nY) * h * zoom) / ((a.size + b.size) / 2 * coverScale)
  ))).sort((a, b) => a - b);
  const compact = nearest.filter(distance => distance < 1).length;
  assert.ok(compact > nodes.length * .45, 'A substantial part of the map should form dense neighborhoods');
  assert.ok(compact < nodes.length * .8, 'Keep loose tracks between the compact neighborhoods');
  assert.ok(nearest[0] > .5, 'Even the closest pair must keep both cover centers visible');
  assert.ok(nearest[Math.floor(nodes.length * .25)] < .85, 'Dense cores should retain lightly overlapping artwork');
  assert.ok(nearest[Math.floor(nodes.length * .9)] / nearest[Math.floor(nodes.length * .1)] > 1.7,
    'Loose tracks must retain more space than dense cores');
  assert.ok(nearest.at(-1) > 2, 'Leave isolated satellites beyond the dense cores');
});

test('new discoveries preserve the exploratory base and sit near their chosen song', () => {
  const original = layout();
  const added = { id: 'new-discovery', name: 'Discovery', artists: 'New Artist', popularity: 70,
    tasteMapPlacement: { anchorId: tracks[0].id } };
  const nodes = layout([...tracks, added], {
    affinityEntries: [[added.id, tracks[0].id]],
    fixedBaseEntries: original.map(node => [node.id, node]),
  });
  original.forEach((node, i) => {
    assert.equal(nodes[i].id, node.id);
    for (const key of ['nX', 'nY', 'nRawX', 'nRawY', 'size']) assert.equal(nodes[i][key], node[key]);
  });
  const discovery = nodes.at(-1), seed = nodes[0];
  const scale = 5 * Math.sqrt(240 / 110);
  assert.ok(Math.hypot((discovery.nX - seed.nX) * width * scale, (discovery.nY - seed.nY) * height * scale) < 400);
});
