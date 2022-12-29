import os
import json

from flask import Flask, request, Response
from werkzeug.utils import secure_filename

from doordetector import process_file

UPLOAD_FOLDER = '/tmp'
ALLOWED_EXTENSIONS = {'jpg'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/door', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return "no file part", 400
    file = request.files['file']
    # if user does not select file, browser also
    # submit an empty part without filename
    if file.filename == '':
        return "no file selected", 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(image_path)

        label = process_file(image_path)

        return Response(json.dumps([
            {
                'label': label,
            }
        ]), mimetype='application/json')


@app.route('/')
def root():
    return "Door Recognition Server v1"


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
