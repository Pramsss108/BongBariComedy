import onnx
import onnxruntime as ort
from onnxruntime.quantization import quantize_dynamic, QuantType
import os
import sys

def quantize_model():
    base_path = "client/public/models/mms-tts-ben-v2/onnx"
    input_model_path = os.path.join(base_path, "model.onnx")
    optimized_model_path = os.path.join(base_path, "model_optimized.onnx")
    output_model_path = os.path.join(base_path, "model_quantized.onnx")

    if not os.path.exists(input_model_path):
        print(f"Error: Input model not found at {input_model_path}")
        return

    print("Step 1: Optimizing model (Constant Folding)...")
    try:
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
        # This will write the optimized graph to the filepath
        sess_options.optimized_model_filepath = optimized_model_path
        
        # Load session to trigger optimization
        print(f"Loading {input_model_path} into ORT session...")
        _ = ort.InferenceSession(input_model_path, sess_options)
        print(f"Optimized model saved (in-memory or to file) to {optimized_model_path}")
    except Exception as e:
        print(f"Optimization failed: {e}")
        return

    print("Step 2: Quantizing model dynamically (INT8)...")
    try:
        quantize_dynamic(
            optimized_model_path,
            output_model_path,
            weight_type=QuantType.QUInt8
        )
    except Exception as e:
        print(f"Quantization failed: {e}")
        return
    
    # Cleanup intermediate
    if os.path.exists(optimized_model_path):
        try:
            os.remove(optimized_model_path)
        except:
            pass
    
    if os.path.exists(output_model_path):
        orig_sz = os.path.getsize(input_model_path) / (1024 * 1024)
        quant_sz = os.path.getsize(output_model_path) / (1024 * 1024)
        print(f"Success! INT8 Model created (Stable).")
        print(f"Reduced: {orig_sz:.1f}MB -> {quant_sz:.1f}MB")

if __name__ == "__main__":
    quantize_model()
