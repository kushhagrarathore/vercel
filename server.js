const { Server } = require('socket.io');

const io = new Server(3000, {
  cors: { origin: '*' }
});

const quizzes = {};
const quizTimers = {}; // { [roomCode]: NodeJS.Timeout }

io.on('connection', (socket) => {
  console.log('User connected', socket.id);

  function startQuestionTimer(roomCode) {
    const quiz = quizzes[roomCode];
    if (!quiz) return;
    // Clear any existing timer
    if (quizTimers[roomCode]) {
      clearTimeout(quizTimers[roomCode]);
    }
    const index = quiz.currentQuestionIndex;
    const question = quiz.questions[index];
    const time = (question.timeLimit || 20) * 1000;
    quizTimers[roomCode] = setTimeout(() => {
      // Auto-advance to next question or end quiz
      if (index < quiz.questions.length - 1) {
        quiz.currentQuestionIndex = index + 1;
        io.to(roomCode).emit('question_changed', {
          index: quiz.currentQuestionIndex,
          timestamp: Date.now(),
        });
        io.to(roomCode).emit('answer_stats', quiz.answerStats[quiz.currentQuestionIndex]);
        startQuestionTimer(roomCode);
      } else {
        // End quiz
        quiz.status = 'ended';
        const leaderboard = [...quiz.participants]
          .sort((a, b) => b.score - a.score)
          .map(({ id, name, score }) => ({ id, name, score }));
        io.to(roomCode).emit('leaderboard', leaderboard);
        io.to(roomCode).emit('quiz_ended');
        clearTimeout(quizTimers[roomCode]);
        delete quizTimers[roomCode];
      }
    }, time);
  }

  socket.on('host_create_quiz', ({ quizId, roomCode, questions }) => {
    quizzes[roomCode] = {
      id: quizId,
      hostId: socket.id,
      participants: [],
      currentQuestionIndex: 0,
      questions,
      status: 'waiting',
      answerStats: {}, // { [questionIndex]: [count, ...] }
    };
    socket.join(roomCode);
    socket.emit('quiz_created', { roomCode });
  });

  socket.on('player_join', ({ roomCode, name }) => {
    const quiz = quizzes[roomCode];
    if (quiz) {
      // Prevent duplicate join
      if (!quiz.participants.find(p => p.id === socket.id)) {
        quiz.participants.push({
          id: socket.id,
          name,
          score: 0,
        });
      }
      socket.join(roomCode);
      io.to(roomCode).emit('participants_updated', quiz.participants);
      // If quiz is already live, send current state to this player
      if (quiz.status === 'live') {
        socket.emit('quiz_started', {
          questions: quiz.questions,
        });
        socket.emit('question_changed', {
          index: quiz.currentQuestionIndex,
          timestamp: Date.now(),
        });
      }
    }
  });

  socket.on('start_quiz', ({ roomCode }) => {
    const quiz = quizzes[roomCode];
    if (quiz) {
      quiz.status = 'live';
      quiz.currentQuestionIndex = 0;
      quiz.answerStats = { 0: Array(quiz.questions[0].options.length).fill(0) };
      io.to(roomCode).emit('quiz_started', {
        questions: quiz.questions,
      });
      io.to(roomCode).emit('answer_stats', quiz.answerStats[0]);
      startQuestionTimer(roomCode);
    }
  });

  socket.on('next_question', ({ roomCode, index }) => {
    const quiz = quizzes[roomCode];
    if (quiz) {
      // Clear timer if host advances manually
      if (quizTimers[roomCode]) {
        clearTimeout(quizTimers[roomCode]);
        delete quizTimers[roomCode];
      }
      quiz.currentQuestionIndex = index;
      quiz.answerStats[index] = Array(quiz.questions[index].options.length).fill(0);
      io.to(roomCode).emit('question_changed', {
        index,
        timestamp: Date.now(),
      });
      io.to(roomCode).emit('answer_stats', quiz.answerStats[index]);
      startQuestionTimer(roomCode);
    }
  });

  socket.on('submit_answer', ({ roomCode, index, answer, name }) => {
    const quiz = quizzes[roomCode];
    if (quiz) {
      const question = quiz.questions[index];
      const isCorrect = answer === question.correctIndex;
      // Update score for this player
      const participant = quiz.participants.find(p => p.id === socket.id);
      if (participant && isCorrect) participant.score += 1;
      // Track answer stats
      if (!quiz.answerStats[index]) {
        quiz.answerStats[index] = Array(question.options.length).fill(0);
      }
      quiz.answerStats[index][answer]++;
      // Emit live stats to all in room (or just host if you want)
      io.to(roomCode).emit('answer_stats', quiz.answerStats[index]);
      // Send feedback to this player only
      socket.emit('answer_feedback', {
        isCorrect,
        correctAnswer: question.options[question.correctIndex],
        feedbackText: isCorrect ? 'Great job!' : 'Better luck next time!',
      });
    }
  });

  socket.on('end_quiz', ({ roomCode }) => {
    const quiz = quizzes[roomCode];
    if (quiz) {
      quiz.status = 'ended';
      if (quizTimers[roomCode]) {
        clearTimeout(quizTimers[roomCode]);
        delete quizTimers[roomCode];
      }
      // Sort leaderboard by score descending
      const leaderboard = [...quiz.participants]
        .sort((a, b) => b.score - a.score)
        .map(({ id, name, score }) => ({ id, name, score }));
      io.to(roomCode).emit('leaderboard', leaderboard);
      io.to(roomCode).emit('quiz_ended');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected', socket.id);
    // Remove from all quizzes
    for (const roomCode in quizzes) {
      const quiz = quizzes[roomCode];
      const idx = quiz.participants.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        quiz.participants.splice(idx, 1);
        io.to(roomCode).emit('participants_updated', quiz.participants);
      }
    }
  });
});

console.log('Socket.IO server running on port 3000'); 