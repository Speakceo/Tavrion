import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import { ScormPlayer } from '../../components/ScormPlayer';
import { Upload, FileText, Users, Trash2, Download, Eye, Calendar, Search, Filter, Brain, CheckCircle, AlertTriangle, XCircle, PlusCircle, RefreshCw } from 'lucide-react';
import { validateScormPackage, extractScormMetadata, type ScormValidationResult } from '../../utils/scormValidator';
import { createScormPackage, type ScormCourseData } from '../../utils/scormCreator';
import { convertScormForCompatibility, needsConversion, type ConversionResult } from '../../utils/scormConverter';
import { getCourseFormatLabel } from '../../utils/uploadedCourseDisplay';
import {
  buildExtractedScormStoragePrefix,
  scanScormZip,
  uploadScormZipExtracted,
} from '../../utils/scormStorage';
import { uploadLargeFile } from '../../utils/chunkedUpload';
import {
  uploadCourseThumbnail,
  removeCourseStoragePaths,
  validateThumbnailFile,
} from '../../utils/uploadedCourseMedia';
import { UploadedCourseCover } from '../../components/UploadedCourseCover';
import { applyOrgUserScope, filterByDepartment, uniqueSortedStrings } from '../../utils/orgUsers';
import { applyOrgScope, orgIdForInsert } from '../../utils/orgScope';

interface UploadedCourse {
  id: string;
  title: string;
  description: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: string;
  thumbnail_path?: string | null;
  uploaded_by: string;
  created_at: string;
  uploader?: {
    full_name: string;
    email: string;
  };
  quiz?: {
    enabled: boolean;
    passing_score: number;
  } | null;
}

export function UploadedCourses() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<UploadedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [certificateTemplate, setCertificateTemplate] = useState<'classic' | 'modern' | 'executive'>('classic');
  const [selectedCourse, setSelectedCourse] = useState<UploadedCourse | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [previewCourse, setPreviewCourse] = useState<UploadedCourse | null>(null);
  const [scormValidation, setScormValidation] = useState<ScormValidationResult | null>(null);
  const [scormZipScan, setScormZipScan] = useState<Awaited<ReturnType<typeof scanScormZip>> | null>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [showCreateScormModal, setShowCreateScormModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createScormForm, setCreateScormForm] = useState({
    title: '',
    description: '',
    htmlContent: '',
    version: '1.2' as '1.2' | '2004',
    category: 'general',
  });

  const [thumbnailUploading, setThumbnailUploading] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'general',
    file: null as File | null,
    thumbnail: null as File | null,
    enableQuiz: false,
    passingScore: 70,
    quizQuestions: [] as Array<{
      question: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOption: 'a' | 'b' | 'c' | 'd';
      points: number;
    }>,
  });

  useEffect(() => {
    loadCourses();
    if (profile) loadUsers();
  }, [profile]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('uploaded_courses')
        .select(`
          *,
          uploader:user_profiles!uploaded_courses_uploaded_by_fkey(full_name, email),
          quiz:uploaded_course_quizzes(enabled, passing_score)
        `)
        .order('created_at', { ascending: false });
      query = applyOrgScope(query, profile);
      const { data, error } = await query;

      if (error) throw error;
      const processedData = (data || []).map((course: any) => ({
        ...course,
        quiz: Array.isArray(course.quiz) && course.quiz.length > 0 ? course.quiz[0] : course.quiz,
      }));
      setCourses(processedData);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await applyOrgUserScope(
        supabase
          .from('user_profiles')
          .select('id, email, full_name, role, department')
          .in('role', ['employee', 'trainer', 'partner'])
          .eq('is_active', true)
          .order('full_name'),
        profile,
      );

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const departments = uniqueSortedStrings(users.map((u) => u.department));
  const filteredAssignUsers = filterByDepartment(users, departmentFilter);
  const allowedUserIds = new Set(users.map((u) => u.id));

  const attachThumbnail = async (courseId: string, thumbnail: File, previousPath?: string | null) => {
    const thumbPath = await uploadCourseThumbnail(thumbnail, courseId);
    const { error } = await supabase
      .from('uploaded_courses')
      .update({ thumbnail_path: thumbPath, updated_at: new Date().toISOString() })
      .eq('id', courseId);
    if (error) {
      await removeCourseStoragePaths([thumbPath]);
      throw error;
    }
    if (previousPath) await removeCourseStoragePaths([previousPath]);
    return thumbPath;
  };

  const handleFileChange = async (file: File | null) => {
    setUploadForm({ ...uploadForm, file });
    setScormValidation(null);
    setScormZipScan(null);
    setConversionResult(null);

    if (!file) return;

    const fileType = file.name.split('.').pop()?.toLowerCase();
    const maxValidationSize = 500 * 1024 * 1024;

    if (fileType === 'zip') {
      if (file.size > maxValidationSize) {
        setScormValidation({
          isValid: true,
          version: 'unknown',
          errors: [],
          warnings: ['File too large for automatic validation (>500MB). Upload will proceed without validation.'],
        });
        return;
      }

      setValidating(true);
      try {
        const [validation, zipScan] = await Promise.all([
          validateScormPackage(file),
          scanScormZip(file),
        ]);
        setScormValidation(validation);
        setScormZipScan(zipScan);

        if (validation.isValid && validation.title && !uploadForm.title) {
          setUploadForm(prev => ({
            ...prev,
            title: validation.title || '',
            description: validation.description || prev.description,
          }));
        }

        if (validation.isValid || validation.errors.length > 0) {
          setConverting(true);
          try {
            const conversion = await convertScormForCompatibility(file);
            setConversionResult(conversion);

            if (conversion.success && conversion.convertedBlob) {
              const convertedFile = new File(
                [conversion.convertedBlob],
                file.name.replace('.zip', '_compatible.zip'),
                { type: 'application/zip' }
              );
              setUploadForm(prev => ({ ...prev, file: convertedFile }));
            }
          } catch (error) {
            console.error('Error converting SCORM package:', error);
          } finally {
            setConverting(false);
          }
        }
      } catch (error) {
        console.error('Error validating SCORM package:', error);
      } finally {
        setValidating(false);
      }
    }
  };

  const handleCreateScorm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createScormForm.title.trim() || !createScormForm.htmlContent.trim()) {
      alert('Please provide a title and content');
      return;
    }

    try {
      setCreating(true);

      const scormBlob = await createScormPackage({
        title: createScormForm.title,
        description: createScormForm.description,
        htmlContent: createScormForm.htmlContent,
        version: createScormForm.version,
      });

      const timestamp = Date.now();
      const fileName = `${createScormForm.title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.zip`;
      const scormFile = new File([scormBlob], fileName, { type: 'application/zip' });
      const filePath = buildExtractedScormStoragePrefix(fileName, timestamp);

      await uploadScormZipExtracted(scormFile, filePath);

      const { error: dbError } = await supabase
        .from('uploaded_courses')
        .insert({
          title: createScormForm.title,
          description: createScormForm.description,
          file_name: fileName,
          file_path: filePath,
          file_type: 'scorm',
          file_size: scormBlob.size,
          category: createScormForm.category,
          uploaded_by: profile?.id,
          organization_id: orgIdForInsert(profile),
        });

      if (dbError) {
        await removeCourseStoragePaths([filePath]);
        throw dbError;
      }

      alert('SCORM course created successfully!');
      setShowCreateScormModal(false);
      setCreateScormForm({
        title: '',
        description: '',
        htmlContent: '',
        version: '1.2',
        category: 'general',
      });
      loadCourses();
    } catch (error: any) {
      console.error('Error creating SCORM course:', error);
      alert('Failed to create SCORM course: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadForm.file || !uploadForm.title.trim()) {
      alert('Please provide a title and select a file');
      return;
    }

    const maxSizeBytes = 1000 * 1024 * 1024; // 1000 MB (1 GB)
    if (uploadForm.file.size > maxSizeBytes) {
      alert('File size exceeds the 1 GB limit. Please choose a smaller file.');
      return;
    }

    const fileType = uploadForm.file.name.split('.').pop()?.toLowerCase();
    const allowedTypes = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'zip', 'mp4', 'mov', 'avi', 'webm', 'xlsx', 'xls', 'csv', 'txt', 'md'];
    if (!allowedTypes.includes(fileType || '')) {
      alert('Supported formats: PDF, PPT, PPTX, DOC, DOCX, ZIP (SCORM), Videos (MP4, MOV, AVI, WEBM), Excel, CSV, TXT, MD');
      return;
    }

    if (uploadForm.enableQuiz && uploadForm.quizQuestions.length === 0) {
      alert('Add at least one quiz question or disable the quiz.');
      return;
    }

    if (uploadForm.thumbnail) {
      const thumbError = validateThumbnailFile(uploadForm.thumbnail);
      if (thumbError) {
        alert(thumbError);
        return;
      }
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const timestamp = Date.now();
      const sanitizedFileName = uploadForm.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const isScormZip = fileType === 'zip';
      const filePath = isScormZip
        ? buildExtractedScormStoragePrefix(sanitizedFileName, timestamp)
        : `${timestamp}_${sanitizedFileName}`;

      if (isScormZip) {
        const zipScan = scormZipScan || await scanScormZip(uploadForm.file);
        if (zipScan.oversizedEntry) {
          const name = zipScan.oversizedEntry.path.split('/').pop() || zipScan.oversizedEntry.path;
          throw new Error(
            `"${name}" inside the SCORM package is too large for storage. Each file must be under 50 MB on the current Supabase plan.`,
          );
        }
      }

      const fileSizeInMB = uploadForm.file.size / (1024 * 1024);
      console.log(`Uploading ${fileSizeInMB.toFixed(2)} MB file to path: ${filePath}`);

      const uploadStartTime = Date.now();

      const progressInterval = setInterval(() => {
        if (isScormZip) return;
        setUploadProgress(prev => {
          if (prev >= 95) return prev;
          const increment = fileSizeInMB > 500 ? 0.5 : 2;
          return prev + increment;
        });
      }, 2000);

      try {
        if (isScormZip) {
          // Always extract SCORM ZIPs so media/assets stream correctly on playback.
          console.log('Extracting SCORM ZIP and uploading files individually...');
          await uploadScormZipExtracted(uploadForm.file, filePath, (pct, message) => {
            clearInterval(progressInterval);
            setUploadProgress(pct);
            console.log(`[SCORM upload] ${pct}% — ${message}`);
          });
        } else {
          console.log('Starting upload to Supabase storage...');
          console.log('File size:', fileSizeInMB.toFixed(2), 'MB');
          console.log('Upload path:', filePath);

          const uploadResult = await uploadLargeFile({
            bucket: 'course-files',
            path: filePath,
            file: uploadForm.file,
            context: 'course',
            onProgress: (progress) => {
              clearInterval(progressInterval);
              setUploadProgress(progress);
            },
          });

          if (!uploadResult.success || uploadResult.error) {
            console.error('Upload failed:', uploadResult.error);
            const errorMessage = uploadResult.error?.message || 'Upload failed';
            throw new Error(errorMessage);
          }

          console.log('Upload successful:', uploadResult.data);
        }

        clearInterval(progressInterval);
        setUploadProgress(100);

        const uploadDuration = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
        console.log(`Upload completed in ${uploadDuration} seconds`);
      } catch (uploadErr: any) {
        clearInterval(progressInterval);
        console.error('Upload exception:', uploadErr);
        if (uploadErr.message) {
          throw uploadErr;
        }
        throw new Error('Upload failed due to a network error. Please check your connection and try again.');
      }

      const storedFileType = isScormZip ? 'scorm' : fileType;

      const { data: courseData, error: dbError } = await supabase
        .from('uploaded_courses')
        .insert({
          title: uploadForm.title,
          description: uploadForm.description,
          file_name: uploadForm.file.name,
          file_path: filePath,
          file_type: storedFileType,
          file_size: uploadForm.file.size,
          category: uploadForm.category,
          uploaded_by: profile?.id,
          organization_id: orgIdForInsert(profile),
        })
        .select()
        .single();

      if (dbError) {
        await removeCourseStoragePaths([filePath]);
        throw dbError;
      }

      try {
        if (uploadForm.thumbnail) {
          await attachThumbnail(courseData.id, uploadForm.thumbnail);
        }

        if (uploadForm.enableQuiz && uploadForm.quizQuestions.length > 0) {
          const { data: quizData, error: quizError } = await supabase
            .from('uploaded_course_quizzes')
            .insert({
              course_id: courseData.id,
              enabled: true,
              passing_score: uploadForm.passingScore,
            })
            .select()
            .single();

          if (quizError) throw quizError;

          const questions = uploadForm.quizQuestions.map((q, index) => ({
            quiz_id: quizData.id,
            question_text: q.question,
            option_a: q.optionA,
            option_b: q.optionB,
            option_c: q.optionC,
            option_d: q.optionD,
            correct_option: q.correctOption,
            points: q.points,
            order_index: index,
          }));

          const { error: questionsError } = await supabase
            .from('uploaded_course_quiz_questions')
            .insert(questions);

          if (questionsError) throw questionsError;
        }
      } catch (followUpError) {
        await supabase.from('uploaded_courses').delete().eq('id', courseData.id);
        await removeCourseStoragePaths([filePath]);
        throw followUpError;
      }

      alert('Course uploaded successfully!');
      setShowUploadModal(false);
      setUploadForm({
        title: '',
        description: '',
        category: 'general',
        file: null,
        thumbnail: null,
        enableQuiz: false,
        passingScore: 70,
        quizQuestions: [],
      });
      loadCourses();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert('Failed to upload course: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (course: UploadedCourse) => {
    if (!confirm(`Delete "${course.title}"? This will remove all assignments.`)) return;

    try {
      await removeCourseStoragePaths([course.file_path, course.thumbnail_path]);

      const { error: dbError } = await supabase
        .from('uploaded_courses')
        .delete()
        .eq('id', course.id);

      if (dbError) throw dbError;

      alert('Course deleted successfully!');
      loadCourses();
    } catch (error: any) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course: ' + error.message);
    }
  };

  const handleAssign = async () => {
    if (!selectedCourse || selectedUsers.size === 0) {
      alert('Please select at least one user');
      return;
    }

    try {
      const validUserIds = Array.from(selectedUsers).filter((id) => allowedUserIds.has(id));
      if (validUserIds.length === 0) {
        alert('No valid users selected for your organisation.');
        return;
      }

      const assignments = validUserIds.map((userId) => ({
        course_id: selectedCourse.id,
        user_id: userId,
        assigned_by: profile?.id,
        status: 'assigned',
        certificate_template: certificateTemplate,
      }));

      const { error } = await supabase
        .from('uploaded_course_assignments')
        .upsert(assignments, {
          onConflict: 'course_id,user_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      alert(`Course assigned to ${validUserIds.length} user(s) successfully!`);
      setShowAssignModal(false);
      setSelectedCourse(null);
      setSelectedUsers(new Set());
    } catch (error: any) {
      console.error('Error assigning course:', error);
      alert('Failed to assign course: ' + error.message);
    }
  };

  const handleDownload = async (course: UploadedCourse) => {
    try {
      if (course.file_type === 'scorm' || course.file_path.startsWith('extracted/scorm/')) {
        alert('This course is stored as an extracted SCORM package for reliable playback. Use Preview to open it.');
        return;
      }

      const { data, error } = await supabase.storage
        .from('course-files')
        .download(course.file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = course.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      alert('Failed to download file: ' + error.message);
    }
  };

  const handleThumbnailChange = async (course: UploadedCourse, file: File | null) => {
    if (!file) return;
    const thumbError = validateThumbnailFile(file);
    if (thumbError) {
      alert(thumbError);
      return;
    }

    try {
      setThumbnailUploading(true);
      await attachThumbnail(course.id, file, course.thumbnail_path);
      alert('Thumbnail updated.');
      loadCourses();
    } catch (error: any) {
      console.error('Error updating thumbnail:', error);
      alert('Failed to update thumbnail: ' + error.message);
    } finally {
      setThumbnailUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileIcon = (type: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      pdf: <FileText className="w-8 h-8 text-red-600" />,
      ppt: <FileText className="w-8 h-8 text-orange-600" />,
      pptx: <FileText className="w-8 h-8 text-orange-600" />,
      doc: <FileText className="w-8 h-8 text-blue-600" />,
      docx: <FileText className="w-8 h-8 text-blue-600" />,
      zip: <FileText className="w-8 h-8 text-green-600" />,
      mp4: <FileText className="w-8 h-8 text-purple-600" />,
      mov: <FileText className="w-8 h-8 text-purple-600" />,
      avi: <FileText className="w-8 h-8 text-purple-600" />,
      webm: <FileText className="w-8 h-8 text-purple-600" />,
      xlsx: <FileText className="w-8 h-8 text-green-600" />,
      xls: <FileText className="w-8 h-8 text-green-600" />,
      csv: <FileText className="w-8 h-8 text-green-600" />,
      txt: <FileText className="w-8 h-8 text-gray-600" />,
      md: <FileText className="w-8 h-8 text-gray-600" />,
    };
    return iconMap[type] || <FileText className="w-8 h-8 text-gray-600" />;
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || course.file_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Uploaded Courses</h1>
            <p className="text-gray-600 mt-1">Upload and manage courses in any format including SCORM</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateScormModal(true)}
              className="lt-btn-primary"
              style={{padding:'9px 16px',borderRadius:8}}
            >
              <PlusCircle className="w-5 h-5" />
              Create SCORM
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="lt-btn-primary"
              style={{padding:'9px 16px',borderRadius:8}}
            >
              <Upload className="w-5 h-5" />
              Upload Course
            </button>
          </div>
        </div>

        <div className="lt-card p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search courses..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="pdf">PDF</option>
                <option value="ppt">PowerPoint</option>
                <option value="pptx">PowerPoint</option>
                <option value="doc">Word</option>
                <option value="docx">Word</option>
                <option value="zip">SCORM/ZIP</option>
                <option value="mp4">Video</option>
                <option value="xlsx">Excel</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="lt-spinner" />
            <p className="mt-4 text-gray-600">Loading courses...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="lt-card p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses uploaded yet</h3>
            <p className="text-gray-600 mb-4">
              Upload course materials in any format including SCORM packages
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="lt-btn-primary"
              style={{padding:'9px 16px',borderRadius:8}}
            >
              <Upload className="w-5 h-5" />
              Upload Your First Course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="lt-card overflow-hidden hover:shadow-md transition-shadow"
              >
                <UploadedCourseCover
                  title={course.title}
                  thumbnailPath={course.thumbnail_path}
                  fileType={course.file_type}
                  height={120}
                />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4 gap-2">
                    <div className="flex gap-2 flex-wrap justify-end">
                      <span className="lt-badge lt-badge-blue text-xs font-semibold rounded">
                        {getCourseFormatLabel(course.file_type)}
                      </span>
                      {course.quiz && course.quiz.enabled && (
                        <span className="lt-badge lt-badge-success text-xs font-semibold rounded flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          Quiz
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {course.title}
                  </h3>

                  {course.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {course.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                    <Calendar className="w-4 h-4" />
                    {new Date(course.created_at).toLocaleDateString()}
                    <span className="ml-auto">{formatFileSize(course.file_size)}</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="lt-btn-secondary w-full cursor-pointer" style={{ padding: '9px 16px', borderRadius: 8, textAlign: 'center' }}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={thumbnailUploading}
                        onChange={(e) => {
                          void handleThumbnailChange(course, e.target.files?.[0] || null);
                          e.target.value = '';
                        }}
                      />
                      {thumbnailUploading ? 'Updating…' : course.thumbnail_path ? 'Change thumbnail' : 'Add thumbnail'}
                    </label>
                    <div className="flex gap-2">
                      {(course.file_type === 'zip' || course.file_type === 'scorm') && (
                        <button
                          onClick={() => setPreviewCourse(course)}
                          className="lt-btn-primary flex-1"
                          style={{padding:'9px 16px',borderRadius:8}}
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(course)}
                        className="lt-btn-secondary flex-1"
                        style={{padding:'9px 16px',borderRadius:8}}
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedCourse(course);
                          setDepartmentFilter('');
                          setSelectedUsers(new Set());
                          setShowAssignModal(true);
                        }}
                        className="lt-btn-primary flex-1"
                        style={{padding:'9px 16px',borderRadius:8}}
                      >
                        <Users className="w-4 h-4" />
                        Assign
                      </button>
                      <button
                        onClick={() => handleDelete(course)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b">
              <h3 className="text-2xl font-semibold">Upload Course</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Title *
                </label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Sales Training 2024"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of the course content..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="general">General</option>
                  <option value="sales">Sales</option>
                  <option value="customer_service">Customer Service</option>
                  <option value="product">Product</option>
                  <option value="compliance">Compliance</option>
                  <option value="leadership">Leadership</option>
                  <option value="technical">Technical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover thumbnail <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      const err = validateThumbnailFile(file);
                      if (err) {
                        alert(err);
                        e.target.value = '';
                        return;
                      }
                    }
                    setUploadForm({ ...uploadForm, thumbnail: file });
                  }}
                  className="w-full text-sm text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP, or GIF · max 2 MB</p>
                {uploadForm.thumbnail && (
                  <p className="text-sm text-green-600 mt-1 font-medium">
                    Thumbnail: {uploadForm.thumbnail.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course File *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.mp4,.mov,.avi,.webm,.xlsx,.xls,.csv,.txt,.md"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                    required
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Click to upload
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    PDF, Word, PowerPoint, SCORM (ZIP), Videos, Excel, Text (max 1GB)
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    SCORM ZIPs are extracted and uploaded file-by-file automatically (works around Supabase&apos;s 50 MB per-file limit).
                  </p>
                  {uploadForm.file && (
                    <p className="text-sm text-green-600 mt-2 font-medium">
                      Selected: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                    </p>
                  )}
                  {validating && (
                    <p className="text-sm text-blue-600 mt-2 flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Validating SCORM package...
                    </p>
                  )}
                  {converting && (
                    <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Converting for compatibility...
                    </p>
                  )}
                </div>

                {scormValidation && (
                  <div className={`mt-4 p-4 rounded-lg border ${
                    scormValidation.isValid
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      {scormValidation.isValid ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h4 className={`font-semibold mb-2 ${
                          scormValidation.isValid ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {scormValidation.isValid ? 'Valid SCORM Package' : 'SCORM Validation Failed'}
                        </h4>

                        {scormValidation.isValid && (
                          <div className="space-y-1 text-sm text-green-800">
                            <p>Version: <span className="font-medium">{scormValidation.version}</span></p>
                            {scormValidation.launchFile && (
                              <p>Launch File: <span className="font-medium">{scormValidation.launchFile}</span></p>
                            )}
                          </div>
                        )}

                        {scormValidation.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-semibold text-red-900 mb-1">Errors:</p>
                            <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
                              {scormValidation.errors.map((error, i) => (
                                <li key={i}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {scormValidation.warnings.length > 0 && (
                          <div className="mt-2">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-yellow-900 mb-1">Warnings:</p>
                                <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
                                  {scormValidation.warnings.map((warning, i) => (
                                    <li key={i}>{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {scormZipScan && (
                  <div className="mt-4 p-4 rounded-lg border bg-slate-50 border-slate-200">
                    <p className="text-sm text-slate-800">
                      Package contains <strong>{scormZipScan.fileCount}</strong> files and will be extracted for reliable SCORM playback.
                    </p>
                    {scormZipScan.oversizedEntry && (
                      <p className="text-sm text-red-700 mt-2">
                        Cannot upload: &quot;{scormZipScan.oversizedEntry.path.split('/').pop()}&quot; is too large for storage (50 MB per-file limit).
                      </p>
                    )}
                  </div>
                )}

                {conversionResult && conversionResult.success && (
                  <div className="mt-4 p-4 rounded-lg border bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-3">
                      <RefreshCw className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-2">
                          Auto-Converted for Compatibility
                        </h4>
                        <p className="text-sm text-blue-800 mb-2">
                          The SCORM package has been automatically converted to ensure compatibility with our player.
                        </p>
                        {conversionResult.fixesApplied.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-blue-900 mb-1">Fixes Applied:</p>
                            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                              {conversionResult.fixesApplied.map((fix, i) => (
                                <li key={i}>{fix}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {conversionResult && !conversionResult.success && conversionResult.errors.length > 0 && (
                  <div className="mt-4 p-4 rounded-lg border bg-yellow-50 border-yellow-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-yellow-900 mb-2">
                          Conversion Issues
                        </h4>
                        <p className="text-sm text-yellow-800 mb-2">
                          Could not automatically convert the package. Uploading original file.
                        </p>
                        <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
                          {conversionResult.errors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={uploadForm.enableQuiz}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, enableQuiz: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable Quiz for this course
                  </span>
                </label>

                {uploadForm.enableQuiz && (
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Passing Score (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={uploadForm.passingScore}
                        onChange={(e) =>
                          setUploadForm({ ...uploadForm, passingScore: parseInt(e.target.value) })
                        }
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-700">
                          Quiz Questions
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadForm({
                              ...uploadForm,
                              quizQuestions: [
                                ...uploadForm.quizQuestions,
                                {
                                  question: '',
                                  optionA: '',
                                  optionB: '',
                                  optionC: '',
                                  optionD: '',
                                  correctOption: 'a' as 'a',
                                  points: 1,
                                },
                              ],
                            });
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Add Question
                        </button>
                      </div>

                      {uploadForm.quizQuestions.map((q, qIndex) => (
                        <div key={qIndex} className="bg-white p-4 rounded-lg border border-gray-200 mb-3">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-700">
                              Question {qIndex + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...uploadForm.quizQuestions];
                                updated.splice(qIndex, 1);
                                setUploadForm({ ...uploadForm, quizQuestions: updated });
                              }}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Question text"
                              value={q.question}
                              onChange={(e) => {
                                const updated = [...uploadForm.quizQuestions];
                                updated[qIndex].question = e.target.value;
                                setUploadForm({ ...uploadForm, quizQuestions: updated });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />

                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Option A"
                                value={q.optionA}
                                onChange={(e) => {
                                  const updated = [...uploadForm.quizQuestions];
                                  updated[qIndex].optionA = e.target.value;
                                  setUploadForm({ ...uploadForm, quizQuestions: updated });
                                }}
                                className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <input
                                type="text"
                                placeholder="Option B"
                                value={q.optionB}
                                onChange={(e) => {
                                  const updated = [...uploadForm.quizQuestions];
                                  updated[qIndex].optionB = e.target.value;
                                  setUploadForm({ ...uploadForm, quizQuestions: updated });
                                }}
                                className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <input
                                type="text"
                                placeholder="Option C"
                                value={q.optionC}
                                onChange={(e) => {
                                  const updated = [...uploadForm.quizQuestions];
                                  updated[qIndex].optionC = e.target.value;
                                  setUploadForm({ ...uploadForm, quizQuestions: updated });
                                }}
                                className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <input
                                type="text"
                                placeholder="Option D"
                                value={q.optionD}
                                onChange={(e) => {
                                  const updated = [...uploadForm.quizQuestions];
                                  updated[qIndex].optionD = e.target.value;
                                  setUploadForm({ ...uploadForm, quizQuestions: updated });
                                }}
                                className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            <div className="flex gap-2">
                              <select
                                value={q.correctOption}
                                onChange={(e) => {
                                  const updated = [...uploadForm.quizQuestions];
                                  updated[qIndex].correctOption = e.target.value as 'a' | 'b' | 'c' | 'd';
                                  setUploadForm({ ...uploadForm, quizQuestions: updated });
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="a">Correct: A</option>
                                <option value="b">Correct: B</option>
                                <option value="c">Correct: C</option>
                                <option value="d">Correct: D</option>
                              </select>
                              <input
                                type="number"
                                min="1"
                                value={q.points}
                                onChange={(e) => {
                                  const updated = [...uploadForm.quizQuestions];
                                  updated[qIndex].points = parseInt(e.target.value) || 1;
                                  setUploadForm({ ...uploadForm, quizQuestions: updated });
                                }}
                                placeholder="Points"
                                className="w-24 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {uploadForm.quizQuestions.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No questions added yet. Click "Add Question" to create quiz questions.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {uploading && uploadProgress > 0 && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between text-sm font-medium text-blue-900 mb-2">
                    <span>Uploading {uploadForm.file?.name}...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  {uploadForm.file && uploadForm.file.size > 500 * 1024 * 1024 && (
                    <p className="text-xs text-blue-700 mt-2">
                      Large file upload in progress. This may take several minutes. Please do not close this window.
                    </p>
                  )}
                  <p className="text-xs text-blue-600 mt-1">
                    File size: {uploadForm.file && formatFileSize(uploadForm.file.size)}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                Assign "{selectedCourse.title}" to Users
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedCourse(null);
                  setSelectedUsers(new Set());
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Certificate layout</label>
              <select
                value={certificateTemplate}
                onChange={(e) => setCertificateTemplate(e.target.value as 'classic' | 'modern' | 'executive')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="classic">Classic Gold</option>
                <option value="modern">Modern Blue</option>
                <option value="executive">Executive Dark</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Auto-issued when the learner completes this course</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 mb-4">
              {filteredAssignUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.id)}
                    onChange={(e) => {
                      const updated = new Set(selectedUsers);
                      if (e.target.checked) {
                        updated.add(user.id);
                      } else {
                        updated.delete(user.id);
                      }
                      setSelectedUsers(updated);
                    }}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">{user.full_name || user.email}</div>
                    <div className="text-sm text-gray-500">
                      {user.role}{user.department ? ` · ${user.department}` : ''}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedCourse(null);
                  setSelectedUsers(new Set());
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={selectedUsers.size === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Assign to {selectedUsers.size} user(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateScormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b">
              <h3 className="text-2xl font-semibold">Create SCORM Course</h3>
              <button
                onClick={() => setShowCreateScormModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateScorm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Title *
                </label>
                <input
                  type="text"
                  value={createScormForm.title}
                  onChange={(e) => setCreateScormForm({ ...createScormForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Introduction to Sales"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={createScormForm.description}
                  onChange={(e) => setCreateScormForm({ ...createScormForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Brief description of the course..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={createScormForm.category}
                  onChange={(e) => setCreateScormForm({ ...createScormForm, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="general">General</option>
                  <option value="sales">Sales</option>
                  <option value="customer_service">Customer Service</option>
                  <option value="product">Product</option>
                  <option value="compliance">Compliance</option>
                  <option value="leadership">Leadership</option>
                  <option value="technical">Technical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SCORM Version
                </label>
                <select
                  value={createScormForm.version}
                  onChange={(e) => setCreateScormForm({ ...createScormForm, version: e.target.value as '1.2' | '2004' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="1.2">SCORM 1.2 (Recommended)</option>
                  <option value="2004">SCORM 2004</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Content (HTML) *
                </label>
                <textarea
                  value={createScormForm.htmlContent}
                  onChange={(e) => setCreateScormForm({ ...createScormForm, htmlContent: e.target.value })}
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                  placeholder="<h2>Welcome</h2>&#10;<p>This is your course content...</p>&#10;<ul>&#10;  <li>Point 1</li>&#10;  <li>Point 2</li>&#10;</ul>"
                  required
                />
                <p className="text-sm text-gray-500 mt-2">
                  Enter HTML content for your course. You can use headings, paragraphs, lists, images, and more.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateScormModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create SCORM Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewCourse && (previewCourse.file_type === 'zip' || previewCourse.file_type === 'scorm') && (
        <ScormPlayer
          courseId={previewCourse.id}
          courseTitle={previewCourse.title}
          filePath={previewCourse.file_path}
          subtitle={getCourseFormatLabel(previewCourse.file_type)}
          showDebug
          onClose={() => setPreviewCourse(null)}
          onComplete={() => {
            console.log('Course preview completed');
            setPreviewCourse(null);
          }}
        />
      )}
    </Layout>
  );
}
