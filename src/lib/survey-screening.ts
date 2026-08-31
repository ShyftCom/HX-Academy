import { db } from "@/lib/db";

/**
 * Answer-based screening for the public application form.
 *
 * A Super Admin can mark individual options of a survey question as
 * disqualifying. Picking one ends the application there: no lead is created
 * and the visitor is sent to the "not eligible" page.
 *
 * The marked options deliberately never leave the server. They are not in the
 * payload GET /api/public/landing publishes, so the form cannot show a visitor
 * which answers to avoid — it posts what was answered and asks.
 */

export type SubmittedAnswer = { questionId: string; answer: string };

/** Parse a JSON string column that is expected to hold an array of strings. */
function parseOptionList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Checkbox answers arrive as a JSON array, every other type as a plain string.
 * Both are normalised to a list so one comparison covers all question types.
 */
function answerValues(answer: string): string[] {
  const trimmed = answer.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim());
    } catch {
      /* not JSON after all — fall through and treat it as one value */
    }
  }
  return [trimmed];
}

/**
 * Which of the submitted answers hit a disqualifying option, if any.
 *
 * Questions the caller did not answer, and ids that belong to no question or
 * to a different survey, are simply ignored — screening only ever fires on an
 * answer that genuinely matches a marked option.
 */
export async function screenSurveyAnswers(
  answers: SubmittedAnswer[],
): Promise<{ disqualified: boolean; questionIds: string[] }> {
  if (!answers.length) return { disqualified: false, questionIds: [] };

  const questions = await db.surveyQuestion.findMany({
    where: { id: { in: answers.map((a) => a.questionId) } },
    select: { id: true, disqualifyingOptions: true },
  });

  const blocked = new Map<string, Set<string>>();
  for (const q of questions) {
    const options = parseOptionList(q.disqualifyingOptions);
    if (options.length) blocked.set(q.id, new Set(options));
  }
  if (!blocked.size) return { disqualified: false, questionIds: [] };

  const hits: string[] = [];
  for (const a of answers) {
    const marked = blocked.get(a.questionId);
    if (!marked) continue;
    if (answerValues(a.answer).some((v) => marked.has(v))) hits.push(a.questionId);
  }

  return { disqualified: hits.length > 0, questionIds: hits };
}
