# From Segmentation to Surrealism: Unleashing the Power of YOLOv8 and Stable Diffusion in Painting

The world of art is constantly evolving, and artificial intelligence (AI) is rapidly becoming a powerful tool for artistic expression. Imagine a process that can not only identify objects within an image but also use that information to create fantastical and unique paintings. This is the exciting potential that arises from combining YOLOv8 segmentation with Stable Diffusion.

In this blog post, we’ll delve into this groundbreaking technique, showcasing how it can be used to elevate your artistic creations. We’ll provide a step-by-step guide specifically tailored for Google Colab, making it accessible even for those with limited coding experience. So, whether you’re a seasoned artist or just beginning your creative journey, get ready to unleash your imagination with the power of AI-assisted painting!

Before diving into the guide, let’s ensure we have the optimal environment for unleashing our creativity. Google Colab offers powerful GPUs that can significantly accelerate the process. So you need to change the runtime first to t4 gpu.

Once the T4 GPU is selected, we’ll establish a connection between our Colab runtime and Google Drive. This connection lets us access files from your drive directly within the notebook. Run the following code to connect:

```text
from google.colab import drive
drive.mount('/content/drive')

```

Now, let’s import the necessary libraries to display and manipulate images within our notebook.

```text
import cv2
from google.colab.patches import cv2_imshow
import numpy as np

```

Now, let’s visualize the image we’ll be working with! We can use OpenCV (cv2) to read the image directly from our Google Drive. Here’s the code:

```text
img = cv2.imread("/content/drive/MyDrive/path/your_image.jpeg")
cv2_imshow(img)

```

as for me i am using cat image

![Image](https://cdn-images-1.medium.com/max/589/1*JmeMykuP8YotZZ3Ijk3Qpw.png)

To leverage the power of YOLOv8 for image segmentation in our project, we’ll need to install the ultralytics library. This library provides convenient access to YOLOv8 models and functionalities. We can install it using the following command within our Colab notebook:

```text
!pip install ultralytics

```

Now, it’s time to unleash the power of YOLOv8 for image segmentation! The ultralytics library offers various pre-trained YOLOv8 models, each with different capabilities. We recommend exploring the ultralytics documentation [https://docs.ultralytics.com/](https://docs.ultralytics.com/) to choose the model that best suits your segmentation needs.

Here’s a code snippet demonstrating how to use YOLOv8 for segmentation with a sample model:

```text
from ultralytics import YOLO

model = YOLO("yolov8x-seg.pt")
conf = 0.5

results = model.predict(img, conf=conf)

```

Now, with the YOLOv8, we have segmented our image! The results variable from the model.predict function holds valuable information about the detected objects. We’ll iterate through these results and create a new image where the background is white and the detected objects black. This manipulation prepares the image perfectly for the next step involving Stable Diffusion.

```text
result_img = img
for result in results:
  for mask, bon in zip(result.masks.xy, result.boxes):
    white_mask = np.ones_like(result_img) * 255
    points = np.int32([mask])
    result_img = cv2.fillPoly(white_mask, points, (0, 0, 0))

```

Let’s visualize the outcome of our segmentation process! Run the following code to display the image with the segmented background (white) and black objects:

```text
cv2_imshow(result_img)

```

![Image](https://cdn-images-1.medium.com/max/589/1*wcZJI9nnlC9GIps3Tfe93g.png)

Now, we’re ready to unleash the artistic power of Stable Diffusion! To interact with this powerful library, we’ll need to install a few additional packages within our Colab environment.

```text
!pip install --upgrade diffusers transformers scipy ftfy gradio accelerate

```

Now that the required packages are installed, let’s import the functions we’ll be using from the respective libraries.

```text
import torch
from diffusers import StableDiffusionInpaintPipeline
import gradio as gr
import PIL

```

Now, it’s time to ignite the creative spark! We’ll initialize the StableDiffusionInpaintPipeline, which serves as the engine for our artistic exploration.

```text
model_path = "runwayml/stable-diffusion-inpainting"
device = "cuda"
pipe_in_paint = StableDiffusionInpaintPipeline.from_pretrained(
    model_path,
    torch_dtype=torch.float16,
).to(device)

```

Before unleashing the creative power of Stable Diffusion, we need to process our images . Here, we’ll define two helpful functions

- cv_to_pil_img**:** This function converts an image from OpenCV (cv2) format to the Pillow (PIL). The conversion involves changing the color space from BGR (OpenCV) to RGB (PIL) for compatibility.

- image_grid**:** This function creates a grid layout from a list of images. It takes the number of rows, columns, and a list of images as input and generates a single image displaying all the input images in a grid format.

```text
def cv_to_pil_img(img):
  color_coverted = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
  pil_image = PIL.Image.fromarray(color_coverted)
  return pil_image

def image_grid(imgs, rows, cols):
    assert len(imgs) == rows*cols

    w, h = imgs[0].size
    grid = PIL.Image.new('RGB', size=(cols*w, rows*h))
    grid_w, grid_h = grid.size
    
    for i, img in enumerate(imgs):
        grid.paste(img, box=(i%cols*w, i//cols*h))
    return grid

```

after that we convert our original image and mask image (that we are using yolo segmentation before) also in here i resize the image to 512 x 512

```text
mask_pil_img = cv_to_pil_img(result_img).resize((512,512))
ori_pil_img = cv_to_pil_img(img).resize((512,512))

```

Now, it’s time to witness the magic of Stable Diffusion! We’ll leverage the pipe_in_paint object we initialized earlier to create new images based on our original image and the mask. (note: We set num_images_per_prompt to 3 to generate three different artistic interpretations based on the prompt and image, also you can change the manual seed to get different result)

```text
prompt = "change the background to beautifull beach"

guidance_scale=10
num_samples = 3
generator = torch.Generator(device="cuda").manual_seed(0)

images = pipe_in_paint(
    prompt=prompt,
    image=ori_pil_img,
    mask_image=mask_pil_img,
    guidance_scale=guidance_scale,
    generator=generator,
    num_images_per_prompt=num_samples,
).images

```

Now, let’s witness the fruits of our creative collaboration with Stable Diffusion! The pipe_in_paint function generates a list of images based on our prompt and settings. Here's what we'll do to visualize the results:

- **Including the Original Image:** We’ll use the insert method to add the original image (ori_pil_img) at the beginning of the images list. This ensures the original image is displayed on the left side when we create the grid.

- **Creating the Image Grid:** We’ll use the image_grid function we defined earlier to create a grid layout from the list of images (images). We set the number of rows to 1 (to display all images in a single row) and the number of columns to num_samples + 1 (to accommodate the original image and the generated samples).

```text
images.insert(0, ori_pil_img)
image_grid(images, 1, num_samples + 1)

```

This concludes the inpainting process, and the results are displayed below! You’ll see the original image on the left side, followed by the AI-generated images depicting the background transformed into a beautiful beach, as instructed by our prompt.

![Image](https://cdn-images-1.medium.com/max/1024/1*rmtsICSGQgKCTEbiM0kidw.png)

---

Published 2024-03-16 · [Read on medium](https://medium.com/@moonNight1/from-segmentation-to-surrealism-unleashing-the-power-of-yolov8-and-stable-diffusion-in-painting-9d66e8624609?source=rss-86218010e568------2)
