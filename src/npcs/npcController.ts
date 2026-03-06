import { createNpcService } from './npcService.ts';

export function createNpcController() {
  const service = createNpcService();

  return {
    service,
    bind() {
      return service.list();
    }
  };
}
