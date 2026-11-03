from pathlib import Path
import json
import re
import struct
import xml.etree.ElementTree as ET
import zipfile

root = Path(__file__).resolve().parent
rows = []
ns = {'s': 'http://www.w3.org/2000/svg'}
svgs = sorted((root / 'svg').glob('*.svg'))
assert len(svgs) == 10
for file in svgs:
    text = file.read_text()
    tree = ET.fromstring(text)
    assert not tree.findall('.//s:image', ns), file
    assert not tree.findall('.//s:foreignObject', ns), file
    assert not tree.findall('.//s:text', ns), file
    assert not re.search(r'\b(?:NaN|Infinity)\b', text), file
    assert 'href=' not in text, file
    ids = [e.attrib['id'] for e in tree.iter() if 'id' in e.attrib]
    assert len(ids) == len(set(ids)), file
    for ref in re.findall(r'url\(#([^)]*)\)', text):
        assert ref in ids, (file, ref)
    png = root / 'png' / (file.stem + '.png')
    header = png.read_bytes()[:33]
    assert header[:8] == b'\x89PNG\r\n\x1a\n'
    width, height = struct.unpack('>II', header[16:24])
    assert (width, height) == (4096, 4096)
    assert header[25] == 6, 'RGBA PNG required'
    rows.append({'file': file.name, 'circles': len(tree.findall('.//s:circle', ns)),
                 'lines': len(tree.findall('.//s:line', ns)), 'png': [width, height], 'native_vector': True})
layers = [ET.parse(root / 'svg' / f'{name}.svg').getroot().attrib['viewBox'] for name in
          ['01-spectra-glow-transparent', '07-spectra-stars-only', '08-spectra-links-only']]
assert len(set(layers)) == 1
(root / 'QUALITY-CHECK.json').write_text(json.dumps({'pass': True, 'variants': rows}, indent=2))
for suffix, paths in [('', sorted(root.rglob('*'))), ('-SVG-only', svgs + [root / 'README.md', root / 'QUALITY-CHECK.json'])]:
    target = root.parent / (root.name + suffix + '.zip')
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for file in paths:
            if file.is_file():
                archive.write(file, Path(root.name) / file.relative_to(root))
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
    print(f'{target.name}: {target.stat().st_size / 1048576:.2f} MiB')
print('All 10 native SVGs and 4K PNGs passed validation.')
