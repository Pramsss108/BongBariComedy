const fs = require('fs');

let f = fs.readFileSync('client/src/pages/SocialDownloaderPage.tsx', 'utf8');

f = f.replace(/<option[^>]*value="layer2".*?<\/option>/gs, 
  '<option className="bg-[#0f0f11] text-white" value="layer2">🧪 Force Layer 2: CF Swarm Edge (Working/Free/IG-FB)</option>');

f = f.replace(/<option[^>]*value="layer3".*?<\/option>/gs, 
  '<option className="bg-[#0f0f11] text-white" value="layer3">✅ Force Layer 3: Hetzner IPv6 yt-dlp (Working/Free)</option>');

f = f.replace(/<option[^>]*value="layer4".*?<\/option>/gs, 
  '<option className="bg-[#0f0f11] text-white" value="layer4">✅ Force Layer 4: YTDL-Core Spoofer (Working/Free)</option>');

f = f.replace(/<option[^>]*value="layer5".*?<\/option>/gs, 
  '<option className="bg-[#0f0f11] opacity-50 text-white" value="layer5">🛠️ Force Layer 5: Future Expansion Slot</option>');

f = f.replace(/<option[^>]*value="layer6".*?<\/option>/gs, 
  '<option className="bg-[#0f0f11] text-[#ff4444] font-bold" value="layer6">🔒 Force Layer 6: ASocks Proxy (Ultimate Last Slot)</option>');

fs.writeFileSync('client/src/pages/SocialDownloaderPage.tsx', f);
console.log('UI updated');