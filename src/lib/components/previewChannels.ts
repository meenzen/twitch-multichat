// Which channels the link preview image shows. The image can't measure text,
// so widths are estimated in characters: a row of tabs holds about
// `rowChars` characters, the gap between tabs counts as `gapChars`.

export interface PreviewChannel {
  name: string;
  color: string;
}

export interface PreviewChannels {
  /** The first channels, as many as fit */
  shown: PreviewChannel[];
  /** How many channels are left out */
  hidden: number;
}

// readable on the dark chat background
const colors = [
  "#ff6b9a",
  "#ffd43b",
  "#51cf66",
  "#74c0fc",
  "#ffa94d",
  "#da77f2",
  "#63e6be",
  "#ff8787",
];

const rowChars = 32;
const gapChars = 2;
const maxRows = 2;

export function moreLabel(hidden: number): string {
  return `+${hidden} more`;
}

/** Fits tabs into rows, returns the number of rows they need */
function rowsNeeded(labels: string[]): number {
  let rows = 1;
  let used = 0;
  for (const label of labels) {
    const width = Math.min(label.length, rowChars);
    if (used > 0 && used + gapChars + width > rowChars) {
      rows++;
      used = width;
    } else {
      used += (used > 0 ? gapChars : 0) + width;
    }
  }
  return rows;
}

export function previewChannels(names: string[]): PreviewChannels {
  let count = Math.max(1, names.length);
  for (; count > 1; count--) {
    const hidden = names.length - count;
    const labels = names.slice(0, count);
    if (hidden > 0) labels.push(moreLabel(hidden));
    if (rowsNeeded(labels) <= maxRows) break;
  }
  return {
    shown: names.slice(0, count).map((name, i) => ({
      name,
      color: colors[i % colors.length],
    })),
    hidden: names.length - Math.min(count, names.length),
  };
}
