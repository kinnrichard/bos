import { describe, it, expect } from 'vitest';
import { calculatePosition, getAdjacentPositions, needsRebalancing, rebalancePositions } from './positioning-v2';

describe('calculatePosition', () => {
  describe('basic position calculations', () => {
    it('should calculate midpoint between two positions', () => {
      const position = calculatePosition(1000, 2000);
      expect(position).toBe(1500);
    });

    it('should handle decimal positions', () => {
      const position = calculatePosition(1.5, 2.5);
      expect(position).toBe(2);
    });

    it('should maintain precision with very close positions', () => {
      const position = calculatePosition(1.0001, 1.0002);
      expect(position).toBe(1.00015);
    });
  });

  describe('edge cases with null values', () => {
    it('should handle insertion at start when prevPosition is null', () => {
      const position = calculatePosition(null, 1000);
      expect(position).toBe(500);
    });

    it('should handle insertion at start with small nextPosition', () => {
      const position = calculatePosition(null, 10);
      expect(position).toBe(5);
    });

    it('should handle insertion at start with fractional nextPosition', () => {
      const position = calculatePosition(null, 0.5);
      expect(position).toBe(0.25);
    });

    it('should handle insertion at end when nextPosition is null', () => {
      const position = calculatePosition(1000, null);
      expect(position).toBe(2000);
    });

    it('should handle insertion at end with large prevPosition', () => {
      const position = calculatePosition(999999, null);
      expect(position).toBe(1000999);
    });

    it('should handle empty list when both are null', () => {
      const position = calculatePosition(null, null);
      expect(position).toBe(1000);
    });
  });

  describe('boundary conditions', () => {
    it('should handle zero positions', () => {
      const position = calculatePosition(0, 1);
      expect(position).toBe(0.5);
    });

    it('should handle negative positions', () => {
      const position = calculatePosition(-10, 10);
      expect(position).toBe(0);
    });

    it('should work with very large position values', () => {
      const position = calculatePosition(1e10, 1e10 + 2000);
      expect(position).toBe(1e10 + 1000);
    });

    it('should maintain precision near JavaScript number limits', () => {
      const largeNum = Number.MAX_SAFE_INTEGER / 2;
      const position = calculatePosition(largeNum, largeNum + 2);
      // Due to floating-point precision, we need to check closeness rather than exact equality
      expect(Math.abs(position - (largeNum + 1))).toBeLessThanOrEqual(1);
    });
  });

  describe('spacing configuration', () => {
    it('should use custom spacing for end insertion', () => {
      const position = calculatePosition(1000, null, { defaultSpacing: 500 });
      expect(position).toBe(1500);
    });

    it('should use custom initial position for empty list', () => {
      const position = calculatePosition(null, null, { initialPosition: 5000 });
      expect(position).toBe(5000);
    });

    it('should apply both custom spacing and initial position', () => {
      const position1 = calculatePosition(null, null, { initialPosition: 100 });
      expect(position1).toBe(100);
      
      const position2 = calculatePosition(100, null, { defaultSpacing: 50 });
      expect(position2).toBe(150);
    });
  });
});

describe('getAdjacentPositions', () => {
  const tasks = [
    { id: '1', position: 1000 },
    { id: '2', position: 2000 },
    { id: '3', position: 3000 },
    { id: '4', position: 4000 },
    { id: '5', position: 5000 }
  ];

  it('should find adjacent positions for middle item', () => {
    const adjacent = getAdjacentPositions(tasks, 2);
    expect(adjacent).toEqual({
      prev: { id: '2', position: 2000 },
      next: { id: '4', position: 4000 }
    });
  });

  it('should handle first item with no previous', () => {
    const adjacent = getAdjacentPositions(tasks, 0);
    expect(adjacent).toEqual({
      prev: null,
      next: { id: '2', position: 2000 }
    });
  });

  it('should handle last item with no next', () => {
    const adjacent = getAdjacentPositions(tasks, 4);
    expect(adjacent).toEqual({
      prev: { id: '4', position: 4000 },
      next: null
    });
  });

  it('should handle single item list', () => {
    const singleTask = [{ id: '1', position: 1000 }];
    const adjacent = getAdjacentPositions(singleTask, 0);
    expect(adjacent).toEqual({
      prev: null,
      next: null
    });
  });

  it('should handle empty list', () => {
    const adjacent = getAdjacentPositions([], 0);
    expect(adjacent).toEqual({
      prev: null,
      next: null
    });
  });

  it('should handle out of bounds index', () => {
    const adjacent = getAdjacentPositions(tasks, 10);
    expect(adjacent).toEqual({
      prev: null,
      next: null
    });
  });

  it('should handle negative index', () => {
    const adjacent = getAdjacentPositions(tasks, -1);
    expect(adjacent).toEqual({
      prev: null,
      next: null
    });
  });

  it('should work with unsorted positions', () => {
    const unsorted = [
      { id: '1', position: 3000 },
      { id: '2', position: 1000 },
      { id: '3', position: 2000 }
    ];
    // Should not sort, just get adjacent by array index
    const adjacent = getAdjacentPositions(unsorted, 1);
    expect(adjacent).toEqual({
      prev: { id: '1', position: 3000 },
      next: { id: '3', position: 2000 }
    });
  });
});

describe('needsRebalancing', () => {
  it('should detect when positions are too close', () => {
    // Use positions that are actually close enough for JavaScript to distinguish
    // but still within our threshold
    const positions = [1, 1 + 1e-11, 1 + 2e-11];
    expect(needsRebalancing(positions)).toBe(true);
  });

  it('should not trigger for well-spaced positions', () => {
    const positions = [1000, 2000, 3000, 4000];
    expect(needsRebalancing(positions)).toBe(false);
  });

  it('should handle fractional positions with good spacing', () => {
    const positions = [1, 1.5, 2, 2.5, 3];
    expect(needsRebalancing(positions)).toBe(false);
  });

  it('should detect precision issues after many subdivisions', () => {
    // Simulate many insertions between two positions
    let positions = [1, 2];
    for (let i = 0; i < 50; i++) {
      const mid = (positions[0] + positions[1]) / 2;
      positions = [positions[0], mid, positions[1]];
    }
    expect(needsRebalancing(positions)).toBe(true);
  });

  it('should handle empty array', () => {
    expect(needsRebalancing([])).toBe(false);
  });

  it('should handle single position', () => {
    expect(needsRebalancing([1000])).toBe(false);
  });

  it('should use custom threshold', () => {
    const positions = [1, 1.001, 1.002];
    expect(needsRebalancing(positions, 0.01)).toBe(true);
    expect(needsRebalancing(positions, 0.0001)).toBe(false);
  });
});

describe('rebalancePositions', () => {
  it('should create evenly spaced positions', () => {
    const positions = rebalancePositions(5);
    expect(positions).toEqual([1000, 2000, 3000, 4000, 5000]);
  });

  it('should handle custom start position', () => {
    const positions = rebalancePositions(3, 500);
    expect(positions).toEqual([500, 1500, 2500]);
  });

  it('should handle custom spacing', () => {
    const positions = rebalancePositions(4, 0, 100);
    expect(positions).toEqual([0, 100, 200, 300]);
  });

  it('should handle single item', () => {
    const positions = rebalancePositions(1);
    expect(positions).toEqual([1000]);
  });

  it('should handle zero count', () => {
    const positions = rebalancePositions(0);
    expect(positions).toEqual([]);
  });

  it('should create positions suitable for future insertions', () => {
    const positions = rebalancePositions(3);
    // Should have enough space for insertions
    const gap1 = positions[1] - positions[0];
    const gap2 = positions[2] - positions[1];
    expect(gap1).toBe(1000);
    expect(gap2).toBe(1000);
  });

  it('should work with fractional start and spacing', () => {
    const positions = rebalancePositions(3, 1.5, 0.5);
    expect(positions).toEqual([1.5, 2, 2.5]);
  });
});