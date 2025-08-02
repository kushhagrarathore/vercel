import React, { useState } from 'react';

const APITest = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const data = await response.json();
      setTestResult({
        status: response.status,
        statusText: response.statusText,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      });
    } catch (error) {
      setTestResult({
        error: error.message,
        status: 'ERROR',
      });
    } finally {
      setLoading(false);
    }
  };

  const testGenerateAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          topic: 'Test Topic',
          session_code: 'test_' + Date.now(),
        }),
      });
      
      const data = await response.json();
      setTestResult({
        status: response.status,
        statusText: response.statusText,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      });
    } catch (error) {
      setTestResult({
        error: error.message,
        status: 'ERROR',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">API Test Component</h2>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={testAPI}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test /api/test'}
        </button>
        
        <button
          onClick={testGenerateAPI}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 ml-2"
        >
          {loading ? 'Testing...' : 'Test /api/generate'}
        </button>
      </div>

      {testResult && (
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-2">Test Result:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default APITest; 