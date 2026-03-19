import axios from 'axios';
import { Assignment, FormValues } from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
});

export async function createAssignment(form: FormValues): Promise<{ assignmentId: string; jobId: string }> {
  const fd = new FormData();
  fd.append('title', form.title);
  fd.append('subject', form.subject);
  fd.append('dueDate', form.dueDate);
  fd.append('questionTypes', JSON.stringify(form.questionTypes));
  fd.append('totalQuestions', String(form.totalQuestions));
  fd.append('totalMarks', String(form.totalMarks));
  fd.append('difficulty', form.difficulty);
  fd.append('additionalInstructions', form.additionalInstructions);
  if (form.file) fd.append('file', form.file);

  const { data } = await api.post('/assignments', fd);
  return data;
}

export async function getAssignment(id: string): Promise<Assignment> {
  const { data } = await api.get(`/assignments/${id}`);
  return data;
}

export async function getAssignments(): Promise<Assignment[]> {
  const { data } = await api.get('/assignments');
  return data;
}

export async function regenerateAssignment(id: string): Promise<{ jobId: string }> {
  const { data } = await api.post(`/assignments/${id}/regenerate`);
  return data;
}

export function createWebSocket(assignmentId: string): WebSocket {
  const wsBase = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000').replace(/^http/, 'ws');
  return new WebSocket(`${wsBase}/ws?assignmentId=${assignmentId}`);
}
