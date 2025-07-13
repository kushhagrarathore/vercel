import React from 'react';

// Shared, presentation-optimized question view
export default function QuestionPreview({
  question = {},
  customizations = {},
  showResults = false,
  pollResults = [],
  timeLeft = null,
  onOptionClick = null,
  selectedOption = null,
  editable = false,
  onEdit = null,
  showTimer = false,
  showCorrect = false,
}) {
  // Use question data or fallback
  const options = question.options || [];
  const questionText = question.question_text || '';
  const correctIdx = question.correct_answer_index ?? null;
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

  // Responsive grid for options
  let optionGrid = 'grid-cols-1';
  if (options.length === 2) optionGrid = 'grid-cols-2';
  if (options.length === 3) optionGrid = 'grid-cols-3';
  if (options.length >= 4) optionGrid = 'grid-cols-2 md:grid-cols-4';

  return (
    <div
      className="w-full h-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100"
      style={{ background: c.backgroundColor, fontFamily: c.fontFamily }}
    >
      <div
        className="w-full max-w-5xl mx-auto flex flex-col gap-10 justify-center items-center px-2 md:px-8"
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
        <h2 className="text-4xl md:text-5xl font-bold text-blue-700 mb-8 text-center tracking-tight w-full break-words" style={{fontSize: Math.max(32, c.fontSize + 8)}}>
          {questionText || <span className="text-gray-400">Enter your question...</span>}
        </h2>
        <div className={`w-full grid gap-8 ${optionGrid} mb-4`}>
          {options.map((option, index) => {
            const isCorrect = correctIdx === index;
            const isSelected = selectedOption === index;
            return (
              <div
                key={index}
                className={`relative flex items-center px-8 py-6 rounded-2xl border-2 transition-all duration-200 cursor-pointer group ${
                  isCorrect && showCorrect ? 'border-green-500 bg-green-50' : isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
                style={{
                  color: c.textColor,
                  fontFamily: c.fontFamily,
                  fontSize: Math.max(22, c.fontSize),
                  fontWeight: c.bold ? 'bold' : 'normal',
                  fontStyle: c.italic ? 'italic' : 'normal',
                  minHeight: '72px',
                  boxShadow: 'none',
                  marginBottom: '0.5rem',
                  borderRadius: c.borderRadius * 0.7,
                  borderWidth: 2,
                  borderColor: isCorrect && showCorrect ? '#22c55e' : isSelected ? c.buttonColor : '#e5e7eb',
                  background: isCorrect && showCorrect ? '#dcfce7' : isSelected ? '#eff6ff' : '#fff',
                  transition: 'all 0.2s',
                  pointerEvents: editable ? 'auto' : 'none',
                }}
                onClick={editable && onOptionClick ? () => onOptionClick(index) : undefined}
              >
                <span className="flex-1 text-left px-2 font-semibold break-words">{option || <span className="text-gray-400">Option {index + 1}</span>}</span>
                {showCorrect && isCorrect && (
                  <span className="ml-4 text-green-600 font-bold text-3xl">✓</span>
                )}
                {isSelected && !showCorrect && (
                  <span className="ml-4 text-blue-600 font-bold text-3xl">●</span>
                )}
                {showResults && pollResults && pollResults.length > 0 && (
                  <span className="ml-4 text-black font-bold text-xl">{pollResults[index] || 0}</span>
                )}
              </div>
            );
          })}
        </div>
        {showTimer && timeLeft !== null && (
          <div className="mt-4 text-2xl font-bold text-purple-700 flex items-center gap-2 bg-white/80 px-6 py-2 rounded-full shadow w-fit mx-auto">
            <svg className="w-7 h-7 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {timeLeft}s
          </div>
        )}
      </div>
    </div>
  );
} 