import paramiko
import sys

def run_cmd(cmd):
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect('78.47.104.43', username='root', password='Shipath###108', timeout=10)
        
        print(f"Executing payload...")
        stdin, stdout, stderr = client.exec_command(cmd)
        
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        
        print(f"--- STDOUT ---\n{out}")
        print(f"--- STDERR ---\n{err}")
        print(f"EXIT_CODE: {exit_status}")
        
    except Exception as e:
        print(f"SSH Exception: {str(e)}")
    finally:
        client.close()

if __name__ == '__main__':
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
    else:
        with open('cmd.txt', 'r') as f:
            cmd = f.read()
    run_cmd(cmd)