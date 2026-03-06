const permissions = {
  viewer: ['read:characters', 'read:npcs'],
  editor: ['read:characters', 'write:characters', 'read:npcs', 'write:npcs'],
  admin: ['*']
};

export function can(role, action) {
  const allowed = permissions[role] || [];
  return allowed.includes('*') || allowed.includes(action);
}
