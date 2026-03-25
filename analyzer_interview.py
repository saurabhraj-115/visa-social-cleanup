"""
Interview simulation module — generates officer dossiers, mock interview questions,
answer evaluations, content rewrites, and prep packages using Claude.
"""
import json
from typing import Optional
import anthropic
import config


def _client():
    return anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)


# ── Dossier ──────────────────────────────────────────────────────────────────

DOSSIER_SYSTEM = """You are a US consular officer writing a pre-interview intelligence brief about a visa applicant.
You have been provided a list of their flagged social media posts. Write a 4-6 paragraph brief summarizing:
1. Overall risk profile and first impression
2. Specific themes or patterns of concern
3. Recommended lines of questioning for the interview
4. Your assessment of whether this applicant warrants additional scrutiny

Write in first-person officer voice. Be clinical, direct, and analytical — like an actual intelligence brief.
Use specific references to the applicant's content. Do not be lenient; your job is to identify risk."""

def generate_dossier(flagged_items: list[dict]) -> str:
    if not flagged_items:
        return "No flagged content was identified. Applicant appears low-risk based on available social media data."

    items_text = "\n\n".join(
        f"[{i+1}] Platform: {item['platform']} | Type: {item['content_type']} | Severity: {item['severity']}\n"
        f"Content: {item['text'][:500]}\nRisk reason: {item['reason']}"
        for i, item in enumerate(flagged_items)
    )

    response = _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1200,
        system=DOSSIER_SYSTEM,
        messages=[{
            "role": "user",
            "content": f"Flagged social media content from applicant:\n\n{items_text}\n\nWrite the pre-interview intelligence brief."
        }]
    )
    return response.content[0].text.strip()


# ── Mock Interview ────────────────────────────────────────────────────────────

INTERVIEW_SYSTEM = """You are a US visa interview officer conducting an official visa interview.
You have read the applicant's pre-interview intelligence brief and are familiar with their flagged social media content.
Your job is to probe concerning content with direct, professional questions.

Rules:
- Ask ONE question per turn. Keep it focused and pointed.
- Reference specific content or patterns from the dossier when relevant.
- Start with the most concerning flagged items.
- Do not be adversarial or rude — be professionally skeptical.
- After the first question is answered, follow up based on the answer or move to the next concern.
- Format: Just the question itself. No preamble like "Question:" or "Officer:"."""

def get_interview_question(dossier: str, history: list[dict], flagged_items: list[dict]) -> str:
    items_summary = "\n".join(
        f"- [{item['severity'].upper()}] {item['platform']}: {item['text'][:200]}"
        for item in flagged_items[:8]
    )

    messages = [
        {
            "role": "user",
            "content": (
                f"INTELLIGENCE BRIEF:\n{dossier}\n\n"
                f"TOP FLAGGED ITEMS:\n{items_summary}\n\n"
                "Begin the interview. Ask your first question."
            )
        }
    ]

    # Interleave history: user messages are applicant answers, assistant messages are officer questions
    for turn in history:
        messages.append({"role": "assistant", "content": turn["question"]})
        if turn.get("answer"):
            messages.append({"role": "user", "content": f"Applicant answer: {turn['answer']}\n\nAsk your next question."})

    response = _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        system=INTERVIEW_SYSTEM,
        messages=messages,
    )
    return response.content[0].text.strip()


# ── Answer Evaluation ─────────────────────────────────────────────────────────

EVAL_SYSTEM = """You are evaluating a visa applicant's interview answer from an officer's perspective.
Given the officer's question, the applicant's answer, and the original flagged content that prompted the question,
assess whether the answer would reassure or concern an immigration officer.

Respond ONLY with valid JSON in this exact format:
{
  "verdict": "satisfactory" | "needs_improvement" | "concerning",
  "coaching": "1-2 sentences of coaching feedback for the applicant"
}"""

def evaluate_answer(question: str, answer: str, flagged_item: Optional[dict] = None) -> dict:
    context = ""
    if flagged_item:
        context = f"\nOriginal flagged content: {flagged_item['text'][:300]}\nRisk reason: {flagged_item['reason']}"

    response = _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        system=EVAL_SYSTEM,
        messages=[{
            "role": "user",
            "content": f"Officer's question: {question}\n\nApplicant's answer: {answer}{context}\n\nEvaluate this answer."
        }]
    )
    try:
        return json.loads(response.content[0].text.strip())
    except (json.JSONDecodeError, KeyError):
        return {"verdict": "needs_improvement", "coaching": "Unable to evaluate. Try giving a more detailed answer."}


# ── Content Rewrite ───────────────────────────────────────────────────────────

REWRITE_SYSTEM = """You are helping a visa applicant soften a social media post that was flagged as potentially risky.
Rewrite the post to reduce visa risk while:
1. Preserving the applicant's authentic voice and general intent
2. Removing or softening language that could concern an immigration officer
3. Keeping it natural — it should not sound like a corporate press release
4. Keeping approximately the same length

Respond with ONLY the rewritten post text. No explanation, no preamble."""

def rewrite_content(item: dict) -> str:
    response = _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        system=REWRITE_SYSTEM,
        messages=[{
            "role": "user",
            "content": (
                f"Platform: {item['platform']}\n"
                f"Content type: {item['content_type']}\n"
                f"Risk reason: {item['reason']}\n\n"
                f"Original post:\n{item['text']}"
            )
        }]
    )
    return response.content[0].text.strip()


# ── Prep Package ──────────────────────────────────────────────────────────────

PREP_SYSTEM = """You are a visa interview coach helping an applicant prepare for their US visa interview.
Based on the officer's intelligence brief and flagged content, generate a preparation package.

Respond ONLY with valid JSON in this exact format:
{
  "visa_ready_score": <integer 0-100, where 100 is fully safe>,
  "predicted_questions": [
    {
      "question": "the interview question",
      "flagged_content_ref": "brief quote of the content that would prompt this question",
      "suggested_answer": "a concise, honest talking point"
    }
  ],
  "key_themes": ["theme1", "theme2"],
  "top_advice": "2-3 sentences of the single most important advice for this applicant"
}

Generate 3-6 predicted questions. Base the visa_ready_score on severity and number of flagged items."""

def generate_prep_package(dossier: str, flagged_items: list[dict]) -> dict:
    if not flagged_items:
        return {
            "visa_ready_score": 95,
            "predicted_questions": [],
            "key_themes": [],
            "top_advice": "Your social media appears clean. Focus on clearly explaining your travel purpose and ties to your home country."
        }

    items_text = "\n".join(
        f"- [{item['severity'].upper()}] {item['platform']}: {item['text'][:300]} (reason: {item['reason']})"
        for item in flagged_items[:10]
    )

    response = _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        system=PREP_SYSTEM,
        messages=[{
            "role": "user",
            "content": f"OFFICER BRIEF:\n{dossier}\n\nFLAGGED ITEMS:\n{items_text}\n\nGenerate the prep package."
        }]
    )
    try:
        return json.loads(response.content[0].text.strip())
    except (json.JSONDecodeError, KeyError):
        return {
            "visa_ready_score": 50,
            "predicted_questions": [],
            "key_themes": [],
            "top_advice": "Review your flagged content carefully before the interview."
        }
