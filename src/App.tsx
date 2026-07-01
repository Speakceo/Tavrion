import { Component, ErrorInfo, ReactNode, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { pingSupabaseKeepalive } from './lib/supabaseKeepalive';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PagePasswordGate } from './components/PagePasswordGate';
import { BooksFeatureRoute } from './components/BooksFeatureRoute';
import { OrgFeatureGate } from './components/OrgFeatureGate';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Courses } from './pages/Courses';
import { CourseDetail } from './pages/CourseDetail';
import { LessonView } from './pages/LessonView';
import { AITutor } from './pages/AITutor';
import { MockCalls } from './pages/MockCalls';
import { LiveCalls } from './pages/LiveCalls';
import { DnaStudio } from './pages/DnaStudio';
import { TavrionBot } from './pages/TavrionBot';
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
import { OwnerBooks } from './pages/owner/Books';
import { Books } from './pages/Books';
import { TestDashboard } from './modules/assessment/pages/TestDashboard';
import { AssessmentLibrary } from './modules/assessment/pages/AssessmentLibrary';
import { AssessmentBuilder } from './modules/assessment/pages/AssessmentBuilder';
import { QuestionBank } from './modules/assessment/pages/QuestionBank';
import { TestAssignments } from './modules/assessment/pages/TestAssignments';
import { TestAnalytics } from './modules/assessment/pages/TestAnalytics';
import { TestReports } from './modules/assessment/pages/TestReports';
import { TestSessions } from './modules/assessment/pages/TestSessions';
import { TestLinks } from './modules/assessment/pages/TestLinks';
import { TakeAssessment } from './modules/assessment/pages/TakeAssessment';
import { AssessmentResult } from './modules/assessment/pages/AssessmentResult';
import { CandidateAccess } from './modules/assessment/pages/public/CandidateAccess';
import { PendingFeatures } from './modules/assessment/pages/PendingFeatures';
import { RoleTemplates } from './modules/assessment/pages/RoleTemplates';

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

function KeepaliveBoot() {
  useEffect(() => {
    pingSupabaseKeepalive();
  }, []);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <KeepaliveBoot />
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />

          {/* Public candidate assessment — no auth */}
          <Route path="/assess/:linkCode" element={<CandidateAccess />} />

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
                <OrgFeatureGate feature="ai_tutor">
                  <AITutor />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />

          <Route
            path="/mock-calls"
            element={
              <ProtectedRoute>
                <OrgFeatureGate feature="mock_calls">
                  <MockCalls />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />

          <Route
            path="/mock-calls-new"
            element={<Navigate to="/mock-calls" replace />}
          />

          <Route
            path="/live-calls"
            element={
              <ProtectedRoute>
                <OrgFeatureGate feature="live_calls">
                  <LiveCalls />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dna-studio"
            element={
              <PagePasswordGate
                title="DNA Studio"
                storageKey="tavrion_gate_dna_studio"
                description="DNA Studio is restricted. Enter the access password to open the brand analysis tools."
              >
                <DnaStudio />
              </PagePasswordGate>
            }
          />

          <Route
            path="/tavrion-bot"
            element={
              <PagePasswordGate
                title="Tavrion Bot"
                storageKey="tavrion_gate_tavrion_bot"
                description="Tavrion Bot is restricted. Enter the access password to manage chatbots and embeds."
              >
                <TavrionBot />
              </PagePasswordGate>
            }
          />

          <Route
            path="/social"
            element={
              <ProtectedRoute>
                <OrgFeatureGate feature="social">
                  <Social />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />

          <Route
            path="/polls"
            element={
              <ProtectedRoute>
                <OrgFeatureGate feature="polls">
                  <Polls />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />

          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <OrgFeatureGate feature="events">
                  <Events />
                </OrgFeatureGate>
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
                <OrgFeatureGate feature="shots">
                  <Shots />
                </OrgFeatureGate>
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
                <OrgFeatureGate feature="vault">
                  <Vault />
                </OrgFeatureGate>
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
                <OrgFeatureGate feature="best_calls">
                  <BestCalls />
                </OrgFeatureGate>
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
                <OrgFeatureGate feature="best_calls">
                  <AdminBestCalls />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/email-nudges"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <OrgFeatureGate feature="email_nudges">
                  <EmailNudges />
                </OrgFeatureGate>
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

          {/* Tavrion Test — Assessment & Hiring (admin header toggle) */}
          <Route
            path="/test"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <OrgFeatureGate feature="tavrion_test">
                  <TestDashboard />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/library"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <OrgFeatureGate feature="tavrion_test">
                  <AssessmentLibrary />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/library/:id/builder"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <OrgFeatureGate feature="tavrion_test">
                  <AssessmentBuilder />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/questions"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <OrgFeatureGate feature="tavrion_test">
                  <QuestionBank />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/assignments"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <OrgFeatureGate feature="tavrion_test">
                  <TestAssignments />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/analytics"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <OrgFeatureGate feature="tavrion_test">
                  <TestAnalytics />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/sessions"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <OrgFeatureGate feature="tavrion_test">
                  <TestSessions />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/links"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <OrgFeatureGate feature="tavrion_test">
                  <TestLinks />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/reports"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <OrgFeatureGate feature="tavrion_test">
                  <TestReports />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/templates"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <OrgFeatureGate feature="tavrion_test">
                  <RoleTemplates />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/roadmap"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'trainer']}>
                <OrgFeatureGate feature="tavrion_test">
                  <PendingFeatures />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/take/:assignmentId"
            element={
              <ProtectedRoute>
                <OrgFeatureGate feature="tavrion_test">
                  <TakeAssessment />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/result/:attemptId"
            element={
              <ProtectedRoute>
                <OrgFeatureGate feature="tavrion_test">
                  <AssessmentResult />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />

          <Route
            path="/certificates"
            element={
              <ProtectedRoute>
                <OrgFeatureGate feature="certificates">
                  <Certificates />
                </OrgFeatureGate>
              </ProtectedRoute>
            }
          />

          <Route
            path="/books"
            element={
              <ProtectedRoute>
                <BooksFeatureRoute>
                  <Books />
                </BooksFeatureRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/books/:collectionId"
            element={
              <ProtectedRoute>
                <BooksFeatureRoute>
                  <Books />
                </BooksFeatureRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/books/:collectionId/read/:documentId"
            element={
              <ProtectedRoute>
                <BooksFeatureRoute>
                  <Books />
                </BooksFeatureRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/owner/books"
            element={
              <ProtectedRoute ownerOnly>
                <OwnerBooks />
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
            path="/owner/organizations/new"
            element={
              <ProtectedRoute ownerOnly>
                <OrgDetail />
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

          <Route path="/home" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
