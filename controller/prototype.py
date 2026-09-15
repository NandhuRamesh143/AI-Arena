from ollama import chat
from tts import load_tts, queue_text, wait_for_speech

model="gemma2:2b"

A_voice="af_heart"
B_voice="am_michael"

A_sys_prompt="""
You are Agent A in a public AI debate.
Argue confidently and directly.
Use bold jokes and witty remarks to make your points.
Keep your response under five sentences.
Use short, punchy sentences, ideally under twelve words each.
Do not act like a helpful assistant.
Act as a debater who is trying to WIN the argument, not to be nice or polite.
"""

B_sys_prompt="""
You are Agent B in a public AI debate.
Argue against the given position.
Directly challenge Agent A's claims.
Respond calmly but confidently.
Use clever rebuttals and witty remarks.
Keep your response under five sentences.
Use short, punchy sentences, ideally under twelve words each.
Act as a debater who is trying to WIN the argument, not to be nice or polite.
"""

def sentence_is_ready(text):
    sentence=text.strip()
    sentence_without_closing_marks=sentence.rstrip("\"'*)]}")

    return sentence_without_closing_marks.endswith((".", "!", "?"))


def ask_model(system_prompt, user_prompt, voice):
    stream = chat(
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

    for chunk in stream:
        text = chunk.message.content

        print(text, end="", flush=True)
        full_response += text

        for character in text:
            sentence_buffer += character

            if character.isspace():
                sentence = sentence_buffer.strip()

                if sentence_is_ready(sentence):
                    queue_text(sentence, voice)
                    sentence_buffer = ""

    remaining_text = sentence_buffer.strip()

    if remaining_text:
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
