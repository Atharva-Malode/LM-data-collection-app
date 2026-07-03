import { FingerName, Pattern } from './types';

export const FINGERS: FingerName[] = [
  'Right Thumb', 'Right Index', 'Right Middle', 'Right Ring', 'Right Little',
  'Left Thumb', 'Left Index', 'Left Middle', 'Left Ring', 'Left Little',
];

export const SUB_PATTERNS: Record<string, string[]> = {
  Whorl: [
    'Plain Whorl',
    'Central Pocket Loop Whorl',
    'Double Loop Whorl',
    'Accidental Whorl'
  ],
  Loop: [
    'Ulnar Loop',
    'Radial Loop'
  ],
  Arch: [
    'Plain Arch',
    'Tented Arch'
  ],
};

export const PATTERNS: Pattern[] = ['Whorl', 'Loop', 'Arch'];
