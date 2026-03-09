const { spawn } = require('child_process');
const child = spawn('firebase', ['login', '--reauth', '--no-localhost'], { shell: true });

child.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
});

child.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
});

// Auto-kill after 20 seconds
setTimeout(() => {
    child.kill();
    process.exit(0);
}, 20000);
