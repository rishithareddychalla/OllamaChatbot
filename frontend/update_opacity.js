const fs = require('fs');
const cssPath = './src/app/globals.css';
let css = fs.readFileSync(cssPath, 'utf-8');

// We just need to replace the opacities in the encoded strings inside the CSS
// The encoded strings have rgba(0%2C0%2C0%2C0.06) for light mode
// and rgba(255%2C255%2C255%2C0.04) for dark mode

css = css.replace(/rgba\(0%2C0%2C0%2C0\.06\)/g, 'rgba(0%2C0%2C0%2C0.18)');
css = css.replace(/rgba\(255%2C255%2C255%2C0\.04\)/g, 'rgba(255%2C255%2C255%2C0.12)');

fs.writeFileSync(cssPath, css);
console.log('Successfully updated doodle opacities to be more visible.');
