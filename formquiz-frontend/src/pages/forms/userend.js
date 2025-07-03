import React, { useEffect, useState, useCallback } from "react";
import { Button } from '../../components/buttonquiz';
import { Card } from '../../components/card';
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { CheckCircle } from "lucide-react";

export default function LiveQuizUser() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [slides, setSlides] = useState([]);
  const [quizTitle, setQuizTitle] = useState("Live Quiz");
  const [selected, setSelected] = useState(null);
  const [timer, setTimer] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [points, setPoints] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [userName, setUserName] = useState("You");
  const [users, setUsers] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [hasAnswered, setHasAnswered] = useState(false);

  const currentQuestion = slides[questionIndex];

  // Load quiz data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("quizData");
    const title = localStorage.getItem("quizTitle");
    const user = localStorage.getItem("userName") || "You";
    if (saved) {
      const parsedSlides = JSON.parse(saved);
      setSlides(parsedSlides);
      setTimer(parsedSlides[0]?.timer || 10);
      setTimeLeft(parsedSlides[0]?.timer || 10);
      if (title) setQuizTitle(title);
      setUserName(user);
      const updated = [...(JSON.parse(localStorage.getItem("liveUsers")) || []), { id: Date.now(), name: user, points: 0 }];
      localStorage.setItem("liveUsers", JSON.stringify(updated));
      setUsers(updated);
    }
  }, []);

  // Poll users every 1s
  useEffect(() => {
    const interval = setInterval(() => {
      const data = JSON.parse(localStorage.getItem("liveUsers")) || [];
      setUsers(data);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateUserPoints = (earned) => {
    const data = JSON.parse(localStorage.getItem("liveUsers")) || [];
    const updated = data.map((u) =>
      u.name === userName ? { ...u, points: u.points + earned } : u
    );
    localStorage.setItem("liveUsers", JSON.stringify(updated));
    setUsers(updated);
  };

  const handleAnswer = useCallback(
    (index) => {
      if (hasAnswered) return;
      setHasAnswered(true);
      setSelected(index);

      const correct = index === currentQuestion?.correctAnswerIndex;
      const earned = correct ? 10 : 0;
      setPoints((prev) => prev + earned);
      updateUserPoints(earned);

      setUserAnswers((prev) => {
        if (prev.some((a) => a.questionIndex === questionIndex)) return prev;
        return [
          ...prev,
          {
            questionIndex,
            selectedIndex: index,
            correctIndex: currentQuestion?.correctAnswerIndex,
          },
        ];
      });
    },
    [hasAnswered, currentQuestion, questionIndex, userName]
  );

  // Countdown logic
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!hasAnswered) handleAnswer(null);
          setTimeout(() => {
            const next = questionIndex + 1;
            if (next < slides.length) {
              setQuestionIndex(next);
              setSelected(null);
              setHasAnswered(false);
              setTimer(slides[next].timer || 10);
              setTimeLeft(slides[next].timer || 10);
            } else {
              setQuizFinished(true);
            }
          }, 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [handleAnswer, hasAnswered, questionIndex, slides]);

  if (!currentQuestion && !quizFinished) return <div className="p-4">Loading...</div>;

  if (quizFinished)
    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-purple-100 flex flex-col items-center justify-center text-center space-y-10">
        <div className="bg-white shadow-2xl rounded-3xl p-8 max-w-3xl w-full">
          <h2 className="text-5xl font-extrabold text-purple-800 mb-6">🎉 Quiz Completed!</h2>
          <p className="text-2xl text-gray-800 mb-8">You scored <strong>{points}</strong> points.</p>

          <div className="text-left mb-10">
            <h4 className="text-2xl font-bold mb-4 text-purple-700">Your Answers</h4>
            <ul className="space-y-4">
              {[...new Map(userAnswers.map(item => [item.questionIndex, item])).values()].map((ans, idx) => (
                <li key={idx} className="bg-gray-50 p-4 rounded-xl border">
                  <div className="font-medium text-lg">Q{idx + 1}: {slides[ans.questionIndex]?.question}</div>
                  <div className="mt-1">
                    Your Answer: <span className={ans.selectedIndex === ans.correctIndex ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                      {slides[ans.questionIndex]?.options[ans.selectedIndex] || "No Answer"}
                    </span>
                  </div>
                  <div>Correct Answer: <strong>{slides[ans.questionIndex]?.options[ans.correctIndex]}</strong></div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10">
            <h4 className="text-2xl font-bold text-purple-700 mb-4">🏆 Final Leaderboard</h4>
            <ul className="space-y-3 text-left text-lg">
              {users
                .sort((a, b) => b.points - a.points)
                .map((user, idx) => (
                  <li key={user.id} className="bg-purple-50 border border-purple-300 p-3 rounded-xl shadow-sm flex justify-between">
                    <span className="font-semibold text-purple-800">{idx + 1}. {user.name}</span>
                    <span className="text-purple-600">{user.points} pts</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    );

  return (
    <div
      className="min-h-screen p-4"
      style={{ backgroundColor: currentQuestion.background || "#ffffff" }}
    >
      <h2 className="text-3xl font-bold text-center mb-6 text-purple-700">
        {quizTitle}
      </h2>

      <div className="flex justify-center mb-6">
        <div className="w-16 h-16">
          <CircularProgressbar
            value={(timeLeft / timer) * 100}
            text={`${timeLeft}s`}
            styles={buildStyles({
              pathColor: `#6D28D9`,
              textColor: "#111827",
              trailColor: "#E5E7EB",
            })}
          />
        </div>
      </div>

      <Card className="max-w-xl mx-auto mb-4 shadow-lg">
        <div className="space-y-4">
          <div className="text-sm text-right text-gray-600">
            Question {questionIndex + 1} of {slides.length}
          </div>

          <h3
            className={`font-semibold ${currentQuestion.fontSize}`}
            style={{ color: currentQuestion.textColor }}
          >
            {currentQuestion.question}
          </h3>

          <div className="grid gap-2">
            {currentQuestion.options.map((opt, i) => {
              const isSelected = selected === i;
              return (
                <Button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={selected !== null}
                  className={`
                    w-full px-4 py-2 flex justify-between items-center text-left rounded-xl border-2 transition duration-200
                    ${isSelected
                      ? "bg-purple-100 border-purple-600 text-purple-900 font-semibold shadow-lg scale-[1.02]"
                      : "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200"}
                  `}
                >
                  {opt}
                  {isSelected && <CheckCircle className="w-5 h-5 text-purple-700" />}
                </Button>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
