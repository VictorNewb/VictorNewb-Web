#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const packageJson = require('./package.json');

const args = process.argv.slice(2);
const command = args[0];
const packageName = args[1];
const CWD = process.cwd();

// --- Find the website root (folder containing index.html) ---
function findWebsiteRoot() {
  let current = CWD;
  for (let i = 0; i < 6; i++) {
    const indexPath = path.join(current, 'index.html');
    if (fs.existsSync(indexPath)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return CWD;
}

const WEBSITE_ROOT = findWebsiteRoot();
const WEB_PACKAGES_PATH = path.join(WEBSITE_ROOT, 'packages.json');

// --- HELP ---
function showHelp() {
  console.log(chalk.cyan(`
  VictorNewb - Package Manager (npm powered)

  Usage:
    victornewb <command> [options]

  Commands:
    help                     Show this help message
    publish                  Publish current package to npm registry
    install <package>        Install a package from npm
    uninstall <package>      Uninstall a package

  Options:
    --version, -v            Show version number
    --help, -h               Show this help message

  Examples:
    victornewb publish
    victornewb install lodash
    victornewb uninstall lodash
  `));
  process.exit(0);
}

// --- VERSION ---
function showVersion() {
  console.log(chalk.magenta(`v${packageJson.version}`));
  process.exit(0);
}

// --- Update the website's packages.json (showcase) ---
function updateWebsitePackages(pkgData, action) {
  let data = { packages: [] };

  if (fs.existsSync(WEB_PACKAGES_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(WEB_PACKAGES_PATH, 'utf8'));
      if (!data.packages) data.packages = [];
    } catch (_) {
      data = { packages: [] };
    }
  }

  if (action === 'add') {
    const existingIdx = data.packages.findIndex(p => p.name === pkgData.name);
    if (existingIdx !== -1) {
      data.packages[existingIdx] = pkgData;
    } else {
      data.packages.push(pkgData);
    }
  } else if (action === 'remove') {
    data.packages = data.packages.filter(p => p.name !== pkgData.name);
  }

  fs.writeFileSync(WEB_PACKAGES_PATH, JSON.stringify(data, null, 2));
}

// --- COMMAND: PUBLISH (to npm) ---
function runPublish() {
  const pkgPath = path.join(CWD, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.log(chalk.red('Error: No package.json found in the current directory.'));
    console.log(chalk.gray('  Run this command inside a project with a package.json.'));
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const name = pkg.name || 'unnamed-package';
  const version = pkg.version || '0.0.0';
  const description = pkg.description || 'Published via VictorNewb CLI';

  // 1. Publish to npm
  try {
    console.log(chalk.yellow(`Publishing ${name}@${version} to npm registry...`));
    execSync('npm publish', { stdio: 'inherit', cwd: CWD });
    console.log(chalk.green(`Successfully published ${name}@${version} to npm.`));
  } catch (error) {
    console.log(chalk.red('Publish failed.'));
    console.log(chalk.gray('  Make sure you are logged in: npm login'));
    console.log(chalk.gray('  Or check your package.json for errors.'));
    process.exit(1);
  }

  // 2. Update the website showcase (packages.json next to index.html)
  updateWebsitePackages({ name, version, description }, 'add');
  console.log(chalk.gray(`  Website showcase updated at: ${WEB_PACKAGES_PATH}`));
  process.exit(0);
}

// --- COMMAND: INSTALL (from npm) ---
function runInstall() {
  if (!packageName) {
    console.log(chalk.red('Error: Please specify a package name to install.'));
    console.log(chalk.gray('  Usage: victornewb install <package>'));
    process.exit(1);
  }

  try {
    console.log(chalk.yellow(`Installing ${packageName} from npm...`));
    execSync(`npm install ${packageName}`, { stdio: 'inherit', cwd: CWD });
    console.log(chalk.green(`Successfully installed ${packageName}`));
  } catch (error) {
    console.log(chalk.red(`Failed to install ${packageName}`));
    process.exit(1);
  }
  process.exit(0);
}

// --- COMMAND: UNINSTALL (from npm) ---
function runUninstall() {
  if (!packageName) {
    console.log(chalk.red('Error: Please specify a package name to uninstall.'));
    console.log(chalk.gray('  Usage: victornewb uninstall <package>'));
    process.exit(1);
  }

  try {
    console.log(chalk.yellow(`Uninstalling ${packageName}...`));
    execSync(`npm uninstall ${packageName}`, { stdio: 'inherit', cwd: CWD });
    console.log(chalk.green(`Successfully uninstalled ${packageName}`));
  } catch (error) {
    console.log(chalk.red(`Failed to uninstall ${packageName}`));
    process.exit(1);
  }

  // Optional: remove from website showcase if you want
  // updateWebsitePackages({ name: packageName }, 'remove');
  // console.log(chalk.gray(`  Website showcase updated.`));

  process.exit(0);
}

// --- ROUTER ---
if (!command || command === '--help' || command === '-h') {
  showHelp();
}

if (command === '--version' || command === '-v') {
  showVersion();
}

switch (command) {
  case 'help':
    showHelp();
    break;
  case 'publish':
    runPublish();
    break;
  case 'install':
    runInstall();
    break;
  case 'uninstall':
    runUninstall();
    break;
  default:
    console.log(chalk.red(`Unknown command: ${command}`));
    console.log(chalk.gray('Run "victornewb --help" to see available commands.'));
    process.exit(1);
}