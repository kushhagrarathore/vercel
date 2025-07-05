import { QRCodeSVG } from 'qrcode.react';

export function generateLiveLink(quizId) {
  return `${window.location.origin}/join/${quizId}`;
}

export function LiveLinkQRCode({ quizId, size = 180 }) {
  const url = generateLiveLink(quizId);
  return <QRCodeSVG value={url} size={size} />;
}
