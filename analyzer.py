import json
import time
from dataclasses import dataclass
from typing import Optional
import anthropic
import config

SYSTEM_PROMPT = """You are a US visa application risk assessor. Your job is to evaluate social media content and determine if it could raise concerns for a US immigration officer reviewing a visa applicant's social media history.

You are evaluating content in the context of a US visa interview in 2026, with Donald Trump as president. Immigration officers may scrutinize content that:

1. Expresses strong anti-American government or military sentiment
2. Expresses support for countries or governments adversarial to the US (Russia, China, Iran, North Korea, Cuba, Venezuela, etc.)
3. Contains strong criticism of US immigration policy or border enforcement
4. Expresses support for groups designated as terrorist or extremist organizations by the US
5. Strongly advocates against American values (democracy, rule of law, free markets)
6. Contains conspiracy theories that could be seen as threatening to the US
7. Expresses sympathy for attacks on the US or its allies
8. Contains anti-Semitic, anti-LGBT, or other extremist rhetoric that US officials may find concerning
9. Expresses extreme political views (far-left or far-right) that advocate violence or overthrowing the government

Normal political commentary, mild criticism of US policy, support for international causes, or cultural expression should NOT be flagged.

Respond ONLY with a valid JSON object in this exact format:
{
  "flag": true or false,
  "severity": "high", "medium", or "low",
  "reason": "brief explanation of why this content was or was not flagged"
}

Set "flag" to false and "severity" to "low" for benign content.
Set "flag" to true for concerning content, with "high" for clearly problematic content and "medium" for borderline content."""

USER_PROMPT_TEMPLATE = """Platform: {platform}
Content Type: {content_type}
Content: {text}

Evaluate this content for potential visa application risk."""


@dataclass
class AnalysisResult:
    flag: bool
    severity: str  # "high", "medium", "low"
    reason: str


class ContentAnalyzer:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

    def analyze(self, platform: str, content_type: str, text: str) -> AnalysisResult:
        if not text or not text.strip():
            return AnalysisResult(flag=False, severity="low", reason="Empty content")

        # Truncate very long content to save tokens
        truncated = text[:2000] if len(text) > 2000 else text

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=256,
                system=SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": USER_PROMPT_TEMPLATE.format(
                            platform=platform,
                            content_type=content_type,
                            text=truncated,
                        ),
                    }
                ],
            )
            raw = response.content[0].text.strip()
            data = json.loads(raw)
            return AnalysisResult(
                flag=bool(data.get("flag", False)),
                severity=data.get("severity", "low"),
                reason=data.get("reason", ""),
            )
        except (json.JSONDecodeError, KeyError, IndexError) as e:
            return AnalysisResult(flag=False, severity="low", reason=f"Analysis error: {e}")

    def analyze_batch(
        self,
        items: list,
        delay: float = 0.3,
        progress_callback=None,
    ) -> list:
        """Analyze a list of ContentItems, returning (item, result) pairs."""
        results = []
        for i, item in enumerate(items):
            result = self.analyze(item.platform, item.content_type, item.text)
            results.append((item, result))
            if progress_callback:
                progress_callback(i + 1, len(items), item, result)
            if delay > 0:
                time.sleep(delay)
        return results
