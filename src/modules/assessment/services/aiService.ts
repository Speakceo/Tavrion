/** AI feature stubs — wire to edge function when ready. */

export async function generateQuestions(prompt: string, count = 5) {
  return {
    questions: Array.from({ length: count }, (_, i) => ({
      title: `Generated question ${i + 1}`,
      prompt: `${prompt} (sample ${i + 1})`,
      question_type: 'multiple_choice' as const,
      options: [
        { option_text: 'Option A', is_correct: true },
        { option_text: 'Option B', is_correct: false },
      ],
    })),
    note: 'AI generation placeholder — connect assessment-ai edge function for production.',
  };
}

export async function generateAssessmentBrief(jobDescription: string) {
  return {
    title: 'Skills Assessment',
    description: `Assessment derived from: ${jobDescription.slice(0, 120)}...`,
    suggestedSkills: ['Communication', 'Problem Solving', 'Technical Aptitude'],
    note: 'AI placeholder',
  };
}

export async function summarizeCandidate(attemptId: string) {
  return {
    attemptId,
    summary: 'Candidate demonstrated solid fundamentals with room for growth in advanced topics.',
    strengths: ['Logical reasoning', 'Time management'],
    gaps: ['Depth in system design'],
    note: 'AI placeholder',
  };
}
