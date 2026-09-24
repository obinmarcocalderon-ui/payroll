// Canonical display text for status values that need to read identically
// everywhere they show up — badges, filters, summary cards, and
// notification copy all pull from this one map instead of each location
// hardcoding (and inevitably drifting from) its own wording.
//
// Anything not listed here falls back to a generic "snake_case" ->
// "Title Case" conversion, which is why most status values (e.g.
// "approved", "rejected", "enrolled") don't need an entry — the derived
// text is already the desired label.
const STATUS_LABEL_OVERRIDES: Record<string, string> = {
  // Claims: "submitted" and "under_review" are two backend sub-states of
  // the same thing from the reader's point of view — a claim sitting in
  // someone's queue awaiting a decision — so both resolve to one label.
  submitted: 'Pending Approval',
  under_review: 'Pending Approval',

  // Payroll: spelled out explicitly (rather than left to the generic
  // conversion) so prose copy — e.g. dashboard notifications — can quote
  // the exact same words as the status badge instead of paraphrasing.
  for_approval: 'For Approval',
};

function titleCase(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * The single canonical label for a status value. Used by StatusBadge for
 * the badge chip itself, and by any other UI (filters, stat cards,
 * notification strings) that needs to describe the same status in text —
 * import this instead of re-deriving or re-typing the wording locally.
 */
export function statusLabel(status: string): string {
  return STATUS_LABEL_OVERRIDES[status] ?? titleCase(status);
}
