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
    randomRangePercent = 0.5
  } = config;

  // Between two positions
  if (prevPosition !== null && nextPosition !== null) {
    const gap = nextPosition - prevPosition;

    // Use randomization only if gap is large enough
    if (gap >= 4) {
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
    // Generate random negative position to allow infinite insertions before
    return -Math.floor(Math.random() * defaultSpacing + 1);
  }

  // At end: randomize around default spacing
  if (prevPosition !== null && nextPosition === null) {
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

/**
 * Check if positions need rebalancing due to precision limits
 * 
 * @param positions - Array of position values (should be sorted)
 * @param threshold - Minimum gap threshold (default: 1e-10)
 * @returns True if positions are too close and need rebalancing
 */
export function needsRebalancing(positions: number[], threshold = 1e-10): boolean {
  if (positions.length < 2) {
    return false;
  }

  // Check each adjacent pair for gaps that are too small
  for (let i = 1; i < positions.length; i++) {
    const gap = Math.abs(positions[i] - positions[i - 1]);
    if (gap < threshold) {
      return true;
    }
  }

  return false;
}

/**
 * Generate evenly spaced position values for rebalancing
 * 
 * @param count - Number of positions to generate
 * @param startPos - Starting position value (default: 10000)
 * @param spacing - Space between positions (default: 10000)
 * @returns Array of evenly spaced position values
 */
export function rebalancePositions(
  count: number,
  startPos = 10000,
  spacing = 10000
): number[] {
  if (count <= 0) {
    return [];
  }

  return Array.from({ length: count }, (_, i) => startPos + (i * spacing));
}