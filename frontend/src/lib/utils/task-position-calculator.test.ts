import { describe, it, expect } from 'vitest';
import { calculatePosition } from '$lib/shared/utils/positioning-v2';

describe('Task Position Calculator - Integration Tests', () => {
  describe('Inline Task Creation Scenarios', () => {
    it('should calculate correct position when inserting between two tasks', () => {
      const tasks = [
        { id: '1', position: 1000 },
        { id: '2', position: 2000 },
        { id: '3', position: 3000 }
      ];
      
      // Inserting after task 1, before task 2
      const afterTask = tasks[0];
      const nextTask = tasks[1];
      const position = calculatePosition(afterTask.position, nextTask.position);
      
      expect(position).toBe(1500);
      expect(position).toBeGreaterThan(afterTask.position);
      expect(position).toBeLessThan(nextTask.position);
    });

    it('should handle inserting at the end of a list', () => {
      const tasks = [
        { id: '1', position: 1000 },
        { id: '2', position: 2000 },
        { id: '3', position: 3000 }
      ];
      
      // Inserting after last task
      const lastTask = tasks[tasks.length - 1];
      const position = calculatePosition(lastTask.position, null);
      
      expect(position).toBe(4000); // 3000 + 1000 (default spacing)
      expect(position).toBeGreaterThan(lastTask.position);
    });

    it('should handle multiple insertions between same tasks', () => {
      // Start with two tasks
      let tasks = [
        { id: '1', position: 1000 },
        { id: '2', position: 2000 }
      ];
      
      // First insertion
      const pos1 = calculatePosition(1000, 2000);
      expect(pos1).toBe(1500);
      tasks.splice(1, 0, { id: 'new1', position: pos1 });
      
      // Second insertion between task 1 and new1
      const pos2 = calculatePosition(1000, 1500);
      expect(pos2).toBe(1250);
      tasks.splice(1, 0, { id: 'new2', position: pos2 });
      
      // Third insertion between task 1 and new2
      const pos3 = calculatePosition(1000, 1250);
      expect(pos3).toBe(1125);
      
      // All positions should be unique and maintain order
      expect(pos3).toBeGreaterThan(1000);
      expect(pos3).toBeLessThan(pos2);
      expect(pos2).toBeLessThan(pos1);
      expect(pos1).toBeLessThan(2000);
    });

    it('should handle subtask insertion with parent scope', () => {
      const tasks = [
        { id: '1', position: 1000, parent_id: null },
        { id: '2', position: 2000, parent_id: null },
        { id: '3', position: 1000, parent_id: '2' },
        { id: '4', position: 2000, parent_id: '2' },
        { id: '5', position: 3000, parent_id: '2' }
      ];
      
      // Get only subtasks of task 2
      const subtasks = tasks.filter(t => t.parent_id === '2')
                           .sort((a, b) => a.position - b.position);
      
      // Insert between first and second subtask
      const position = calculatePosition(subtasks[0].position, subtasks[1].position);
      
      expect(position).toBe(1500);
      expect(position).toBeGreaterThan(subtasks[0].position);
      expect(position).toBeLessThan(subtasks[1].position);
    });
  });

  describe('Bottom Task Creation Scenarios', () => {
    it('should add task at end of root level', () => {
      const tasks = [
        { id: '1', position: 1000, parent_id: null },
        { id: '2', position: 2000, parent_id: null },
        { id: '3', position: 1000, parent_id: '2' }
      ];
      
      // Get only root tasks
      const rootTasks = tasks.filter(t => !t.parent_id)
                            .sort((a, b) => a.position - b.position);
      
      const lastTask = rootTasks[rootTasks.length - 1];
      const position = calculatePosition(lastTask.position, null);
      
      expect(position).toBe(3000); // 2000 + 1000
    });

    it('should handle first task in empty job', () => {
      const position = calculatePosition(null, null);
      
      expect(position).toBe(1000); // Default initial position
    });
  });

  describe('Edge Cases and Precision', () => {
    it('should maintain precision for many insertions', () => {
      let prevPos = 1000;
      let nextPos = 2000;
      const positions: number[] = [];
      
      // Simulate 20 insertions between same two positions
      for (let i = 0; i < 20; i++) {
        const pos = calculatePosition(prevPos, nextPos);
        positions.push(pos);
        nextPos = pos; // Next insertion will be between prevPos and this new position
      }
      
      // All positions should be unique
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(positions.length);
      
      // All should be between original bounds
      positions.forEach(pos => {
        expect(pos).toBeGreaterThan(1000);
        expect(pos).toBeLessThan(2000);
      });
      
      // Should be in descending order (since we're always inserting at the beginning)
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]).toBeLessThan(positions[i - 1]);
      }
    });

    it('should handle positions with existing decimal values', () => {
      const position = calculatePosition(1234.5678, 1234.9999);
      
      expect(position).toBeCloseTo(1234.78385, 5);
      expect(position).toBeGreaterThan(1234.5678);
      expect(position).toBeLessThan(1234.9999);
    });
  });

  describe('Zero.js Sync Compatibility', () => {
    it('should produce positions suitable for Zero.js sync', () => {
      // Positions should be numbers that can be accurately represented in JSON
      const position = calculatePosition(1000, 2000);
      
      // Convert to JSON and back
      const jsonStr = JSON.stringify({ position });
      const parsed = JSON.parse(jsonStr);
      
      expect(parsed.position).toBe(position);
      expect(typeof parsed.position).toBe('number');
    });

    it('should handle concurrent offline insertions', () => {
      // Simulate two users inserting at the same position offline
      const user1Position = calculatePosition(1000, 2000);
      const user2Position = calculatePosition(1000, 2000);
      
      // Both get the same base position
      expect(user1Position).toBe(1500);
      expect(user2Position).toBe(1500);
      
      // In real usage, server-side mutations would add microsecond components
      // to ensure uniqueness, but our base algorithm provides stable positions
    });
  });
});