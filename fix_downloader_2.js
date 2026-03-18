const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');
const searchStr = \            throw new Error(\\\Both engines failed. Engine: \. Cobalt: \\\\);
        }
}\;
const newStr = \            throw new Error(\\\Both engines failed. Engine: \. Cobalt: \\\\);
        }
    }
}\;
if(code.includes(searchStr)) { code = code.replace(searchStr, newStr); fs.writeFileSync('server/routes/downloader.ts', code); console.log('Fixed syntax!'); } else { console.log('Not found'); } 
