/** 
 * Bong Share - GoFile API Engine
 * High-leverage file sharing using GoFile.io public API
 * Updated March 2026: /getServer is dead → using /servers (array response)
 */

export interface GoFileServerResponse {
  status: string;
  data: {
    servers: Array<{ name: string; zone: string }>;
  };
}

export interface GoFileUploaderResponse {
  status: string;
  data: {
    downloadPage: string;
    code: string;
    parentFolder: string;
    fileId: string;
    fileName: string;
    md5: string;
    directLink: string;
    info: string;
  };
}

export async function getBestServer(): Promise<string> {
  try {
    const response = await fetch('https://api.gofile.io/servers');
    const result: GoFileServerResponse = await response.json();
    if (result.status === 'ok' && result.data.servers?.length > 0) {
      // Pick a random server from the pool for load distribution
      const idx = Math.floor(Math.random() * result.data.servers.length);
      return result.data.servers[idx].name;
    }
    throw new Error('No active GoFile servers available');
  } catch (error) {
    console.error('GoFile getBestServer Error:', error);
    throw error;
  }
}

export function uploadFileWithProgress(
  file: File, 
  server: string, 
  onProgress: (percent: number) => void
): Promise<GoFileUploaderResponse['data']> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          try {
            const response: GoFileUploaderResponse = JSON.parse(xhr.responseText);
            if (response.status === 'ok') {
              resolve(response.data);
            } else {
              reject(new Error(response.status || 'Upload failed'));
            }
          } catch (e) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`Server returned status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.open('POST', `https://${server}.gofile.io/uploadFile`);
    xhr.send(formData);
  });
}
