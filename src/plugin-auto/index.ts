import { Plugin } from '@elizaos/core';
import { events } from './events';
import AutonomousService from './service';

export const autoPlugin: Plugin = {
  name: 'auto',
  description: 'Auto plugin',
  events: events,
  services: [AutonomousService],
};
