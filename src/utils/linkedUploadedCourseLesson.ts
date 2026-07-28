import type { Lesson, LessonType } from '../types';

export type LinkedUploadedCourseContent = {
  kind?: 'uploaded_course';
  uploaded_course_id?: string;
  title?: string;
  description?: string;
  file_name?: string;
  file_path?: string;
  file_type?: string;
};

export function isLinkedUploadedCourseLesson(
  type: string | undefined,
  content: unknown,
): content is LinkedUploadedCourseContent {
  if (type === 'uploaded_course') return true;
  return type === 'scorm'
    && !!content
    && typeof content === 'object'
    && (content as LinkedUploadedCourseContent).kind === 'uploaded_course';
}

export function getLinkedUploadedCourseContent(content: unknown): LinkedUploadedCourseContent | null {
  if (!content || typeof content !== 'object') return null;
  const linked = content as LinkedUploadedCourseContent;
  if (!linked.file_path || !linked.file_type) return null;
  return linked;
}

export function normalizeLessonForEditor(lesson: Lesson) {
  if (isLinkedUploadedCourseLesson(lesson.type, lesson.content)) {
    return {
      ...lesson,
      type: 'uploaded_course' as LessonType,
      content: lesson.content,
    };
  }

  if (lesson.type === 'quiz' && lesson.content && typeof lesson.content !== 'string') {
    return {
      ...lesson,
      content: JSON.stringify(lesson.content, null, 2),
    };
  }

  return lesson;
}

export function buildPersistedLesson(lesson: {
  type: LessonType;
  title?: string;
  content: unknown;
}): { type: LessonType; content: unknown } {
  if (lesson.type === 'uploaded_course') {
    const content = lesson.content && typeof lesson.content === 'object'
      ? lesson.content as LinkedUploadedCourseContent
      : {};
    if (!content.uploaded_course_id || !content.file_path || !content.file_type) {
      throw new Error(`Select an uploaded course for lesson "${lesson.title || 'Untitled lesson'}".`);
    }

    return {
      type: 'scorm',
      content: {
        ...content,
        kind: 'uploaded_course',
      },
    };
  }

  return {
    type: lesson.type,
    content: lesson.content,
  };
}
