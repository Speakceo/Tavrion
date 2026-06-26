import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Award, Sparkles } from 'lucide-react';

interface CourseCompletionCelebrationProps {
  courseTitle: string;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#0a72ef', '#16a34a', '#de1d8d', '#f59e0b', '#8b5cf6', '#ff5b4f'];

export function CourseCompletionCelebration({ courseTitle, onClose }: CourseCompletionCelebrationProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="course-complete-overlay" role="dialog" aria-modal="true" aria-labelledby="course-complete-title">
      <div className="course-complete-confetti" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => (
          <span
            key={i}
            className="course-complete-confetti-piece"
            style={{
              left: `${(i * 17) % 100}%`,
              animationDelay: `${(i % 8) * 0.12}s`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              width: i % 3 === 0 ? 10 : 7,
              height: i % 2 === 0 ? 14 : 10,
            }}
          />
        ))}
      </div>

      <div className="course-complete-card">
        <div className="course-complete-badge">
          <Sparkles size={18} color="#16a34a" />
        </div>
        <div className="course-complete-check" aria-hidden="true">
          <svg viewBox="0 0 52 52" className="course-complete-check-svg">
            <circle className="course-complete-check-circle" cx="26" cy="26" r="24" fill="none" />
            <path className="course-complete-check-mark" fill="none" d="M14 27l8 8 16-18" />
          </svg>
        </div>
        <h2 id="course-complete-title" className="course-complete-title">Course complete!</h2>
        <p className="course-complete-subtitle">
          Great work finishing <strong>{courseTitle}</strong>
        </p>
        <p className="course-complete-note">Your certificate has been added to your profile.</p>
        <div className="course-complete-actions">
          <Link to="/certificates" className="lt-btn-primary course-complete-btn" onClick={onClose}>
            <Award size={15} />
            View certificate
          </Link>
          <button type="button" className="lt-btn-secondary course-complete-btn" onClick={onClose}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
