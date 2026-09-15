import os
import warnings
from queue import Queue
from threading import Thread

import numpy as np

os.environ["HF_HUB_VERBOSITY"] = "error"

warnings.filterwarnings("ignore", message="dropout option adds dropout.*")
warnings.filterwarnings("ignore", message=".*weight_norm.*deprecated.*")
warnings.filterwarnings("ignore", message=".*torch.jit.script.*deprecated.*")

from kokoro import KPipeline
import sounddevice as sd


SAMPLE_RATE = 24000
SILENCE_THRESHOLD = 0.015
SILENCE_PADDING = 0.04
CONTINUATION_PAUSE = 0.02
SENTENCE_PAUSE = 0.12

text_queue = Queue()
audio_queue = Queue()


def trim_silence(audio):
    audio = np.asarray(audio, dtype=np.float32).flatten()

    if len(audio) == 0:
        return audio

    peak = np.max(np.abs(audio))

    if peak == 0:
        return audio

    active_samples = np.where(np.abs(audio) > peak * SILENCE_THRESHOLD)[0]

    if len(active_samples) == 0:
        return audio

    padding_samples = int(SAMPLE_RATE * SILENCE_PADDING)
    start = max(0, active_samples[0] - padding_samples)
    end = min(len(audio), active_samples[-1] + padding_samples)

    return audio[start:end]


def pause_after(text):
    text = text.strip()
    text = text.rstrip("\"'*)]}")

    if text.endswith((".", "!", "?")):
        return SENTENCE_PAUSE

    return CONTINUATION_PAUSE


def synthesis_worker(pipeline):
    while True:
        text, voice = text_queue.get()

        try:
            generator = pipeline(
                text,
                voice=voice,
                speed=1
            )

            generated_audio = []

            for result in generator:
                audio = trim_silence(result.audio)

                if len(audio) > 0:
                    generated_audio.append(audio)

            for audio in generated_audio[:-1]:
                audio_queue.put((audio, 0))

            if generated_audio:
                audio_queue.put((generated_audio[-1], pause_after(text)))

        except Exception as error:
            print(f"\nTTS generation error: {error}")

        finally:
            text_queue.task_done()


def playback_worker():
    try:
        with sd.OutputStream(
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="float32"
        ) as output_stream:
            while True:
                audio, pause = audio_queue.get()

                try:
                    output_stream.write(audio.reshape(-1, 1))

                    pause_samples = int(SAMPLE_RATE * pause)

                    if pause_samples > 0:
                        silence = np.zeros((pause_samples, 1), dtype=np.float32)
                        output_stream.write(silence)

                except Exception as error:
                    print(f"\nAudio playback error: {error}")

                finally:
                    audio_queue.task_done()

    except Exception as error:
        print(f"\nCould not open the audio output: {error}")


def load_tts():
    print("Loading Kokoro...")

    pipeline = KPipeline(
        lang_code="a",
        repo_id="hexgrad/Kokoro-82M",
        device="cpu"
    )

    warmup_generator = pipeline(
        "Ready.",
        voice="af_heart",
        speed=1
    )

    for result in warmup_generator:
        pass

    synthesis_thread = Thread(
        target=synthesis_worker,
        args=(pipeline,),
        daemon=True
    )

    playback_thread = Thread(
        target=playback_worker,
        daemon=True
    )

    synthesis_thread.start()
    playback_thread.start()

    print("Kokoro is ready.")


def queue_text(text, voice):
    text_queue.put((text, voice))


def wait_for_speech():
    text_queue.join()
    audio_queue.join()
