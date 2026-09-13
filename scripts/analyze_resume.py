import json
import re
import sys
import warnings
from collections import Counter
from typing import Optional

warnings.filterwarnings("ignore")

try:
    from nltk import FreqDist
    from nltk.stem import PorterStemmer
except Exception:
    class FreqDist(Counter):
        def most_common(self, n=None):
            return super().most_common(n)

    class PorterStemmer:
        def stem(self, token: str) -> str:
            return token

import math

def compute_text_similarity(text1: str, text2: str) -> float:
    tokens1 = [t for t in tokenize(text1) if t not in STOPWORDS and len(t) > 2]
    tokens2 = [t for t in tokenize(text2) if t not in STOPWORDS and len(t) > 2]
    if not tokens1 or not tokens2:
        return 0.0
    vec1 = Counter(tokens1)
    vec2 = Counter(tokens2)
    intersection = set(vec1.keys()) & set(vec2.keys())
    dot = sum(vec1[k] * vec2[k] for k in intersection)
    mag1 = math.sqrt(sum(v ** 2 for v in vec1.values()))
    mag2 = math.sqrt(sum(v ** 2 for v in vec2.values()))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return float(dot) / (mag1 * mag2)


TOKEN_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9+.#/-]{1,}")
NUMBER_PATTERN = re.compile(r"\b\d+(?:\.\d+)?%?\b")
YEAR_PATTERN = re.compile(r"\b(?:19|20)\d{2}\b")
YEARS_REQUIRED_PATTERN = re.compile(r"(\d+)\+?\s*(?:years?|yrs?)", re.IGNORECASE)
EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_PATTERN = re.compile(r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")
URL_PATTERN = re.compile(r"(?:https?://)?(?:www\.)?(?:linkedin\.com/in/|github\.com/)[a-zA-Z0-9_-]+")

ALIASES = {
    "node.js": "nodejs",
    "node": "nodejs",
    "react.js": "react",
    "next.js": "nextjs",
    "vue.js": "vue",
    "express.js": "express",
    "c++": "cpp",
    "c#": "csharp",
    ".net": "dotnet",
    "postgres": "postgresql",
    "amazon web services": "aws",
    "google cloud": "gcp",
    "rest api": "rest",
    "restful api": "rest",
    "ci/cd": "cicd",
    "ci cd": "cicd",
    "machine learning": "ml",
    "data analysis": "analytics",
    "js": "javascript",
    "ts": "typescript",
}

DISPLAY_NAMES = {
    "nodejs": "Node.js",
    "postgresql": "PostgreSQL",
    "aws": "AWS",
    "gcp": "GCP",
    "cicd": "CI/CD",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "cpp": "C++",
    "csharp": "C#",
    "dotnet": ".NET",
    "rest": "REST API",
    "ml": "Machine Learning",
    "analytics": "Data Analysis",
}

STOPWORDS = {
    "a", "about", "above", "across", "after", "again", "against", "all", "also",
    "am", "an", "and", "any", "are", "as", "at", "be", "because", "been", "before",
    "being", "below", "between", "both", "but", "by", "can", "could", "did", "do",
    "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had",
    "has", "have", "having", "he", "her", "here", "hers", "herself", "him", "himself",
    "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me",
    "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
    "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same",
    "she", "should", "so", "some", "such", "than", "that", "the", "their", "theirs",
    "them", "themselves", "then", "there", "these", "they", "this", "those", "through",
    "to", "too", "under", "until", "up", "very", "was", "we", "were", "what", "when",
    "where", "which", "while", "who", "whom", "why", "with", "would", "you", "your",
    "yours", "yourself", "yourselves", "experience", "experienced", "required",
    "preferred", "requirements", "responsibilities", "responsibility", "role", "roles",
    "position", "positions", "candidate", "candidates", "job", "work", "working",
    "ability", "skills", "skill", "using", "use", "used", "strong", "plus", "must",
    "including", "within", "based", "build", "building", "developer", "developers",
    "engineer", "engineering", "company", "teams", "team", "across", "support",
    "solutions", "solution", "systems", "services", "applications", "platform",
    "platforms", "tools", "tool", "years", "year",
}

ACTION_VERBS = {
    "built", "developed", "designed", "led", "implemented", "improved", "optimized",
    "created", "delivered", "launched", "managed", "reduced", "increased", "scaled",
    "automated", "integrated", "deployed", "analyzed", "owned",
}

SECTION_HEADINGS = {
    "summary": {"summary", "profile", "professional summary"},
    "experience": {
        "experience",
        "work experience",
        "professional experience",
        "employment history",
        "work history",
    },
    "projects": {"projects", "project experience", "academic projects"},
    "skills": {"skills", "technical skills", "core skills", "technologies"},
    "education": {"education", "academic background"},
}

COMMON_SKILLS = {
    "python", "java", "javascript", "typescript", "nodejs", "react", "express",
    "sql", "postgresql", "mysql", "mongodb", "docker", "aws", "azure", "gcp",
    "linux", "git", "kubernetes", "html", "css", "api", "apis", "rest", "graphql",
    "terraform", "cicd", "testing", "pytest", "django", "flask", "spring",
    "redis", "kafka", "microservices", "nextjs", "vue", "analytics", "ml",
}

DEGREE_TERMS = {
    "bachelor": {"bachelor", "bachelors", "bs", "b.s", "ba", "b.a"},
    "master": {"master", "masters", "ms", "m.s", "mba"},
    "phd": {"phd", "doctorate"},
}

REQUIRED_MARKERS = {
    "required", "must", "minimum qualifications", "basic qualifications",
    "must have", "need to have", "requirements", "qualification", "qualifications",
}

PREFERRED_MARKERS = {
    "preferred", "nice to have", "bonus", "pluses", "good to have",
    "preferred qualifications",
}

SENIORITY_KEYWORDS = {
    "intern": 0,
    "entry level": 1,
    "entry-level": 1,
    "junior": 1,
    "associate": 2,
    "mid": 2,
    "senior": 3,
    "lead": 4,
    "staff": 4,
    "principal": 5,
}

stemmer = PorterStemmer()


def normalize_token(token: str) -> str:
    token = token.lower().strip(".,;:()[]{}<>\"'")
    return ALIASES.get(token, token)


def pretty_term(term: str) -> str:
    return DISPLAY_NAMES.get(term, term.upper() if term.isupper() else term)


def tokenize(text: str) -> list[str]:
    return [normalize_token(token) for token in TOKEN_PATTERN.findall(text)]


def filtered_tokens(text: str) -> list[str]:
    tokens = []
    for token in tokenize(text):
        if len(token) < 2 or token in STOPWORDS or token.isdigit():
            continue
        tokens.append(token)
    return tokens


def stem_terms(terms: set[str]) -> set[str]:
    return {stemmer.stem(term) for term in terms}


def heading_key(line: str) -> str:
    cleaned = re.sub(r"[^a-z ]+", " ", line.lower()).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def detect_resume_sections(resume_text: str) -> dict[str, str]:
    sections = {name: [] for name in ["summary", "experience", "projects", "skills", "education", "other"]}
    current_section = "other"

    for raw_line in resume_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        line_key = heading_key(line)
        matched_heading = None
        for section_name, headings in SECTION_HEADINGS.items():
            if line_key in headings:
                matched_heading = section_name
                break

        if matched_heading:
            current_section = matched_heading
            continue

        sections[current_section].append(line)

    return {section: "\n".join(lines).strip() for section, lines in sections.items()}


def extract_phrases(text: str) -> set[str]:
    lowered = re.sub(r"\s+", " ", text.lower())
    matches = set()
    for phrase, canonical in ALIASES.items():
        if " " not in phrase and "/" not in phrase:
            continue
        pattern = r"(^|[^a-z0-9])" + re.escape(phrase) + r"([^a-z0-9]|$)"
        if re.search(pattern, lowered):
            matches.add(canonical)
    return matches


def extract_term_set(text: str) -> set[str]:
    terms = set(extract_phrases(text))
    for token in filtered_tokens(text):
        if token in COMMON_SKILLS or len(token) >= 4:
            terms.add(token)
    return terms


def top_keywords(text: str, limit: int = 8) -> list[str]:
    frequencies = FreqDist(filtered_tokens(text))
    keywords = []
    for token, _count in frequencies.most_common(limit * 3):
        if token in STOPWORDS or len(token) < 3:
            continue
        if token not in keywords:
            keywords.append(token)
        if len(keywords) >= limit:
            break
    return keywords


def split_job_description(job_description: str) -> dict[str, str]:
    buckets = {"required": [], "preferred": [], "general": []}
    current_bucket = "general"

    for raw_line in job_description.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        line_lower = line.lower()

        if any(marker in line_lower for marker in PREFERRED_MARKERS):
            current_bucket = "preferred"
            if line_lower not in PREFERRED_MARKERS:
                buckets[current_bucket].append(line)
            continue

        if any(marker in line_lower for marker in REQUIRED_MARKERS):
            current_bucket = "required"
            if line_lower not in REQUIRED_MARKERS:
                buckets[current_bucket].append(line)
            continue

        if heading_key(line) in {"responsibilities", "about the role", "what you will do"}:
            current_bucket = "general"
            continue

        buckets[current_bucket].append(line)

    return {name: "\n".join(lines).strip() for name, lines in buckets.items()}


def extract_degree_requirement(text: str) -> Optional[str]:
    lowered = text.lower()
    for degree_name, terms in reversed(list(DEGREE_TERMS.items())):
        if any(term in lowered for term in terms):
            return degree_name
    return None


def extract_required_years(text: str) -> int:
    matches = [int(value) for value in YEARS_REQUIRED_PATTERN.findall(text)]
    return max(matches) if matches else 0


def estimate_resume_years(experience_text: str, full_text: str) -> int:
    explicit_matches = [int(value) for value in YEARS_REQUIRED_PATTERN.findall(full_text)]
    explicit_matches = [value for value in explicit_matches if value <= 40]
    if explicit_matches:
        return max(explicit_matches)

    years = [int(value) for value in YEAR_PATTERN.findall(experience_text)]
    if len(years) >= 2:
        return max(0, max(years) - min(years))

    return 0


def detect_seniority(text: str) -> int:
    lowered = text.lower()
    detected = 2
    for phrase, level in SENIORITY_KEYWORDS.items():
        if phrase in lowered:
            detected = max(detected, level)
    return detected


def build_job_profile(job_description: str) -> dict:
    jd_sections = split_job_description(job_description)
    required_terms = extract_term_set(jd_sections["required"])
    preferred_terms = extract_term_set(jd_sections["preferred"])
    general_terms = extract_term_set(jd_sections["general"])
    fallback_terms = set(top_keywords(job_description, 10))

    if not required_terms:
        required_terms = {
            term for term in fallback_terms if term in COMMON_SKILLS
        } or set(top_keywords(job_description, 6))

    preferred_terms |= {
        term
        for term in general_terms.union(fallback_terms)
        if term in COMMON_SKILLS and term not in required_terms
    }

    if not preferred_terms:
        preferred_terms = {
            term for term in fallback_terms if term not in required_terms
        }

    return {
        "required_terms": required_terms,
        "preferred_terms": preferred_terms,
        "required_years": extract_required_years(jd_sections["required"] or job_description),
        "required_degree": extract_degree_requirement(job_description),
        "seniority_level": detect_seniority(job_description),
    }


def ratio(numerator: int, denominator: int) -> float:
    return numerator / denominator if denominator else 0.0


def degree_score(required_degree: Optional[str], education_text: str) -> float:
    if not required_degree:
        return 70.0 if education_text.strip() else 40.0

    lowered = education_text.lower()
    degree_order = {"bachelor": 1, "master": 2, "phd": 3}
    resume_degree = extract_degree_requirement(education_text)
    if not resume_degree:
        return 20.0
    if degree_order.get(resume_degree, 0) >= degree_order.get(required_degree, 0):
        return 100.0
    return 50.0


def section_match_score(section_terms: set[str], jd_terms: set[str]) -> float:
    jd_stems = stem_terms(jd_terms)
    section_stems = stem_terms(section_terms)
    return ratio(len(jd_stems & section_stems), len(jd_stems))


def summarize_score(score: int, has_job_description: bool, caps_applied: list[str]) -> str:
    if caps_applied:
        return f"Score was capped by requirement checks: {caps_applied[0]}"

    if has_job_description:
        if score >= 80:
            return "Strong match overall, with solid evidence in the highest-priority sections."
        if score >= 60:
            return "Moderate match overall, but some required items or section evidence are missing."
        return "Weak overall match, mainly because required evidence is missing from the resume."

    if score >= 80:
        return "Resume looks strong overall with clear impact and section coverage."
    if score >= 60:
        return "Resume has a decent baseline, but key evidence and structure could be stronger."
    return "Resume needs stronger skills, clearer evidence, and better structure to stand out."


def extract_sample_bullets(text: str) -> list[str]:
    candidates = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        clean = re.sub(r"^[\s•\-*—–]+\s*", "", line).strip()
        words = clean.split()
        if 4 <= len(words) <= 35 and clean[0].isupper():
            candidates.append(clean)
    return candidates


def generate_bullet_rewrites(resume_text: str, sections: dict[str, str]) -> list[dict]:
    pool = extract_sample_bullets(sections.get("experience", "") + "\n" + sections.get("projects", ""))
    if not pool:
        pool = extract_sample_bullets(resume_text)

    rewrites = []
    for bullet in pool:
        has_num = bool(NUMBER_PATTERN.search(bullet))
        clean_base = bullet.rstrip(".;")
        lower_base = clean_base.lower()

        if not has_num or not any(v in lower_base for v in ["built", "led", "architected", "optimized", "reduced"]):
            if "develop" in lower_base or "built" in lower_base or "creat" in lower_base:
                action = "Architected and delivered"
                metric = "reducing deployment cycle time by 34% across 3 distinct releases"
            elif "manag" in lower_base or "lead" in lower_base or "coordinat" in lower_base:
                action = "Spearheaded and scaled"
                metric = "boosting cross-functional team velocity by 25% across quarterly goals"
            elif "test" in lower_base or "bug" in lower_base or "fix" in lower_base:
                action = "Engineered automated test suites for"
                metric = "increasing test coverage to 92% and reducing production bugs by 40%"
            else:
                action = "Optimized and deployed"
                metric = "improving efficiency by 30% and supporting over 10K+ active interactions"

            first_char_lower = clean_base[0].lower() + clean_base[1:] if len(clean_base) > 1 else clean_base
            improved = f"{action} {first_char_lower}, {metric}."
            rewrites.append({
                "original": bullet,
                "improved": improved,
                "reason": "Applied STAR framework with strong active verb and quantifiable business impact."
            })
            if len(rewrites) >= 3:
                break

    if not rewrites and pool:
        clean_base = pool[0].rstrip(".;")
        first_char_lower = clean_base[0].lower() + clean_base[1:] if len(clean_base) > 1 else clean_base
        rewrites.append({
            "original": pool[0],
            "improved": f"Architected and deployed {first_char_lower}, driving a 35% improvement in operational throughput.",
            "reason": "Elevated passive description with quantifiable performance metric."
        })
    return rewrites


def generate_ats_checklist(
    resume_text: str,
    sections: dict[str, str],
    has_email: bool,
    has_phone: bool,
    has_urls: bool,
    action_verb_count: int,
    metric_count: int,
    section_count: int
) -> list[dict]:
    word_count = len(re.findall(r"\b\w+\b", resume_text))
    return [
        {
            "check": "Contact Details (Email & Phone)",
            "passed": bool(has_email and has_phone),
            "detail": "Email address and telephone number found" if (has_email and has_phone) else "Missing clear email or phone number in contact header"
        },
        {
            "check": "Professional Profiles (LinkedIn / GitHub)",
            "passed": bool(has_urls),
            "detail": "LinkedIn, GitHub, or portfolio link detected" if has_urls else "Consider adding your LinkedIn or GitHub profile link"
        },
        {
            "check": "Standard Resume Structure",
            "passed": section_count >= 3,
            "detail": f"Detected {section_count}/4 core sections (Experience, Projects, Skills, Education)"
        },
        {
            "check": "Measurable Impact & Metrics",
            "passed": metric_count >= 2,
            "detail": f"Found {metric_count} quantified achievements (percentages, counts, or metrics)" if metric_count >= 2 else "Lacks quantifiable metrics (% growth, users served, latency reduction)"
        },
        {
            "check": "Strong Action Verbs",
            "passed": action_verb_count >= 3,
            "detail": f"Found {action_verb_count} action verbs driving accomplishments" if action_verb_count >= 3 else "Start bullet points with assertive verbs (e.g., Architected, Spearheaded)"
        },
        {
            "check": "ATS Word Count & Formatting",
            "passed": 200 <= word_count <= 1400,
            "detail": f"Resume is {word_count} words (optimal range is 350-900 words)"
        }
    ]


def analyze_resume(resume_text: str, job_description: str, enable_tier1_booster: bool = False) -> dict:
    sections = detect_resume_sections(resume_text)
    resume_terms_by_section = {
        section: extract_term_set(text) for section, text in sections.items()
    }

    experience_terms = resume_terms_by_section.get("experience", set())
    projects_terms = resume_terms_by_section.get("projects", set())
    skills_terms = resume_terms_by_section.get("skills", set())
    education_terms = resume_terms_by_section.get("education", set())
    overall_terms = set().union(*resume_terms_by_section.values())

    has_email = bool(EMAIL_PATTERN.search(resume_text))
    has_phone = bool(PHONE_PATTERN.search(resume_text))
    has_urls = bool(URL_PATTERN.search(resume_text))

    action_verb_count = sum(1 for token in tokenize(resume_text) if token in ACTION_VERBS)
    metric_count = len(NUMBER_PATTERN.findall(resume_text))
    section_count = sum(1 for name in ["experience", "projects", "skills", "education"] if sections[name].strip())

    ats_checklist = generate_ats_checklist(
        resume_text, sections, has_email, has_phone, has_urls,
        action_verb_count, metric_count, section_count
    )
    bullet_rewrites = generate_bullet_rewrites(resume_text, sections)
    
    tier1_boost = False
    if enable_tier1_booster:
        tier1_pattern = re.compile(r"\b(iit|nit|iiit|bits pilani|indian institute of technology|national institute of technology)\b", re.IGNORECASE)
        if tier1_pattern.search(sections["education"]) or tier1_pattern.search(sections["summary"]) or tier1_pattern.search(resume_text[:1000]):
            tier1_boost = True

    has_job_description = bool(job_description.strip())

    if has_job_description:
        job_profile = build_job_profile(job_description)
        required_terms = job_profile["required_terms"]
        preferred_terms = job_profile["preferred_terms"]

        exp_required = section_match_score(experience_terms, required_terms)
        exp_preferred = section_match_score(experience_terms, preferred_terms)
        proj_required = section_match_score(projects_terms, required_terms)
        proj_preferred = section_match_score(projects_terms, preferred_terms)
        skills_required = section_match_score(skills_terms, required_terms)
        skills_preferred = section_match_score(skills_terms, preferred_terms)
        edu_score = degree_score(job_profile["required_degree"], sections["education"])

        experience_quality = min(action_verb_count, 6) / 6 * 12 + min(metric_count, 4) / 4 * 8
        project_quality = min(action_verb_count, 4) / 4 * 10 + min(metric_count, 3) / 3 * 10

        experience_score = min(100, exp_required * 65 + exp_preferred * 15 + experience_quality)
        projects_score = min(100, proj_required * 55 + proj_preferred * 20 + project_quality)
        skills_score = min(100, skills_required * 75 + skills_preferred * 25)
        edu_score = degree_score(job_profile["required_degree"], sections["education"])
        if tier1_boost:
            edu_score = min(100.0, edu_score + 20.0)
        education_score = min(100, edu_score)

        weighted_score = round(
            experience_score * 0.50
            + projects_score * 0.25
            + skills_score * 0.15
            + education_score * 0.10
        )

        tfidf_similarity = compute_text_similarity(job_description, resume_text)

        similarity_boost = min(20, round(tfidf_similarity * 40))
        weighted_score = min(100, weighted_score + similarity_boost)

        matched_required = {
            term for term in required_terms if stemmer.stem(term) in stem_terms(overall_terms)
        }
        missing_required = sorted(required_terms - matched_required)
        matched_preferred = {
            term for term in preferred_terms if stemmer.stem(term) in stem_terms(overall_terms)
        }
        missing_preferred = sorted(preferred_terms - matched_preferred)

        caps_applied = []
        score_cap = 100

        required_match_ratio = ratio(len(matched_required), len(required_terms))
        if required_terms and required_match_ratio < 0.35:
            score_cap = min(score_cap, 55)
            caps_applied.append("Too many required job skills are missing.")

        if required_terms and not sections["experience"].strip():
            score_cap = min(score_cap, 72)
            caps_applied.append("Resume does not show a clear experience section.")

        resume_years = estimate_resume_years(sections["experience"], resume_text)
        required_years = job_profile["required_years"]
        if required_years and resume_years and resume_years < required_years:
            score_cap = min(score_cap, 65)
            caps_applied.append(
                f"Experience appears below the job's {required_years}+ year requirement."
            )
        elif required_years and not resume_years and sections["experience"].strip():
            score_cap = min(score_cap, 75)
            caps_applied.append(
                "The resume does not clearly prove the requested years of experience."
            )

        resume_seniority = detect_seniority(sections["experience"] + "\n" + sections["summary"])
        if job_profile["seniority_level"] >= 3 and resume_seniority <= 1:
            score_cap = min(score_cap, 70)
            caps_applied.append("Resume looks more junior than the target role.")

        final_score = min(weighted_score, score_cap)

        strengths = []
        gaps = []

        if exp_required >= 0.4:
            strengths.append("Experience section covers a meaningful share of required job skills.")
        if proj_required >= 0.35:
            strengths.append("Projects reinforce some of the target job requirements.")
        if tier1_boost:
            strengths.append("Tier-1 University detected (Education score boosted).")
        if metric_count:
            strengths.append("Resume includes measurable outcomes or numbers.")
        if skills_required >= 0.4:
            strengths.append("Skills section supports the role with relevant technologies.")
        if tfidf_similarity > 0.15:
            strengths.append(f"High contextual similarity with Job Description ({round(tfidf_similarity * 100)}%).")

        if missing_required:
            gaps.append(
                f"Missing or weak required skills: {', '.join(pretty_term(term) for term in missing_required[:5])}."
            )
        if exp_required < 0.3:
            gaps.append("The experience section does not strongly reflect the core job requirements.")
        if required_years and score_cap <= 75:
            gaps.append("The resume does not clearly demonstrate the expected years or seniority.")
        if section_count < 3:
            gaps.append("Adding clearer sections can improve matching confidence.")

        if not strengths:
            strengths.append("Resume has some relevant content, but the strongest evidence is limited.")
        if not gaps:
            gaps.append("Only a few obvious gaps were detected after section-based scoring.")

        matched_keywords = list(
            dict.fromkeys(
                pretty_term(term)
                for term in list(matched_required)[:6] + list(matched_preferred)[:2]
            )
        )
        missing_keywords = list(
            dict.fromkeys(
                pretty_term(term)
                for term in list(missing_required)[:6] + list(missing_preferred)[:2]
            )
        )

        return {
            "score": final_score,
            "summary": summarize_score(final_score, True, caps_applied),
            "strengths": strengths[:3],
            "gaps": gaps[:3],
            "matchedKeywords": matched_keywords[:8],
            "missingKeywords": missing_keywords[:8],
            "method": "Section-weighted manual analysis",
            "capsApplied": caps_applied[:3],
            "sectionScores": {
                "experience": round(experience_score),
                "projects": round(projects_score),
                "skills": round(skills_score),
                "education": round(education_score),
            },
            "jobRequirements": {
                "requiredSkills": [pretty_term(term) for term in sorted(required_terms)[:8]],
                "preferredSkills": [pretty_term(term) for term in sorted(preferred_terms)[:8]],
                "requiredYears": required_years,
            },
            "bulletPointRewrites": bullet_rewrites,
            "atsChecklist": ats_checklist,
        }

    overall_skill_count = sum(1 for skill in COMMON_SKILLS if skill in overall_terms)

    contact_info_score = 0
    if has_email: contact_info_score += 5
    if has_phone: contact_info_score += 5
    if has_urls: contact_info_score += 5

    baseline_score = round(
        25
        + contact_info_score
        + min(overall_skill_count, 8) / 8 * 25
        + min(action_verb_count, 6) / 6 * 15
        + min(metric_count, 4) / 4 * 15
        + min(section_count, 4) / 4 * 10
    )
    baseline_score = max(0, min(100, baseline_score))
    
    if tier1_boost:
        baseline_score = min(100, baseline_score + 15)

    strengths = []
    gaps = []

    if has_email and has_phone:
        strengths.append("Contact information (Email & Phone) successfully detected.")
    if has_urls:
        strengths.append("Professional links (LinkedIn/GitHub) detected.")
    if overall_skill_count >= 4:
        strengths.append("Resume mentions a useful spread of technical skills.")
    if tier1_boost:
        strengths.append("Tier-1 University detected (Education score boosted).")
    if metric_count:
        strengths.append("Resume includes measurable achievements or outcomes.")
    if sections["experience"].strip():
        strengths.append("Resume has a recognizable experience section.")

    if not has_email or not has_phone:
        gaps.append("Missing standard contact information (Email or Phone).")
    if metric_count == 0:
        gaps.append("Add numbers or measurable results to strengthen impact.")
    if not sections["projects"].strip():
        gaps.append("Projects can help show proof of work when experience is limited.")
    if section_count < 3:
        gaps.append("Stronger section headings would make the resume easier to parse.")

    if not strengths:
        strengths.append("Resume has enough content for a basic ATS analysis.")
    if not gaps:
        gaps.append("Only a few general improvement areas were detected.")

    return {
        "score": baseline_score,
        "summary": summarize_score(baseline_score, False, []),
        "strengths": strengths[:3],
        "gaps": gaps[:3],
        "matchedKeywords": [],
        "missingKeywords": [],
        "method": "General ATS Readiness Check",
        "capsApplied": [],
        "sectionScores": {
            "experience": 70 if sections["experience"].strip() else 30,
            "projects": 70 if sections["projects"].strip() else 35,
            "skills": min(100, round(overall_skill_count / 8 * 100)) if overall_skill_count else 25,
            "education": min(100, (70 if sections["education"].strip() else 40) + (20 if tier1_boost else 0)),
        },
        "jobRequirements": {
            "requiredSkills": [],
            "preferredSkills": [],
            "requiredYears": 0,
        },
        "bulletPointRewrites": bullet_rewrites,
        "atsChecklist": ats_checklist,
    }


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        result = analyze_resume(
            payload.get("resume_text", ""),
            payload.get("job_description", ""),
            payload.get("enableTier1Booster", False)
        )
        json.dump(result, sys.stdout)
        return 0
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
