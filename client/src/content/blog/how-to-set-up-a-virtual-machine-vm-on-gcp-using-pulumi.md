# How to Set Up a Virtual Machine (VM) on GCP Using Pulumi

![Image](https://cdn-images-1.medium.com/max/1024/1*UrHX4xTXft8qS0NLCw_ACw.jpeg)

Cloud infrastructure management has become easier with tools like Pulumi or Terraform that help you define your infrastructure as code, whether you are working with GCP, AWS, or Azure.

In this article, we will learn how to set up a Google Cloud Virtual Machine (VM) using Pulumi, making it simple to automate your cloud infrastructure.

**Prerequisites**

Before we learn how to implement it, you need to have these tools installed.

- gcloud

- pulumi

### Step 1: set up the tools

After you have these tools installed, you need to authenticate using the following commands:

For Pulumi:

```text
pulumi login

```

For gcloud

```text
gcloud auth application-default login 

```

In gcloud, we use application-default to save the credentials locally, allowing Pulumi to access them.

After that, we need to configure Pulumi to use our project.

```text
pulumi config set gcp:project <project-id>

```

### Step 2: Initialize the project

Now we can set up the project using this:

```text
mkdir vm
cd vm
pulumi new gcp-typescript

```

We also need to install the GCP plugin and the dotenv package.

```text
npm install @pulumi/gcp dotenv

```

### Step 3: now we can start to implement the infrastructure code

now we can write the pulumi code

```text
import * as gcp from "@pulumi/gcp";
import * as dotenv from "dotenv";

dotenv.config();

// Create a Google Cloud Network
const network = new gcp.compute.Network("my-network", {
  autoCreateSubnetworks: true,
});

const allowedIp = process.env.ALLOWED_IP_ADDRESS;

// Create a Firewall Rule to allow SSH traffic
// /32 in IP notation is part of CIDR (Classless Inter-Domain Routing)
const firewall = new gcp.compute.Firewall("my-firewall", {
  network: network.name,
  allows: [{
    protocol: "tcp",
    ports: ["22"],
  }],
  sourceRanges: [`${allowedIp}/32`],
});

// Create an External IP Address
const externalIp = new gcp.compute.Address("my-vm-ip", {
  region: "us-central1", // Replace with your desired region
});

const sshKey = process.env.SSH_PUBLIC_KEY;
if (!sshKey) {
  throw new Error("Environment variable SSH_PUBLIC_KEY is required to set up the VM.");
}

// Create a Google Cloud Virtual Machine
// NOTE: create this using .env values
const vm = new gcp.compute.Instance("my-vm", {
  machineType: "e2-micro", // You can choose different machine types
  zone: "us-central1-b",   // Specify the zone where the VM should be created
  bootDisk: {
    initializeParams: {
      image: "debian-cloud/debian-11", // Use Debian as the OS
    },
  },
  networkInterfaces: [{
    network: network.id,
    accessConfigs: [{ natIp: externalIp.address }],
  }],
  metadata: {
    sshKeys: `pulumi-user:ssh-rsa ${sshKey} pulumi-user`,
  },
});

// Export the VM's public IP address
export const publicIp = externalIp.address;

```

in this implementation we create

- vpc network

- firewall rule

- Vm

- Vm external ip (so you can connecting to the vm with ssh)

Make sure to add your ssh key and ip address in dot env file

### Step 4: deploy the infrastructure

now we can deploy the infrastructure but before that we also can preview the changes

```text
pulumi preview # see the changes
pulumi up # deploy it

```

You can connect to the vm with ssh eg:

```text
ssh pulumi-user@<public-ip-address>

```

Final thoughts:
It’s easy to set up a VM on GCP with Pulumi, right?

---

Published 2024-12-01 · [Read on medium](https://medium.com/@moonNight1/how-to-setup-vm-on-gcp-using-pulumi-1fd8ef7efae5?source=rss-86218010e568------2)
