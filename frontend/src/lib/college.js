export const XAVIERS_COLLEGE_DISPLAY = "St. Xavier's College, Mumbai";
export const COLLEGE_PLACEHOLDER = "Enter your college name";

export function formatDob(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export function buildAcademicString({
  xavieriteNa,
  isXavierite,
  xavierCollegeLevel,
  rollGrNumber,
  jcStream,
  division,
  institutionYearJc,
  uid,
  rollNumber,
  degreeCourse,
  yearDegree,
  institutionName,
  course,
  institutionYear,
}) {
  if (xavieriteNa) return "External / Others (N/A)";
  if (isXavierite && xavierCollegeLevel === "junior") {
    return `Xavier's JC · Roll/GR: ${rollGrNumber.trim()} · ${jcStream} · Div ${division.trim()} · ${institutionYearJc}`;
  }
  if (isXavierite && xavierCollegeLevel === "senior") {
    return `Xavier's · UID: ${uid.trim()} · Roll: ${rollNumber.trim()} · ${degreeCourse.trim()} · ${yearDegree}`;
  }
  return `${institutionName.trim()} · ${course.trim()} · ${institutionYear.trim()}`;
}

export function buildCollegeString(fields) {
  const academic = buildAcademicString(fields);
  const personal = `Gender: ${fields.gender} · DOB: ${formatDob(fields.dateOfBirth)}`;
  return `${personal} · ${academic}`;
}

/** Display name for account section — from booking academic answers. */
export function getCollegeDisplayName({
  xavieriteNa,
  isXavierite,
  institutionName,
}) {
  if (xavieriteNa) return COLLEGE_PLACEHOLDER;
  if (isXavierite === true) return XAVIERS_COLLEGE_DISPLAY;
  if (isXavierite === false) {
    const name = institutionName?.trim();
    return name || COLLEGE_PLACEHOLDER;
  }
  return COLLEGE_PLACEHOLDER;
}

/** Derive display label from stored user.college or ticket.college (legacy full strings). */
export function resolveCollegeDisplay(stored) {
  if (!stored?.trim()) return COLLEGE_PLACEHOLDER;

  const fromTicket = parseCollegeDisplayFromBookingDetails(stored);
  if (fromTicket) return fromTicket;

  if (stored === XAVIERS_COLLEGE_DISPLAY) return stored;
  if (stored.length <= 120 && !stored.includes("Gender:")) return stored.trim();

  return COLLEGE_PLACEHOLDER;
}

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

export function isCollegePlaceholder(display) {
  return display === COLLEGE_PLACEHOLDER;
}
