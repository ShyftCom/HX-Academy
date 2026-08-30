/**
 * Setting keys shared between server routes and admin screens.
 *
 * Deliberately its own module: src/lib/settings.ts imports the Prisma client,
 * so a "use client" page cannot import a constant from there without dragging
 * the database into the browser bundle. Nothing here imports anything.
 */

/**
 * Names the survey the public application form asks, or is empty/absent when
 * the form skips the survey step. Written by the Survey Builder page, read by
 * GET /api/public/landing.
 */
export const APPLICATION_SURVEY_SETTING = "lp_active_survey_id";
