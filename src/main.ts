import { bindLoginActions } from './auth/login.ts';
import { initCharacterController } from './characters/characterController.ts';
import { createNpcController } from './npcs/npcController.ts';

export function bootstrapApp() {
  bindLoginActions();
  createNpcController().bind();
  initCharacterController();

  const closeButtons = document.querySelectorAll('[data-close-roll]');
  closeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById('rollDialog');
      if (dialog && typeof dialog.close === 'function') dialog.close();
    });
  });
}

bootstrapApp();
