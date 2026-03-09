const { spawn } = require('child_process');
const child = spawn('firebase', ['login', '--reauth', '--no-localhost'], { shell: true });

child.stdout.on('data', (data) => {
    const output = data.toString();
    // Look for the URL pattern
    if (output.includes('https://')) {
        console.log('---URL_START---');
        console.log(output.trim());
        console.log('---URL_END---');
    } else {
        process.stdout.write(output);
    }
});

child.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
});

setTimeout(() => {
    child.kill();
    process.exit(0);
}, 15000);
