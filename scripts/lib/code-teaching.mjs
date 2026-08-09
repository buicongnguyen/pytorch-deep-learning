export const syntaxRules = [
  { key: "dataclass", test: /@dataclass\b/, url: "https://docs.python.org/3/library/dataclasses.html" },
  { key: "decorators", test: /^\s*@(?:torch\.|[A-Za-z_]\w*)/m, url: "https://docs.python.org/3/glossary.html#term-decorator" },
  { key: "context-manager", test: /^\s*with\s+.+:/m, url: "https://docs.python.org/3/reference/compound_stmts.html#the-with-statement" },
  { key: "class-protocol", test: /def\s+__(?:init|len|getitem|call)__\s*\(/, url: "https://docs.python.org/3/reference/datamodel.html#special-method-names" },
  { key: "comprehensions", test: /[\[({][^\n]*\bfor\s+\w+\s+in\s+[^\n]*[\])}]/, url: "https://docs.python.org/3/tutorial/datastructures.html#list-comprehensions" },
  { key: "unpacking", test: /(?:\*\*\w+|\*\([^\n]+\)|\{[^\n]*\*\*)/, url: "https://docs.python.org/3/reference/expressions.html#expression-lists" },
  { key: "conditional-expression", test: /\b[^\n]+\s+if\s+[^\n]+\s+else\s+[^\n]+/, url: "https://docs.python.org/3/reference/expressions.html#conditional-expressions" },
  { key: "matrix-multiply", test: /\s@\s|torch\.(?:matmul|mm|bmm)\s*\(/, url: "https://docs.pytorch.org/docs/stable/generated/torch.matmul.html" },
  { key: "tensor-indexing", test: /\[[^\]\n]*(?::|\.\.\.)[^\]\n]*\]/, url: "https://docs.pytorch.org/docs/stable/tensor_view.html" },
  { key: "tensor-shapes", test: /\.(?:reshape|view|flatten|movedim|permute|transpose|unsqueeze|squeeze)\s*\(/, url: "https://docs.pytorch.org/docs/stable/tensor_view.html" },
  { key: "broadcasting", test: /broadcast|expand_as\s*\(|view\s*\(\s*1\s*,\s*-?1/, url: "https://docs.pytorch.org/docs/stable/notes/broadcasting.html" },
  { key: "autograd", test: /requires_grad|\.backward\s*\(|\.grad\b|torch\.autograd/, url: "https://docs.pytorch.org/docs/stable/notes/autograd.html" },
  { key: "inference-mode", test: /(?:inference_mode|no_grad)\s*\(/, url: "https://docs.pytorch.org/docs/stable/generated/torch.autograd.grad_mode.inference_mode.html" },
  { key: "state-dict", test: /state_dict\s*\(|load_state_dict\s*\(|torch\.(?:save|load)\s*\(/, url: "https://docs.pytorch.org/docs/stable/notes/serialization.html" },
  { key: "dataset-loader", test: /\b(?:Dataset|DataLoader|DistributedSampler)\b/, url: "https://docs.pytorch.org/docs/stable/data.html" },
  { key: "model-zoo", test: /\b(?:list_models|get_model_weights|get_model|resnet50|vit_b_16)\s*\(/, url: "https://docs.pytorch.org/vision/stable/models.html" },
  { key: "image-io", test: /\bdecode_image\s*\(/, url: "https://docs.pytorch.org/vision/stable/io.html" },
  { key: "transforms", test: /torchvision\.transforms|\bv2\.(?:Compose|ToImage|ToDtype|Normalize|Random)/, url: "https://docs.pytorch.org/vision/stable/transforms.html" },
  { key: "tv-tensors", test: /tv_tensors\.(?:Image|Mask|BoundingBoxes)/, url: "https://docs.pytorch.org/vision/stable/tv_tensors.html" },
  { key: "model-modes", test: /\.(?:train|eval)\s*\(\s*\)/, url: "https://docs.pytorch.org/docs/stable/generated/torch.nn.Module.html" },
  { key: "tensor-numpy", test: /torch\.from_numpy|\.numpy\s*\(|\bnp\./, url: "https://docs.pytorch.org/docs/stable/generated/torch.from_numpy.html" },
  { key: "deepcopy", test: /copy\.deepcopy\s*\(/, url: "https://docs.python.org/3/library/copy.html" },
  { key: "pathlib", test: /\bPath\s*\(/, url: "https://docs.python.org/3/library/pathlib.html" },
  { key: "temporary-directory", test: /TemporaryDirectory\s*\(/, url: "https://docs.python.org/3/library/tempfile.html#tempfile.TemporaryDirectory" },
  { key: "json-manifest", test: /json\.(?:dumps|dump|loads|load)\s*\(/, url: "https://docs.python.org/3/library/json.html" },
  { key: "exceptions", test: /^\s*(?:raise|try\s*:|except\b)/m, url: "https://docs.python.org/3/tutorial/errors.html" },
  { key: "testing", test: /torch\.testing\.|\bassert\s+/, url: "https://docs.pytorch.org/docs/stable/testing.html" },
  { key: "probabilities", test: /\.(?:softmax|sigmoid|argmax)\s*\(|torch\.multinomial\s*\(/, url: "https://docs.pytorch.org/docs/stable/generated/torch.nn.functional.softmax.html" },
  { key: "sequence-padding", test: /pad_sequence\s*\(/, url: "https://docs.pytorch.org/docs/stable/generated/torch.nn.utils.rnn.pad_sequence.html" },
  { key: "torch-cond", test: /torch\.cond\s*\(/, url: "https://docs.pytorch.org/docs/stable/generated/torch.cond.html" },
  { key: "iterators", test: /itertools\.|\bnext\s*\(\s*iter\s*\(|\breversed\s*\(/, url: "https://docs.python.org/3/library/itertools.html" },
  { key: "amp", test: /(?:autocast|GradScaler)\s*\(/, url: "https://docs.pytorch.org/docs/stable/amp.html" },
  { key: "compile", test: /torch\.compile\s*\(/, url: "https://docs.pytorch.org/docs/stable/generated/torch.compile.html" },
  { key: "distributed", test: /torch\.distributed|\bdist\.|\bDDP\s*\(|DeviceMesh|fully_shard/, url: "https://docs.pytorch.org/docs/stable/distributed.html" },
  { key: "attention", test: /scaled_dot_product_attention|MultiheadAttention|Transformer/, url: "https://docs.pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html" },
  { key: "convolution", test: /\b(?:Conv[123]d|conv[123]d)\s*\(/, url: "https://docs.pytorch.org/docs/stable/generated/torch.nn.Conv2d.html" },
  { key: "loss-functions", test: /(?:Loss\s*\(|cross_entropy\s*\(|binary_cross_entropy|\bloss\s*=)/, url: "https://docs.pytorch.org/docs/stable/nn.html#loss-functions" },
  { key: "optimizer", test: /torch\.optim|optimizer\.(?:zero_grad|step|state_dict)/, url: "https://docs.pytorch.org/docs/stable/optim.html" },
  { key: "module", test: /nn\.Module|def\s+forward\s*\(|nn\.Sequential/, url: "https://docs.pytorch.org/docs/stable/generated/torch.nn.Module.html" },
  { key: "device-placement", test: /\.to\s*\(|torch\.device\s*\(|torch\.accelerator/, url: "https://docs.pytorch.org/docs/stable/generated/torch.Tensor.to.html" },
  { key: "randomness", test: /manual_seed|Generator\s*\(|randn?\s*\(|randperm\s*\(/, url: "https://docs.pytorch.org/docs/stable/notes/randomness.html" },
  { key: "export", test: /torch\.export|torch\.onnx\.export|aoti_compile_and_package/, url: "https://docs.pytorch.org/docs/stable/export.html" },
  { key: "quantization", test: /quantize_|Int8WeightOnlyConfig/, url: "https://docs.pytorch.org/ao/stable/api_reference/api_ref_quantization.html" },
  { key: "profiler", test: /torch\.profiler|profile\s*\(|record_function/, url: "https://docs.pytorch.org/docs/stable/profiler.html" },
  { key: "type-hints", test: /def\s+\w+\s*\([^\n)]*:\s*[^\n,)]+|\)\s*->\s*[^:]+:/, url: "https://docs.python.org/3/library/typing.html" },
  { key: "python-control-flow", test: /^\s*(?:for|while|if|try)\b.+:/m, url: "https://docs.python.org/3/tutorial/controlflow.html" },
  { key: "tensor-creation", test: /torch\.(?:tensor|arange|zeros|ones|rand|randn|empty|full)\s*\(/, url: "https://docs.pytorch.org/docs/stable/generated/torch.tensor.html" }
];

export const syntaxRuleByKey = new Map(syntaxRules.map((rule) => [rule.key, rule]));

const specializedSyntaxOrder = [
  "attention", "distributed", "quantization", "profiler", "export", "amp", "compile",
  "model-zoo", "image-io", "tv-tensors", "torch-cond", "sequence-padding", "state-dict",
  "dataset-loader", "transforms", "convolution", "model-modes", "deepcopy", "temporary-directory",
  "json-manifest", "probabilities", "tensor-numpy", "testing"
];

export const teachingCommentRules = [
  { key: "trainingMode", test: /^\s*model\.train\s*\(\s*\)\s*$/ },
  { key: "evaluationMode", test: /^\s*(?:model|float_model|quantized_model)\.eval\s*\(\s*\)\s*$/ },
  { key: "clearGradients", test: /^\s*optimizer\.zero_grad\s*\(/ },
  { key: "backwardPass", test: /^\s*(?:loss\.backward\s*\(|scaler\.scale\s*\(\s*loss\s*\)\.backward\s*\()/ },
  { key: "optimizerStep", test: /^\s*(?:optimizer\.step\s*\(|scaler\.step\s*\(\s*optimizer\s*\))/ },
  { key: "inferenceContext", test: /^\s*(?:@|with\s+)torch\.(?:inference_mode|no_grad)\s*\(/ },
  { key: "autocastContext", test: /^\s*with\s+(?:torch\.)?(?:amp\.)?autocast\s*\(/ },
  { key: "saveCheckpoint", test: /^\s*torch\.save\s*\(/ },
  { key: "loadCheckpoint", test: /^\s*(?:checkpoint|state|payload)\s*=\s*torch\.load\s*\(/ },
  { key: "compileBoundary", test: /^\s*\w+\s*=\s*torch\.compile\s*\(/ },
  { key: "parityCheck", test: /^\s*torch\.testing\.assert_close\s*\(/ },
  { key: "initializeDistributed", test: /^\s*dist\.init_process_group\s*\(/ },
  { key: "cleanupDistributed", test: /^\s*dist\.destroy_process_group\s*\(/ },
  { key: "samplerEpoch", test: /^\s*sampler\.set_epoch\s*\(/ }
];

export function detectSyntaxKeys(source, limit = 3) {
  const matches = syntaxRules.filter((rule) => rule.test.test(source)).map((rule) => rule.key);
  if (!matches.length && /\btorch\./.test(source)) matches.push("tensor-creation");
  if (!matches.length) matches.push("python-control-flow");
  const selected = [];
  const specialized = specializedSyntaxOrder.find((key) => matches.includes(key));
  if (specialized) selected.push(specialized);
  for (const key of matches) if (!selected.includes(key) && selected.length < limit) selected.push(key);
  return selected;
}

function wrapComment(text, width = 84) {
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    if (current && `${current} ${word}`.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function addPurposeComment(source, summary, language = "python", purposeLabel = "Purpose", inlineComments = {}) {
  if (language !== "python" || !source?.trim() || !summary?.trim()) return source;
  const purpose = wrapComment(summary).map((line, index) => `# ${index ? "  " : `${purposeLabel}: `}${line}`).join("\n");
  const annotated = [];
  for (const line of source.split("\n")) {
    const rule = teachingCommentRules.find((candidate) => candidate.test.test(line));
    if (rule && inlineComments[rule.key]) {
      const indent = line.match(/^\s*/)?.[0] || "";
      const previous = [...annotated].reverse().find((candidate) => candidate.trim());
      if (!previous?.trimStart().startsWith("#")) annotated.push(`${indent}# ${inlineComments[rule.key]}`);
    }
    annotated.push(line);
  }
  return `${purpose}\n\n${annotated.join("\n")}`;
}
