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
import Spinner from '../components/Spinner';
import Skeleton from '../components/Skeleton';
import { useToast } from '../components/Toast';

// 🔲 Modal for sharing
const Modal = ({ show, onClose, url }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 relative">
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

// 🔲 Reorderable Slide Component
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
        />
      </div>
      <div className="flex gap-2 items-center">
        <span {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600" title="Drag">⠿</span>
        <button className="text-lg text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); onDelete(); }}>✕</button>
      </div>
    </div>
  );
}

// 🔲 Main Quiz Builder
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
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const addSlide = (type = "multiple") => {
    const normalizedType = type === "multiple_choice" ? "multiple" : type;
    const newSlide = {
      id: Date.now() + Math.random(),
      name: `Slide ${slides.length + 1}`,
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
    if (slides.length === 1) return;
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    setSelectedSlide((prev) => (prev > index ? prev - 1 : Math.min(prev, newSlides.length - 1)));
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
    setSlides((prev) =>
      prev.map((slide, i) => {
        if (i !== selectedSlide) return slide;
        const newOptions = [...slide.options];
        if (newOptions.length <= 2) return slide;
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
    if (active.id !== over.id) {
      const oldIndex = slides.findIndex((s) => s.id === active.id);
      const newIndex = slides.findIndex((s) => s.id === over.id);
      setSlides((prev) => arrayMove(prev, oldIndex, newIndex));
    }
  };

  const currentSlide = slides[selectedSlide];
  const shareURL = `https://inquizo.com/quiz/${title.replace(/\s+/g, "-")}`;

  const saveToSupabase = async () => {
    setLoading(true);
    try {
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.user) {
        toast('Unable to get user info.', 'error');
        console.error(userError);
        setLoading(false);
        return;
      }
      const { id: user_id, email } = user.user;
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert([{ title, user_id, created_by: email }])
        .select()
        .single();
      if (quizError) {
        toast('Error saving quiz.', 'error');
        console.error(quizError);
        setLoading(false);
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
      }));
      const { error: slidesError } = await supabase
        .from('slides')
        .insert(slidesToInsert);
      if (slidesError) {
        toast('Quiz saved, but failed to save slides.', 'error');
        console.error(slidesError);
      } else {
        toast('Quiz and slides saved to Supabase!', 'success');
      }
    } catch (err) {
      toast('Unexpected error saving quiz.', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const formattedSlides = slides.map((slide) => ({
      text: slide.question || "",
      options: slide.options || [],
      correctIndex: slide.correctAnswerIndex ?? 0,
      fontSize: slide.fontSize || "text-base",
      textColor: slide.textColor || "#000000",
      timer: slide.timer || 10,
    }));
    localStorage.setItem("quizData", JSON.stringify(formattedSlides));
    alert("Slides saved successfully!");
  };

  const questionTypes = [
    "Multiple Choice", "Open Ended", "Ranking", "Guess the Number",
    "2 x 2 Grid", "Pin on Image", "Word Cloud", "Scales",
    "Q&A", "100 points", "Quick Form"
  ];

  return (
    <div className={`min-h-screen p-4 transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-black'}`}>
      <Modal show={showModal} onClose={() => setShowModal(false)} url={shareURL} />

      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>← Back</Button>
          <Input
            className="text-2xl font-semibold border-none shadow-none focus:ring-0 focus:outline-none w-auto"
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </Button>
          <Button variant="outline" onClick={saveToSupabase}>Save</Button>
          <Button variant="outline" onClick={() => setShowModal(true)}>Share</Button>
          <Button className="bg-purple-600 text-white">Present</Button>
          <Button
            className="bg-blue-500 text-white"
            onClick={() => {
              localStorage.setItem("quizData", JSON.stringify(slides));
              window.open("/preview", "_blank");
            }}
          >
            Preview as User
          </Button>
        </div>
      </div>
      
      {loading && <div style={{ margin: '40px auto', textAlign: 'center' }}><Spinner size={40} /></div>}

      {/* Builder Area */}
      {mode === "create" ? (
        <div className="grid grid-cols-5 gap-4">
          {/* Left Panel */}
          <div className="col-span-1 relative">
            <Button onClick={() => setDropdownOpen(!dropdownOpen)} className="w-full mb-2">+ New Slide</Button>
            {dropdownOpen && (
              <div className="absolute z-10 bg-white border rounded shadow-md w-full p-4">
                <h3 className="text-sm font-semibold mb-3">Interactive Questions</h3>
                <div className="grid grid-cols-2 gap-3">
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
            <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis]}>
              <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {slides.map((slide, i) => (
                  <SortableSlide
                    key={slide.id}
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
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Center Panel */}
          <div className="col-span-3 space-y-6">
            <Card className="rounded-2xl shadow-xl border border-gray-200" style={{ backgroundColor: currentSlide.background }}>
              <CardContent className="p-4 space-y-4">
                <Input
                  placeholder="Ask a Question Here..."
                  value={currentSlide.question}
                  onChange={(e) => updateSlide("question", e.target.value)}
                  className={`${currentSlide.fontSize} font-semibold w-full`}
                  style={{ color: currentSlide.textColor }}
                />
                <div className="space-y-2">
                  {currentSlide.options.map((opt, i) => {
                    const isCorrect = currentSlide.correctAnswerIndex === i;
                    return (
                      <div key={i} className={`flex items-center gap-2 p-2 rounded-md border w-full ${isCorrect ? "border-green-500 bg-green-50" : "border-gray-300"}`}>
                        {currentSlide.type === "multiple" && (
                          <input
                            type="radio"
                            name={`correct-answer-${selectedSlide}`}
                            checked={isCorrect}
                            onChange={() => updateSlide("correctAnswerIndex", i)}
                          />
                        )}
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(i, e.target.value)}
                          placeholder={`Option ${i + 1}`}
                          className={`flex-1 p-2 rounded-md border ${isCorrect ? "border-green-500 font-semibold" : "border-gray-200"}`}
                          style={{ color: currentSlide.textColor }}
                        />
                        {currentSlide.options.length > 2 && (
                          <button onClick={() => removeOption(i)} className="text-red-500 px-2 py-1 text-sm">❌</button>
                        )}
                      </div>
                    );
                  })}
                  {currentSlide.options.length < 4 ? (
                    <Button variant="outline" onClick={() => {
                      const updatedSlides = [...slides];
                      updatedSlides[selectedSlide].options.push("");
                      setSlides(updatedSlides);
                    }}>+ Add option</Button>
                  ) : (
                    <div className="text-sm text-red-500">Maximum 4 options allowed</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="col-span-1 space-y-4">
            <Card>
              <CardContent className="space-y-4 p-4">
  {/* Background Color */}
  <div>
    <label className="block mb-1 text-sm font-medium">Background Color</label>
    <Input
      type="color"
      value={currentSlide.background}
      onChange={(e) => updateSlide("background", e.target.value)}
    />
  </div>

  {/* Text Color */}
  <div>
    <label className="block mb-1 text-sm font-medium">Text Color</label>
    <Input
      type="color"
      value={currentSlide.textColor}
      onChange={(e) => updateSlide("textColor", e.target.value)}
    />
  </div>

  {/* Font Size */}
  <div>
    <label className="block mb-1 text-sm font-medium">Font Size</label>
    <select
      className="w-full border rounded p-2"
      value={currentSlide.fontSize}
      onChange={(e) => updateSlide("fontSize", e.target.value)}
    >
      <option value="text-sm">Small</option>
      <option value="text-base">Normal</option>
      <option value="text-lg">Large</option>
      <option value="text-xl">Extra Large</option>
    </select>
  </div>

  {/* Timer */}
  <div>
    <label className="block mb-1 text-sm font-medium">Timer</label>
    <select
      className="w-full border rounded p-2"
      value={currentSlide.timer}
      onChange={(e) => updateSlide("timer", parseInt(e.target.value))}
    >
      {[5, 10, 15, 20, 25, 30, 45, 60, 120, 180, 240, 300].map((sec) => (
        <option key={sec} value={sec}>
          {sec < 60 ? `${sec}s` : `${sec / 60} min`}
        </option>
      ))}
    </select>
  </div>

  {/* Common Apply Button */}
  <Button
    className="w-full bg-purple-600 text-white mt-2"
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
    }}
  >
    Apply All Settings to All Slides
  </Button>
</CardContent>

            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center text-xl mt-20">
          <h2 className="font-semibold mb-4">Responses & Analytics</h2>
          <p>No responses yet. Check back after presenting your quiz to see a report here.</p>
        </div>
      )}
    </div>
  );
}