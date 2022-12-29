import os
import subprocess
from pathlib import Path

from skimage import io, transform
import numpy as np

import tensorflow as tf
from tensorflow import keras

output_image_size = 160  # must match size of pipeline

door_id = "door"
handle_id = "handle"

output_dir = '/tmp'


def float_parse_optional(f):
    try:
        return float(f)
    except ValueError:
        return None


def parse_yolo_output_line(line):
    entries_as_str = line.split(', ')
    [id, x, y, width, height] = map(float_parse_optional, entries_as_str)
    return (x, y, width, height)


def warp_image(door_coords, image_path):
    (x, y, width, height) = door_coords
    image = io.imread(image_path)

    height = image.shape[0]
    width = image.shape[1]

    door_center = (door_coords[0] * width, door_coords[1] * height)
    door_width = door_coords[2] * width
    door_height = door_coords[3] * height

    pos_bottom_left = (door_center[0] - door_width / 2,
                       door_center[1] + door_height / 2)
    pos_bottom_right = (
        door_center[0] + door_width / 2, door_center[1] + door_height / 2)
    pos_top_right = (door_center[0] + door_width / 2,
                     door_center[1] - door_height / 2)
    pos_top_left = (door_center[0] - door_width / 2,
                    door_center[1] - door_height / 2)

    src = np.array([[0, 0], [0, output_image_size], [
                   output_image_size, output_image_size], [output_image_size, 0]])
    dst = np.array([pos_top_left, pos_bottom_left,
                   pos_bottom_right, pos_top_right])

    tform = transform.ProjectiveTransform()
    tform.estimate(src, dst)
    warped = transform.warp(image, tform, output_shape=(
        output_image_size, output_image_size))

    out_path = output_dir
    Path(out_path).mkdir(parents=True, exist_ok=True)

    out_file = os.path.join(out_path, os.path.basename(image_path))

    output_path = Path(out_file)
    output_path = output_path.with_suffix('.png')
    io.imsave(str(output_path), warped)

    return output_path


def check_meta_file_exists(image_path):
    return os.path.isfile(str(image_path) + ".txt")


def parse_file(image_path):
    raw_file_handle = open(str(image_path) + ".txt")
    lines = raw_file_handle.readlines()
    raw_file_handle.close()
    door_coords = None
    handle_coords = None
    for line in lines:
        if line.startswith(door_id):
            if (door_coords is not None):
                print('multiple doors detected')
            door_coords = parse_yolo_output_line(line)
        elif line.startswith(handle_id):
            if (handle_coords is not None):
                print('multiple handles detected')
            handle_coords = parse_yolo_output_line(line)

    return door_coords, handle_coords


def process_file(image_path):
    p = subprocess.Popen(['./darknet', 'detect', 'cfg_custom/yolo-obj.cfg', 'cfg_custom/yolo-obj.weights', str(image_path)],
                         cwd='/app/yolo',
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = p.communicate()
    if p.returncode != 0:
        raise Exception(stderr)

    door_coords, handle_coords = parse_file(image_path)
    if door_coords is None and handle_coords is None:
        print('no door and handle detected')
        return
    elif door_coords is None:
        print('no door detected')
        return
    elif handle_coords is None:
        print('no handle detected')
        return
    else:
        print('door and handle detected')

    # warp image
    image_destination = warp_image(door_coords, image_path)

    model_dir = '/app/door-discriminator'
    model = keras.models.load_model(model_dir)

    img_data = io.imread(image_destination)
    x = img_data
    x = np.expand_dims(x, axis=0)

    prediction = model.predict(x)

    predicted_value = prediction[0][0]

    label = 'left' if predicted_value < 0.5 else 'right'

    return label
