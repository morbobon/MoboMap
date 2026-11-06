// Highlight modes a group can combine. Labels: i18n keys hl_<id> (name) and hl_<id>_t (tooltip).
// fill, hatch, dots and tint are mutually exclusive (see toggleHL).
const HLS = ['fill', 'hatch', 'dots', 'tint', 'glow', 'outline', 'emboss', 'pin', 'label', 'callout', 'dim'].map(
  (id) => ({ id }),
);
