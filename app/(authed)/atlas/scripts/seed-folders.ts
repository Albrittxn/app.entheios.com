// Seed data for the Scripts tab.
//
// Clean slate — no demo folders or templates. The Scripts and Campaigns
// tabs start empty; users create their own folders and SMS templates.
// Variable syntax (highlighted by the Scripts UI) follows GHL conventions:
//   {{contact.first_name}}     — lead's first name
//   {{contact.state}}          — lead's state
//   {{right_now.day_of_week}}  — current day, computed at send time

import type { ScriptFolder, Template } from "@/lib/types";

export const SCRIPT_FOLDERS_SEED: ScriptFolder[] = [];

export const TEMPLATES_SEED: Template[] = [];
