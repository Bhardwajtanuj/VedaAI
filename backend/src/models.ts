import mongoose, { Schema, Document } from "mongoose";

export interface IQuestion {
  text: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  type: string;
}

export interface ISection {
  title: string;
  instruction: string;
  questions: IQuestion[];
  totalMarks: number;
}

export interface IAssignment extends Document {
  title: string;
  subject: string;
  dueDate: Date;
  questionTypes: string[];
  totalQuestions: number;
  totalMarks: number;
  difficulty: string;
  additionalInstructions: string;
  fileContent?: string;
  status: "pending" | "processing" | "completed" | "failed";
  jobId?: string;
  result?: {
    sections: ISection[];
    metadata: {
      totalMarks: number;
      totalQuestions: number;
      generatedAt: Date;
    };
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  text: { type: String, required: true },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  marks: { type: Number, required: true },
  type: { type: String, required: true },
});

const SectionSchema = new Schema<ISection>({
  title: { type: String, required: true },
  instruction: { type: String, required: true },
  questions: [QuestionSchema],
  totalMarks: { type: Number, required: true },
});

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    dueDate: { type: Date, required: true },
    questionTypes: [{ type: String }],
    totalQuestions: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    difficulty: { type: String, required: true },
    additionalInstructions: { type: String, default: "" },
    fileContent: { type: String },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    jobId: { type: String },
    result: {
      sections: [SectionSchema],
      metadata: {
        totalMarks: Number,
        totalQuestions: Number,
        generatedAt: Date,
      },
    },
    error: { type: String },
  },
  { timestamps: true }
);

export const Assignment = mongoose.model<IAssignment>("Assignment", AssignmentSchema);
