import { Wifi, WifiOff } from 'lucide-react';

const positions = [
  { top: '16%', left: '13%' },
  { top: '66%', left: '7%' },
  { top: '76%', left: '38%' },
  { top: '13%', left: '63%' },
  { top: '64%', left: '83%' }
];

export function MeshMap({ devices = [] }) {
  const byId = Object.fromEntries(devices.map((device) => [device.deviceId, device]));
  const ordered = [
    byId['phone-alice'],
    byId['phone-stranger1'],
    byId['phone-stranger2'],
    byId['phone-stranger3'],
    byId['phone-bridge']
  ].filter(Boolean);

  return (
    <div className="mesh-board">
      <svg className="mesh-lines" viewBox="0 0 600 260" preserveAspectRatio="none" aria-hidden="true">
        <path d="M90 58 C150 70 180 100 240 130 S 330 190 420 170 520 150 540 100" />
        <path d="M90 58 C130 120 190 170 240 130 S 360 60 420 70 500 100 540 100" />
        <path d="M70 180 C130 190 180 180 240 130 S 310 190 420 170 500 130 540 100" />
        <path d="M240 130 C300 150 360 120 420 70 S 490 50 540 100" />
      </svg>
      {ordered.map((device, index) => (
        <div
          key={device.deviceId}
          className={`mesh-node ${device.hasInternet ? 'is-bridge' : ''}`}
          style={positions[index]}
        >
          <div className="mesh-node-head">
            <span className={`node-signal ${device.hasInternet ? 'online' : ''}`}>
              {device.hasInternet ? <Wifi size={12} /> : <WifiOff size={12} />}
            </span>
            <span className="mono tiny">{device.hasInternet ? '4G' : 'offline'}</span>
          </div>
          <p className="mesh-node-name">{device.label}</p>
          <p className="mesh-node-count">
            {device.packetCount} <span>{device.packetCount === 1 ? 'packet' : 'packets'}</span>
          </p>
          <div className="packet-dots" aria-hidden="true">
            {Array.from({ length: Math.min(device.packetCount, 5) }).map((_, dot) => (
              <span key={dot} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
