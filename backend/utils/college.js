export const XAVIERS_COLLEGE_DISPLAY = "St. Xavier's College, Mumbai";
export const COLLEGE_PLACEHOLDER = "Enter your college name";

export function parseCollegeDisplayFromBookingDetails(college) {
  if (!college?.trim()) return null;

  if (college.includes("Xavier's JC") || college.includes("Xavier's · UID:")) {
    return XAVIERS_COLLEGE_DISPLAY;
  }
  if (college.includes("External / Others (N/A)")) {
    return COLLEGE_PLACEHOLDER;
  }

  const parts = college.split(" · ");
  const dobIdx = parts.findIndex((p) => p.startsWith("DOB:"));
  if (dobIdx >= 0 && parts.length > dobIdx + 1) {
    const academic = parts.slice(dobIdx + 1).join(" · ");
    if (academic.includes("Xavier's JC") || academic.includes("Xavier's · UID:")) {
      return XAVIERS_COLLEGE_DISPLAY;
    }
    if (academic.includes("External / Others (N/A)")) {
      return COLLEGE_PLACEHOLDER;
    }
    const institution = academic.split(" · ")[0]?.trim();
    return institution || COLLEGE_PLACEHOLDER;
  }

  return null;
}

export function normalizeCollegeDisplayName(name) {
  const trimmed = name?.trim();
  if (!trimmed || trimmed.length > 120) return null;
  return trimmed;
}
