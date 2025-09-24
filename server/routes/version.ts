import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

// Get build version and deployment info
router.get('/version', async (req, res) => {
  try {
    let gitHash = 'unknown';
    let gitBranch = 'unknown';
    const buildTime = new Date().toISOString();

    // Try to get git info
    try {
      const { stdout: hashStdout } = await execAsync('git rev-parse --short HEAD');
      gitHash = hashStdout.trim();
    } catch (e) {
      // Git not available or not a git repo
    }

    try {
      const { stdout: branchStdout } = await execAsync('git rev-parse --abbrev-ref HEAD');
      gitBranch = branchStdout.trim();
    } catch (e) {
      // Git not available or not a git repo
    }

    const versionInfo = {
      version: '1.0.0',
      gitHash,
      gitBranch,
      buildTime,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      status: 'healthy'
    };

    res.json(versionInfo);
  } catch (error) {
    console.error('Version endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to get version info',
      status: 'unhealthy' 
    });
  }
});

export default router;