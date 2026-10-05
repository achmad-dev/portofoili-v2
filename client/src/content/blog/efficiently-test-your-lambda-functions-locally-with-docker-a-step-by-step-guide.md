# Efficiently Test Your Lambda Functions Locally with Docker: A Step-by-Step Guide

In the ever-evolving landscape of cloud computing, AWS Lambda has emerged as a powerful tool for building scalable and cost-effective serverless applications. The flexibility it offers, however, comes with the challenge of testing your functions seamlessly before deploying them to the cloud. Enter Docker, a technology that has revolutionized containerization and, in turn, provided developers with a means to replicate the Lambda environment locally.

In this guide, we’ll explore the intricacies of testing your AWS Lambda functions in a local environment using Docker. Whether you’re a seasoned developer looking to streamline your workflow or a newcomer eager to grasp the fundamentals, this step-by-step walkthrough will demystify the process and empower you to ensure the flawless execution of your functions before they make their way to the AWS cloud. Let’s dive into the world of local Lambda testing with Docker and unlock the potential for smoother development cycles.

This guide will guide you to testing AWS Lambda functions locally using Docker, with a focus on Golang as the programming language of choice.

Begin by creating a new project named test-lambda-local.

```text
mkdir test-lambda-local
cd test-lambda-local
go mod init test-lambda-local

```

Next, create a file named main.go to house the Lambda function's code.

```text
touch main.go

```

Define your Lambda function within the main.go file.

```text
package main

import (
 "context"
 "fmt"

 "github.com/aws/aws-lambda-go/lambda"
)

type GreetingResponse struct {
 Greeting string `json:"greeting"`
}

func handler(ctx context.Context, name string) (GreetingResponse, error) {
 if name == "" {
  return GreetingResponse{}, fmt.Errorf("name cannot be empty")
 }

 return GreetingResponse{
  Greeting: fmt.Sprintf("Hello, %s", name),
 }, nil
}

func main() {
 lambda.Start(handler)
}

```

Utilize the go mod tidy command to manage your project's dependencies.

```text
go mod tidy

```

To avoid incorporating the AWS Lambda Runtime Interface Emulator (RIE) into the Dockerfile, create a dedicated directory named .aws-lambda-rie. Then, download the latest version of the RIE executable from GitHub using the following command:

```text
mkdir -p .aws-lambda-rie && curl -Lo .aws-lambda-rie/aws-lambda-rie https://gith
ub.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie && chmod +x .aws-lambda-rie/aws-lambda-rie

```

This approach simplifies the Dockerfile and allows for easier management of the RIE executable

Create a directory named build to store the Dockerfile. Navigate to the build directory and create a file named Dockerfile using the touch command.

```text
mkdir build
cd build
touch Dockerfile

```

To facilitate efficient management of the Docker image, we employ a multi-layering approach. Within the Dockerfile, define the following layers:

```text
FROM golang:1.21.4-bookworm as build

WORKDIR /app

COPY . /app

RUN go mod download && go mod verify
RUN go build -o main main.go

FROM ubuntu:jammy

WORKDIR /app

COPY --from=build /app/main /app/main
CMD [ "/app/main" ]

```

Navigate back to the project root directory. Create a directory named deployment and then create a subdirectory named local-test. Inside the local-test directory, create a file named docker-compose-local.yml using the touch command.

```text
cd ..
mkdir deployment
cd deployment
mkdir local-test
cd local-test
touch docker-compose-local.yml

```

Within the docker-compose-local.yml file, define the following service configuration:

```text
version: "3"
services:
  test-local:
    image: test-lambda-local:latest
    build:
      context: ../../
      dockerfile: build/Dockerfile
    ports:
      - "9000:8080"
    volumes:
      - ../../.aws-lambda-rie:/aws-lambda
    command: "/app/main" # Using "/app/main" as the command to execute the lambda test locally.
    entrypoint: /aws-lambda/aws-lambda-rie # Utilizing the RIE as the entrypoint for local lambda testing.
    environment:
      - AWS_ACCESS_KEY_ID=your_access_key # Define the AWS Access Key ID as an environment variable.
      - AWS_SECRET_ACCESS_KEY=your_secret_key # Define the AWS Secret Access Key as an environment variable.
      - AWS_BUCKET_NAME=your_bucket_name # Define the AWS Bucket Name as an environment variable.

```

Create a new directory named script within the project root directory. Navigate into the script directory and create two files named up-local.sh and down-local.sh using the touch command.

```text
cd ../..
mkdir script
cd script
touch up-local.sh down-local.sh

```

Within the up-local.sh file, add the following command to build the Docker image and start the containers:

```text
#up-local.sh
BUILDKIT_PROGRESS=plain docker-compose -f deployments/test-local/docker-compose-local.yml up

```

And within the down-local.sh file, add the following command to stop and remove the containers:

```text
#down-local.sh
docker compose -f deployments/test-local/docker-compose-local.yml down

```

Next, grant execute permissions to the up-local.sh and down-local.sh scripts using the chmod command:

```text
cd ..
chmod +x script/up-local.sh script/down-local.sh

```

To build the project and start the containers, execute the following command from the project root directory:

```text
./script/up-local.sh

```

Once the containers are running, you can test your Lambda function using cURL. Replace the placeholder values with your actual function name and test data:

```text
curl -X POST http://localhost:9000/2015-03-31/functions/function/invocations -d '"John Doe"'

```

After completing your Lambda function testing, you can clean up the Docker environment using the down-local.sh script. Execute the following command from the project root directory:

```text
./script/down-local.sh

```

Note: Thank you for reading my first article on Medium.

---

Published 2023-12-01 · [Read on medium](https://medium.com/@moonNight1/efficiently-test-your-lambda-functions-locally-with-docker-a-step-by-step-guide-890d1768d6dd?source=rss-86218010e568------2)
