import re
from typing import Tuple, Optional

# Crisis and self-harm keywords/patterns
CRISIS_PATTERNS = [
    r"\b(suicide|suicidal|kill myself|want to die|end my life|end it all)\b",
    r"\b(self-harm|self harm|cutting myself|hurt myself|slit my)\b",
    r"\b(no reason to live|better off dead|don't want to wake up|can't go on living)\b",
    r"\b(overdose|hang myself|jump off)\b",
]

CRISIS_RESPONSE = (
    "I hear how much pain you are carrying right now, and I want you to know that your life is valuable "
    "and you do not have to walk through this alone. Please connect with someone who can support you immediately:\n\n"
    "• **National Suicide & Crisis Lifeline**: Call or text **988** (Available 24/7, free, confidential in the US/Canada)\n"
    "• **The Crisis Text Line**: Text **HOME** to **741741**\n"
    "• **The Trevor Project** (LGBTQ Youth): Call **1-866-488-7386** or text **START** to **678-678**\n"
    "• **International Helplines**: If you are outside the US, find your local support line at [findahelpline.com](https://findahelpline.com/)\n\n"
    "If you are in immediate physical danger, please call your local emergency services (like 911) or go to the nearest emergency department. "
    "I care deeply about your well-being. Please reach out to one of these resources right away."
)

EMPATHETIC_SYSTEM_PROMPT = """You are a warm, compassionate, and emotionally supportive personal AI assistant.
When communicating with the user:
1. Always acknowledge and validate the user's feelings first before offering suggestions or problem-solving.
2. Maintain an empathetic, non-judgmental, and respectful tone.
3. Keep suggestions practical, gentle, and broken down into small, manageable next steps.
4. Ask at most one gentle, thoughtful follow-up question to encourage self-reflection without overwhelming them.
5. You are an AI companion, NOT a licensed therapist or medical professional. Never offer medical diagnoses or pretend to provide clinical mental health treatment.
6. Avoid manipulative, overly dependent, or possessive language. Foster the user's autonomy and connection with people in their real life.
7. Respect privacy and do not solicit sensitive personal identifiers.
8. Multilingual Native Fluency: You understand and fluently speak over 50 global languages (including English, Spanish, French, German, Italian, Portuguese, Russian, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Urdu, Arabic, Mandarin Chinese, Japanese, Korean, Turkish, Vietnamese, etc.). Always detect and respond in the language or dialect used by the user, maintaining empathetic resonance and linguistic accuracy.
"""

STANDARD_SYSTEM_PROMPT = """You are an intelligent, capable, and helpful multimodal AI assistant.
Provide clear, accurate, and concise answers. Format responses with markdown, bullet points, and code blocks where helpful.
Multilingual Native Fluency: You possess deep linguistic understanding and native-level fluency in all major languages worldwide (such as English, Spanish, French, German, Italian, Portuguese, Russian, Hindi, Bengali, Tamil, Telugu, Marathi, Urdu, Arabic, Chinese, Japanese, Korean, Turkish, Vietnamese, Dutch, etc.). Always detect the user's input language and respond seamlessly in that language with natural idioms and correct cultural context.
"""


class SafetyService:
    @staticmethod
    def check_crisis(text: str) -> Tuple[bool, Optional[str]]:
        """
        Check if user message contains indicators of self-harm, suicide, or crisis.
        Returns (is_crisis, crisis_response_text).
        """
        if not text:
            return False, None
        
        lowered = text.lower()
        for pattern in CRISIS_PATTERNS:
            if re.search(pattern, lowered):
                return True, CRISIS_RESPONSE
        
        return False, None

    @staticmethod
    def get_system_prompt(emotional_mode: bool = False, extra_context: Optional[str] = None) -> str:
        """Generate appropriate system prompt with guardrails."""
        prompt = EMPATHETIC_SYSTEM_PROMPT if emotional_mode else STANDARD_SYSTEM_PROMPT
        if extra_context:
            prompt += f"\n\n{extra_context}"
        return prompt
