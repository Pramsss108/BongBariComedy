import onnx
from onnx import helper, TensorProto

def inject_int32_cast():
    model_path = "client/public/models/mms-tts-ben-v2/onnx/model_quantized.onnx"
    output_path = model_path # Overwrite
    
    print(f"Loading {model_path}...")
    try:
        model = onnx.load(model_path)
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    graph = model.graph
    
    # Inputs to convert from INT64 -> INT32 interface
    target_inputs = ["input_ids", "attention_mask"]
    converted_count = 0
    
    new_nodes = []
    
    for inp in graph.input:
        if inp.name in target_inputs:
            # Check if already int32 (in case script runs twice)
            if inp.type.tensor_type.elem_type == TensorProto.INT32:
                print(f"Input {inp.name} is already INT32. Skipping.")
                continue
                
            print(f"Injecting CAST (INT32->INT64) for input: {inp.name}")
            
            # 1. Rename the original input to an internal name
            internal_name = inp.name + "_inner_int64"
            
            # 2. Update all existing nodes that use this input to use the internal name
            for node in graph.node:
                for i, input_name in enumerate(node.input):
                    if input_name == inp.name:
                        node.input[i] = internal_name
            
            # 3. Create the Cast node: Input(INT32) -> [Cast] -> Internal(INT64)
            cast_node = helper.make_node(
                'Cast',
                inputs=[inp.name],
                outputs=[internal_name],
                to=TensorProto.INT64,
                name=f"Cast_Input_{inp.name}"
            )
            new_nodes.append(cast_node)
            
            # 4. Change the graph input definition to INT32
            inp.type.tensor_type.elem_type = TensorProto.INT32
            converted_count += 1

    if converted_count > 0:
        # Insert Cast nodes at the beginning of execution
        # Convert to list types to manipulate
        existing_nodes = list(graph.node)
        
        # Prepend new nodes
        full_node_list = new_nodes + existing_nodes
        
        # Replace graph nodes
        del graph.node[:]
        graph.node.extend(full_node_list)
        
        print(f"Saving modified model to {output_path}...")
        onnx.save(model, output_path)
        print("Success: Model inputs now accept INT32.")
    else:
        print("No inputs needed conversion.")

if __name__ == "__main__":
    inject_int32_cast()
