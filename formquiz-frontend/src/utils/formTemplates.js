export const formTemplates = {
  feedback: {
    title: "Feedback Form",
    description: "Collect feedback and suggestions easily.",
    questions: [
      { type: "short-text", question_text: "Name", required: false, options: [] },
      { type: "short-text", question_text: "Email", required: false, options: [] },
      { type: "long-text", question_text: "Your Feedback", required: true, options: [] },
      { type: "multiple-choice", question_text: "How satisfied are you?", required: true, options: ["Very Satisfied", "Satisfied", "Neutral", "Unsatisfied"] }
    ]
  },
  contact: {
    title: "Contact Form",
    description: "Let users reach out to you quickly.",
    questions: [
      { type: "short-text", question_text: "Name", required: true, options: [] },
      { type: "short-text", question_text: "Email", required: true, options: [] },
      { type: "long-text", question_text: "Message", required: true, options: [] }
    ]
  },
  survey: {
    title: "Survey Form",
    description: "Create surveys to gather opinions and data.",
    questions: [
      { type: "short-text", question_text: "Name", required: false, options: [] },
      { type: "multiple-choice", question_text: "How did you hear about us?", required: true, options: ["Social Media", "Friend", "Other"] },
      { type: "long-text", question_text: "Additional Comments", required: false, options: [] }
    ]
  }
}; 