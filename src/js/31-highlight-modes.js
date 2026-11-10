// Highlight modes a group can combine. Labels: i18n keys hl_<id> (name) and hl_<id>_t (tooltip).
// The fill modes (HL_FILLS) are mutually exclusive (see toggleHL).
const HLS = [
  'fill',
  'hatch',
  'cross',
  'dots',
  'tint',
  'glow',
  'outline',
  'dashed',
  'emboss',
  'shadow',
  'inset',
  'bevel',
  'block',
  'pin',
  'label',
  'callout',
  'dim',
].map((id) => ({ id }));
const HL_FILLS = ['fill', 'hatch', 'cross', 'dots', 'tint'];
// a pattern fill: drawn from the group's pattern (#<mode><group index>)
const HL_PATTERNS = ['hatch', 'cross', 'dots'];
// filters applied to a group's whole area at once (so its own areas do not shade each other), innermost first
const HL_GROUP_FX = ['bevel', 'inset', 'shadow'];
