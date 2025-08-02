import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRCodeTest() {
  const [customUrl, setCustomUrl] = useState('https://example.com/test');
  const [sessionCode, setSessionCode] = useState('ABC123');
  const [qrSize, setQrSize] = useState(320);
  const [qrLevel, setQrLevel] = useState('M');

  const quizUrl = `${window.location.origin}/quiz/user?code=${sessionCode}`;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">QR Code Test Page</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Custom URL QR Code */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Custom URL QR Code</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL:
              </label>
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Enter URL to encode"
              />
            </div>
            <div className="text-center">
              <QRCodeSVG
                value={customUrl}
                size={qrSize}
                level={qrLevel}
                includeMargin={true}
                className="bg-white p-4 rounded-lg mx-auto"
              />
            </div>
          </div>

          {/* Quiz URL QR Code */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Quiz URL QR Code</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Code:
              </label>
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Enter session code"
              />
            </div>
            <div className="text-center">
              <QRCodeSVG
                value={quizUrl}
                size={qrSize}
                level={qrLevel}
                includeMargin={true}
                className="bg-white p-4 rounded-lg mx-auto"
              />
            </div>
          </div>
        </div>

        {/* QR Code Settings */}
        <div className="bg-white p-6 rounded-lg shadow-lg mt-8">
          <h2 className="text-xl font-semibold mb-4">QR Code Settings</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Size: {qrSize}px
              </label>
              <input
                type="range"
                min="200"
                max="600"
                step="20"
                value={qrSize}
                onChange={(e) => setQrSize(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Error Correction Level:
              </label>
              <select
                value={qrLevel}
                onChange={(e) => setQrLevel(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="L">L - Low (7%)</option>
                <option value="M">M - Medium (15%)</option>
                <option value="Q">Q - Quartile (25%)</option>
                <option value="H">H - High (30%)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        <div className="bg-white p-6 rounded-lg shadow-lg mt-8">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Origin:</strong> {window.location.origin}</p>
            <p><strong>Quiz URL:</strong> {quizUrl}</p>
            <p><strong>URL Length:</strong> {quizUrl.length} characters</p>
            <p><strong>QR Size:</strong> {qrSize}px</p>
            <p><strong>Error Level:</strong> {qrLevel}</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-6 rounded-lg mt-8">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Use your phone's camera app to scan the QR codes</li>
            <li>Test both the custom URL and quiz URL QR codes</li>
            <li>Try different sizes and error correction levels</li>
            <li>Check if the scanned URL opens correctly</li>
            <li>If scanning fails, try increasing the size or error level</li>
          </ul>
        </div>

        {/* Common Issues */}
        <div className="bg-yellow-50 p-6 rounded-lg mt-8">
          <h2 className="text-xl font-semibold mb-4">Common Issues & Solutions</h2>
          <div className="space-y-3 text-sm">
            <div>
              <strong>QR Code too small:</strong> Increase the size to 400px or larger
            </div>
            <div>
              <strong>Poor contrast:</strong> Ensure white background and black QR code
            </div>
              <strong>URL too long:</strong> Use shorter session codes or increase error correction
            </div>
            <div>
              <strong>Camera can't focus:</strong> Ensure good lighting and hold phone steady
            </div>
            <div>
              <strong>Wrong URL format:</strong> Check that the origin and session code are correct
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 