---
title: "Docker 调用 Nvidia 报错"
publishDate: 2025-01-12
updatedDate: 2025-01-12
description: "正常安装 Nvidia Docker 后运行时报错 Failed to initialize NVML: Unknown Error。"
heroImage:
  src: "/images/axi-hero/docker-nvidia-error-zh.webp"
  alt: "Docker 调用 Nvidia 报错"
  inferSize: true
  source: "https://www.pixiv.net/artworks/125859477"
category: "tech"
tags:
  - "bug-report"
  - "docker"
  - "nvidia"
  - "isaac-sim"
language: zh
comment: true
---
## 前言

最近在配置 Docker 环境，在安装 Nvidia Docker 后，运行时报错 `Failed to initialize NVML: Unknown Error`。

## 情况复现

这个情况并不是很容易复现，本身我是在实验室的服务器上运行的 Docker，从而安装 docker 版本的 isaac sim，参照 Isaac Sim 的[官方文档](https://docs.omniverse.nvidia.com/isaacsim/latest/installation/install_container.html)，具体的 Docker 安装为：

### 安装 NVIDIA Driver

```bash
sudo apt-get update
sudo apt install build-essential -y
wget https://us.download.nvidia.com/XFree86/Linux-x86_64/535.129.03/NVIDIA-Linux-x86_64-535.129.03.run
chmod +x NVIDIA-Linux-x86_64-535.129.03.run
sudo ./NVIDIA-Linux-x86_64-535.129.03.run
```

这一步我压根没操作，因为本身就已经配置好了。可以用 `nvidia-smi` 查看是否安装成功，有输出就没问题。

### 安装 Docker

```bash
# Docker installation using the convenience script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Post-install steps for Docker
sudo groupadd docker
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker
docker run hello-world
```

这里面实际上直接 `sudo usermod -aG docker $USER` 就好了，然后 `ctrl+d` 退出，再 SSH 进来刷新一下就好了。

### 安装 Nvidia Container Toolkit

```bash
# Configure the repository
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
  && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list \
  && \
    sudo apt-get update

# Install the NVIDIA Container Toolkit packages
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker

# Configure the container runtime
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify NVIDIA Container Toolkit
docker run --rm --runtime=nvidia --gpus all ubuntu nvidia-smi
```

### 安装 Isaac Sim

```bash
docker pull nvcr.io/nvidia/isaac-sim:4.2.0
docker run --name isaac-sim --entrypoint bash -it --runtime=nvidia --gpus all -e "ACCEPT_EULA=Y" --rm --network=host \
    -e "PRIVACY_CONSENT=Y" \
    -v ~/docker/isaac-sim/cache/kit:/isaac-sim/kit/cache:rw \
    -v ~/docker/isaac-sim/cache/ov:/root/.cache/ov:rw \
    -v ~/docker/isaac-sim/cache/pip:/root/.cache/pip:rw \
    -v ~/docker/isaac-sim/cache/glcache:/root/.cache/nvidia/GLCache:rw \
    -v ~/docker/isaac-sim/cache/computecache:/root/.nv/ComputeCache:rw \
    -v ~/docker/isaac-sim/logs:/root/.nvidia-omniverse/logs:rw \
    -v ~/docker/isaac-sim/data:/root/.local/share/ov/data:rw \
    -v ~/docker/isaac-sim/documents:/root/Documents:rw \
    nvcr.io/nvidia/isaac-sim:4.2.0
```

此时你会交互式地进入 Docker 中，然后运行 `nvidia-smi` 查看是否成功。

一般来说，就会正常输出，但是本人在某个服务器上就遇到了报错 `Failed to initialize NVML: Unknown Error`。

想要了解是否与本人遇到的情况相同，可以尝试使用：

```bash
docker run --rm -it --device=/dev/nvidiactl --device=/dev/nvidia0 --gpus all nvcr.io/nvidia/isaac-sim:4.2.0
```

然后尝试一下输出，会发现输出一张卡。

然而这并非通用的方法，因为你把 nvidia0 换成 nvidia1 或者其他的，就找不到卡了。

## 解决方法

解决方法也很简单，直接修改 Docker 的一个配置文件：

```bash
sudo vim /etc/nvidia-container-runtime/config.toml
```

```toml title="config.toml"
...
no-cgroups = true # [!code --]
no-cgroups = false # [!code ++]
```

然后重启 docker 服务：

```bash
sudo systemctl restart docker
```

此时再运行 `nvidia-smi`，就会发现可以正常输出了。
