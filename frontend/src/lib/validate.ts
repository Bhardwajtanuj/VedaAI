import { FormValues } from '@/types';

export function validateForm(form: FormValues): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};

  if (!form.title.trim()) errors.title = 'Assignment title is required';
  if (!form.subject.trim()) errors.subject = 'Subject is required';
  if (!form.dueDate) errors.dueDate = 'Due date is required';
  else if (new Date(form.dueDate) < new Date()) errors.dueDate = 'Due date must be in the future';

  if (form.questionTypes.length === 0) errors.questionTypes = 'Select at least one question type';

  if (form.totalQuestions === '' || form.totalQuestions === undefined) {
    errors.totalQuestions = 'Number of questions is required';
  } else if (Number(form.totalQuestions) <= 0) {
    errors.totalQuestions = 'Must be a positive number';
  } else if (Number(form.totalQuestions) > 100) {
    errors.totalQuestions = 'Maximum 100 questions allowed';
  }

  if (form.totalMarks === '' || form.totalMarks === undefined) {
    errors.totalMarks = 'Total marks is required';
  } else if (Number(form.totalMarks) <= 0) {
    errors.totalMarks = 'Must be a positive number';
  }

  return errors;
}
