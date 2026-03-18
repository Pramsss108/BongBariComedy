const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');
const searchStr =         formatNotAvailable(
          res,
          \Preview unavailable for this video. You can still download it directly.\,
        );
      }
export function;
const newStr =         formatNotAvailable(
          res,
          \Preview unavailable for this video. You can still download it directly.\,
        );
      }
    }
}
export function;
code = code.replace(searchStr, newStr);
fs.writeFileSync('server/routes/downloader.ts', code);
