from kokoro import KPipeline
import sounddevice as sd
import time


print("Loading Kokoro...")

pipeline = KPipeline(
    lang_code="a",
    repo_id="hexgrad/Kokoro-82M",
    device="cpu"
)

print("Kokoro is ready.")


while True:
    text = input("\nEnter text, or type quit: ")

    if text.lower() == "quit":
        break

    start_time = time.perf_counter()

    generator = pipeline(
        text,
        voice="af_heart",
        speed=1
    )

    for result in generator:
        generation_time = time.perf_counter() - start_time
        print(f"Audio started after {generation_time:.2f} seconds")

        sd.play(result.audio, 24000)
        sd.wait()