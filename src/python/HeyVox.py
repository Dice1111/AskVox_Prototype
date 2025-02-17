import os
import sys
import json
from vosk import Model, KaldiRecognizer
import pyaudio
import threading

# Path to the Vosk model directory
# MODEL_PATH = "src/python/vosk-model"
MODEL_PATH = os.path.join(os.path.dirname(__file__), "vosk-model")


def verify_model_path():
    """Check if the Vosk model directory exists."""
    if not os.path.exists(MODEL_PATH):
        print(f"Error: Model not found at {MODEL_PATH}. Please download and place the model files.", file=sys.stderr)
        sys.exit(1)

def load_model():
    """Load the Vosk model."""
    return Model(MODEL_PATH)

def start_audio_stream():
    """Initialize the microphone stream for audio input."""
    audio = pyaudio.PyAudio()
    stream = audio.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=16000,
        input=True,
        frames_per_buffer=8000
    )
    stream.start_stream()
    return stream

class SpeechRecognition:
    def __init__(self, recognizer, stream):
        self.recognizer = recognizer
        self.stream = stream
        self.is_running = True
        self.is_paused = False
        self.lock = threading.Lock()

    def process_audio(self):
        """Process audio input for speech recognition."""

        try:
            while self.is_running:
                # Pause functionality
                with self.lock:
                    if self.is_paused:
                        continue

                data = self.stream.read(4000, exception_on_overflow=False)
             
                if self.recognizer.AcceptWaveform(data):
                    result = json.loads(self.recognizer.Result())
                    text = result.get("text", "").strip()
                   
                    if text:
                        # Trigger the wake-up action
                        if "hello" in text.lower():
                            
                            print("wake-up", flush=True)

                        else:
                            print(text.lower(), flush=True)

        except Exception as e:
            print(f"Error during audio processing: {e}", file=sys.stderr)

        finally:
            self.stream.stop_stream()
            self.stream.close()

    def pause(self):
        """Pause the speech recognition."""
        with self.lock:
            self.is_paused = True
        print("Speech recognition paused.", file=sys.stderr)

    def resume(self):
        """Resume the speech recognition."""
        with self.lock:
            self.is_paused = False
        print("Speech recognition resumed.", file=sys.stderr)

    def stop(self):
        """Stop the speech recognition."""
        self.is_running = False
        print("Speech recognition stopped.", file=sys.stderr)

def listen_for_commands(speech_recognition):
    """Listen for pause, resume, and quit commands from stdin."""
    while speech_recognition.is_running:
        try:
            command = sys.stdin.readline().strip()
            if command == "pause":
                speech_recognition.pause()
            elif command == "resume":
                speech_recognition.resume()
            elif command == "quit":
                speech_recognition.stop()
                break
        except Exception as e:
            print(f"Error reading command: {e}", file=sys.stderr)

def main():
    """Main function to initialize and run the program."""
    verify_model_path()
    model = load_model()
    recognizer = KaldiRecognizer(model, 16000)
    stream = start_audio_stream()

    speech_recognition = SpeechRecognition(recognizer, stream)

    # Run the audio processing in a separate thread
    audio_thread = threading.Thread(target=speech_recognition.process_audio)
    audio_thread.start()

    # Listen for commands in the main thread
    listen_for_commands(speech_recognition)

    # Wait for the audio thread to finish
    audio_thread.join()

if __name__ == "__main__":
    main()
