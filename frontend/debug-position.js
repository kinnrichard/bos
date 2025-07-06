// Debug script for position calculation
import { calculatePositionFromTarget } from './src/lib/utils/position-calculator.js';

const tasks = [
  { id: 'aa199df2-ad07-4141-9ca3-24350ae10f66', position: 3, parent_id: '0868e68c-0560-49e4-8023-8da58258a0fb' },
  { id: '573af5c6-7cd6-41e2-9207-e4e4354b3a53', position: 4, parent_id: '0868e68c-0560-49e4-8023-8da58258a0fb' },
  { id: '0d6d43c1-90a3-4fc3-a9ae-7658f797f333', position: 5, parent_id: '0868e68c-0560-49e4-8023-8da58258a0fb' },
  { id: 'd4754ddf-471b-41a4-948a-01423c144469', position: 6, parent_id: '0868e68c-0560-49e4-8023-8da58258a0fb' },
  { id: 'c180c0ed-3a1b-46c4-b3cd-deb96de1e930', position: 7, parent_id: '0868e68c-0560-49e4-8023-8da58258a0fb' },
  { id: 'f6d7132a-6060-4c15-946e-b2701f21d1f9', position: 8, parent_id: '0868e68c-0560-49e4-8023-8da58258a0fb' },
  { id: '413d84d5-93e4-4daf-b648-eaee8c776d39', position: 9, parent_id: '0868e68c-0560-49e4-8023-8da58258a0fb' },
  { id: '0bd45386-d4ef-4531-9f45-1fce59b379e1', position: 10, parent_id: '0868e68c-0560-49e4-8023-8da58258a0fb' },
  { id: 'f07927d6-87f3-4cc0-ab0e-099cf4744fc2', position: 11, parent_id: '0868e68c-0560-49e4-8023-8da58258a0fb' }
];

const dropZone = {
  mode: 'reorder',
  position: 'above',
  targetTaskId: '413d84d5-93e4-4daf-b648-eaee8c776d39'
};

const parentId = '0868e68c-0560-49e4-8023-8da58258a0fb';
const draggedTaskIds = ['aa199df2-ad07-4141-9ca3-24350ae10f66'];

console.log('Testing single task above positioning...');
console.log('Tasks:', tasks.map(t => `${t.id.slice(0,8)}:${t.position}`));
console.log('Target task:', dropZone.targetTaskId.slice(0,8), 'at position', tasks.find(t => t.id === dropZone.targetTaskId)?.position);
console.log('Dragged task:', draggedTaskIds[0].slice(0,8), 'at position', tasks.find(t => t.id === draggedTaskIds[0])?.position);

const result = calculatePositionFromTarget(tasks, dropZone, parentId, draggedTaskIds);

console.log('\nResult:', result);
console.log('Expected: 7, Got:', result.calculatedPosition);