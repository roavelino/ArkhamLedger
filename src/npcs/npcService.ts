export function createNpcService() {
  const npcs = [];

  return {
    list() {
      return [...npcs];
    },
    upsert(npc) {
      const idx = npcs.findIndex((item) => item.id === npc.id);
      if (idx >= 0) npcs[idx] = npc;
      else npcs.push(npc);
      return npc;
    },
    remove(id) {
      const idx = npcs.findIndex((item) => item.id === id);
      if (idx >= 0) npcs.splice(idx, 1);
    }
  };
}
