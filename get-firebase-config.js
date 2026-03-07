const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
    console.log('Fetching Firebase config...');
    const output = execSync('firebase apps:sdkconfig web', { encoding: 'utf8' });

    // The output contains a JS-like object inside { ... }
    // We can try to parse it with a regex or a simple matcher.
    const configMatch = output.match(/\{[\s\S]*?\}/);
    if (!configMatch) {
        throw new Error('Could not find config object in Firebase CLI output');
    }

    // To be safe, we'll try to refine the JSON-like part.
    let configString = configMatch[0]
        .replace(/\/\/.*$/gm, '') // remove comments
        .replace(/(\w+):/g, '"$1":') // quote keys
        .replace(/'/g, '"'); // quote values

    // Extra cleanup for common Firebase CLI terminal artifacts
    configString = configString.replace(/,\s*\}/g, '}'); // remove trailing commas

    console.log('Raw match:', configMatch[0]);

    // Since the terminal might mangle even the capture, let's just use the direct SDK config if possible.
    // Actually, execSync should capture correctly.

    const config = JSON.parse(configString);
    console.log('STR_START');
    console.log(JSON.stringify(config, null, 2));
    console.log('STR_END');

} catch (err) {
    console.error('Error fetching config:', err.message);
    process.exit(1);
}
