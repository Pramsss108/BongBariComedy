const fs = require('fs');
let s = fs.readFileSync('client/src/pages/SocialDownloaderPage.tsx', 'utf8');

const t = `    } catch (err: any) {
      clearInterval(progressInterval);
      setExtractProgress(null);
      setPhase("error");
      if (err.name === 'AbortError') {`;

const p = `    } catch (err: any) {
      clearInterval(progressInterval);
      setExtractProgress(null);
      setPhase("error");
      setVideoInfo(null); // Clear any old metadata so the UI fully stops
      if (err.name === 'AbortError') {`;

s = s.replace(t, p);
fs.writeFileSync('client/src/pages/SocialDownloaderPage.tsx', s);