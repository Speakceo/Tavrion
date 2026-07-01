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

export async function importRoleTemplate(
  viewer: OrgViewer & { id: string },
  templateId: string,
  options?: { publish?: boolean },
): Promise<{ assessmentId: string; questionCount: number }> {
  const template = getTemplateById(templateId);
  if (!template) throw new Error('Template not found');

  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const assessment = await createAssessment(viewer, {
    title: template.title,
    description: template.description,
    tags: template.tags,
    instructions: template.instructions,
    passing_score: template.passing_score,
    time_limit_minutes: template.time_limit_minutes,
    settings: { template_id: template.id, role: template.role },
  });

  let questionCount = 0;

  for (let si = 0; si < template.sections.length; si++) {
    const section = template.sections[si];
    const { data: sectionRow, error: sectionErr } = await supabase
      .from('assessment_sections')
      .insert({
        assessment_id: assessment.id,
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

  if (options?.publish) {
    await updateAssessmentStatus(viewer, assessment.id, 'published');
  }

  await logAssessmentAudit(orgId, viewer.id, 'import_template', 'assessment', assessment.id, {
    template_id: template.id,
    role: template.role,
    question_count: questionCount,
  });

  return { assessmentId: assessment.id, questionCount };
}

export async function importAllRoleTemplates(
  viewer: OrgViewer & { id: string },
  options?: { publish?: boolean },
) {
  const results: { templateId: string; assessmentId: string; questionCount: number }[] = [];
  for (const template of ROLE_ASSESSMENT_TEMPLATES) {
    const result = await importRoleTemplate(viewer, template.id, options);
    results.push({ templateId: template.id, ...result });
  }
  return results;
}

export function listRoleTemplates(): RoleAssessmentTemplate[] {
  return ROLE_ASSESSMENT_TEMPLATES;
}
