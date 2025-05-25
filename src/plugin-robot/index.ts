import { type Plugin } from '@elizaos/core';
import { RobotService } from './service';
import { performScreenAction } from './action';
import { screenProvider } from './provider';
import './types'; // Ensure module augmentation is loaded

export const robotPlugin: Plugin = {
  name: 'plugin-robot',
  description: 'Control screen using robotjs and provide screen context',
  actions: [performScreenAction],
  providers: [screenProvider],
  services: [RobotService],
};

export default robotPlugin;
