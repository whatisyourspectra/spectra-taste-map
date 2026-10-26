import { validLighting } from '../moodEngine.js';

// In-process simulation only. No Pleos SDK calls or device location access.
export function createSimulator() {
  let snapshot = {
    mode: 'simulation', lightingAccess: 'read_write', locationSupported: false,
    driving: false, destination: null, navigationRevision: 0, locationEvent: null,
    appliedLighting: { color: '#d7e2f2', brightness: 0.35 }, lightingWrites: 0,
  };
  return {
    getSnapshot: () => structuredClone(snapshot),
    configure(options) {
      if (Object.hasOwn(options, 'lightingAccess') && ['read_write', 'write', 'read', 'none', 'error'].includes(options.lightingAccess)) snapshot.lightingAccess = options.lightingAccess;
      if (typeof options.locationSupported === 'boolean') {
        snapshot.locationSupported = options.locationSupported;
        if (!options.locationSupported) snapshot.locationEvent = null;
      }
      if (typeof options.driving === 'boolean') snapshot.driving = options.driving;
      return this.getSnapshot();
    },
    setDestination(destination) {
      snapshot.destination = destination ? { ...destination } : null;
      snapshot.navigationRevision += 1;
      snapshot.locationEvent = null;
      return this.getSnapshot();
    },
    emitWorkExit() {
      if (!snapshot.locationSupported) return { ok: false, snapshot: this.getSnapshot() };
      snapshot.locationEvent = { id: `exit-${snapshot.navigationRevision + 1}`, placeId: 'work', transition: 'exit' };
      snapshot.navigationRevision += 1;
      return { ok: true, snapshot: this.getSnapshot() };
    },
    async checkLightingCapability() {
      return { access: snapshot.lightingAccess, simulation: true };
    },
    async applyLighting(lighting) {
      if (!validLighting(lighting)) return { status: 'invalid', simulation: true };
      // Recheck on write: permission may have changed since capability discovery.
      if (!['read_write', 'write'].includes(snapshot.lightingAccess)) return { status: snapshot.lightingAccess === 'read' ? 'read_only' : snapshot.lightingAccess === 'error' ? 'error' : 'unsupported', simulation: true };
      snapshot.appliedLighting = { ...lighting };
      snapshot.lightingWrites += 1;
      return { status: 'simulated', simulation: true, lighting: { ...lighting } };
    },
  };
}
