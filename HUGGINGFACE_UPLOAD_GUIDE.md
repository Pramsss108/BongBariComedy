# 📦 How to Upload Your Model (Baby Coder Guide)

You have successfully created your model! Now we just need to put the files inside it. Here is the *exact* step-by-step to upload it without using any code.

### Step 1: Click "Files and versions"
In your screenshot, right under the title `PRAMSSS/mms-tts-bengali-webgpu`, there is a tab called **`≡ Files and versions`**. Click that!

### Step 2: Open the Uploader
1. On the new page, look to the top right side for a button that says **`+ Add file`**.
2. Click it, and from the dropdown, click **`Upload files`**.

### Step 3: Upload the 6 Small Files
1. Open your Windows File Explorer on your computer.
2. Go to your project folder here:
   `D:\barir Mashla\website\BongBariComedy\BongBariComedy\client\public\models\mms-tts-ben`
3. Drag these 6 small files from that folder into the web browser window (into the "drag and drop" box):
   - `added_tokens.json`
   - `config.json`
   - `special_tokens_map.json`
   - `tokenizer.json`
   - `tokenizer_config.json`
   - `vocab.json`
4. Once you drop them, scroll to the bottom of the webpage.
5. Click the black button that says **`Commit changes to main`**.

### Step 4: Upload the Big File (The Brain)
1. After the page reloads, click **`+ Add file`** -> **`Upload files`** again.
2. This is the **most important part**: on the upload page, there is a text box near the top that says `Filename`.
3. Type EXACTLY this into that Filename box: 
   `onnx/model.onnx`
4. Now go back to your Windows File Explorer. Go inside the `onnx` folder (inside the `mms-tts-ben` folder). 
5. Drag the large `model.onnx` file (the 114MB one) into the web browser box.
6. Scroll down and click **`Commit changes to main`**. 
   *(This will take a few minutes because the file is big!)*

### Step 5: Tell me when you are done!
Once the big file is uploaded, you are finished! Just send me a message saying **"Done"**. 

I will then write the code to connect your new `PRAMSSS/mms-tts-bengali-webgpu` cloud model to your website!