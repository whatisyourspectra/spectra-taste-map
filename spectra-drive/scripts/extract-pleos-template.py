"""Extract the official Connect-S 17-inch frames, without rasterizing or redrawing.

Usage: python3 scripts/extract-pleos-template.py /path/to/display-layout-03.svg
The source URL and derivation are recorded in docs/design/pleos-connect/README.md.
"""

from copy import deepcopy
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
source = ET.parse(sys.argv[1]).getroot()
definitions = source.find(f'{{{SVG}}}defs')
output = Path(__file__).resolve().parents[1] / 'public' / 'pleos'
output.mkdir(parents=True, exist_ok=True)
for name, clip, y in [('landscape', 'clip6_0_1', 940), ('split', 'clip20_0_1', 2530)]:
    frame = ET.Element(f'{{{SVG}}}svg', {
        'width': '2560', 'height': '1440', 'viewBox': f'400 {y} 2560 1440', 'fill': 'none',
    })
    ET.SubElement(frame, f'{{{SVG}}}title').text = 'Pleos Connect-S 17-inch official display layout reference'
    ET.SubElement(frame, f'{{{SVG}}}desc').text = (
        'Viewport extracted from Hyundai Motor Group Pleos Playground display layout guide. '
        'System UI reference only; application content is rendered separately.'
    )
    group = next(element for element in source if element.get('clip-path') == f'url(#{clip})')
    frame.append(deepcopy(group))
    frame.append(deepcopy(definitions))
    ET.ElementTree(frame).write(output / f'connect-s-17-{name}.svg', encoding='utf-8', xml_declaration=True)
