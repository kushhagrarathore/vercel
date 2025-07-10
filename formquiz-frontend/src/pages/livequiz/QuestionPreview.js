import React from 'react';

// Accepts: question (object), customizations (object)
export default function QuestionPreview({
  question = {},
  customizations = {},
}) {
  // Use question data or fallback
  const options = question.options || ['Option 1', 'Option 2'];
  const questionText = question.question_text || 'Sample question text goes here.';
  const correctIdx = question.correct_answer_index ?? 0;
  const c = {
    backgroundColor: customizations.backgroundColor || '#f8fafc',
    questionContainerBgColor: customizations.questionContainerBgColor || '#fff',
    textColor: customizations.textColor || '#222',
    fontSize: customizations.fontSize || 20,
    fontFamily: customizations.fontFamily || 'Inter, Arial, sans-serif',
    borderRadius: customizations.borderRadius || 20,
    shadow: customizations.shadow ?? true,
    bold: customizations.bold || false,
    italic: customizations.italic || false,
    alignment: customizations.alignment || 'center',
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center w-full bg-gray-50"
      style={{ background: c.backgroundColor }}
    >
      <div
        className="shadow-2xl max-w-2xl w-full mx-auto flex flex-col gap-10 justify-center items-center"
        style={{
          background: c.questionContainerBgColor,
          borderRadius: c.borderRadius * 0.7,
          color: c.textColor,
          fontFamily: c.fontFamily,
          fontSize: c.fontSize,
          fontWeight: c.bold ? 'bold' : 'normal',
          fontStyle: c.italic ? 'italic' : 'normal',
          boxShadow: c.shadow ? '0 4px 16px 0 rgba(0,0,0,0.08)' : 'none',
          padding: '2.5rem 2.5rem 3.5rem 2.5rem',
          margin: '2.5rem',
          textAlign: c.alignment,
          transition: 'all 0.3s',
          boxSizing: 'border-box',
          overflow: 'visible',
          minHeight: '520px',
          maxHeight: '700px',
        }}
      >
        <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center tracking-tight">Q1 Preview</h2>
        <div className="mb-6 w-full px-2">
          <label className="block mb-2 font-semibold text-gray-700">Question Text</label>
          <div
            className="w-full p-4 border border-gray-200 rounded-lg text-lg shadow-sm bg-white"
            style={{
              color: c.textColor,
              fontFamily: c.fontFamily,
              fontSize: c.fontSize,
              fontWeight: c.bold ? 'bold' : 'normal',
              fontStyle: c.italic ? 'italic' : 'normal',
              minHeight: '48px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {questionText}
          </div>
        </div>
        <div className="mb-6 w-full px-2">
          <label className="block mb-2 font-semibold text-gray-700">Options</label>
          <div className={`grid gap-6 w-full ${options.length === 2 ? 'grid-cols-2' : options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`} style={{paddingLeft:'0.5rem',paddingRight:'0.5rem'}}>
            {options.map((option, index) => (
              <div key={index} className={`relative flex items-center px-4 py-2 rounded-full border transition-all duration-200 ${correctIdx === index ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'} group`}
                style={{
                  color: c.textColor,
                  fontFamily: c.fontFamily,
                  fontSize: c.fontSize,
                  fontWeight: c.bold ? 'bold' : 'normal',
                  fontStyle: c.italic ? 'italic' : 'normal',
                  minHeight: '56px',
                  position: 'relative',
                  boxShadow: 'none',
                  marginBottom: '0.5rem',
                }}
              >
                <span className="flex-1 text-left px-2 font-semibold">{option}</span>
                <div className="flex items-center gap-2" style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
                  <span
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-150 ${correctIdx === index ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-gray-400 border-gray-200'}`}
                    title="Correct Answer"
                    style={{ position: 'relative' }}
                  >
                    {correctIdx === index ? '\u2713' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 