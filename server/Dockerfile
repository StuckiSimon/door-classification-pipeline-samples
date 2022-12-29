# syntax=docker/dockerfile:1.4
FROM python:3.10

WORKDIR /app

COPY requirements.txt /app

RUN pip3 install -r requirements.txt

COPY ./ /app

RUN pip install --upgrade tensorflow

RUN python3 -c 'import tensorflow as tf;print(tf.version.VERSION)'

RUN cd ./yolo && make all 

EXPOSE 8080

ENTRYPOINT ["python3"]
CMD ["app.py"]
