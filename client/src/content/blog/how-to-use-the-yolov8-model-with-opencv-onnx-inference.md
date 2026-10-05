# How to use the yolov8 model with OpenCV onnx inference

Before you can use yolov8 model with opencv onnx inference you need to convert the model to onnx format you can this code for that

```text
from ultralytics import YOLO

model = YOLO("/path/to/your_yolo_model.pt")

model.export(format="onnx", imgsz=[640,640], opset=12)

```

after that, you can use the model that converted to onnx with an example like this

```text
import cv2
import numpy as np

net = cv2.dnn.readNetFromONNX("yolov8m-face.onnx")

```

and then you can use it to detect objects in images, but you need to resize the input image first to 640 x 640 dimension

here is an example of how to use it

```text
INPUT_WIDTH = 640
INPUT_HEIGHT = 640

image = cv2.imread('/path/to/your_image.jpg')
blob = cv2.dnn.blobFromImage(image, 1/255.0, (INPUT_WIDTH, INPUT_HEIGHT), swapRB=True, crop=False)
net.setInput(blob)

```

after that, you can get output like this

```text
output = net.forward()
output = output.transpose((0, 2, 1))

```

and then you can extract the output with format class ids, confidence, and the boxes(that save the detected area with the format, x = left, y = top, width, height) and then we save the extracted index cv2.dnn.NMSBoxes to index variable

```text
# Extract output detection
class_ids, confs, boxes = list(), list(), list()

image_height, image_width, _ = image.shape
x_factor = image_width / INPUT_WIDTH
y_factor = image_height / INPUT_HEIGHT

rows = preds[0].shape[0]

for i in range(rows):
    row = preds[0][i]
    conf = row[4]
    
    classes_score = row[4:]
    _,_,_, max_idx = cv2.minMaxLoc(classes_score)
    class_id = max_idx[1]
    if (classes_score[class_id] > .25):
        confs.append(conf)
        label = int(class_id)
        class_ids.append(label)
        
        #extract boxes
        x, y, w, h = row[0].item(), row[1].item(), row[2].item(), row[3].item() 
        left = int((x - 0.5 * w) * x_factor)
        top = int((y - 0.5 * h) * y_factor)
        width = int(w * x_factor)
        height = int(h * y_factor)
        box = np.array([left, top, width, height])
        boxes.append(box)
        
r_class_ids, r_confs, r_boxes = list(), list(), list()

indexes = cv2.dnn.NMSBoxes(boxes, confs, 0.25, 0.45) 
for i in indexes:
    r_class_ids.append(class_ids[i])
    r_confs.append(confs[i])
    r_boxes.append(boxes[i])

```

after that, we can check if the extracted output is the same as our expectation

```text

for i in indexes:
    box = boxes[i]
    left = box[0]
    top = box[1]
    width = box[2]
    height = box[3]
    conf = confs[i]
    
    cv2.rectangle(image, (left, top), (left + width, top + height), (0,255,0), 3)

```

and then you can generate the resulting image with boxes in the detected area

```text
cv2.imwrite("your_result_image.jpg", image)

```

here is my result I used yolov8 model with the capability to detect faces in images, and I used le-sserafim image to test it.

![Image](https://cdn-images-1.medium.com/max/1024/1*DrbQidpx8a8Kz6bWt-yRSQ.jpeg)

---

Published 2024-03-07 · [Read on medium](https://medium.com/@moonNight1/how-to-use-the-yolov8-model-with-opencv-onnx-inference-cd2e30c36ecf?source=rss-86218010e568------2)
