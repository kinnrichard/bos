/**
 * Randomized integer-based positioning system for task ordering
 * 
 * This module provides utilities for calculating positions between existing items
 * using randomized integer values within specified ranges to reduce position
 * conflicts during offline operations. When conflicts do occur (same position),
 * the client handles them by secondary sorting on created_at.
 * 
 * Randomization is used to prevent multiple offline clients from choosing the
 * same position when inserting at the same location.
 * 
 * Top-of-list positioning uses negative integers to allow infinite insertions
 * before the first item in the list.
 */

export interface PositionConfig {
  defaultSpacing?: number;
  initialPosition?: number;
  randomRangePercent?: number;
  disableRandomization?: boolean; // For testing purposes
}

export interface Positionable {
  id: string;
  position: number;
}

/**
 * Calculate a position value between two existing positions
 * 
 * @param prevPosition - Position of the item before the insertion point (null if inserting at start)
 * @param nextPosition - Position of the item after the insertion point (null if inserting at end)
 * @param config - Optional configuration for spacing and initial position
 * @returns An integer position value that will sort between the two given positions
 */
export function calculatePosition(
  prevPosition: number | null,
  nextPosition: number | null,
  config: PositionConfig = {}
): number {
  const { 
    defaultSpacing = 10000, 
    initialPosition = 10000,
    randomRangePercent = 0.5,
    disableRandomization = false
  } = config;

  // Between two positions
  if (prevPosition !== null && nextPosition !== null) {
    const gap = nextPosition - prevPosition;

    // Use randomization only if gap is large enough
    if (gap >= 4 && !disableRandomization) {
      const rangeSize = gap * randomRangePercent;
      const rangeStart = prevPosition + (gap - rangeSize) / 2;
      const rangeEnd = rangeStart + rangeSize;

      return Math.floor(rangeStart + Math.random() * (rangeEnd - rangeStart));
    }

    // Fallback to midpoint for small gaps
    return Math.floor((prevPosition + nextPosition) / 2);
  }

  // At start: use negative positioning with randomization to allow infinite insertions before
  if (prevPosition === null && nextPosition !== null) {
    if (disableRandomization) {
      // For testing: use deterministic negative position
      return -1;
    }
    // Generate random negative position to allow infinite insertions before
    return -Math.floor(Math.random() * defaultSpacing + 1);
  }

  // At end: randomize around default spacing
  if (prevPosition !== null && nextPosition === null) {
    if (disableRandomization) {
      // For testing: use deterministic spacing
      return prevPosition + defaultSpacing;
    }
    if (defaultSpacing >= 4) {
      const minSpacing = defaultSpacing * (1 - randomRangePercent / 2);
      const maxSpacing = defaultSpacing * (1 + randomRangePercent / 2);
      return prevPosition + Math.floor(minSpacing + Math.random() * (maxSpacing - minSpacing));
    }
    return prevPosition + defaultSpacing;
  }

  // Empty list
  return initialPosition;
}

/**
 * Get the adjacent items for a given index in a list
 * 
 * @param items - Array of items with positions
 * @param targetIndex - Index to find adjacent items for
 * @returns Object with prev and next items (or null if at boundaries)
 */
export function getAdjacentPositions<T extends Positionable>(
  items: T[],
  targetIndex: number
): { prev: T | null; next: T | null } {
  // Handle invalid indices
  if (targetIndex < 0 || targetIndex >= items.length || items.length === 0) {
    return { prev: null, next: null };
  }

  // Get previous item (if not at start)
  const prev = targetIndex > 0 ? items[targetIndex - 1] : null;

  // Get next item (if not at end)
  const next = targetIndex < items.length - 1 ? items[targetIndex + 1] : null;

  return { prev, next };
}

