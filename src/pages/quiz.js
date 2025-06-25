// ✅ Complete quiz builder with all UI components and functionality

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { QRCodeCanvas } from "qrcode.react";

import { Card, CardContent } from "../components/card";
import { Button } from "../components/buttonquiz";
import { Input } from "../components/input";
import { Tabs, TabsList, TabsTrigger } from "../components/tabs";

import { supabase } from "../supabase";
import "./quiz.css";

// Modal component for sharing quiz
const Modal = ({ show, onClose, url }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 relative">
        <h2 className="text-lg font-semibold mb-4">Share Quiz</h2>
        <div className="flex justify-center items-center h-full w-full">
          <QRCodeCanvas value={url} />
        </div>
        <p className="text-sm mt-4 break-all text-center">{url}</p>
        <Button className="mt-4 w-full" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

// Sortable slide component
function SortableSlide({ id, index, onClick, onDelete, isSelected, name, onNameChange }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: isSelected ? "2px solid #7e22ce" : "1px solid #ccc",
    backgroundColor: "#fff",
    borderRadius: "8px",
    padding: "0.5rem",
    cursor: "pointer",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex justify-between items-center mb-2 bg-white hover:bg-purple-50 shadow-md rounded-lg px-3 py-2 transition"
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
        <span {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600" title="Drag">⠿</span>
        <button className="text-lg text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); onDelete(); }}>✕</button>
      </div>
    </div>
  );
}

export default function Quiz() {
  const [title, setTitle] = useState("Untitled Quiz");
  const [slides, setSlides] = useState([
    { 
      id: Date.now(), 
      name: "Slide 1", 
      type: "multiple", 
      question: "", 
      options: ["", ""], 
      correctAnswerIndex: null, 
      background: "#ffffff", 
      textColor: "#000000", 
      fontSize: "text-lg", 
      timer: 10 
    }
  ]);
  const [selectedSlide, setSelectedSlide] = useState(0);
  const [mode, setMode] = useState("create");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const saveToSupabase = async () => {
    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user || !user.id) {
        alert("You must be logged in to save a quiz.");
        return;
      }

      // Insert quiz with explicit user_id and created_by
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert([{ 
          title,
          user_id: user.id,
          created_by: user.email || user.id
        }])
        .select()
        .single();

      if (quizError) {
        alert("Error saving quiz.");
        console.error(quizError);
        return;
      }

      const slidesToInsert = slides.map((slide, index) => ({
        quiz_id: quiz.id,
        slide_index: index,
        question: slide.question,
        type: slide.type,
        options: slide.options,
        correct_answer_index: slide.correctAnswerIndex,
        background: slide.background,
        text_color: slide.textColor,
        font_size: slide.fontSize,
        timer: slide.timer
      }));

      const { error: slidesError } = await supabase.from("slides").insert(slidesToInsert);

      if (slidesError) {
        alert("Quiz saved, but failed to save slides.");
        console.error(slidesError);
      } else {
        alert("✅ Quiz and slides saved successfully!");
        // Optionally navigate back to dashboard
        // navigate('/dashboard');
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred while saving the quiz.");
    } finally {
      setIsLoading(false);
    }
  };

  const addSlide = () => {
    const newSlide = {
      id: Date.now(),
      name: `Slide ${slides.length + 1}`,
      type: "multiple",
      question: "",
      options: ["", ""],
      correctAnswerIndex: null,
      background: "#ffffff",
      textColor: "#000000",
      fontSize: "text-lg",
      timer: 10
    };
    setSlides([...slides, newSlide]);
    setSelectedSlide(slides.length);
  };

  const deleteSlide = (index) => {
    if (slides.length > 1) {
      const newSlides = slides.filter((_, i) => i !== index);
      setSlides(newSlides);
      setSelectedSlide(Math.max(0, Math.min(selectedSlide, newSlides.length - 1)));
    }
  };

  const updateSlide = (index, updates) => {
    const updatedSlides = [...slides];
    updatedSlides[index] = { ...updatedSlides[index], ...updates };
    setSlides(updatedSlides);
  };

  const addOption = () => {
    if (slides[selectedSlide]) {
      const updatedSlides = [...slides];
      updatedSlides[selectedSlide].options.push("");
      setSlides(updatedSlides);
    }
  };

  const removeOption = (optionIndex) => {
    if (slides[selectedSlide] && slides[selectedSlide].options.length > 2) {
      const updatedSlides = [...slides];
      updatedSlides[selectedSlide].options.splice(optionIndex, 1);
      // Reset correct answer if it was the removed option
      if (updatedSlides[selectedSlide].correctAnswerIndex === optionIndex) {
        updatedSlides[selectedSlide].correctAnswerIndex = null;
      } else if (updatedSlides[selectedSlide].correctAnswerIndex > optionIndex) {
        updatedSlides[selectedSlide].correctAnswerIndex--;
      }
      setSlides(updatedSlides);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSlides((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const currentSlide = slides[selectedSlide];
  const shareUrl = `${window.location.origin}/quiz/play/${slides[0]?.id || 'preview'}`;

  return (
    <div className={`min-h-screen p-4 transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-black'}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/dashboard')} 
            variant="outline"
            className="flex items-center gap-2"
          >
            ← Back to Dashboard
          </Button>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold bg-transparent border-none focus:ring-0 min-w-64"
            placeholder="Enter quiz title..."
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            variant="outline"
            className="px-3 py-2"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </Button>
          <Button 
            onClick={saveToSupabase} 
            className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Quiz'}
          </Button>
          <Button 
            onClick={() => setShowModal(true)} 
            variant="outline"
          >
            📤 Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[20rem_1fr_18rem] gap-6 h-full">

        {/* Left Sidebar - Slides */}
        <div className="w-80 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Slides ({slides.length})</h3>
            <Button
              onClick={addSlide}
              className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-3 py-1"
            >
              + Add Slide
            </Button>
          </div>

          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={slides.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {slides.map((slide, index) => (
                  <SortableSlide
                    key={slide.id}
                    id={slide.id}
                    index={index}
                    name={slide.name}
                    isSelected={selectedSlide === index}
                    onClick={() => setSelectedSlide(index)}
                    onDelete={() => deleteSlide(index)}
                    onNameChange={(newName) => updateSlide(index, { name: newName })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          {currentSlide ? (
            <div className="space-y-6">
              {/* Slide Type Selector */}
              <div>
                <label className="block text-sm font-medium mb-2">Question Type</label>
                <Tabs value={currentSlide.type} onValueChange={(value) => updateSlide(selectedSlide, { type: value })}>
                  <TabsList>
                    <TabsTrigger value="multiple">Multiple Choice</TabsTrigger>
                    <TabsTrigger value="true-false">True/False</TabsTrigger>
                    <TabsTrigger value="text">Text Response</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Question Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Question</label>
                <Input
                  type="text"
                  value={currentSlide.question}
                  onChange={(e) => updateSlide(selectedSlide, { question: e.target.value })}
                  placeholder="Enter your question here..."
                  className="w-full text-lg p-3"
                />
              </div>

              {/* Answer Options */}
              {currentSlide.type === "multiple" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Answer Options</label>
                  <div className="space-y-3">
                    {currentSlide.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`correct-${selectedSlide}`}
                          checked={currentSlide.correctAnswerIndex === optionIndex}
                          onChange={() => updateSlide(selectedSlide, { correctAnswerIndex: optionIndex })}
                          className="w-4 h-4 text-purple-600"
                        />
                        <Input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...currentSlide.options];
                            newOptions[optionIndex] = e.target.value;
                            updateSlide(selectedSlide, { options: newOptions });
                          }}
                          placeholder={`Option ${optionIndex + 1}`}
                          className="flex-1"
                        />
                        {currentSlide.options.length > 2 && (
                          <Button
                            onClick={() => removeOption(optionIndex)}
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-700 px-2"
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={addOption}
                    variant="outline"
                    className="mt-3"
                  >
                    + Add Option
                  </Button>
                </div>
              )}

              {/* True/False Options */}
              {currentSlide.type === "true-false" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Correct Answer</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`tf-${selectedSlide}`}
                        checked={currentSlide.correctAnswerIndex === 0}
                        onChange={() => updateSlide(selectedSlide, { 
                          correctAnswerIndex: 0,
                          options: ["True", "False"]
                        })}
                        className="w-4 h-4 text-purple-600"
                      />
                      True
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`tf-${selectedSlide}`}
                        checked={currentSlide.correctAnswerIndex === 1}
                        onChange={() => updateSlide(selectedSlide, { 
                          correctAnswerIndex: 1,
                          options: ["True", "False"]
                        })}
                        className="w-4 h-4 text-purple-600"
                      />
                      False
                    </label>
                  </div>
                </div>
              )}

              {/* Timer Settings */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Timer (seconds)</label>
                  <Input
                    type="number"
                    min="5"
                    max="300"
                    value={currentSlide.timer}
                    onChange={(e) => updateSlide(selectedSlide, { timer: parseInt(e.target.value) || 10 })}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Style Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Background Color</label>
                  <Input
                    type="color"
                    value={currentSlide.background}
                    onChange={(e) => updateSlide(selectedSlide, { background: e.target.value })}
                    className="w-full h-10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Text Color</label>
                  <Input
                    type="color"
                    value={currentSlide.textColor}
                    onChange={(e) => updateSlide(selectedSlide, { textColor: e.target.value })}
                    className="w-full h-10"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 border rounded-lg" 
                style={{ 
                  backgroundColor: currentSlide.background, 
                  color: currentSlide.textColor 
                }}
              >
                <h4 className="font-medium mb-2">Preview:</h4>
                <p className={`${currentSlide.fontSize} font-medium mb-3`}>
                  {currentSlide.question || "Your question will appear here"}
                </p>
                {currentSlide.type === "multiple" && (
                  <div className="space-y-2">
                    {currentSlide.options.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-4 h-4 border border-gray-400 rounded-full"></div>
                        <span>{option || `Option ${idx + 1}`}</span>
                      </div>
                    ))}
                  </div>
                )}
                {currentSlide.type === "true-false" && (
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-gray-400 rounded-full"></div>
                      <span>True</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-gray-400 rounded-full"></div>
                      <span>False</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>No slide selected</p>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <Modal 
        show={showModal} 
        onClose={() => setShowModal(false)} 
        url={shareUrl} 
      />
    </div>
  );
}