import onnxruntime as ort

print("Inspecting quantized model...")
try:
    session = ort.InferenceSession("client/public/models/mms-tts-ben-v2/onnx/model_quantized.onnx")

    print("\nInputs:")
    for i in session.get_inputs():
        print(f"Name: {i.name}, Shape: {i.shape}, Type: {i.type}")

    print("\nOutputs:")
    for o in session.get_outputs():
        print(f"Name: {o.name}, Shape: {o.shape}, Type: {o.type}")
except Exception as e:
    print(f"Error loading model: {e}")
