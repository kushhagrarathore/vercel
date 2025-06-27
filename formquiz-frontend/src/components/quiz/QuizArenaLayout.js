import React from 'react';

const LETTERS = ['A', 'B', 'C', 'D'];

const QuizArenaLayout = ({
  quizTitle,
  questionNumber,
  questionText,
  options = [],
  selected,
  onSelect,
  showNextButton = true,
  onNext,
  onPrev,
  nextButtonLabel = 'Next',
  prevButtonLabel = 'Previous',
  showPrevButton = false,
  sectionGrid = [],
  customization = {},
  disabled = false,
  showHeader = true,
  showSectionGrid = true,
  showTimer = false,
  topRightButton = null,
}) => {
  // Customization defaults
  const {
    quizTitleColor = customization.quizTitleColor || '#2563eb',
    optionBorderColor = customization.optionBorderColor || '#e0e0e0',
    optionSelectedColor = customization.optionSelectedColor || '#2563eb',
    optionLetterBg = customization.optionLetterBg || '#2563eb',
    optionLetterColor = customization.optionLetterColor || '#fff',
    nextButtonColor = customization.nextButtonColor || '#2563eb',
    nextButtonTextColor = customization.nextButtonTextColor || '#fff',
    font = customization.font || 'Inter, Segoe UI, Arial, sans-serif',
    background = customization.backgroundColor || '#f8f9fb',
    cardBackground = customization.cardBackground || '#fff',
    sectionGridColor = customization.sectionGridColor || '#2563eb',
    sectionGridInactive = customization.sectionGridInactive || '#e0e7ff',
  } = customization;

  return (
    <div style={{ minHeight: '100vh', background, fontFamily: font, display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      {showHeader && (
        <div style={{
          background: '#fff',
          color: '#23263a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 0',
          height: 60,
          borderBottom: '1.5px solid #ececec',
          boxShadow: '0 2px 8px rgba(30,50,80,0.03)',
          position: 'relative',
        }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: quizTitleColor, letterSpacing: '-0.5px', textAlign: 'center' }}>{quizTitle} <span style={{ color: quizTitleColor, fontWeight: 700 }}>| QUIZ ARENA</span></div>
          {topRightButton && (
            <div style={{ position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)' }}>{topRightButton}</div>
          )}
        </div>
      )}
      {/* Main Card */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '32px 8px' }}>
        <div style={{
          background: cardBackground,
          borderRadius: 18,
          boxShadow: '0 8px 32px rgba(60,60,100,0.10)',
          minWidth: 320,
          maxWidth: 480,
          width: '100%',
          margin: '0 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '38px 28px 32px 28px',
          position: 'relative',
          transition: 'box-shadow 0.18s, border 0.18s, background 0.18s',
        }}>
          <div style={{ fontWeight: 700, fontSize: 20, color: '#23263a', marginBottom: 18, textAlign: 'center' }}>Q{questionNumber} - <span style={{ fontWeight: 800 }}>{questionText}</span></div>
          <div style={{ width: '100%', marginTop: 8, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {options.map((opt, idx) => (
              <button
                key={idx}
                disabled={disabled}
                onClick={onSelect ? () => onSelect(idx) : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  background: selected === idx ? optionSelectedColor : cardBackground,
                  color: selected === idx ? '#fff' : '#23263a',
                  border: `2px solid ${selected === idx ? optionSelectedColor : optionBorderColor}`,
                  borderRadius: 10,
                  padding: '16px 0',
                  fontWeight: 600,
                  fontSize: 18,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'background 0.18s, color 0.18s, border 0.18s',
                  outline: selected === idx ? '2px solid #a5b4fc' : 'none',
                  gap: 18,
                  boxShadow: selected === idx ? '0 4px 16px rgba(37,99,235,0.10)' : '0 1px 4px rgba(30,50,80,0.04)',
                }}
              >
                <span style={{
                  background: optionLetterBg,
                  color: optionLetterColor,
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 19,
                  marginLeft: 18,
                  marginRight: 18,
                }}>{LETTERS[idx]}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{opt}</span>
              </button>
            ))}
          </div>
          {/* Section grid and navigation */}
          <div style={{ width: '100%', marginTop: 18, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
            {showSectionGrid && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#23263a', marginBottom: 4 }}>SECTION 1</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {sectionGrid.map((active, idx) => (
                    <div key={idx} style={{ width: 18, height: 18, borderRadius: 4, background: active ? sectionGridColor : sectionGridInactive, border: active ? `2px solid ${sectionGridColor}` : '1.5px solid #c7d2fe' }} />
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              {showPrevButton && (
                <button
                  onClick={onPrev}
                  style={{ background: nextButtonColor, color: nextButtonTextColor, border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.10)' }}
                >
                  {prevButtonLabel}
                </button>
              )}
              {showNextButton && (
                <button
                  onClick={onNext}
                  style={{ background: nextButtonColor, color: nextButtonTextColor, border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.10)' }}
                >
                  {nextButtonLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .quiz-arena-root { flex-direction: column; }
        }
        @media (max-width: 600px) {
          .quiz-arena-root, .quiz-preview-root {
            padding: 0 !important;
            flex-direction: column !important;
          }
          .quiz-preview-card, .quiz-arena-card {
            min-width: 0 !important;
            max-width: 98vw !important;
            padding: 12px 2vw 12px 2vw !important;
            border-radius: 10px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default QuizArenaLayout; 