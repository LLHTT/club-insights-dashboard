// Both clubs in this dataset are Asia/Ho_Chi_Minh (docs/SYSTEM_DESIGN.md §1.3). Used only to
// format a timestamp for display in the browser - the actual range/week math (src/lib/metrics)
// always reads a club's own time_zone column, never this constant.
export const DISPLAY_TIME_ZONE = "Asia/Ho_Chi_Minh";
