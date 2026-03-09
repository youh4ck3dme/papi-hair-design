const { spawn } = require('child_process');
const child = spawn('firebase', ['login', '--reauth', '--no-localhost'], {
    shell: true,
    env: { ...process.env, TERM: 'xterm-256color', COLUMNS: '1000' }
});

let fullOutput = '';
child.stdout.on('data', (data) => {
    fullOutput += data.toString();
    console.log(data.toString());
});

child.stderr.on('data', (data) => {
    fullOutput += data.toString();
    console.error(data.toString());
});

setTimeout(() => {
    const urlMatch = fullOutput.match(/https:\/\/auth\.firebase\.tools\/login\S+/);
    if (urlMatch) {
        console.log('\n---FULL_URL_START---');
        console.log(urlMatch[0]);
        console.log('---FULL_URL_END---');
    }
    // Keep it running for the user
}, 10000);
