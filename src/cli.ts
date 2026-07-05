#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { Controller } from './controller.js';
import type { RGBColor } from './color.js';
import { getEffect, listEffects } from './effects/index.js';

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/**
 * Parses a hex colour string to an RGBColor.
 * Accepts `#rrggbb` or `rrggbb`.
 */
function hexToRgb(hex: string): RGBColor {
  const value = hex.replace(/^#/, '');

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(
      `Invalid hex colour: "${hex}". Use format RRGGBB or #RRGGBB (e.g. ff0000 for red).`,
    );
  }

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/**
 * Creates a Controller and tries to connect to the keyboard.
 * Exits the process with a non-zero code on failure.
 */
function createController(): Controller {
  const ctrl = new Controller();

  if (!ctrl.connect()) {
    console.error(chalk.red('✖ Could not connect to Redragon keyboard.'));
    console.error(
      chalk.gray('  Ensure the device is connected and you have proper permissions'),
      chalk.gray('  (udev rule for 258a:0049 / 25a7:fa70).'),
    );
    process.exit(1);
  }

  return ctrl;
}

// ---------------------------------------------------------------
// CLI definition
// ---------------------------------------------------------------

const program = new Command();

program
  .name('redragon')
  .description('CLI controller for the Redragon K629CGO-PRO-M keyboard')
  .version('0.1.0');

// ---- connect ---------------------------------------------------

program
  .command('connect')
  .description('Connect to the keyboard and verify communication')
  .action(() => {
    const ctrl = new Controller();

    if (ctrl.connect()) {
      console.log(chalk.green('✔ Connected to Redragon keyboard'));
    } else {
      console.error(chalk.red('✖ Failed to connect to keyboard'));
      process.exit(1);
    }
  });

// ---- color <hex> -----------------------------------------------

program
  .command('color')
  .description('Set all keys to a solid colour')
  .argument('<hex>', 'Hex colour (rrggbb or #rrggbb)')
  .action((hex: string) => {
    const ctrl = createController();
    const color = hexToRgb(hex);
    ctrl.setAllColor(color);
    console.log(chalk.green(`✔ All keys set to #${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`));
  });

// ---- key-color <key> <hex> -------------------------------------

program
  .command('key-color')
  .description('Set the colour of a single key')
  .argument('<key>', 'Key identifier (e.g. esc, space, a)')
  .argument('<hex>', 'Hex colour (rrggbb or #rrggbb)')
  .action((key: string, hex: string) => {
    const ctrl = createController();
    const color = hexToRgb(hex);
    ctrl.setKeyColor(key, color);
    console.log(chalk.green(`✔ Key "${key}" set to #${hex.replace(/^#/, '')}`));
  });

// ---- effect <name> [brightness] [speed] ------------------------

program
  .command('effect')
  .description('Apply an effect (static / rainbow / wave / …)')
  .argument('<name>', 'Effect name from list-effects')
  .argument('[brightness]', 'Brightness 0–4', '3')
  .argument('[speed]', 'Speed 0–4', '2')
  .action((name: string, brightness: string, speed: string) => {
    const ctrl = createController();
    const b = Math.min(4, Math.max(0, parseInt(brightness, 10) || 3));
    const s = Math.min(4, Math.max(0, parseInt(speed, 10) || 2));

    if (name === 'static') {
      // Firmware static with a default orange colour; the colour
      // command or the web UI should be used when a custom colour
      // is needed.
      ctrl.applyFirmwareStatic({ r: 255, g: 100, b: 0 }, b);
    } else if (name === 'rainbow') {
      ctrl.applyFirmwareRainbow(b, s);
    } else {
      const effect = getEffect(name);
      if (!effect) {
        console.error(chalk.red(`✖ Unknown effect: "${name}".`));
        console.error(chalk.gray(`  Available: ${ctrl.listEffects().join(', ')}`));
        process.exit(1);
      }
      ctrl.startEffect(effect, 30);
    }

    console.log(chalk.green(`✔ Applied effect "${name}"`));
  });

// ---- static <hex> [brightness] ---------------------------------

program
  .command('static')
  .description('Apply firmware static effect with a specific colour')
  .argument('<hex>', 'Hex colour (rrggbb or #rrggbb)')
  .argument('[brightness]', 'Brightness 0–4', '3')
  .action((hex: string, brightness: string) => {
    const ctrl = createController();
    const color = hexToRgb(hex);
    const b = Math.min(4, Math.max(0, parseInt(brightness, 10) || 3));
    ctrl.applyFirmwareStatic(color, b);
    console.log(
      chalk.green(`✔ Firmware static effect applied (#${hex.replace(/^#/, '')})`),
    );
  });

// ---- rainbow [brightness] [speed] ------------------------------

program
  .command('rainbow')
  .description('Apply firmware rainbow effect')
  .argument('[brightness]', 'Brightness 0–4', '3')
  .argument('[speed]', 'Speed 0–4', '2')
  .action((brightness: string, speed: string) => {
    const ctrl = createController();
    const b = Math.min(4, Math.max(0, parseInt(brightness, 10) || 3));
    const s = Math.min(4, Math.max(0, parseInt(speed, 10) || 2));
    ctrl.applyFirmwareRainbow(b, s);
    console.log(chalk.green('✔ Firmware rainbow effect applied'));
  });

// ---- list-effects ----------------------------------------------

program
  .command('list-effects')
  .description('List all registered effects')
  .action(() => {
    const names = listEffects();

    if (names.length === 0) {
      console.log(chalk.yellow('No effects registered.'));
      return;
    }

    console.log(chalk.cyan('Available effects:'));
    for (const name of names) {
      console.log(`  • ${name}`);
    }
  });

// ---- info ------------------------------------------------------

program
  .command('info')
  .description('Show device and connection information')
  .action(() => {
    const ctrl = new Controller();
    const connected = ctrl.connect();

    console.log(chalk.cyan('Redragon K629CGO-PRO-M'));
    console.log('──────────────────────────────');

    if (connected) {
      console.log(`  Status:    ${chalk.green('Connected')}`);
    } else {
      console.log(`  Status:    ${chalk.red('Not connected')}`);
    }

    console.log(`  VID/PID:   258a:0049 / 25a7:fa70`);
    console.log(`  Interface: USB HID (usagePage 0xFF00)`);
    console.log(`  Layout:    TKL (87 keys, 16×6 matrix)`);
  });

// ---- disconnect ------------------------------------------------

program
  .command('disconnect')
  .description('Disconnect from the keyboard')
  .action(() => {
    const ctrl = new Controller();

    if (ctrl.isConnected()) {
      ctrl.disconnect();
      console.log(chalk.green('✔ Disconnected'));
    } else {
      console.log(chalk.yellow('⚠ Not currently connected'));
    }
  });

// ---- Parse -----------------------------------------------------

program.parse();
