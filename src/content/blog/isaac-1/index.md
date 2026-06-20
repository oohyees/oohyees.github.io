---
title: "Isaac Sim 一百讲（1）：安装"
publishDate: 2025-01-19
updatedDate: 2025-01-19
description: "从零开始的 Isaac Sim 之路，第一季开始！"
heroImage:
  src: "/images/axi-hero/isaac-1-zh.webp"
  alt: "Isaac Sim 一百讲（1）：安装"
  inferSize: true
  source: "https://www.pixiv.net/artworks/125533736"
category: "tech"
tags:
  - "embodied ai"
  - "isaac 101"
language: zh
comment: true
---
## 前言

事实上在此之前已经写过一次相关的教程了，详情可以见 [之前的教程](isaac-sim-notes)，但是之前的教程实际上只是写了一下 Isaac Sim 正常的安装方法，并且对官方教程中的一个示例进行了讲解，但是事实上这个示例并不是足够有趣的，甚至和我们实际的实践也没有太大的关系。

在经历了漫长的实践之后，我发现 Isaac Sim 实际的运行逻辑，以及如何去理解的逻辑，这种逻辑使得我们不应该轻易地直接尝试运行官方的教程，因为这并不能让我们清晰地知道这个框架的全貌。因此我决定开始一系列的新博客，来讲解 Isaac Sim 的 Python API 的使用，也大概是因为将来我的工作流程里面会大量地掺杂着 Isaac Sim，因此对于其他的新手来说，一个友好的教程可以提供更加丰富的信息，而且效率更高。

## 安装 Isaac Sim

在 [之前的教程](isaac-sim-notes) 中事实上已经提及过如何使用 omni launcher 进行 Isaac Sim 的安装，这是一种最为友好也是最容易获得的途径，通过这种方式，你可以用 `./python script.py` 的方式运行你涉及 Isaac Sim 的程序，但是很显然这并不够优雅，尤其是对于使用 Conda 的人来说。Isaac Sim 的程序安装形式的脚本中有提供 setup conda 的脚本，然而我们仍然不打算采用。设想你在远程的服务器上安装 Isaac Sim，执行不显示 UI 界面的 headless 程序，并且服务器不支持 VNC 控制，显然直接使用 `pip install` 是最为优雅的解法。

注意，在安装之前确保你已经安装了 CUDA toolkit、CUDA 以及 CUDNN，相应的安装方法可以见我 [之前的博客](torch)，一般来说假如你使用的是实验室的主机，这些内容应当已经配置完毕。

查阅 [Isaac Lab 的文档](https://isaac-sim.github.io/IsaacLab/main/source/setup/installation/pip_installation.html) 以找到安装的指令：

```bash
conda create -n isaac python=3.10
conda activate isaac
pip install isaacsim==4.1.0 isaacsim-extscache-physics==4.1.0 isaacsim-extscache-kit==4.1.0 isaacsim-extscache-kit-sdk==4.1.0 --extra-index-url https://pypi.nvidia.com
```

## 验证安装

可以写一个简单的验证程序来确认是否安装成功，在这里不过多地解释这个脚本的内容，我们将在后续循序渐进地了解 Isaac Sim 的全貌。

```python
from isaacsim import SimulationApp
simulation_app = SimulationApp({"headless": True})
from omni.isaac.core import World
world = World()
world.step()
simulation_app.close()
```

假如可以成功执行，那么就没有问题，给自己鼓个掌吧，你掌握了 50% 的人都不了解的技巧，可以直接通过 Python 启动 Isaac Sim 而无需以来原来的软件。

## Notes

写在最后，尽管我们可以通过 `pip install` 的方式在正经的 conda 中建立 Isaac Sim 环境，但是笔者依然建议读者通过程序的方法将 Isaac Sim 安装在自己的主机（并非服务器）上。Isaac Sim 的程序通过 UI 界面启动，并且具备良好的交互功能，可以用来编辑场景，同时具备诸多方便的功能，因此假如说需要对自己创建的场景进行一些细微的调整，或者对于一些内容进行预览，依然建议通过程序模式进行启动。相应的应用场景我们也会在后续的教程中讲解，敬请期待。