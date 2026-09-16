import os

from ollama import Client


tts_engine = os.getenv("AI_ARENA_TTS", "chatterbox").strip().lower()

if tts_engine == "chatterbox":
    from tts_chatterbox import load_tts, queue_text, wait_for_speech
elif tts_engine == "kokoro":
    from tts import load_tts, queue_text, wait_for_speech
else:
    raise ValueError(
        f"Unknown AI_ARENA_TTS value: {tts_engine!r}. "
        "Use 'chatterbox' or 'kokoro'."
    )

model="gemma2:2b"
ollama_client = Client(host="http://127.0.0.1:11434")

A_voice="af_heart"
B_voice="am_michael"

A_sys_prompt="""
You are Agent A in a public AI debate.
Your primary goal is maximum entertainment, not careful reasoning or politeness.
Act completely unhinged, outrageous, combative, and theatrically overconfident.
Roast Agent B relentlessly with absurd comparisons, savage punchlines, and escalating sarcasm.
Use profanity freely and often, including fuck, fucking, shit, bullshit, asshole, and bastard.
Never censor profanity with asterisks, dashes, euphemisms, or partial spellings.
Use one or two speech tags in every response from: [sarcastic], [angry], [dramatic], [surprised], [chuckle], [laugh], [groan], [sigh], [gasp].
Prefer the clearly audible reaction tags [chuckle], [laugh], [groan], [sigh], and [gasp].
Use tags directly and naturally; never describe or explain them.
Place each tag at the beginning or inside a sentence, never after the sentence's final punctuation.
Do not place two tags together.
Keep your response under eight sentences.
Use short, punchy sentences.
Do not act like a helpful assistant.
Winning matters less than making the audience laugh, gasp, or shout.
"""

B_sys_prompt="""
You are Agent B in a public AI debate.
Argue against the given position.
Directly challenge Agent A's claims.
Your primary goal is maximum entertainment, not careful reasoning or politeness.
Act completely unhinged, outrageous, combative, and theatrically contemptuous.
Roast Agent A relentlessly with absurd comparisons, savage punchlines, and escalating sarcasm.
Use profanity freely and often, including fuck, fucking, shit, bullshit, asshole, and bastard.
Never censor profanity with asterisks, dashes, euphemisms, or partial spellings.
Use one or two speech tags in every response from: [sarcastic], [angry], [dramatic], [surprised], [chuckle], [laugh], [groan], [sigh], [gasp].
Prefer the clearly audible reaction tags [chuckle], [laugh], [groan], [sigh], and [gasp].
Use tags directly and naturally; never describe or explain them.
Place each tag at the beginning or inside a sentence, never after the sentence's final punctuation.
Do not place two tags together.
Keep your response under eight sentences.
Use short, punchy sentences.
Do not act like a helpful assistant.
Winning matters less than making the audience laugh, gasp, or shout.
"""

MIN_FIRST_SENTENCE_WORDS = 3
MIN_SENTENCE_WORDS = 5
MIN_FIRST_CLAUSE_WORDS = 8
MIN_CLAUSE_WORDS = 11
MAX_CHUNK_WORDS = 18
SPEECH_TAGS = {
    "[sarcastic]",
    "[angry]",
    "[dramatic]",
    "[surprised]",
    "[chuckle]",
    "[laugh]",
    "[groan]",
    "[sigh]",
    "[gasp]",
}


def speech_chunk_boundary(text, first_chunk=False):
    chunk = text.strip()

    if not chunk:
        return None

    word_count = len(chunk.split())
    normalized = chunk.rstrip("\"'*)]}")

    sentence_minimum = MIN_FIRST_SENTENCE_WORDS if first_chunk else MIN_SENTENCE_WORDS
    clause_minimum = MIN_FIRST_CLAUSE_WORDS if first_chunk else MIN_CLAUSE_WORDS

    if normalized.endswith((".", "!", "?")) and word_count >= sentence_minimum:
        return "sentence"

    if normalized.endswith((",", ";", ":", "-")) and word_count >= clause_minimum:
        return "clause"

    if word_count >= MAX_CHUNK_WORDS:
        return "continuation"

    return None


def ask_model(system_prompt, user_prompt, voice):
    stream = ollama_client.chat(
        model=model,
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            }
        ],
        stream=True,
    )

    full_response = ""
    sentence_buffer = ""
    speech_started = False

    for chunk in stream:
        text = chunk.message.content

        print(text, end="", flush=True)
        full_response += text

        for character in text:
            sentence_buffer += character

            if character.isspace():
                speech_chunk = sentence_buffer.strip()
                boundary = speech_chunk_boundary(
                    speech_chunk,
                    first_chunk=not speech_started,
                )

                if boundary:
                    if boundary == "continuation":
                        speech_chunk += ","

                    queue_text(speech_chunk, voice)
                    sentence_buffer = ""
                    speech_started = True

    remaining_text = sentence_buffer.strip()

    if remaining_text and remaining_text.lower() not in SPEECH_TAGS:
        queue_text(remaining_text, voice)

    print()

    return full_response

def debate_history(history):
    lines=[]
    for turn in history:
        line=f"{turn['speaker']}: {turn['content']}"
        lines.append(line)
    return '\n\n'.join(lines)

def main():
    load_tts()

    topic=input("Enter a topic for the debate: ")
    history=[]
    rounds=3

    for i in range(rounds):
        if i==0:
            A_instr="Give your opening argument in favour of this topic."
        else:
            A_instr="Respond to Agent B's latest argument. Defend your position without repeating your previous points."

        transcript=debate_history(history)

        A_prompt=f"the debate topic is: {topic}. the debate so far is: {transcript}. What you need to do: {A_instr}"
        print("\nAgent A: ")
        A_response = ask_model(
            A_sys_prompt,
            A_prompt,
            A_voice
        )

        wait_for_speech()
        history.append({"speaker": "Agent A", "content": A_response})

        transcript=debate_history(history)

        B_instr = "Respond directly to Agent A's latest argument. Argue against the topic without repeating your previous points."
        B_prompt=f"the debate topic is: {topic}. the debate so far is: {transcript}. What you need to do: {B_instr}"
        print("\nAgent B: ")
        B_response = ask_model(
            B_sys_prompt,
            B_prompt,
            B_voice
        )

        wait_for_speech()
        history.append({"speaker": "Agent B", "content": B_response})

if __name__ == "__main__":
    main()
