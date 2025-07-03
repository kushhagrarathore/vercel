import { QRCodeSVG } from 'qrcode.react';

export function generateLiveLink(roomCode) {
  return `${window.location.origin}/join/${roomCode}`;
}

export function LiveLinkQRCode({ roomCode, size = 180 }) {
  const url = generateLiveLink(roomCode);
  return <QRCodeSVG value={url} size={size} />;
}
