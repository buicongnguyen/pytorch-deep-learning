import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.resolve(
  process.env.DLWPT_SOURCE ||
    path.join(projectRoot, "..", "..", "OneDrive", "Documents", "ChatGPT", "programming pytorch for deep learning and better version", "dlwpt-code-2e")
);
const outputPath = path.join(projectRoot, "content", "catalog.json");
const upstreamCommit = "d220a257c3f8b8800c8980355400f544f0a9fd44";
const upstreamRepo = "deep-learning-with-pytorch/dlwpt-code-2e";

const chapterDetails = [
  [1, "Introducing deep learning and PyTorch", "Orient yourself: what deep learning changes, why PyTorch is a practical fit, and how notebooks support an experimental workflow."],
  [2, "Pretrained networks", "Run useful models before training your own, then inspect image classifiers, generative models, model hubs, and MNIST."],
  [3, "Tensors", "Build intuition for shape, dtype, storage, indexing, broadcasting, and named dimensions—the vocabulary used by every later model."],
  [4, "Representing real-world data", "Turn images, volumetric scans, tables, time series, text, audio, and video into tensors a model can consume."],
  [5, "The mechanics of learning", "Derive parameter estimation, automatic differentiation, and optimizer-driven learning from small, inspectable examples."],
  [6, "Neural networks", "Move from hand-written functions to reusable modules, nonlinear activations, parameters, and composable network classes."],
  [7, "Learning from images", "Create datasets and train a first image classifier that distinguishes birds from airplanes."],
  [8, "Convolutions", "Use local receptive fields, channels, pooling, and deeper convolutional architectures to improve image models."],
  [9, "Language models and transformers", "Explore tokenization, attention, vision transformers, and autoregressive name generation."],
  [10, "Diffusion and image generation", "Follow noise forward, learn the reverse process, construct U-Net and transformer denoisers, and sample generated data."],
  [11, "Medical imaging project", "Frame the end-to-end lung-cancer project: raw CT data, candidate detection, classification, segmentation, evaluation, and operational constraints."],
  [12, "Loading and exploring CT data", "Parse LUNA metadata, map physical coordinates to voxels, crop 3D candidates, cache expensive work, and inspect volumes."],
  [13, "Training a nodule classifier", "Build a 3D convolutional classifier, organize train/validation splits, run the optimization loop, and record metrics."],
  [14, "Improving classification", "Address class imbalance, augmentation, precision, recall, and F1 while inspecting how data choices affect performance."],
  [15, "Segmentation and foundation models", "Apply Segment Anything to CT slices, create masks and prompts, fine-tune the model, and run inference."],
  [16, "Distributed training", "Scale beyond one process with process groups, collectives, DDP, model and pipeline parallelism, device meshes, and FSDP."],
  [17, "Optimization and deployment", "Compile, profile, quantize, export, serve, batch, stream, and prepare PyTorch models for edge and production targets."]
].map(([number, title, summary]) => ({ number, title, summary }));

const notebookDescriptions = new Map([
  ["1_making_sure_things_work", "Verify the environment with basic imports, tensors, CUDA visibility, and a small computation."],
  ["2_pre_trained_networks", "Load a pretrained vision network, prepare an image, run inference, and interpret class scores."],
  ["3_cyclegan", "Load a CycleGAN and transform an image between learned visual domains."],
  ["3_inpainting", "Use a diffusion pipeline to fill a masked image region from a text prompt."],
  ["4_model_zoos", "Discover and load reusable models from ecosystem model hubs."],
  ["5_mnist", "Train and evaluate a compact neural network on handwritten digits."],
  ["1_tensors", "Explore tensor construction, shapes, dtypes, indexing, views, storage, device movement, and NumPy interoperability."],
  ["2_named_tensors", "Attach semantic names to dimensions and use them to make tensor operations clearer."],
  ["1_parameter_estimation", "Fit a simple physical model and inspect how loss changes with its parameters."],
  ["2_autograd", "Let PyTorch track operations and compute derivatives automatically."],
  ["3_optimizers", "Replace manual parameter updates with optimizer objects and a reusable training loop."],
  ["1_neural_networks", "Express the learning model with PyTorch layers and compare architectures."],
  ["2_activation_functions", "Visualize nonlinear activation functions and their gradients."],
  ["3_nn_module_subclassing", "Create custom modules and define the forward computation explicitly."],
  ["1_datasets", "Wrap samples and labels in Dataset and DataLoader abstractions."],
  ["2_birds_airplanes", "Prepare CIFAR-10 subsets and train the chapter image classifier."],
  ["1_convolution", "Build convolution filters and networks while tracing spatial and channel dimensions."],
  ["tokenization", "Convert text into tokens and token IDs suitable for language models."],
  ["attention", "Implement and visualize attention as learned weighted information retrieval."],
  ["generating_names", "Train an autoregressive model and sample new character sequences."],
  ["vit", "Inspect how a vision transformer turns image patches into a token sequence."],
  ["visualization", "Visualize transformer inputs, attention, or generated sequences."],
  ["forward_diffusion", "Apply the closed-form forward diffusion process to progressively add noise."],
  ["training", "Train a denoiser to predict the noise added at arbitrary timesteps."],
  ["unet", "Construct a U-Net denoising architecture with skip connections."],
  ["dit", "Explore a diffusion transformer as an alternative denoising backbone."],
  ["motivator", "Build visual intuition for why diffusion generation learns to reverse noise."],
  ["mnist", "Apply the chapter's generative workflow to handwritten digits."],
  ["vis", "Render chapter data, schedules, intermediate states, or model samples."],
  ["1_final_metric_f1_score", "Compute classification precision, recall, and F1 from stored predictions."],
  ["1_segment_example", "Run a first segmentation example and inspect the returned masks."],
  ["2_point_prompt", "Guide segmentation with foreground and background point prompts."],
  ["3_segment_ct_slice", "Apply the segmentation model to a medical CT slice."],
  ["4_create_dataset", "Create paired CT-image and mask metadata for fine-tuning."],
  ["5_fine_tuning", "Fine-tune the segmentation model on prepared medical examples."],
  ["6_inference", "Load the fine-tuned model and compare predictions with ground truth."],
  ["dino_model", "Inspect a DINO-family representation model used in the chapter experiments."],
  ["try_sam", "Experiment interactively with Segment Anything predictions."],
  ["1_motivator", "Motivate distributed execution by measuring or observing single-process limits."],
  ["device_mesh", "Organize ranks into named mesh dimensions for hybrid parallel strategies."],
  ["compile_example", "Compile a PyTorch model and compare eager and compiled execution."],
  ["onnx_example", "Export a model to ONNX and execute it with an interoperable runtime."],
  ["profiler_example", "Capture operator timing and memory information with the PyTorch profiler."],
  ["quantization_example", "Reduce numerical precision and inspect the impact on model size and inference."],
  ["torch_export_example", "Capture a portable graph with torch.export and inspect its constraints."],
  ["p2_run_everything", "Orchestrate the medical-imaging pipeline across preprocessing, training, and evaluation."],
  ["p2ch12_explore_data", "Inspect raw LUNA candidates, coordinate transforms, and CT crops."],
  ["p2ch14_explore_data", "Compare balanced and augmented candidate samples before training."],
  ["p2ch15_explore_data", "Explore CT slices and masks used by the segmentation chapter."]
]);

const conceptPatterns = [
  ["imports", /^(?:from\s+\S+\s+import|import\s+)/m],
  ["tensor shapes", /\.shape|\.size\(|reshape|view\(|flatten|unsqueeze|squeeze/],
  ["data loading", /Dataset|DataLoader|ImageFolder|read_csv|open\(|load_dataset/],
  ["preprocessing", /transform|normalize|resize|tokeniz|ToTensor|augmentation/i],
  ["model definition", /class\s+\w+\s*\([^)]*(?:Module|nn\.)|nn\.(?:Linear|Conv|Sequential|Embedding)/],
  ["pretrained model", /from_pretrained|pretrained\s*=|torch\.hub|pipeline\(/],
  ["forward pass", /def\s+forward|model\s*\(|output|logits/],
  ["loss", /loss|CrossEntropy|MSELoss|nll_loss/],
  ["optimization", /optimizer|optim\.|zero_grad|backward\(|\.step\(/],
  ["automatic differentiation", /requires_grad|autograd|\.grad\b|backward\(/],
  ["evaluation", /eval\(|accuracy|precision|recall|f1|confusion/],
  ["visualization", /matplotlib|pyplot|plt\.|imshow|plot\(|seaborn/],
  ["convolution", /Conv[123]d|convolution|kernel|pool/i],
  ["attention", /attention|MultiheadAttention|query|key|value/],
  ["tokenization", /tokenizer|input_ids|vocab|decode|encode/],
  ["diffusion", /diffusion|beta|alpha|noise|timestep|scheduler/i],
  ["distributed execution", /torch\.distributed|init_process_group|DistributedDataParallel|device_mesh|fully_shard/],
  ["export and deployment", /torch\.export|onnx|quantiz|compile\(|profiler|FastAPI|Gradio|ExecuTorch/i],
  ["device placement", /cuda|\.to\(device|torch\.device/],
  ["reproducibility", /manual_seed|random\.seed|np\.random\.seed/]
];

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === ".ipynb_checkpoints") continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await walk(fullPath)));
    else if (entry.name.endsWith(".ipynb")) result.push(fullPath);
  }
  return result;
}

function chapterFromPath(relativePath) {
  const match = relativePath.match(/p[12]ch(\d+)/i);
  if (match) return Number(match[1]);
  if (relativePath === "p2_run_everything.ipynb") return 13;
  throw new Error(`Cannot determine chapter for ${relativePath}`);
}

function titleFromFilename(filename) {
  return filename
    .replace(/\.ipynb$/i, "")
    .replace(/^\d+_/, "")
    .replace(/^x_?/i, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function descriptionFor(relativePath) {
  const key = path.basename(relativePath, ".ipynb");
  return notebookDescriptions.get(key) ||
    (key.includes("sandbox")
      ? "A chapter scratchpad for testing intermediate ideas, tensor shapes, and APIs outside the main narrative notebooks."
      : `Work through the ${titleFromFilename(key)} example and inspect how each code cell advances the chapter workflow.`);
}

function conceptsFor(code) {
  return conceptPatterns.filter(([, pattern]) => pattern.test(code)).map(([name]) => name);
}

function explainCell(code, cellNumber, notebookTitle) {
  const trimmed = code.trim();
  const concepts = conceptsFor(trimmed);
  if (!trimmed) {
    return { concepts: ["notebook structure"], explanation: "This intentionally empty cell separates stages of the notebook and provides space for an experiment." };
  }
  if (/^(?:!|%pip|%conda)/m.test(trimmed)) {
    return { concepts: ["environment setup"], explanation: "This cell prepares the notebook environment by installing a package or running a shell/IPython command. Run it before imports that depend on that package." };
  }
  if (concepts.length === 1 && concepts[0] === "imports") {
    return { concepts, explanation: `This cell loads the libraries used by the next stage of ${notebookTitle}. Keeping imports together makes later cells focus on the experiment itself.` };
  }
  if (/^(?:class|def)\s+/m.test(trimmed)) {
    const definitions = [...trimmed.matchAll(/^(?:class|def)\s+(\w+)/gm)].map((match) => `\`${match[1]}\``).slice(0, 4);
    const named = definitions.length ? definitions.join(", ") : "a reusable component";
    return { concepts: concepts.length ? concepts : ["Python abstraction"], explanation: `This cell defines ${named}. The definition packages repeated behavior so later cells can create, train, or evaluate it without duplicating implementation details.` };
  }
  const actions = [];
  if (concepts.includes("data loading")) actions.push("loads or organizes the data");
  if (concepts.includes("preprocessing")) actions.push("converts inputs into model-ready form");
  if (concepts.includes("model definition") || concepts.includes("pretrained model")) actions.push("constructs the model");
  if (concepts.includes("forward pass")) actions.push("runs data through the model");
  if (concepts.includes("loss")) actions.push("measures prediction error");
  if (concepts.includes("optimization")) actions.push("updates learned parameters");
  if (concepts.includes("evaluation")) actions.push("evaluates the result");
  if (concepts.includes("visualization")) actions.push("visualizes intermediate or final values");
  if (concepts.includes("distributed execution")) actions.push("coordinates work across processes");
  if (concepts.includes("export and deployment")) actions.push("prepares the model for efficient inference or serving");
  if (!actions.length && concepts.includes("tensor shapes")) actions.push("reshapes or inspects tensors so dimensions align with the next operation");
  if (!actions.length) actions.push("advances the experiment by computing or inspecting the next intermediate value");
  const detail = concepts.includes("device placement") ? " It also places tensors or modules on the selected accelerator when available." : "";
  const caution = concepts.includes("tensor shapes") ? " Track the printed or implied shapes here; they explain why the following operation is valid." : "";
  return {
    concepts: concepts.length ? concepts : ["Python experiment"],
    explanation: `Cell ${cellNumber} ${actions.slice(0, 3).join(", then ")}.${detail}${caution}`
  };
}

const notebookFiles = (await walk(sourceRoot)).sort((a, b) => normalizePath(a).localeCompare(normalizePath(b)));
const notebooks = [];
for (const notebookPath of notebookFiles) {
  const relativePath = normalizePath(path.relative(sourceRoot, notebookPath));
  const notebook = JSON.parse(await readFile(notebookPath, "utf8"));
  const title = titleFromFilename(path.basename(relativePath));
  const codeCells = notebook.cells.filter((cell) => cell.cell_type === "code");
  const cells = codeCells.map((cell, index) => {
    const source = Array.isArray(cell.source) ? cell.source.join("") : String(cell.source || "");
    const explained = explainCell(source, index + 1, title);
    return { number: index + 1, ...explained };
  });
  notebooks.push({
    path: relativePath,
    slug: relativePath.replace(/\.ipynb$/i, "").replaceAll("/", "--").replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase(),
    chapter: chapterFromPath(relativePath),
    title,
    summary: descriptionFor(relativePath),
    codeCellCount: cells.length,
    cells,
    sourceUrl: `https://raw.githubusercontent.com/${upstreamRepo}/${upstreamCommit}/${relativePath}`,
    githubUrl: `https://github.com/${upstreamRepo}/blob/${upstreamCommit}/${relativePath}`,
    colabUrl: `https://colab.research.google.com/github/${upstreamRepo}/blob/${upstreamCommit}/${relativePath}`
  });
}

const catalog = {
  generatedAt: new Date().toISOString(),
  upstream: { repository: upstreamRepo, commit: upstreamCommit },
  chapters: chapterDetails.map((chapter) => ({
    ...chapter,
    notebookCount: notebooks.filter((notebook) => notebook.chapter === chapter.number).length,
    codeCellCount: notebooks.filter((notebook) => notebook.chapter === chapter.number).reduce((sum, notebook) => sum + notebook.codeCellCount, 0)
  })),
  notebooks
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(catalog, null, 2) + "\n");
console.log(`Imported ${catalog.chapters.length} chapters, ${notebooks.length} notebooks, and ${notebooks.reduce((sum, item) => sum + item.codeCellCount, 0)} code cells.`);
