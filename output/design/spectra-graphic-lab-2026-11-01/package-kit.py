"""Read-only asset validation and ZIP packaging. Does not modify images."""
from pathlib import Path
import json
import struct
import xml.etree.ElementTree as ET
import zipfile

base = Path(__file__).resolve().parent
data = json.loads((base / 'manifest.json').read_text())
assert not data['previewOnly'], 'Preview PNGs must not be shipped.'
assert len(data['assets']) == 62
report = {'svg': 0, 'png': 0, 'transparent_assets': 0, 'outlined_assets': 0, 'min_long_edge': 10**9, 'max_long_edge': 0, 'errors': []}
ns = '{http://www.w3.org/2000/svg}'
for item in data['assets']:
    source = (base / item['svg']).read_text()
    tree = ET.fromstring(source)
    assert not list(tree.iter(ns + 'image')), item['name'] + ': raster embedding'
    assert not list(tree.iter(ns + 'text')), item['name'] + ': font dependency'
    assert not list(tree.iter(ns + 'foreignObject')), item['name'] + ': external content'
    assert 'NaN' not in source and 'Infinity' not in source, item['name']
    assert not any(k.endswith('href') for el in tree.iter() for k in el.attrib), item['name']
    with (base / item['png']).open('rb') as handle:
        header = handle.read(33)
    assert header[:8] == b'\x89PNG\r\n\x1a\n'
    width, height = struct.unpack('>II', header[16:24])
    assert (width, height) == (item['width'], item['height']), item['name']
    assert max(width, height) >= 4096, item['name']
    if item['transparent']:
        assert header[25] in (4, 6), item['name'] + ': missing alpha channel'
        report['transparent_assets'] += 1
    report['svg'] += 1
    report['png'] += 1
    report['outlined_assets'] += 1
    report['min_long_edge'] = min(report['min_long_edge'], max(width, height))
    report['max_long_edge'] = max(report['max_long_edge'], max(width, height))

# Ensure the offline gallery's preview and download links have local targets.
html = (base / 'index.html').read_text()
for item in data['assets']:
    for rel in [item['svg'], item['png'], '.thumbs/' + item['name'] + '.png']:
        assert (base / rel).is_file(), rel
        assert rel in html, rel
assert report['transparent_assets'] == 60
(base / 'QUALITY-CHECK.json').write_text(json.dumps(report, indent=2))

bundle = base.parent / (base.name + '.zip')
with zipfile.ZipFile(bundle, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for file in sorted(base.rglob('*')):
        if file.is_file() and file.name != '.DS_Store' and '__pycache__' not in file.parts:
            archive.write(file, str(Path(base.name) / file.relative_to(base)))
svg_bundle = base.parent / (base.name + '-SVG-only.zip')
with zipfile.ZipFile(svg_bundle, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for item in data['assets']:
        archive.write(base / item['svg'], str(Path(base.name) / item['svg']))
    for name in ['README.md', 'manifest.json', 'CONTACT-SHEET.png']:
        archive.write(base / name, str(Path(base.name) / name))
print(json.dumps(report, indent=2))
print(f'ALL: {bundle} ({bundle.stat().st_size / 1024**2:.1f} MiB)')
print(f'SVG: {svg_bundle} ({svg_bundle.stat().st_size / 1024**2:.1f} MiB)')
