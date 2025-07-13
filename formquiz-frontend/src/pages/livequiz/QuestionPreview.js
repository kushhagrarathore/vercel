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

  // Option layout: 2 = row, 3 = 2 top/1 bottom, 4 = 2x2 grid
  let optionLayout = null;
  if (options.length === 2) {
    optionLayout = (
      <div className="flex flex-row gap-12 w-full justify-center items-center mt-8">
        {options.map((option, index) => renderOption(option, index))}
      </div>
    );
  } else if (options.length === 3) {
    optionLayout = (
      <div className="flex flex-col gap-8 w-full items-center mt-8">
        <div className="flex flex-row gap-12 w-full justify-center">
          {renderOption(options[0], 0)}
          {renderOption(options[1], 1)}
        </div>
        <div className="flex flex-row gap-12 w-full justify-center">
          {renderOption(options[2], 2)}
        </div>
      </div>
    );
  } else if (options.length === 4) {
    optionLayout = (
      <div className="grid grid-cols-2 gap-12 w-full mt-8">
        {options.map((option, index) => renderOption(option, index))}
      </div>
    );
  } else {
    optionLayout = (
      <div className="flex flex-col gap-8 w-full items-center mt-8">
        {options.map((option, index) => renderOption(option, index))}
      </div>
    );
  }

  function renderOption(option, index) {
    const isCorrect = correctIdx === index;
    const isSelected = selectedOption === index;
    return (
      <div
        key={index}
        className={`flex-1 flex items-center justify-center px-10 py-8 rounded-2xl border-2 transition-all duration-200 cursor-pointer group text-2xl md:text-3xl lg:text-4xl ${
          isCorrect && showCorrect ? 'border-green-500 bg-green-50' : isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
        }`}
        style={{
          color: c.textColor,
          fontFamily: c.fontFamily,
          fontSize: Math.max(28, c.fontSize),
          fontWeight: c.bold ? 'bold' : 'normal',
          fontStyle: c.italic ? 'italic' : 'normal',
          minHeight: '96px',
          boxShadow: 'none',
          borderRadius: c.borderRadius * 0.7,
          borderWidth: 2,
          borderColor: isCorrect && showCorrect ? '#22c55e' : isSelected ? c.buttonColor : '#e5e7eb',
          background: isCorrect && showCorrect ? '#dcfce7' : isSelected ? '#eff6ff' : '#fff',
          transition: 'all 0.2s',
          pointerEvents: editable ? 'auto' : 'none',
          justifyContent: 'center',
        }}
        onClick={editable && onOptionClick ? () => onOptionClick(index) : undefined}
      >
        <span className="flex-1 text-center font-semibold break-words">{option || <span className="text-gray-400">Option {index + 1}</span>}</span>
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

  // Leaderboard and Podium (edge-to-edge, fullscreen)
  function renderLeaderboard() {
    if (!leaderboard) return null;
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white/90 px-0 py-0">
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
      <div className="w-full h-full flex flex-col items-center justify-center bg-white/90 px-0 py-0">
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
      <div className="w-full h-full flex flex-col items-center justify-center bg-white/90 px-0 py-0">
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
      {/* Top Bar */}
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
      {/* Spacer for top bar */}
      {showTopBar && <div style={{ minHeight: '4.5rem', width: '100%' }} />}
      {/* Main content: question, leaderboard, podium, poll results */}
      <div className="w-full flex-1 flex flex-col items-center justify-center px-0 md:px-0" style={{ minHeight: 'calc(100vh - 4.5rem)' }}>
        {showLeaderboard && leaderboard ? renderLeaderboard() :
         showPodium && podium ? renderPodium() :
         showResults && pollResults && pollResults.length ? renderPollResults() : (
          <div
            className="w-full flex flex-col items-center justify-start"
            style={{
              background: c.questionContainerBgColor,
              borderRadius: c.borderRadius,
              color: c.textColor,
              fontFamily: c.fontFamily,
              fontSize: c.fontSize,
              fontWeight: c.bold ? 'bold' : 'normal',
              fontStyle: c.italic ? 'italic' : 'normal',
              boxShadow: c.shadow ? '0 8px 32px 0 rgba(44,62,80,0.13)' : 'none',
              padding: c.padding,
              margin: c.margin,
              textAlign: c.alignment,
              transition: 'all 0.3s',
              minHeight: '420px',
              maxWidth: '100vw',
            }}
          >
            <h2 className="text-5xl font-bold text-blue-700 mb-8 text-center tracking-tight w-full break-words" style={{fontSize: Math.max(36, c.fontSize + 12)}}>
              {questionText || <span className="text-gray-400">Enter your question...</span>}
            </h2>
            {optionLayout}
            {showTimer && timeLeft !== null && !showTopBar && (
              <div className="mt-8 text-3xl font-bold text-purple-700 flex items-center gap-2 bg-white/80 px-8 py-3 rounded-full shadow w-fit mx-auto">
                <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {timeLeft}s
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 