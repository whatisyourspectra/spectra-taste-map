const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));

export function positionGuide(target, panel, viewport) {
  const margin = 16;
  const gap = 16;
  const width = panel.width;
  const height = panel.height;
  const centerX = target.left + target.width / 2;
  const centerY = target.top + target.height / 2;
  const x = clamp(centerX - width / 2, margin, viewport.width - width - margin);
  const y = clamp(centerY - height / 2, margin, viewport.height - height - margin);
  const candidates = [
    { side: 'above', left: x, top: target.top - height - gap },
    { side: 'below', left: x, top: target.bottom + gap },
    { side: 'right', left: target.right + gap, top: y },
    { side: 'left', left: target.left - width - gap, top: y },
  ];
  const fits = p => p.left >= margin && p.top >= margin && p.left + width <= viewport.width - margin && p.top + height <= viewport.height - margin;
  const chosen = candidates.find(fits);
  // A full-screen map has no exterior space. Show its introduction inside it.
  if (!chosen) return { left: x, top: clamp(target.top + gap, margin, viewport.height - height - margin), side: null };
  const horizontal = chosen.side === 'above' || chosen.side === 'below';
  return { ...chosen, arrow: horizontal
    ? clamp(centerX - chosen.left, 24, width - 24)
    : clamp(centerY - chosen.top, 24, height - 24) };
}
