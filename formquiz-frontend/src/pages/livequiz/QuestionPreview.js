import React from 'react';

export default function QuestionPreview({
  question = {},
  customizations = {},
  showResults = false,
  pollResults = [],
  timeLeft = null,
  onOptionClick = null,
  selectedOption = null,
  editable = false,
  showTimer = false,
  showCorrect = false,
  showTopBar = false,
  quizCode = '',
  questionNumber = 1,
  totalQuestions = 1,
  onExit = null,
  leaderboard = null,
  podium = null,
  showLeaderboard = false,
  showPodium = false,
}) {
  // Theme
  const c = {
    backgroundColor: customizations.backgroundColor || '#f8fafc',
    questionContainerBgColor: customizations.questionContainerBgColor || '#fff',
    textColor: customizations.textColor || '#222',
    fontSize: customizations.fontSize || 32,
    fontFamily: customizations.fontFamily || 'Inter, Arial, sans-serif',
    borderRadius: customizations.borderRadius || 32,
    shadow: customizations.shadow ?? true,
    bold: customizations.bold || false,
    italic: customizations.italic || false,
    alignment: customizations.alignment || 'center',
    optionLayout: customizations.optionLayout || 'vertical',
    buttonColor: customizations.buttonColor || '#2563eb',
    padding: customizations.padding || 48,
    margin: customizations.margin || 32,
  };

  // Option layout logic
  const options = question.options || [];
  const questionText = question.question_text || '';
  const correctIdx = question.correct_answer_index ?? null;

  // Always use a 2x2 grid for options
  const optionGrid = [0, 1, 2, 3].map(idx => options[idx] || '');

  function renderOption(option, index) {
    const isCorrect = correctIdx === index;
    const isSelected = selectedOption === index;
    return (
      <div
        key={index}
        className={`relative flex items-center bg-white rounded-2xl border-2 transition-all duration-200 px-8 py-10 min-h-[120px] ${option ? 'border-gray-300' : 'border-dashed border-gray-200 opacity-60'} justify-center`}
        style={{
          boxShadow: option ? '0 4px 16px rgba(44,62,80,0.10)' : 'none',
          fontSize: 28,
          fontWeight: 600,
          color: c.textColor,
          fontFamily: c.fontFamily,
          position: 'relative',
          minWidth: 0,
        }}
      >
        <span className="flex-1 text-2xl text-center font-semibold break-words" style={{fontSize: 28}}>{option || <span className="text-gray-400">Option {index + 1}</span>}</span>
        {showCorrect && isCorrect && (
          <span className="ml-4 text-green-600 font-bold text-4xl">✓</span>
        )}
        {isSelected && !showCorrect && (
          <span className="ml-4 text-blue-600 font-bold text-4xl">●</span>
        )}
        {showResults && pollResults && pollResults.length > 0 && (
          <span className="ml-4 text-black font-bold text-2xl">{pollResults[index] || 0}</span>
        )}
      </div>
    );
  }

  // Leaderboard and Podium (edge-to-edge, fullscreen, below menu bar)
  function renderLeaderboard() {
    if (!leaderboard) return null;
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white/90 px-0 py-0" style={{marginTop: '4.5rem'}}>
        <h3 className="font-bold text-5xl text-gray-900 text-center mb-12 mt-8 tracking-wide">Leaderboard</h3>
        <ol className="w-full max-w-4xl mx-auto space-y-6 mb-8">
          {leaderboard.map((p, i) => (
            <li key={p.id || i} className={`flex items-center justify-between px-16 py-8 rounded-2xl border-4 text-3xl font-bold transition-all ${i === 0 ? 'bg-yellow-100 border-yellow-400' : i === 1 ? 'bg-gray-100 border-gray-400' : i === 2 ? 'bg-orange-100 border-orange-400' : 'bg-gray-50 border-gray-200'}`} style={{ minHeight: 96 }}>
              <span className="w-12 text-center text-4xl text-gray-500">{i + 1}</span>
              <span className="flex-1 text-3xl font-semibold ml-8 text-gray-800 truncate">{p.username || '—'}</span>
              <span className="w-32 text-right text-3xl font-bold text-blue-700">{p.score}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  function renderPodium() {
    if (!podium) return null;
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white/90 px-0 py-0" style={{marginTop: '4.5rem'}}>
        <h3 className="font-bold text-5xl text-gray-900 text-center mb-12 mt-8 tracking-wide">🏆 Podium</h3>
        <div className="flex flex-row items-end justify-center gap-16 w-full max-w-4xl mx-auto mb-12">
          {podium.map((p, i) => (
            <div key={p.id || i} className={`flex flex-col items-center justify-end rounded-2xl border-4 px-10 py-8 ${i === 0 ? 'bg-yellow-100 border-yellow-400' : i === 1 ? 'bg-gray-100 border-gray-400' : i === 2 ? 'bg-orange-100 border-orange-400' : 'bg-gray-50 border-gray-200'}`} style={{ minHeight: 180 }}>
              <span className="text-6xl font-bold mb-4">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}</span>
              <span className="text-3xl font-semibold text-gray-800 mb-2">{p.username || '—'}</span>
              <span className="text-2xl font-bold text-blue-700">{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderPollResults() {
    if (!showResults || !pollResults || !options.length) return null;
    const total = pollResults.reduce((a, b) => a + b, 0) || 1;
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white/90 px-0 py-0" style={{marginTop: '4.5rem'}}>
        <h3 className="font-bold text-5xl text-gray-900 text-center mb-12 mt-8 tracking-wide">Results</h3>
        <div className="w-full flex flex-col items-center justify-center gap-10 mt-6 px-16">
          {options.map((option, idx) => {
            const count = pollResults[idx] || 0;
            const percent = Math.round((count / total) * 100);
            const isCorrect = idx === correctIdx;
            return (
              <div key={idx} className={`flex items-center w-full p-8 rounded-2xl shadow-lg text-3xl font-semibold ${isCorrect ? 'bg-green-100 border-4 border-green-500' : 'bg-gray-100 border-4 border-gray-300'}`}>
                <span className={`flex-1 text-3xl font-semibold ${isCorrect ? 'text-green-700' : 'text-gray-800'}`}>{option}</span>
                <div className="w-1/2 mx-8 bg-gray-200 rounded h-12 relative overflow-hidden">
                  <div className={`h-12 rounded ${isCorrect ? 'bg-green-400' : 'bg-blue-400'}`} style={{ width: `${percent}%` }}></div>
                  <span className="absolute left-6 top-2 text-2xl text-black font-bold">{count} ({percent}%)</span>
                </div>
                {isCorrect && <span className="ml-8 text-green-700 font-bold text-4xl">✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div
      className="w-full h-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100"
      style={{ background: c.backgroundColor, fontFamily: c.fontFamily }}
    >
      {/* Top Bar (if needed) */}
      {showTopBar && (
        <div className="fixed top-0 left-0 w-full z-50 bg-white/90 shadow-md flex items-center justify-between px-8 py-3 gap-4"
          style={{ minHeight: '4.5rem', backdropFilter: 'blur(8px)' }}
        >
          <span className="text-lg md:text-2xl font-bold text-blue-700 tracking-wider">Quiz Code: <span className="text-gray-800">{quizCode}</span></span>
          <span className="text-base md:text-xl font-semibold text-gray-700">Q{questionNumber} of {totalQuestions}</span>
          <div className="flex items-center gap-6">
            {showTimer && timeLeft !== null && (
              <div className="flex items-center gap-2 text-purple-700 font-bold text-xl bg-white/80 px-4 py-1 rounded-full shadow">
                <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {timeLeft}s
              </div>
            )}
            {onExit && (
              <button
                onClick={onExit}
                className="px-5 py-2 bg-gray-700 text-white rounded-lg font-semibold shadow hover:bg-gray-900 transition-all text-base border border-gray-900"
                title="Exit Preview"
              >
                Exit Preview
              </button>
            )}
          </div>
        </div>
      )}
      {/* Spacer for menu bar */}
      <div style={{minHeight: '4.5rem'}} />
      {/* Fixed question bar in main content area */}
      <div className="fixed left-0 w-full z-30 flex items-center justify-center px-8" style={{top: '4.5rem', minHeight: '6.5rem'}}>
        <div className="w-full max-w-4xl text-5xl md:text-6xl font-bold text-blue-700 text-center tracking-tight bg-white bg-opacity-95 outline-none border-b-2 border-blue-200 focus:border-blue-500 transition shadow-xl rounded-2xl py-6" style={{fontSize: 48, padding: '1.5rem 2rem'}}>
          {questionText || <span className="text-gray-400">Enter your question...</span>}
        </div>
      </div>
      {/* Spacer for fixed question bar */}
      <div style={{minHeight: '11rem'}} />
      {/* Main content: options or state views */}
      <div className="w-full flex-1 flex flex-col items-center justify-start px-2 md:px-8" style={{minHeight: 'calc(100vh - 15.5rem)'}}>
        {showLeaderboard && leaderboard ? renderLeaderboard() :
         showPodium && podium ? renderPodium() :
         showResults && pollResults && pollResults.length ? renderPollResults() : (
          <div className="w-full max-w-5xl grid grid-cols-2 gap-12 mt-4 mb-12">
            {optionGrid.map((option, idx) => renderOption(option, idx))}
          </div>
        )}
      </div>
    </div>
  );
} 