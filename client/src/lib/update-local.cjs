const fs = require('fs');

let content = fs.readFileSync('client/src/lib/bengali-tts-webgpu.ts', 'utf8');

content = content.replace(
  /const BENGALI_ONNX_MODEL_URL = [\s\S]*?;/m,
  'const BENGALI_ONNX_MODEL_URL = "/models/mms-tts-ben";\n\nenv.allowLocalModels = true;\nenv.allowRemoteModels = false;\nenv.localModelPath = "/models";'
);

fs.writeFileSync('client/src/lib/bengali-tts-webgpu.ts', content);
