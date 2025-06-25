import React, { useState, useEffect } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

// Simplified components for the artifact environment
const Card = ({ children, className = "", style = {} }) => (
  <div className={`bg-white rounded-lg shadow-md border ${className}`} style={style}>
    {children}
  </div>
);

const CardContent = ({ children, className = "", style = {} }) => (
  <div className={`p-4 ${className}`} style={style}>
    {children}
  </div>
);

const Button = ({ children, className = "", variant = "default", onClick, ...props }) => {
  const baseClasses = "px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
  };
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ className = "", style = {}, ...props }) => (
  <input 
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    style={style}
    {...props}
  />
);

const Tabs = ({ children, value, onValueChange }) => (
  <div className="tabs-container">
    {React.Children.map(children, child => 
      React.cloneElement(child, { value, onValueChange })
    )}
  </div>
);

const TabsList = ({ children, value, onValueChange }) => (
  <div className="flex bg-gray-100 rounded-md p-1">
    {React.Children.map(children, child => 
      React.cloneElement(child, { value, onValueChange })
    )}
  </div>
);

const TabsTrigger = ({ children, value: triggerValue, value: currentValue, onValueChange }) => (
  <button
    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
      currentValue === triggerValue 
        ? 'bg-white text-blue-600 shadow-sm' 
        : 'text-gray-600 hover:text-gray-800'
    }`}
    onClick={() => onValueChange(triggerValue)}
  >
    {children}
  </button>
);

// QR Code Component (simplified version)
const QRCodeCanvas = ({ value }) => (
  <div className="w-32 h-32 bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-400 rounded">
    <div className="text-center text-xs text-gray-600">
      <div className="mb-1">📱</div>
      <div>QR Code</div>
      <div className="text-xs mt-1 break-all">{value.slice(-10)}</div>
    </div>
  </div>
);

// Modal for sharing
const Modal = ({ show, onClose, url }) => {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 relative">
        <h2 className="text-lg font-semibold mb-4">Share Quiz</h2>
        <div className="flex justify-center items-center h-full w-full mb-4">
          <QRCodeCanvas value={url} />
        </div>
        <p className="text-sm mt-4 break-all text-center bg-gray-50 p-2 rounded">{url}</p>
        <Button className="mt-4 w-full" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

// Reorderable Slide Component
function SortableSlide({ id, index, onClick, onDelete, isSelected, name, onNameChange }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: isSelected ? "2px solid #7e22ce" : "1px solid #ccc",
    backgroundColor: isSelected ? "#faf5ff" : "#fff",
    borderRadius: "8px",
    padding: "0.5rem",
    cursor: "pointer",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex justify-between items-center mb-2 hover:bg-purple-50 shadow-md rounded-lg px-3 py-2 transition"
    >
      <div onClick={onClick} className="flex-1">
        <Input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full text-sm font-medium border-none focus:ring-0 bg-transparent"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="flex gap-2 items-center">
        <span 
          {...attributes} 
          {...listeners} 
          className="cursor-grab text-gray-400 hover:text-gray-600 select-none" 
          title="Drag to reorder"
        >
          ⠿
        </span>
        <button 
          className="text-lg text-red-500 hover:text-red-700 transition-colors" 
          onClick={(e) => { 
            e.stopPropagation(); 
            onDelete(); 
          }}
          title="Delete slide"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Main Quiz Builder
export default function Quiz() {
  const [title, setTitle] = useState("Untitled Presentation");
  const [slides, setSlides] = useState([{
    id: Date.now() + Math.random(),
    name: "Slide 1",
    type: "multiple",
    question: "",
    options: ["", ""],
    correctAnswerIndex: null,
    background: "#ffffff",
    textColor: "#000000",
    fontSize: "text-lg",
    timer: 10,
  }]);
  const [selectedSlide, setSelectedSlide] = useState(0);
  const [mode, setMode] = useState("create");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [savedQuizzes, setSavedQuizzes] = useState([]); // In-memory storage
  const [notification, setNotification] = useState("");

  // Show notification helper
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(""), 3000);
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const addSlide = (type = "multiple") => {
    const normalizedType = type === "multiple_choice" ? "multiple" : type;
    const newSlide = {
      id: Date.now() + Math.random(),
      name: `Slide ${slides.length + 1}`, // Fixed template literal
      type: normalizedType,
      question: "",
      options: ["", ""],
      correctAnswerIndex: null,
      background: "#ffffff",
      textColor: "#000000",
      fontSize: "text-lg",
      timer: 10,
    };
    setSlides([...slides, newSlide]);
    setSelectedSlide(slides.length);
    setDropdownOpen(false);
  };

  const deleteSlide = (index) => {
    if (slides.length === 1) {
      showNotification("Cannot delete the last slide");
      return;
    }
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    setSelectedSlide((prev) => (prev > index ? prev - 1 : Math.min(prev, newSlides.length - 1)));
    showNotification("Slide deleted");
  };

  const updateSlide = (key, value) => {
    setSlides((prev) =>
      prev.map((slide, i) =>
        i === selectedSlide ? { ...slide, [key]: value } : slide
      )
    );
  };

  const updateOption = (index, value) => {
    setSlides((prev) =>
      prev.map((slide, i) => {
        if (i !== selectedSlide) return slide;
        const newOptions = [...slide.options];
        newOptions[index] = value;
        return { ...slide, options: newOptions };
      })
    );
  };

  const removeOption = (index) => {
    if (slides[selectedSlide].options.length <= 2) {
      showNotification("Minimum 2 options required");
      return;
    }
    
    setSlides((prev) =>
      prev.map((slide, i) => {
        if (i !== selectedSlide) return slide;
        const newOptions = [...slide.options];
        newOptions.splice(index, 1);
        let newCorrect = slide.correctAnswerIndex;
        if (newCorrect === index) newCorrect = 0;
        else if (newCorrect > index) newCorrect -= 1;
        return { ...slide, options: newOptions, correctAnswerIndex: newCorrect };
      })
    );
  };

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newSlides = arrayMove(slides, oldIndex, newIndex);
      setSlides(newSlides);
      
      // Update selected slide index
      if (selectedSlide === oldIndex) {
        setSelectedSlide(newIndex);
      } else if (selectedSlide === newIndex) {
        setSelectedSlide(oldIndex);
      }
    }
  };

  const currentSlide = slides[selectedSlide];
  const shareURL = `https://inquizo.com/quiz/${title.replace(/\s+/g, "-")}`;

 const saveQuiz = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      showNotification("You must be logged in to save a quiz.");
      return;
    }

    const quizData = {
      title,
      slides: slides.map((slide, index) => ({
        id: slide.id,
        index,
        question: slide.question,
        type: slide.type,
        options: slide.options,
        correctAnswerIndex: slide.correctAnswerIndex,
        background: slide.background,
        textColor: slide.textColor,
        fontSize: slide.fontSize,
        timer: slide.timer,
      })),
      created_by: user.email, // ✅ This line is key
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('quizzes').insert([quizData]);
    
    if (error) {
      console.error("❌ Error saving to Supabase:", error);
      showNotification("❌ Failed to save quiz to Supabase");
    } else {
      showNotification("✅ Quiz saved to Supabase!");
    }
  } catch (error) {
    showNotification("❌ Error saving quiz");
    console.error("Save error:", error);
  }
};
  const validateSlide = (slide) => {
    if (!slide.question.trim()) return "Question is required";
    if (slide.type === "multiple" && slide.options.some(opt => !opt.trim())) {
      return "All options must be filled";
    }
    if (slide.type === "multiple" && slide.correctAnswerIndex === null) {
      return "Please select a correct answer";
    }
    return null;
  };

  const questionTypes = [
    "Multiple Choice", "Open Ended", "Ranking", "Guess the Number",
    "2 x 2 Grid", "Pin on Image", "Word Cloud", "Scales",
    "Q&A", "100 points", "Quick Form"
  ];

  return (
    <div className={`min-h-screen p-4 transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-black'}`}>
      <Modal show={showModal} onClose={() => setShowModal(false)} url={shareURL} />

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity">
          {notification}
        </div>
      )}

      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="outline" onClick={() => window.history.back()}>← Back</Button>
          <Input
            className="text-2xl font-semibold border-none shadow-none focus:ring-0 focus:outline-none w-auto min-w-64"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Quiz"
          />
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList>
              <TabsTrigger value="create">Create</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? "☀️ Light" : "🌙 Dark"}
          </Button>
          <Button variant="outline" onClick={saveQuiz}>💾 Save</Button>
          <Button variant="outline" onClick={() => setShowModal(true)}>📤 Share</Button>
          <Button className="bg-purple-600 text-white hover:bg-purple-700">▶️ Present</Button>
          <Button
            className="bg-blue-500 text-white hover:bg-blue-600"
            onClick={() => showNotification("Preview feature would open in new window")}
          >
            👁️ Preview
          </Button>
        </div>
      </div>

      {/* Builder Area */}
      {mode === "create" ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left Panel */}
          <div className="lg:col-span-1 relative">
            <Button onClick={() => setDropdownOpen(!dropdownOpen)} className="w-full mb-2">
              + New Slide
            </Button>
            {dropdownOpen && (
              <div className="absolute z-10 bg-white border rounded shadow-lg w-full p-4 max-h-80 overflow-y-auto">
                <h3 className="text-sm font-semibold mb-3 text-gray-800">Interactive Questions</h3>
                <div className="grid grid-cols-1 gap-2">
                  {questionTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => addSlide(type.toLowerCase().replace(/\s+/g, "_"))}
                      className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 hover:bg-purple-100 border border-gray-200 transition text-left"
                    >
                      <span className="text-sm font-medium text-gray-700">{type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <DndContext 
              collisionDetection={closestCenter} 
              onDragEnd={onDragEnd} 
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="max-h-96 overflow-y-auto">
                  {slides.map((slide, i) => {
                    const validation = validateSlide(slide);
                    return (
                      <div key={slide.id} className="relative">
                        <SortableSlide
                          id={slide.id}
                          index={i}
                          name={slide.name}
                          onClick={() => setSelectedSlide(i)}
                          onDelete={() => deleteSlide(i)}
                          isSelected={i === selectedSlide}
                          onNameChange={(value) => {
                            const updatedSlides = [...slides];
                            updatedSlides[i].name = value;
                            setSlides(updatedSlides);
                          }}
                        />
                        {validation && i === selectedSlide && (
                          <div className="text-xs text-red-500 mb-2 px-2">⚠️ {validation}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Center Panel */}
          <div className="lg:col-span-3 space-y-6">
            <Card 
              className="rounded-2xl shadow-xl border border-gray-200" 
              style={{ backgroundColor: currentSlide.background }}
            >
              <CardContent className="p-6 space-y-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: currentSlide.textColor }}>
                    Question {selectedSlide + 1}
                  </label>
                  <Input
                    placeholder="Ask a Question Here..."
                    value={currentSlide.question}
                    onChange={(e) => updateSlide("question", e.target.value)}
                    className={`${currentSlide.fontSize} font-semibold w-full border-2 border-gray-300 focus:border-purple-500`}
                    style={{ color: currentSlide.textColor, backgroundColor: 'rgba(255,255,255,0.9)' }}
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-medium" style={{ color: currentSlide.textColor }}>
                    Answer Options
                  </label>
                  {currentSlide.options.map((opt, i) => {
                    const isCorrect = currentSlide.correctAnswerIndex === i;
                    return (
                      <div 
                        key={i} 
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 w-full transition-all ${
                          isCorrect ? "border-green-500 bg-green-50" : "border-gray-300 bg-white"
                        }`}
                      >
                        {currentSlide.type === "multiple" && (
                          <input
                            type="radio"
                            name={`correct-answer-${selectedSlide}`}
                            checked={isCorrect}
                            onChange={() => updateSlide("correctAnswerIndex", i)}
                            className="h-4 w-4 text-green-600 focus:ring-green-500"
                          />
                        )}
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(i, e.target.value)}
                          placeholder={`Option ${i + 1}`}
                          className={`flex-1 p-2 rounded-md border ${
                            isCorrect ? "border-green-500 font-semibold bg-green-50" : "border-gray-200"
                          } focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                          style={{ color: currentSlide.textColor }}
                        />
                        {currentSlide.options.length > 2 && (
                          <button 
                            onClick={() => removeOption(i)} 
                            className="text-red-500 hover:text-red-700 px-2 py-1 text-sm transition-colors"
                            title="Remove option"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    );
                  })}
                  
                  <div className="flex gap-2">
                    {currentSlide.options.length < 6 ? (
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          const updatedSlides = [...slides];
                          updatedSlides[selectedSlide].options.push("");
                          setSlides(updatedSlides);
                        }}
                        className="flex-1"
                      >
                        + Add Option
                      </Button>
                    ) : (
                      <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                        Maximum 6 options allowed
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardContent className="space-y-4 p-4">
                <h3 className="font-semibold text-lg mb-4">Slide Settings</h3>
                
                {/* Background Color */}
                <div>
                  <label className="block mb-2 text-sm font-medium">Background Color</label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={currentSlide.background}
                      onChange={(e) => updateSlide("background", e.target.value)}
                      className="w-12 h-12 p-1 border-2"
                    />
                    <Input
                      type="text"
                      value={currentSlide.background}
                      onChange={(e) => updateSlide("background", e.target.value)}
                      className="flex-1 text-sm"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                {/* Text Color */}
                <div>
                  <label className="block mb-2 text-sm font-medium">Text Color</label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={currentSlide.textColor}
                      onChange={(e) => updateSlide("textColor", e.target.value)}
                      className="w-12 h-12 p-1 border-2"
                    />
                    <Input
                      type="text"
                      value={currentSlide.textColor}
                      onChange={(e) => updateSlide("textColor", e.target.value)}
                      className="flex-1 text-sm"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="block mb-2 text-sm font-medium">Font Size</label>
                  <select
                    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={currentSlide.fontSize}
                    onChange={(e) => updateSlide("fontSize", e.target.value)}
                  >
                    <option value="text-sm">Small</option>
                    <option value="text-base">Normal</option>
                    <option value="text-lg">Large</option>
                    <option value="text-xl">Extra Large</option>
                    <option value="text-2xl">2X Large</option>
                  </select>
                </div>

                {/* Timer */}
                <div>
                  <label className="block mb-2 text-sm font-medium">Timer Duration</label>
                  <select
                    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={currentSlide.timer}
                    onChange={(e) => updateSlide("timer", parseInt(e.target.value))}
                  >
                    {[5, 10, 15, 20, 25, 30, 45, 60, 90, 120, 180, 240, 300].map((sec) => (
                      <option key={sec} value={sec}>
                        {sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60 > 0 ? `${sec % 60}s` : ''}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Apply to All Button */}
                <Button
                  className="w-full bg-purple-600 text-white hover:bg-purple-700 mt-4"
                  onClick={() => {
                    setSlides((prev) =>
                      prev.map((s) => ({
                        ...s,
                        background: currentSlide.background,
                        textColor: currentSlide.textColor,
                        fontSize: currentSlide.fontSize,
                        timer: currentSlide.timer,
                      }))
                    );
                    showNotification("Settings applied to all slides!");
                  }}
                >
                  🎨 Apply to All Slides
                </Button>
              </CardContent>
            </Card>

            {/* Quiz Statistics */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Quiz Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Slides:</span>
                    <span className="font-semibold">{slides.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed:</span>
                    <span className="font-semibold text-green-600">
                      {slides.filter(slide => validateSlide(slide) === null).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Needs Attention:</span>
                    <span className="font-semibold text-red-600">
                      {slides.filter(slide => validateSlide(slide) !== null).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center text-xl mt-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="font-semibold mb-4 text-2xl">📊 Responses & Analytics</h2>
            <div className="bg-white rounded-lg p-8 shadow-md">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-gray-600 mb-4">No responses yet. Check back after presenting your quiz to see detailed analytics here.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-blue-800">Total Responses</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0%</div>
                  <div className="text-sm text-green-800">Average Score</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">0s</div>
                  <div className="text-sm text-purple-800">Avg. Time</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}