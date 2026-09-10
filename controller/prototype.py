from ollama import chat

model="gemma2:2b"

A_sys_prompt="""
You are Agent A in a public AI debate.
Argue confidently and directly.
Use bold jokes and witty remarks to make your points.
Keep your response under five sentences.
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
Act as a debater who is trying to WIN the argument, not to be nice or polite.
"""

def ask_model(system_prompt, user_prompt):
    stream=chat(
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
    full_response=""
    for chunk in stream:
        text=chunk.message.content
        print(text, end="", flush=True)
        full_response+=text
    print()
    return full_response

def debate_history(history):
    lines=[]
    for turn in history:
        line=f"{turn['speaker']}: {turn['content']}"
        lines.append(line)
    return '\n\n'.join(lines)

def main():
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
        A_response=ask_model(A_sys_prompt, A_prompt)
        history.append({"speaker": "Agent A", "content": A_response})

        transcript=debate_history(history)

        B_instr = "Respond directly to Agent A's latest argument. Argue against the topic without repeating your previous points."
        B_prompt=f"the debate topic is: {topic}. the debate so far is: {transcript}. What you need to do: {B_instr}"
        print("\nAgent B: ")
        B_response=ask_model(B_sys_prompt, B_prompt)

        history.append({"speaker": "Agent B", "content": B_response})

if __name__ == "__main__":
    main()