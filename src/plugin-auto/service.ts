import { createUniqueUuid, Entity, IAgentRuntime, Memory, Service } from '@elizaos/core';
import { EventType } from './types';

export default class AutonomousService extends Service {
  static serviceType = 'autonomous';
  capabilityDescription = 'Autonomous agent service, maintains the autonomous agent loop';
  async stop(): Promise<void> {
    console.log('AutonomousService stopped');
    return;
  }

  static async start(runtime: IAgentRuntime): Promise<Service> {
    const autoService = new AutonomousService(runtime);
    return autoService;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    runtime.getService(AutonomousService.serviceType).stop();
    return;
  }
  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.runtime = runtime;

    this.setupWorld().then(() => {
      this.loop();
    });
  }

  async setupWorld() {
    const worldId = createUniqueUuid(this.runtime, 'auto');
    const world = await this.runtime.getWorld(worldId);

    const copilotEntityId = createUniqueUuid(this.runtime, 'copilot');

    const entityExists = await this.runtime.getEntityById(copilotEntityId);

    if (!entityExists) {
      const copilot: Entity = {
        id: copilotEntityId,
        names: ['Copilot'],
        agentId: this.runtime.agentId,
      };

      await this.runtime.createEntity(copilot);
    }

    if (!world) {
      await this.runtime.createWorld({
        id: worldId,
        name: 'Auto',
        agentId: this.runtime.agentId,
        serverId: createUniqueUuid(this.runtime, 'auto'),
      });
    }
  }
  async loop() {
    console.log('*** loop');

    const copilotEntityId = createUniqueUuid(this.runtime, this.runtime.agentId);

    const autoPrompts = [
      'What should I do next? Think, plan and act.',
      'Next action. Go!',
      'What is your immediate next step? Execute.',
      'Proceed with the current plan. What is next?',
      "Don't stop now. What's the next move?",
      'Keep the momentum. What action follows?',
      'Time to act. What will you do?',
      'Focus and execute. What is the priority task?',
      'Advance your goals. What is the next logical step?',
      'Continue your work. What needs to be done now?',
      'Push forward. What is the next objective?',
    ];

    const newMessage: Memory = {
      content: {
        text: autoPrompts[Math.floor(Math.random() * autoPrompts.length)],
        type: 'text',
        source: 'auto',
      },
      roomId: createUniqueUuid(this.runtime, 'auto'),
      worldId: createUniqueUuid(this.runtime, 'auto'),
      entityId: copilotEntityId,
    };

    await this.runtime.emitEvent(EventType.AUTO_MESSAGE_RECEIVED, {
      runtime: this.runtime,
      message: newMessage,
      callback: (content) => {
        console.log('AUTO_MESSAGE_RECEIVED:\n', content);
      },
      onComplete: () => {
        console.log('AUTO_MESSAGE_RECEIVED COMPLETE');
        setTimeout(
          async () => {
            // do work
            this.loop();
          },
          this.runtime.getSetting('AUTONOMOUS_LOOP_INTERVAL') || 1000
        );
      },
    });
  }
}
