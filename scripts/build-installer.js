const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, 'web-installer.cs.template');
const logoWithTextPath = path.join(__dirname, 'logo_with_text.txt');
const logoWithoutTextPath = path.join(__dirname, 'logo_without_text.txt');
const outputPath = path.join(__dirname, 'web-installer.cs');
const manifestPath = path.join(__dirname, 'web-installer.manifest');
const configPath = path.join(__dirname, '..', 'installer-config.json');
const releaseDir = path.join(__dirname, '..', 'release');
const installerPath = path.join(releaseDir, 'Flux Tasks Web Setup.exe');
const installerIconPath = path.join(releaseDir, '.icon-ico', 'icon.ico');

if (!fs.existsSync(templatePath)) {
    console.error('Error: web-installer.cs.template not found!');
    process.exit(1);
}

let template = fs.readFileSync(templatePath, 'utf8');
const logoWithText = fs.existsSync(logoWithTextPath) ? fs.readFileSync(logoWithTextPath, 'utf8').trim() : '';
const logoWithoutText = fs.existsSync(logoWithoutTextPath) ? fs.readFileSync(logoWithoutTextPath, 'utf8').trim() : '';

template = template.replace('__LOGO_WITH_TEXT__', logoWithText);
template = template.replace('__LOGO_WITHOUT_TEXT__', logoWithoutText);

fs.writeFileSync(outputPath, template, 'utf8');

if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, { recursive: true });
}
fs.copyFileSync(configPath, path.join(releaseDir, 'installer-config.json'));

if (process.platform === 'win32') {
    const { execFileSync } = require('child_process');
    const cscCandidates = [
        path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
        path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')
    ];
    const csc = cscCandidates.find(fs.existsSync);
    if (!csc) {
        throw new Error('C# compiler was not found.');
    }
    if (!fs.existsSync(installerIconPath)) {
        throw new Error(`Installer icon was not found: ${installerIconPath}. Run the main application build first.`);
    }
    execFileSync(csc, [
        '/nologo',
        '/target:winexe',
        '/optimize+',
        '/platform:anycpu',
        '/win32manifest:' + manifestPath,
        '/win32icon:' + installerIconPath,
        '/reference:System.dll',
        '/reference:System.Core.dll',
        '/reference:System.Drawing.dll',
        '/reference:System.Windows.Forms.dll',
        '/out:' + installerPath,
        outputPath
    ], { stdio: 'inherit' });
}

console.log('Built Flux Tasks Web Setup and copied installer-config.json.');
