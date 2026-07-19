/* One place for every chart and status color in the app.
   Values come from ANU_DESIGN_SYSTEM/app-ui/APP_UI_SPEC.md (chart series order,
   grid, ticks, tooltip) so recharts output matches the house tokens. */

export const CHART_SERIES = [
  '#d8ad58',
  '#408eff',
  '#9c2848',
  '#2dd4a8',
  '#efd596',
  '#6da7ff',
];

export const CHART_GRID = 'rgba(159,168,187,0.12)';
export const CHART_TICK = '#6b7691';
export const CHART_LABEL = '#e6ecf5';
export const CHART_TOOLTIP_BG = '#101c33';
export const CHART_TOOLTIP_BORDER = 'rgba(216,173,88,0.13)';

/* Load-bearing status colors: green = listed/fresh/good,
   amber = delisting/caution, red = delisted/stale/bad. */
export const STATUS = {
  listed: '#2dd4a8',
  delisting: '#fdcb6e',
  delisted: '#e5484d',
};

/* Lightened one step, for chip text and ramp midpoints. */
export const STATUS_SOFT = {
  listed: '#4be0bb',
  delisting: '#ffd780',
  delisted: '#ff8a80',
};

/* Goal progress ramp, best to worst. */
export const PROGRESS_RAMP = {
  done: STATUS.listed,
  strong: STATUS_SOFT.listed,
  caution: STATUS.delisting,
  behind: STATUS_SOFT.delisted,
  critical: STATUS.delisted,
};

/* Pipeline stage chips, all values from the house palette. */
export const PIPELINE_STAGE_COLORS = {
  prospecting: '#9fa8bb',
  pitched: '#6da7ff',
  tasting_scheduled: '#408eff',
  tasting_done: '#fdcb6e',
  samples_left: '#efd596',
  in_review: '#d8ad58',
  listed: '#2dd4a8',
  lost: '#e5484d',
};
