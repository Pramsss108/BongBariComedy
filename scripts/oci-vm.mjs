#!/usr/bin/env node
/**
 * Oracle Cloud VM control script (uses OCI CLI).
 * Usage:  node scripts/oci-vm.mjs <command>
 * Commands: status | start | stop | reboot
 *
 * npm shortcuts:
 *   npm run vm:status
 *   npm run vm:start
 *   npm run vm:stop
 *   npm run vm:reboot
 */
import { execSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';

const INSTANCE_OCID = 'ocid1.instance.oc1.eu-frankfurt-1.antheljtcpds64ac4dxkfqsooti3fkdwsyhjhwxx6satfcmit5oylvgrsnka';
const OCI = join(homedir(), 'bin', 'oci.exe');

const cmd = process.argv[2]?.toLowerCase();

function run(args) {
  try {
    const out = execSync(`"${OCI}" ${args}`, { encoding: 'utf8', timeout: 30_000 });
    return out.trim();
  } catch (e) {
    console.error('OCI CLI error:', e.stderr || e.message);
    process.exit(1);
  }
}

function getStatus() {
  const raw = run(`compute instance get --instance-id ${INSTANCE_OCID} --query "data.{state:\\"lifecycle-state\\", name:\\"display-name\\", ip:\\"metadata.ssh_authorized_keys\\"}" --output json`);
  // Simpler: just get lifecycle state
  const full = run(`compute instance get --instance-id ${INSTANCE_OCID} --output json`);
  const data = JSON.parse(full).data;
  console.log(`\n  VM: ${data['display-name']}`);
  console.log(`  State: ${data['lifecycle-state']}`);
  console.log(`  Region: ${data['region']}`);
  console.log(`  Shape: ${data['shape']}`);
  console.log(`  Created: ${data['time-created']}`);
  console.log(`  IP: 158.101.175.37\n`);
}

function doAction(action) {
  console.log(`\n  Sending "${action}" to VM...`);
  run(`compute instance action --instance-id ${INSTANCE_OCID} --action ${action}`);
  console.log(`  Done! Action "${action}" sent successfully.\n`);
}

switch (cmd) {
  case 'status':
    getStatus();
    break;
  case 'start':
    doAction('START');
    break;
  case 'stop':
    doAction('STOP');
    break;
  case 'reboot':
    doAction('SOFTRESET');
    break;
  default:
    console.log(`
  Oracle Cloud VM Control
  =======================
  Usage: npm run vm:<command>

  Commands:
    vm:status  - Show VM status (running/stopped)
    vm:start   - Start the VM
    vm:stop    - Stop the VM (graceful)
    vm:reboot  - Reboot the VM (soft reset)
    vm:ssh     - SSH into the VM
`);
    process.exit(1);
}
