import React from 'react';

// Accepts: question (object), showCorrect (bool), selectedAnswer (number|null), onSelect (function|null), quizPhase (string|null), timeLeft (number|null)
export default function QuestionPreview({
  question = {},
  showCorrect = false,
  selectedAnswer = null,
  onSelect = null,
  quizPhase = null,
  timeLeft = null,
  previewMode = true, // If true, show as preview (no interactivity)
  customizations = {},
}) {
  // Dummy values for preview
  const quizCode = 'XXXXXX';
  const questionNumber = 1;
  const totalQuestions = 10;
  const options = question.options || ['Option 1', 'Option 2'];
  const questionText = question.question_text || 'Sample question text goes here.';
  const showResults = false; // Set to true to preview results screen
  const pollResults = [3, 7, 2, 1].slice(0, options.length); // Dummy poll data
  const correctIdx = question.correct_answer_index ?? 0;

  // Merge customizations
  const customizationDefaults = {
    backgroundColor: '#ffffff',
    textColor: '#222222',
    buttonColor: '#2563eb',
    fontSize: 20,
    fontFamily: 'inherit',
    borderRadius: 16,
    padding: 24,
    margin: 16,
    alignment: 'center',
    optionLayout: 'vertical',
    imageUrl: '',
    shadow: true,
    bold: false,
    italic: false,
  };
  const c = { ...customizationDefaults, ...(customizations || {}) };

  // Determine page background style
  let pageBg = c.backgroundColor || '#f8fafc';
  if (c.imageUrl) {
    pageBg = `url(${c.imageUrl}) center/cover no-repeat, ${c.backgroundColor || '#f8fafc'}`;
  } else if (c.backgroundGradient) {
    pageBg = c.backgroundGradient;
  }

  return (
    <div
      className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center overflow-hidden z-40"
      style={{
        background: pageBg,
        backgroundSize: c.imageUrl ? 'cover' : undefined,
        backgroundPosition: c.imageUrl ? 'center' : undefined,
      }}
    >
      {/* Top bar */}
      <div className="fixed top-0 left-0 w-full z-50 bg-white/90 shadow-md flex items-center justify-between px-8 py-3 gap-4"
        style={{ minHeight: '4.5rem', backdropFilter: 'blur(8px)' }}
      >
        <span className="text-lg md:text-2xl font-bold text-blue-700 tracking-wider">Quiz Code: <span className="text-gray-800">{quizCode}</span></span>
        <span className="text-base md:text-xl font-semibold text-gray-700">Q{questionNumber} of {totalQuestions}</span>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-purple-700 font-bold text-xl bg-white/80 px-4 py-1 rounded-full shadow">
            <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {timeLeft}s
          </div>
          <button
            className="px-5 py-2 bg-gray-400 text-white rounded-lg font-semibold shadow text-base border border-gray-400 opacity-60 cursor-not-allowed"
            disabled
          >
            Exit Presentation Mode
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[1600px] mx-auto px-0 pt-[5.5rem] pb-0 box-border relative">
        {/* Question or Results */}
        {!showResults ? (
          <>
            {/* Question text */}
            <div
              className="w-full bg-white/90 rounded-t-3xl shadow-2xl p-10 flex flex-col items-center justify-center"
              style={{
                minHeight: '120px',
                background: c.questionContainerBgColor || '#ffffff',
                color: c.textColor,
                borderRadius: c.borderRadius,
                boxShadow: c.shadow ? '0 4px 24px 0 rgba(0,0,0,0.10)' : 'none',
                fontSize: c.fontSize,
                fontFamily: c.fontFamily,
                textAlign: c.alignment,
              }}
            >
              <h3
                className="font-bold text-4xl md:text-5xl text-gray-900 text-center break-words w-full max-w-5xl"
                style={{
                  fontWeight: c.bold ? 'bold' : 'normal',
                  fontStyle: c.italic ? 'italic' : 'normal',
                  color: c.textColor,
                  fontFamily: c.fontFamily,
                  fontSize: c.fontSize,
                  lineHeight: '1.2',
                }}
              >
                {questionText}
              </h3>
            </div>
            {/* Options */}
            <div className="w-full flex-1 flex flex-col items-center justify-center">
              <div className="w-full flex flex-col items-center justify-center gap-14 mt-14 px-16">
                {/* 2 options: side by side */}
                {options.length === 2 && (
                  <div className="flex flex-row w-full gap-14">
                    {options.map((option, idx) => (
                      <button
                        key={idx}
                        className="flex-1 py-14 text-3xl md:text-4xl font-semibold rounded-2xl shadow-lg text-white text-center"
                        style={{
                          background: c.buttonColor,
                          borderRadius: c.borderRadius,
                          fontSize: c.fontSize,
                          fontFamily: c.fontFamily,
                          fontWeight: c.bold ? 'bold' : 'normal',
                          fontStyle: c.italic ? 'italic' : 'normal',
                          boxShadow: c.shadow ? '0 2px 8px 0 rgba(0,0,0,0.10)' : 'none',
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
                {/* 3 options: 2 top, 1 bottom */}
                {options.length === 3 && (
                  <div className="flex flex-col w-full gap-10">
                    <div className="flex flex-row w-full gap-14">
                      {options.slice(0,2).map((option, idx) => (
                        <button
                          key={idx}
                          className="flex-1 py-14 text-3xl md:text-4xl font-semibold rounded-2xl shadow-lg text-white text-center"
                          style={{
                            background: c.buttonColor,
                            borderRadius: c.borderRadius,
                            fontSize: c.fontSize,
                            fontFamily: c.fontFamily,
                            fontWeight: c.bold ? 'bold' : 'normal',
                            fontStyle: c.italic ? 'italic' : 'normal',
                            boxShadow: c.shadow ? '0 2px 8px 0 rgba(0,0,0,0.10)' : 'none',
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-row w-full justify-center">
                      <button
                        className="w-1/2 py-14 text-3xl md:text-4xl font-semibold rounded-2xl shadow-lg text-white text-center"
                        style={{
                          background: c.buttonColor,
                          borderRadius: c.borderRadius,
                          fontSize: c.fontSize,
                          fontFamily: c.fontFamily,
                          fontWeight: c.bold ? 'bold' : 'normal',
                          fontStyle: c.italic ? 'italic' : 'normal',
                          boxShadow: c.shadow ? '0 2px 8px 0 rgba(0,0,0,0.10)' : 'none',
                        }}
                      >
                        {options[2]}
                      </button>
                    </div>
                  </div>
                )}
                {/* 4 options: 2x2 grid */}
                {options.length === 4 && (
                  <div className="grid grid-cols-2 gap-14 w-full">
                    {options.map((option, idx) => (
                      <button
                        key={idx}
                        className="py-14 text-3xl md:text-4xl font-semibold rounded-2xl shadow-lg text-white text-center"
                        style={{
                          background: c.buttonColor,
                          borderRadius: c.borderRadius,
                          fontSize: c.fontSize,
                          fontFamily: c.fontFamily,
                          fontWeight: c.bold ? 'bold' : 'normal',
                          fontStyle: c.italic ? 'italic' : 'normal',
                          boxShadow: c.shadow ? '0 2px 8px 0 rgba(0,0,0,0.10)' : 'none',
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Next Button - bottom right, floating */}
            <div className="fixed bottom-10 right-16 z-50">
              <button
                className="flex items-center gap-2 px-10 py-5 bg-green-600 text-white rounded-2xl font-bold text-2xl shadow-xl hover:bg-green-700 transition-all border-2 border-green-700 opacity-60 cursor-not-allowed"
                style={{ minWidth: '200px', fontWeight: 700 }}
                disabled
              >
                Next <span className="ml-2 text-3xl">➡</span>
              </button>
            </div>
          </>
        ) : (
          /* Results Screen */
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="w-full bg-white/90 rounded-t-3xl shadow-2xl p-10 flex flex-col items-center justify-center" style={{minHeight:'120px', background: c.questionContainerBgColor || '#ffffff'}}>
              <h3 className="font-bold text-4xl md:text-5xl text-gray-900 text-center break-words w-full max-w-5xl mb-8">Results</h3>
              <div className="w-full flex flex-col items-center justify-center gap-10 mt-6 px-16">
                {options.map((option, idx) => {
                  const count = pollResults[idx] || 0;
                  const total = pollResults.reduce((a, b) => a + b, 0) || 1;
                  const percent = Math.round((count / total) * 100);
                  const isCorrect = idx === correctIdx;
                  return (
                    <div key={idx} className={`flex items-center w-full p-6 rounded-2xl shadow-lg ${isCorrect ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100 border-2 border-gray-300'}`}>
                      <span className={`flex-1 text-2xl md:text-3xl font-semibold ${isCorrect ? 'text-green-700' : 'text-gray-800'}`}>{option}</span>
                      <div className="w-1/2 mx-4 bg-gray-200 rounded h-8 relative overflow-hidden">
                        <div
                          className={`h-8 rounded ${isCorrect ? 'bg-green-400' : 'bg-blue-400'}`}
                          style={{ width: `${percent}%` }}
                        ></div>
                        <span className="absolute left-4 top-1 text-lg text-black font-bold">{count} ({percent}%)</span>
                      </div>
                      {isCorrect && <span className="ml-6 text-green-700 font-bold text-3xl">✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Next Button - bottom right, floating */}
            <div className="fixed bottom-10 right-16 z-50">
              <button
                className="flex items-center gap-2 px-10 py-5 bg-green-600 text-white rounded-2xl font-bold text-2xl shadow-xl hover:bg-green-700 transition-all border-2 border-green-700 opacity-60 cursor-not-allowed"
                style={{ minWidth: '200px', fontWeight: 700 }}
                disabled
              >
                Next <span className="ml-2 text-3xl">➡</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 