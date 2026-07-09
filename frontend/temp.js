const fs = require('fs');
const css = fs.readFileSync('./src/app/globals.css', 'utf-8');
const svgLight = `<svg width='400' height='400' viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'><g fill='none' stroke='rgba(0,0,0,0.06)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M30,40 h20 c5,0 5,5 5,10 s0,10 -5,10 h-20 v-20 m20,5 c5,0 5,5 0,5'/><path d='M35,30 v5 m10,-5 v5'/><path d='M120,40 l5,15 h15 l-10,10 l5,15 l-15,-10 l-15,10 l5,-15 l-10,-10 h15 z'/><path d='M220,50 a10,10 0 0,0 -20,0 c0,15 10,20 20,30 c10,-10 20,-15 20,-30 a10,10 0 0,0 -20,0 z'/><path d='M320,60 v-30 h20 v10 m-20,0 h15 m-15,20 a8,8 0 1,1 -15,0 a8,8 0 1,1 15,0 z'/><path d='M50,150 a15,15 0 0,1 25,0 a20,20 0 0,1 30,10 a15,15 0 0,1 -10,25 h-45 a15,15 0 0,1 0,-35 z'/><path d='M150,120 l30,10 l-30,15 l5,-10 z m5,15 l10,5 l-5,5 z'/><path d='M260,140 a25,25 0 1,0 20,20 a20,20 0 0,1 -20,-20 z'/><path d='M350,120 c-15,0 -20,10 -20,25 c15,0 20,-10 20,-25 z m-20,25 l10,-15'/><path d='M40,240 l20,-20 l10,10 l-20,20 z m20,-20 l5,-5 l10,10 l-5,5 z m-20,20 l-5,10 l10,-5 z'/><path d='M130,220 h30 a10,10 0 0,1 10,10 v15 a10,10 0 0,1 -10,10 h-10 l-10,10 v-10 h-10 a10,10 0 0,1 -10,-10 v-15 a10,10 0 0,1 10,-10 z'/><path d='M140,235 h10 m-10,10 h15'/><path d='M250,220 l30,40 a20,20 0 0,1 -40,0 z'/><circle cx='250' cy='235' r='2'/><circle cx='260' cy='245' r='2'/><circle cx='245' cy='250' r='2'/><path d='M330,240 h40 v30 h-40 z m10,0 l5,-5 h10 l5,5'/><circle cx='350' cy='255' r='8'/><circle cx='365' cy='245' r='1'/><circle cx='60' cy='340' r='15'/><path d='M35,340 c10,15 40,15 50,0 c-10,-15 -40,-15 -50,0 z'/><path d='M150,330 h20 v20 h-20 z m-5,-5 h30 v5 h-30 z m15,5 v20 m-15,-20 h30'/><path d='M160,325 c-5,-10 -15,-5 -5,0 c5,-10 15,-5 5,0'/><path d='M240,330 l15,-10 l15,10 l-15,20 z m-5,0 h35 m-25,-10 l-5,10 l15,20 m10,-30 l5,10 l-15,20'/><path d='M350,330 a15,15 0 0,0 -30,0 v10 a5,5 0 0,0 5,5 h5 v-15 m20,0 v15 h-5 a5,5 0 0,1 -5,-5 v-10'/><circle cx='80' cy='80' r='1'/><circle cx='280' cy='30' r='1.5'/><circle cx='180' cy='180' r='1'/><circle cx='300' cy='280' r='2'/><path d='M90,180 l5,5 m0,-5 l-5,5'/><path d='M380,180 l5,5 m0,-5 l-5,5'/><path d='M200,80 l5,5 m0,-5 l-5,5'/><path d='M100,280 l5,5 m0,-5 l-5,5'/><path d='M10,100 q10,-10 20,0 t20,0'/><path d='M200,380 q10,-10 20,0 t20,0'/></g></svg>`;
const svgDark = svgLight.replace('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.04)');
const lightUrl = 'data:image/svg+xml,' + encodeURIComponent(svgLight);
const darkUrl = 'data:image/svg+xml,' + encodeURIComponent(svgDark);

let isDark = false;
const replacedCss = css.replace(/url\("data:image\/svg\+xml,[^"]*"\)/g, (match) => {
    const replacement = isDark ? `url("${darkUrl}")` : `url("${lightUrl}")`;
    isDark = true;
    return replacement;
});

fs.writeFileSync('./src/app/globals.css', replacedCss);
console.log("Successfully encoded and replaced SVG data URIs in globals.css");
