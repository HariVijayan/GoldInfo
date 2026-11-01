/**
 * Picks evenly spaced items and always keeps the first and the last, so a
 * thinned line still starts and ends on the real data.
 */
export function downsampleEvenly<Item>(items: Item[], maximumItems: number): Item[] {
  if (items.length <= maximumItems || maximumItems < 3) return items;

  const lastIndex = items.length - 1;
  const indexStep = lastIndex / (maximumItems - 1);
  const sampledItems: Item[] = [];
  let previousIndex = -1;

  for (let sampleNumber = 0; sampleNumber < maximumItems; sampleNumber += 1) {
    const sourceIndex = Math.round(sampleNumber * indexStep);
    if (sourceIndex !== previousIndex) {
      sampledItems.push(items[sourceIndex]);
      previousIndex = sourceIndex;
    }
  }

  return sampledItems;
}
