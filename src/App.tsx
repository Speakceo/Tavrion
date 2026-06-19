import { Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Courses } from './pages/Courses';
import { CourseDetail } from './pages/CourseDetail';
import { LessonView } from './pages/LessonView';
import { AITutor } from './pages/AITutor';
import { MockCalls } from './pages/MockCalls';
import { MockCallsNew } from './pages/MockCallsNew';
import { LiveCalls } from './pages/LiveCalls';
import { Social } from './pages/Social';
import { Polls } from './pages/Polls';
import { Events } from './pages/Events';
import { Saved } from './pages/Saved';
import { Shots } from './pages/Shots';
import { MyTeam } from './pages/MyTeam';
import { Vault } from './pages/Vault';
import { MySpace } from './pages/MySpace';
import { RecentLearning } from './pages/RecentLearning';
import { CompletedLearning } from './pages/CompletedLearning';
import { BestCalls } from './pages/BestCalls';
import { AdminUsers } from './pages/admin/Users';
import { Teams } from './pages/admin/Teams';
import { AdminCourses } from './pages/admin/AdminCourses';
import { Analytics } from './pages/admin/Analytics';
import { AIGenerate } from './pages/admin/AIGenerate';
import { CourseReport } from './pages/admin/CourseReport';
import CourseEditor from './pages/admin/CourseEditor';
import { UploadedCourses } from './pages/admin/UploadedCourses';
import { CourseTracking } from './pages/admin/CourseTracking';
import { BestCalls as AdminBestCalls } from './pages/admin/BestCalls';
import { EmailNudges } from './pages/admin/EmailNudges';
import { CourseAssignmentRules } from './pages/admin/CourseAssignmentRules';
import { PolicyVersions } from './pages/admin/PolicyVersions';
import { Certificates } from './pages/Certificates';
import { OwnerDashboard } from './pages/owner/Dashboard';
import { OrgDetail } from './pages/owner/OrgDetail';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>Something went wrong</h1>
          <pre>{this.state.error?.message}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses/:courseId"
            element={
              <ProtectedRoute>
                <CourseDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/lesson/:lessonId"
            element={
              <ProtectedRoute>
                <LessonView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ai-tutor"
            element={
              <ProtectedRoute>
                <AITutor />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mock-calls"
            element={
              <ProtectedRoute>
                <MockCalls />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mock-calls-new"
            element={
              <ProtectedRoute>
                <MockCallsNew />
              </ProtectedRoute>
            }
          />

          <Route
            path="/live-calls"
            element={
              <ProtectedRoute>
                <LiveCalls />
              </ProtectedRoute>
            }
          />

          <Route
            path="/social"
            element={
              <ProtectedRoute>
                <Social />
              </ProtectedRoute>
            }
          />

          <Route
            path="/polls"
            element={
              <ProtectedRoute>
                <Polls />
              </ProtectedRoute>
            }
          />

          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <Events />
              </ProtectedRoute>
            }
          />

          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <Saved />
              </ProtectedRoute>
            }
          />

          <Route
            path="/shots"
            element={
              <ProtectedRoute>
                <Shots />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-team"
            element={
              <ProtectedRoute>
                <MyTeam />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vault"
            element={
              <ProtectedRoute>
                <Vault />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-space"
            element={
              <ProtectedRoute>
                <MySpace />
              </ProtectedRoute>
            }
          />

          <Route
            path="/recent-learning"
            element={
              <ProtectedRoute>
                <RecentLearning />
              </ProtectedRoute>
            }
          />

          <Route
            path="/completed-learning"
            element={
              <ProtectedRoute>
                <CompletedLearning />
              </ProtectedRoute>
            }
          />

          <Route
            path="/best-calls"
            element={
              <ProtectedRoute>
                <BestCalls />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/teams"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <Teams />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/courses"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <AdminCourses />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/courses/generate"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <AIGenerate />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/courses/new"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <CourseEditor />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/courses/:courseId/edit"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <CourseEditor />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <Analytics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/courses/:courseId/report"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <CourseReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/uploaded-courses"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <UploadedCourses />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/course-tracking"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <CourseTracking />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/best-calls"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <AdminBestCalls />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/email-nudges"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <EmailNudges />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/assignment-rules"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <CourseAssignmentRules />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/policy-versions"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <PolicyVersions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/certificates"
            element={
              <ProtectedRoute>
                <Certificates />
              </ProtectedRoute>
            }
          />

          <Route
            path="/owner"
            element={
              <ProtectedRoute ownerOnly>
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/owner/organizations/:orgId"
            element={
              <ProtectedRoute ownerOnly>
                <OrgDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/owner/organizations/new"
            element={
              <ProtectedRoute ownerOnly>
                <OrgDetail />
              </ProtectedRoute>
            }
          />

          <Route path="/home" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
