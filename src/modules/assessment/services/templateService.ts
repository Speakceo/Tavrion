import { supabase } from '../../../lib/supabase';
import { orgIdForInsert } from '../../../utils/orgScope';
import type { OrgViewer } from '../../../utils/orgScope';
import { createAssessment, updateAssessmentStatus, logAssessmentAudit } from './assessmentService';
import { saveQuestion } from './questionService';
import {
  ROLE_ASSESSMENT_TEMPLATES,
  getTemplateById,
  type RoleAssessmentTemplate,
} from '../data/roleAssessmentTemplates';

async function clearAssessmentSections(assessmentId: string) {
  const { data: sections } = await supabase
    .from('assessment_sections')
    .select('id')
    .eq('assessment_id', assessmentId);

  const sectionIds = (sections || []).map((s) => s.id);
  if (sectionIds.length) {
    await supabase.from('assessment_section_questions').delete().in('section_id', sectionIds);
  }
  await supabase.from('assessment_sections').delete().eq('assessment_id', assessmentId);
}

async function findExistingTemplateAssessment(orgId: string, templateId: string) {
  const { data, error } = await supabase
    .from('assessments')
    .select('id, settings, status')
    .eq('organization_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data || []).find((row) => {
    const settings = (row.settings || {}) as Record<string, unknown>;
    return settings.template_id === templateId;
  }) || null;
}

async function populateTemplateQuestions(
  viewer: OrgViewer & { id: string },
  assessmentId: string,
  template: RoleAssessmentTemplate,
) {
  let questionCount = 0;

  for (let si = 0; si < template.sections.length; si++) {
    const section = template.sections[si];
    const { data: sectionRow, error: sectionErr } = await supabase
      .from('assessment_sections')
      .insert({
        assessment_id: assessmentId,
        title: section.title,
        instructions: section.instructions || '',
        sort_order: si,
        weight: 1,
      })
      .select()
      .single();

    if (sectionErr || !sectionRow) throw sectionErr || new Error('Failed to create section');

    for (let qi = 0; qi < section.questions.length; qi++) {
      const q = section.questions[qi];
      const questionId = await saveQuestion(
        viewer,
        {
          question_type: q.question_type,
          title: q.title,
          prompt: q.prompt,
          difficulty: q.difficulty,
          weight: q.weight,
          tags: [...q.tags, `role:${template.role.toLowerCase()}`],
          metadata: q.metadata || {},
        },
        q.options,
      );

      await supabase.from('assessment_section_questions').insert({
        section_id: sectionRow.id,
        question_id: questionId,
        sort_order: qi,
      });
      questionCount += 1;
    }
  }

  return questionCount;
}

export async function importRoleTemplate(
  viewer: OrgViewer & { id: string },
  templateId: string,
  options?: { publish?: boolean },
): Promise<{ assessmentId: string; questionCount: number; refreshed: boolean }> {
  const template = getTemplateById(templateId);
  if (!template) throw new Error('Template not found');

  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const existing = await findExistingTemplateAssessment(orgId, template.id);
  let assessmentId: string;
  let refreshed = false;

  if (existing?.id) {
    assessmentId = existing.id;
    refreshed = true;
    await clearAssessmentSections(assessmentId);
    const { error: updateErr } = await supabase
      .from('assessments')
      .update({
        title: template.title,
        description: template.description,
        tags: template.tags,
        instructions: template.instructions,
        passing_score: template.passing_score,
        time_limit_minutes: template.time_limit_minutes,
        settings: { template_id: template.id, role: template.role },
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId);
    if (updateErr) throw updateErr;
  } else {
    const assessment = await createAssessment(viewer, {
      title: template.title,
      description: template.description,
      tags: template.tags,
      instructions: template.instructions,
      passing_score: template.passing_score,
      time_limit_minutes: template.time_limit_minutes,
      settings: { template_id: template.id, role: template.role },
    });
    assessmentId = assessment.id;
  }

  const questionCount = await populateTemplateQuestions(viewer, assessmentId, template);

  if (options?.publish) {
    await updateAssessmentStatus(viewer, assessmentId, 'published');
  }

  await logAssessmentAudit(orgId, viewer.id, refreshed ? 'refresh_template' : 'import_template', 'assessment', assessmentId, {
    template_id: template.id,
    role: template.role,
    question_count: questionCount,
  });

  return { assessmentId, questionCount, refreshed };
}

export async function importAllRoleTemplates(
  viewer: OrgViewer & { id: string },
  options?: { publish?: boolean },
) {
  const results: { templateId: string; assessmentId: string; questionCount: number; refreshed: boolean }[] = [];
  for (const template of ROLE_ASSESSMENT_TEMPLATES) {
    const result = await importRoleTemplate(viewer, template.id, options);
    results.push({ templateId: template.id, ...result });
  }
  return results;
}

export function listRoleTemplates(): RoleAssessmentTemplate[] {
  return ROLE_ASSESSMENT_TEMPLATES;
}
