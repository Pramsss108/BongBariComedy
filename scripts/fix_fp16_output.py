import onnx
from onnx import TensorProto

def fix_output_type():
    model_path = "client/public/models/mms-tts-ben-v2/onnx/model_quantized.onnx"
    print(f"Loading {model_path}...")
    try:
        model = onnx.load(model_path)
    except Exception as e:
        print(f"Load failed: {e}")
        return

    graph = model.graph
    
    # Check outputs
    changed = False
    for out in graph.output:
        if out.type.tensor_type.elem_type == TensorProto.FLOAT:
            print(f"Changing output {out.name} from FLOAT32 to FLOAT16 to match internal graph...")
            out.type.tensor_type.elem_type = TensorProto.FLOAT16
            changed = True
    
    if changed:
        print("Saving fixed model...")
        onnx.save(model, model_path)
        print("Fixed.")
    else:
        print("No outputs needed fixing (already match?).")

if __name__ == "__main__":
    fix_output_type()
