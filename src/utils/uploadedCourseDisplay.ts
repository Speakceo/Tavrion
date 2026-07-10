export function isInteractiveCourse(fileType?: string) {
  return fileType === 'scorm' || fileType === 'zip' || fileType === 'pdf';
}

export function getCourseFormatLabel(fileType?: string) {
  switch (fileType) {
    case 'scorm':
    case 'zip':
      return 'Interactive course';
    case 'pdf':
      return 'PDF document';
    case 'mp4':
    case 'mov':
    case 'webm':
    case 'avi':
      return 'Video';
    case 'ppt':
    case 'pptx':
      return 'Presentation';
    case 'doc':
    case 'docx':
      return 'Document';
    default:
      return 'Course material';
  }
}

export function getAssignmentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    assigned: 'Not started',
    not_started: 'Not started',
    in_progress: 'In progress',
    viewed: 'In progress',
    downloaded: 'In progress',
    completed: 'Completed',
  };
  return labels[status] || status.replace(/_/g, ' ');
}

export function getCourseActionLabel(fileType?: string, status?: string) {
  if (isInteractiveCourse(fileType)) {
    if (status === 'completed') return 'Review';
    if (status === 'in_progress' || status === 'viewed' || status === 'downloaded') return 'Continue';
    return 'Start course';
  }
  return 'Download';
}

export function getStatusBadgeClass(status: string) {
  if (status === 'completed') return 'lt-badge-success';
  if (status === 'in_progress' || status === 'viewed' || status === 'downloaded') return 'lt-badge-blue';
  return '';
}
