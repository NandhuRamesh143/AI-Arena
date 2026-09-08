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
Act as a debater who is trying to WIN the argument.
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

def main():
    topic=input("Enter a topic for the debate: ")

    A_prompt=f"""the debate topic is: {topic}.
    Argue in favor of this position. Give your opening statement."""

    print("\nAgent A's response:")
    A_response=ask_model(
        A_sys_prompt,
        A_prompt,
    )       

    B_prompt=f"""the debate topic is: {topic}.
    Agent A's response was: {A_response}
    Rebut against Agent A's argument directly. Argue against the original position."""

    print("\nAgent B's response:")
    B_response=ask_model(
        B_sys_prompt,
        B_prompt,
    )

if __name__ == "__main__":
    main()