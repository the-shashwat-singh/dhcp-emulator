import paramiko
import asyncio

class SSHClient:
    def __init__(self, username="shashwat", key_filename="/Users/shashwatsingh/.ssh/id_rsa"):
        self.username = username
        self.key_filename = key_filename

    def _connect(self, host):
        HOST_MAP = {
            "vm-server": "192.168.128.10",
            "vm-agent": "192.168.128.20",
            "vm-client": "192.168.128.50",
            "vm-client-nat": "10.0.2.15"
        }
        ip = HOST_MAP.get(host, host)
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname=ip, username=self.username, key_filename=self.key_filename, timeout=3)
        return client

    async def execute_command(self, host, command, background=False):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._execute_sync, host, command, background)

    def _execute_sync(self, host, command, background):
        try:
            client = self._connect(host)
            if background:
                # Use nohup to run in background
                cmd = f"nohup {command} > /tmp/dhcp_script.log 2>&1 &"
                client.exec_command(cmd)
                client.close()
                return {"status": "started in background"}
            else:
                stdin, stdout, stderr = client.exec_command(command)
                out = stdout.read().decode('utf-8')
                err = stderr.read().decode('utf-8')
                client.close()
                return {"stdout": out, "stderr": err}
        except Exception as e:
            return {"error": str(e)}

ssh_runner = SSHClient()
