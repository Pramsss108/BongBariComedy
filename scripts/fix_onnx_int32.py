import onnx
from onnx import helper, TensorProto, checker

def main():
    model_path = "client/public/models/mms-tts-ben-v2/onnx/model_quantized.onnx"
    output_path = model_path
    
    print(f"Loading model from {model_path}...")
    model = onnx.load(model_path)
    graph = model.graph

    inputs_to_convert = ["input_ids", "attention_mask"]
    new_nodes = []
    
    # Store needed modifications
    # (name, cast_node)
    
    # Iterate over inputs and see if we need to modify
    for inp in graph.input: # The proto field is 'input'
        if inp.name in inputs_to_convert:
            print(f"Converting input '{inp.name}' to INT32...")
            
            # The original input name will now be INT32.
            # We create a new internal name for the INT64 version used by the model.
            internal_name = inp.name + "_int64"
            
            # 1. Update all usages of inp.name to internal_name in EXISTING nodes
            for node in graph.node:
                for i, input_name in enumerate(node.input):
                    if input_name == inp.name:
                        node.input[i] = internal_name
            
            # 2. Change the graph input type to INT32
            inp.type.tensor_type.elem_type = TensorProto.INT32
            
            # 3. Create a Cast node: inp.name (INT32) -> internal_name (INT64)
            cast_node = helper.make_node(
                'Cast',
                inputs=[inp.name],
                outputs=[internal_name],
                to=TensorProto.INT64,
                name=f"Cast_{inp.name}_to_int64"
            )
            # Add to list to insert later
            new_nodes.append(cast_node)

    if not new_nodes:
        print("No inputs needed conversion.")
        return

    # Insert new nodes at the beginning of the graph
    # Convert repeated field to list for manipulation
    nodes_list = list(graph.node)
    
    # Insert new Cast nodes at index 0 (execution start)
    # Reverse so they appear in order (doesn't matter much for independent casts)
    for n in reversed(new_nodes):
        nodes_list.insert(0, n)
    
    # Clear and extend graph.node
    del graph.node[:]
    graph.node.extend(nodes_list)
    
    print("Validating model...")
    try:
        checker.check_model(model)
        print("Model valid.")
    except Exception as e:
        print(f"Validation warning: {e}")

    print(f"Saving to {output_path}...")
    onnx.save(model, output_path)
    print("Done.")

if __name__ == "__main__":
    main()
