/**
 * Fractional positioning system for conflict-free task ordering
 * 
 * This module provides utilities for calculating positions between existing items
 * using fractional/decimal values. This approach allows infinite insertions between
 * any two positions without conflicts.
 */

export interface PositionConfig {
  defaultSpacing?: number;
  initialPosition?: number;
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
 * @returns A position value that will sort between the two given positions
 */
export function calculatePosition(
  prevPosition: number | null,
  nextPosition: number | null,
  config: PositionConfig = {}
): number {
  const { defaultSpacing = 1000, initialPosition = 1000 } = config;

  // If inserting at the start of the list
  if (prevPosition === null && nextPosition !== null) {
    return nextPosition / 2;
  }

  // If inserting at the end of the list
  if (prevPosition !== null && nextPosition === null) {
    return prevPosition + defaultSpacing;
  }

  // If inserting between two items
  if (prevPosition !== null && nextPosition !== null) {
    return (prevPosition + nextPosition) / 2;
  }

  // If the list is empty
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
 * @param startPos - Starting position value (default: 1000)
 * @param spacing - Space between positions (default: 1000)
 * @returns Array of evenly spaced position values
 */
export function rebalancePositions(
  count: number,
  startPos = 1000,
  spacing = 1000
): number[] {
  if (count <= 0) {
    return [];
  }

  return Array.from({ length: count }, (_, i) => startPos + (i * spacing));
}