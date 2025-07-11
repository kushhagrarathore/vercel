export const formTemplates = {
  feedback: {
    title: "Feedback Form",
    description: "Collect feedback and suggestions easily.",
    questions: [
      { question_type: "short-text", question_text: "Name", required: false, options: [] },
      { question_type: "short-text", question_text: "Email", required: false, options: [] },
      { question_type: "long-text", question_text: "Your Feedback", required: true, options: [] },
      { question_type: "multiple-choice", question_text: "How satisfied are you?", required: true, options: ["Very Satisfied", "Satisfied", "Neutral", "Unsatisfied"] }
    ]
  },
  contact: {
    title: "Contact Form",
    description: "Let users reach out to you quickly.",
    questions: [
      { question_type: "short-text", question_text: "Name", required: true, options: [] },
      { question_type: "short-text", question_text: "Email", required: true, options: [] },
      { question_type: "long-text", question_text: "Message", required: true, options: [] }
    ]
  },
  survey: {
    title: "Survey Form",
    description: "Create surveys to gather opinions and data.",
    questions: [
      { question_type: "short-text", question_text: "Name", required: false, options: [] },
      { question_type: "multiple-choice", question_text: "How did you hear about us?", required: true, options: ["Social Media", "Friend", "Other"] },
      { question_type: "long-text", question_text: "Additional Comments", required: false, options: [] }
    ]
  }
}; 