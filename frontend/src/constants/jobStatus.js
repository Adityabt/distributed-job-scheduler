export const STATUS_COLOR = {
  queued: '#FF7A45',
  scheduled: '#FF7A45',
  claimed: '#4FD1C5',
  running: '#4FD1C5',
  completed: '#3DDC84',
  failed: '#F2545B',
  dead_letter: '#F2545B',
};

export const JOB_STAGES = [
  'queued',
  'scheduled',
  'claimed',
  'running',
  'completed',
  'failed',
  'dead_letter',
];

export const JOB_TYPES = ['immediate', 'delayed', 'scheduled', 'recurring'];