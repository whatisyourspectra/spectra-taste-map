from pathlib import Path
import json, re, struct, zipfile
import xml.etree.ElementTree as ET

p=Path(__file__).resolve().parent
audit=json.loads((p/'capture-audit.json').read_text())
assert audit['dataset']=={'all':69,'discoveryLibrary':61,'discoveryHeldOut':8,'duplicateIds':0}
assert not audit['errors'] and not audit['warnings']
v=json.loads((p/'vector-manifest.json').read_text())
m=json.loads((p/'macbook-manifest.json').read_text())
assert len(v['ui'])==20 and len(v['heroes'])==6 and len(m)==2 and len(audit['screens'])==9
ns='{http://www.w3.org/2000/svg}'
counts={'hero_png':0,'hero_svg':0,'ui_svg':0,'ui_png':0,'original_screens':9,'external_links':0,'foreignObject':0}
for folder,items in [('ui-svg',v['ui']),('heroes',v['heroes']+m)]:
 for a in items:
  name=a['name']; image=p/folder/(name+'.png'); head=image.read_bytes()[:33]; size=struct.unpack('>II',head[16:24])
  assert size==(a['width'],a['height']), (name,size,a['width'],a['height'])
  assert max(size)>=3999 if folder=='ui-svg' else size[0]==6000
  counts['ui_png' if folder=='ui-svg' else 'hero_png']+=1
  file=p/folder/(name+'.svg')
  if not file.exists(): continue
  source=file.read_text(); tree=ET.fromstring(source)
  assert not list(tree.iter(ns+'foreignObject')),name
  assert not list(tree.iter(ns+'text')),name
  for el in tree.iter():
   for k,val in el.attrib.items():
    if k.endswith('href'): assert val.startswith(('data:','#')), (name,val[:100])
  clean=re.sub(r'data:image/[^\s"<>]+','IMAGE',source)
  assert not re.search(r'\b(?:NaN|Infinity)\b',clean),name
  if folder=='ui-svg': assert len(list(tree.iter(ns+'path')))>0,name
  counts['ui_svg' if folder=='ui-svg' else 'hero_svg']+=1
(p/'QUALITY-CHECK.json').write_text(json.dumps(counts,indent=2))

# Include the captured DOM, reference crops, and generation source so the bundle
# remains reviewable and can be rebuilt within the SPECTRA repository.
bundle=p.with_suffix('.zip')
with zipfile.ZipFile(bundle,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in sorted(p.rglob('*')):
  if not f.is_file() or f.name=='.DS_Store': continue
  z.write(f,str(Path(p.name)/f.relative_to(p)))
ui_bundle=p.parent/(p.name+'-UI-SVG.zip')
with zipfile.ZipFile(ui_bundle,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in sorted((p/'ui-svg').glob('*.svg')): z.write(f,'ui-svg/'+f.name)
 for name in ['README.md','CONTACT-SHEET.png','QUALITY-CHECK.json']: z.write(p/name,name)
for file in [bundle,ui_bundle]:
 with zipfile.ZipFile(file) as z: assert z.testzip() is None
 print(file,round(file.stat().st_size/1048576,1),'MiB')
print(json.dumps(counts,indent=2))
