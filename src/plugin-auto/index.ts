import { Plugin } from '@elizaos/core';
import { events } from './events';
import AutonomousService from './service';
import './types'; // Ensure module augmentation is loaded
import { autonomousFeedProvider } from './messageFeed';
import { reflectAction } from './reflect';

export const autoPlugin: Plugin = {
  name: 'auto',
  description: 'Auto plugin',
  events: events,
  actions: [reflectAction],
  services: [AutonomousService],
  providers: [autonomousFeedProvider],
};
