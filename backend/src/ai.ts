import Anthropic from "@anthropic-ai/sdk";
import { ISection } from "./models";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateParams {
  title: string;
  subject: string;
  questionTypes: string[];
  totalQuestions: number;
  totalMarks: number;
  difficulty: string;
  additionalInstructions: string;
  fileContent?: string;
}

interface GeneratedPaper {
  sections: ISection[];
  metadata: {
    totalMarks: number;
    totalQuestions: number;
    generatedAt: Date;
  };
}

function buildPrompt(params: GenerateParams): string {
  const typeDistribution = params.questionTypes.join(", ");
  const marksPerQuestion = Math.floor(params.totalMarks / params.totalQuestions);

  const contextSection = params.fileContent
    ? `\nReference Material:\n${params.fileContent.substring(0, 3000)}\n`
    : "";

  return `You are an expert exam paper creator. Generate a structured question paper in valid JSON format only.

Assignment: ${params.title}
Subject: ${params.subject}
Total Questions: ${params.totalQuestions}
Total Marks: ${params.totalMarks}
Marks per Question (approx): ${marksPerQuestion}
Question Types: ${typeDistribution}
Overall Difficulty: ${params.difficulty}
Additional Instructions: ${params.additionalInstructions || "None"}
${contextSection}

Rules:
- Distribute questions into 2-3 sections (Section A, B, C) based on question types
- Mix difficulties: easy/medium/hard based on overall difficulty setting
- If difficulty is "easy": 60% easy, 30% medium, 10% hard
- If difficulty is "medium": 20% easy, 60% medium, 20% hard  
- If difficulty is "hard": 10% easy, 30% medium, 60% hard
- Each section should have a clear instruction line
- Questions must be relevant to the subject
- Marks per question should reflect difficulty (harder = more marks)
- Total marks across all sections must equal exactly ${params.totalMarks}

Respond ONLY with this exact JSON structure, no markdown, no extra text:
{
  "sections": [
    {
      "title": "Section A",
      "instruction": "Attempt all questions.",
      "totalMarks": 20,
      "questions": [
        {
          "text": "Question text here",
          "type": "mcq",
          "difficulty": "easy",
          "marks": 2
        }
      ]
    }
  ]
}`;
}

export async function generateAssessment(params: GenerateParams): Promise<GeneratedPaper> {
  const prompt = buildPrompt(params);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  let parsed: { sections: ISection[] };
  try {
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response into valid JSON");
  }

  if (!parsed.sections || !Array.isArray(parsed.sections)) {
    throw new Error("AI response missing sections array");
  }

  let actualTotalMarks = 0;
  let actualTotalQuestions = 0;

  const validatedSections: ISection[] = parsed.sections.map((section) => {
    const questions = (section.questions || []).map((q) => {
      actualTotalMarks += q.marks || 0;
      actualTotalQuestions += 1;
      return {
        text: q.text || "Question text",
        difficulty: (q.difficulty as "easy" | "medium" | "hard") || "medium",
        marks: q.marks || 1,
        type: q.type || "short-answer",
      };
    });

    const sectionMarks = questions.reduce((sum, q) => sum + q.marks, 0);

    return {
      title: section.title || "Section",
      instruction: section.instruction || "Attempt all questions.",
      questions,
      totalMarks: sectionMarks,
    };
  });

  return {
    sections: validatedSections,
    metadata: {
      totalMarks: actualTotalMarks,
      totalQuestions: actualTotalQuestions,
      generatedAt: new Date(),
    },
  };
}
