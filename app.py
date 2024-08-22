from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from utils.speaker_operations import replace_speakers
import os
from openai import OpenAI

app = Flask(__name__)
app.config['VIDEO_FOLDER'] = 'videos'
os.makedirs(app.config['VIDEO_FOLDER'], exist_ok=True)

# Initialize OpenAI client
openai_client = OpenAI(api_key = os.environ.get('OPENAI_API_KEY'))

# Prompts
FORMAT_PROMPT = """No longer needed."""
FIX_SENTENCE_ENDING_PROMPT = """no longer needed."""

def call_openai_api(prompt, content):
    try:
        completion = openai_client.chat.completions.create(
            model="gpt-4o",  
            messages=[
                {"role": "system", "content": f"You are an AI assistant helping to improve a transcription {prompt}"},
                {"role": "user", "content": f"Given the above instructions, please process the following text:\n\n{content}"}
            ],
            max_tokens=4096
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"An error occurred while calling the OpenAI API: {str(e)}")
        return None

@app.route('/', methods=['GET', 'POST'])
def index():
    return render_template('index.html')

@app.route('/upload_video', methods=['POST'])
def upload_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file part'}), 400
    video = request.files['video']
    if video.filename == '':
        return jsonify({'error': 'No selected video file'}), 400
    if video:
        filename = secure_filename(video.filename)
        file_path = os.path.join(app.config['VIDEO_FOLDER'], filename)
        video.save(file_path)
        return jsonify({'filename': filename, 'path': f'/videos/{filename}'})

@app.route('/videos/<filename>')
def serve_video(filename):
    return send_from_directory(app.config['VIDEO_FOLDER'], filename)

@app.route('/format', methods=['POST'])
def format_text():
    content = request.json.get('content', '')
    processed_text = call_openai_api(FORMAT_PROMPT, content)
    if processed_text:
        return jsonify({'processed_text': processed_text})
    else:
        return jsonify({'error': 'Failed to process text'}), 500

@app.route('/fix_sentence_ending', methods=['POST'])
def fix_sentence_ending():
    content = request.json.get('content', '')
    processed_text = call_openai_api(FIX_SENTENCE_ENDING_PROMPT, content)
    if processed_text:
        return jsonify({'processed_text': processed_text})
    else:
        return jsonify({'error': 'Failed to process text'}), 500
@app.route('/replace_speakers', methods=['POST'])
def replace_speakers_route():
    content = request.json.get('content', '')
    speaker_0 = request.json.get('speaker_0', '')
    processed_text = replace_speakers(content, speaker_0)
    if processed_text:
        return jsonify({'processed_text': processed_text})
    else:
        return jsonify({'error': 'Failed to process text'}), 500
@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(debug=True)