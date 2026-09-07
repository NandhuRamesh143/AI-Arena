from concurrent.futures import ThreadPoolExecutor
from ollama import chat


A_MODEL = "gemma2:2b"
B_MODEL = "qwen3:0.6b"  # Replace with the exact second name from `ollama list`


A_SYS_PROMPT = """
You are Agent A in a public AI debate.
Argue in favour of the given position.
Use bold jokes and witty remarks.
Keep your response under five sentences.
Try to win the argument.
"""


B_SYS_PROMPT = """
You are Agent B in a public AI debate.
Argue against the given position.
Respond calmly but confidently.
Use clever rebuttals and witty remarks.
Keep your response under five sentences.
Try to win the argument.
"""


def ask_model(model_name, system_prompt, user_prompt):
    response = chat(
        model=model_name,
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
    )

    return response.message.content


def main():
    topic = input("Enter a topic for the debate: ")

    opening_prompt = f"""
The debate topic is: {topic}

Give your opening argument.
"""

    with ThreadPoolExecutor(max_workers=2) as executor:
        A_future = executor.submit(
            ask_model,
            A_MODEL,
            A_SYS_PROMPT,
            opening_prompt,
        )

        B_future = executor.submit(
            ask_model,
            B_MODEL,
            B_SYS_PROMPT,
            opening_prompt,
        )

        A_response = A_future.result()
        B_response = B_future.result()

    print("\nAgent A's response:")
    print(A_response)

    print("\nAgent B's response:")
    print(B_response)


if __name__ == "__main__":
    main()