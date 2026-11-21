const copyPacket = (packet, ttl) => ({
  packetId: packet.packetId,
  ttl,
  createdAt: packet.createdAt,
  ciphertext: packet.ciphertext
});

export class MeshSimulator {
  constructor() {
    this.devices = new Map();
    this.reset();
  }

  reset() {
    this.devices = new Map([
      ['phone-alice', { deviceId: 'phone-alice', label: 'Alice', hasInternet: false, packets: new Map() }],
      ['phone-stranger1', { deviceId: 'phone-stranger1', label: 'Stranger 01', hasInternet: false, packets: new Map() }],
      ['phone-stranger2', { deviceId: 'phone-stranger2', label: 'Stranger 02', hasInternet: false, packets: new Map() }],
      ['phone-stranger3', { deviceId: 'phone-stranger3', label: 'Stranger 03', hasInternet: false, packets: new Map() }],
      ['phone-bridge', { deviceId: 'phone-bridge', label: 'Bridge phone', hasInternet: true, packets: new Map() }]
    ]);
  }

  deviceList() {
    return Array.from(this.devices.values());
  }

  inject(deviceId, packet) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error(`Unknown device: ${deviceId}`);
    device.packets.set(packet.packetId, packet);
    return packet;
  }

  state() {
    return this.deviceList().map((device) => ({
      deviceId: device.deviceId,
      label: device.label,
      hasInternet: device.hasInternet,
      packetCount: device.packets.size,
      packetIds: Array.from(device.packets.keys()).map((id) => id.slice(0, 8))
    }));
  }

  gossipOnce() {
    const devices = this.deviceList();
    const snapshot = new Map();
    for (const device of devices) {
      snapshot.set(device.deviceId, Array.from(device.packets.values()));
    }

    let transfers = 0;
    for (const source of devices) {
      for (const packet of snapshot.get(source.deviceId)) {
        if (packet.ttl <= 0) continue;
        for (const target of devices) {
          if (target.deviceId === source.deviceId) continue;
          if (target.packets.has(packet.packetId)) continue;
          target.packets.set(packet.packetId, copyPacket(packet, packet.ttl - 1));
          transfers += 1;
        }
      }
    }

    return {
      transfers,
      deviceCounts: Object.fromEntries(devices.map((device) => [device.deviceId, device.packets.size]))
    };
  }

  bridgeUploads() {
    const uploads = [];
    for (const device of this.devices.values()) {
      if (!device.hasInternet) continue;
      for (const packet of device.packets.values()) {
        uploads.push({ bridgeNodeId: device.deviceId, packet });
      }
    }
    return uploads;
  }
}

export const mesh = new MeshSimulator();
