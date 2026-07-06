#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { Controller } from './controller.js';
import { hexToRgb } from './color.js';
import { listEffects } from './effects/index.js';
import { defaultEffectDispatcher } from './effects/dispatcher.js';
import { DeviceManager } from './device.js';
import { FIRMWARE_EFFECTS, FrameBuilder } from './protocol.js';
import { KeyLayout } from './layout.js';

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
      chalk.gray('  (udev rule for 258a:0049 / 25a7:fa70).')
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
    console.log(
      chalk.green(
        `✔ All keys set to #${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`
      )
    );
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

    const applied = defaultEffectDispatcher.apply(name, ctrl, {
      brightness: b,
      speed: s,
    });

    if (!applied) {
      console.error(chalk.red(`✖ Unknown effect: "${name}".`));
      console.error(chalk.gray(`  Available: ${ctrl.listEffects().join(', ')}`));
      process.exit(1);
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
    console.log(chalk.green(`✔ Firmware static effect applied (#${hex.replace(/^#/, '')})`));
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

// ---- snake -----------------------------------------------------

program
  .command('snake')
  .description('Apply firmware snake effect')
  .argument('[brightness]', 'Brightness 0–4', '3')
  .argument('[speed]', 'Speed 0–4', '2')
  .action((brightness: string, speed: string) => {
    const ctrl = createController();
    const b = Math.min(4, Math.max(0, parseInt(brightness, 10) || 3));
    const s = Math.min(4, Math.max(0, parseInt(speed, 10) || 2));
    defaultEffectDispatcher.apply('snake', ctrl, { brightness: b, speed: s });
    console.log(chalk.green('✔ Firmware snake effect applied'));
  });

// ---- star-twinkle ----------------------------------------------

program
  .command('star-twinkle')
  .description('Apply firmware star twinkle effect')
  .argument('[brightness]', 'Brightness 0–4', '3')
  .argument('[speed]', 'Speed 0–4', '2')
  .action((brightness: string, speed: string) => {
    const ctrl = createController();
    const b = Math.min(4, Math.max(0, parseInt(brightness, 10) || 3));
    const s = Math.min(4, Math.max(0, parseInt(speed, 10) || 2));
    defaultEffectDispatcher.apply('star-twinkle', ctrl, { brightness: b, speed: s });
    console.log(chalk.green('✔ Firmware star twinkle effect applied'));
  });

// ---- sine-wave -------------------------------------------------

program
  .command('sine-wave')
  .description('Apply firmware sine wave effect')
  .argument('[brightness]', 'Brightness 0–4', '3')
  .argument('[speed]', 'Speed 0–4', '2')
  .action((brightness: string, speed: string) => {
    const ctrl = createController();
    const b = Math.min(4, Math.max(0, parseInt(brightness, 10) || 3));
    const s = Math.min(4, Math.max(0, parseInt(speed, 10) || 2));
    defaultEffectDispatcher.apply('sine-wave', ctrl, { brightness: b, speed: s });
    console.log(chalk.green('✔ Firmware sine wave effect applied'));
  });

// ---- waterfall -------------------------------------------------

program
  .command('waterfall')
  .description('Apply firmware waterfall effect')
  .argument('[brightness]', 'Brightness 0–4', '3')
  .argument('[speed]', 'Speed 0–4', '2')
  .action((brightness: string, speed: string) => {
    const ctrl = createController();
    const b = Math.min(4, Math.max(0, parseInt(brightness, 10) || 3));
    const s = Math.min(4, Math.max(0, parseInt(speed, 10) || 2));
    defaultEffectDispatcher.apply('waterfall', ctrl, { brightness: b, speed: s });
    console.log(chalk.green('✔ Firmware waterfall effect applied'));
  });

// ---- rainbow-blossom -------------------------------------------

program
  .command('rainbow-blossom')
  .description('Apply firmware rainbow blossom effect')
  .argument('[brightness]', 'Brightness 0–4', '3')
  .argument('[speed]', 'Speed 0–4', '2')
  .action((brightness: string, speed: string) => {
    const ctrl = createController();
    const b = Math.min(4, Math.max(0, parseInt(brightness, 10) || 3));
    const s = Math.min(4, Math.max(0, parseInt(speed, 10) || 2));
    defaultEffectDispatcher.apply('rainbow-blossom', ctrl, { brightness: b, speed: s });
    console.log(chalk.green('✔ Firmware rainbow blossom effect applied'));
  });

// ---- wheel -----------------------------------------------------

program
  .command('wheel')
  .description('Apply firmware wheel effect')
  .argument('[brightness]', 'Brightness 0–4', '3')
  .argument('[speed]', 'Speed 0–4', '2')
  .action((brightness: string, speed: string) => {
    const ctrl = createController();
    const b = Math.min(4, Math.max(0, parseInt(brightness, 10) || 3));
    const s = Math.min(4, Math.max(0, parseInt(speed, 10) || 2));
    defaultEffectDispatcher.apply('wheel', ctrl, { brightness: b, speed: s });
    console.log(chalk.green('✔ Firmware wheel effect applied'));
  });

// ---- debug-effect ------------------------------------------------

program
  .command('debug-effect')
  .description('Debug: send firmware burst with verbose frame logging')
  .argument('<mode>', 'Effect name (static, rainbow, snake, etc.)')
  .option('-b, --brightness <0-4>', 'Brightness', '3')
  .option('-s, --speed <0-4>', 'Speed', '2')
  .option('-c, --color <hex>', 'Color (RRGGBB)', 'ff6400')
  .option('-r, --report-id <0-255>', 'Override HID report ID in all frames (default: original)')
  .option('-p, --patch-handshake <hex>', 'Override handshake bytes (e.g. 080ab6000000)')
  .action(
    (
      mode: string,
      opts: {
        brightness: string;
        speed: string;
        color: string;
        reportId?: string;
        patchHandshake?: string;
      }
    ) => {
      const dm = new DeviceManager();
      console.log(chalk.dim('1. Searching for device...'));
      if (!dm.find()) {
        console.log(chalk.red('✗ No Redragon keyboard found'));
        process.exit(1);
      }
      console.log(chalk.green(`   ✓ Found: ${dm.getLabel()}`));

      console.log(chalk.dim('2. Opening device...'));
      dm.open();
      console.log(chalk.green('   ✓ Device opened'));

      const effectMode = (FIRMWARE_EFFECTS as Record<string, number>)[
        mode.toUpperCase().replace('-', '_')
      ];
      if (effectMode === undefined) {
        console.log(chalk.red(`✗ Unknown effect mode: ${mode}`));
        console.log(chalk.dim('   Available:'), Object.keys(FIRMWARE_EFFECTS).join(', '));
        dm.close();
        process.exit(1);
      }

      const b = Math.min(4, Math.max(0, parseInt(opts.brightness, 10) || 3));
      const s = Math.min(4, Math.max(0, parseInt(opts.speed, 10) || 2));
      const color = hexToRgb(opts.color);

      console.log(
        chalk.dim(
          `3. Building burst frames (mode=0x${effectMode.toString(16).padStart(2, '0')}, ` +
            `color=rgb(${color.r},${color.g},${color.b}), brightness=${b}, speed=${s})...`
        )
      );

      const layout = new KeyLayout();
      const fb = new FrameBuilder(layout);
      const frames = fb.buildFirmwareEffectFrame(effectMode, color, b, s);

      // Apply report ID override
      if (opts.reportId) {
        const rid = parseInt(opts.reportId, 10);
        if (rid < 0 || rid > 255) {
          console.log(chalk.red(`✗ Invalid report ID: ${opts.reportId} (must be 0-255)`));
          dm.close();
          process.exit(1);
        }
        for (const f of frames) {
          f.writeUInt8(rid, 0);
        }
        console.log(
          chalk.yellow(`   ⚠ Overriding report ID to 0x${rid.toString(16).padStart(2, '0')}`)
        );
      }

      // Apply handshake patch
      if (opts.patchHandshake) {
        const hex = opts.patchHandshake.replace(/\s/g, '');
        if (!/^[0-9a-fA-F]+$/.test(hex)) {
          console.log(chalk.red('✗ Invalid hex for --patch-handshake'));
          dm.close();
          process.exit(1);
        }
        const patch = Buffer.from(hex, 'hex');
        const handshake = frames[0];
        for (let i = 0; i < patch.length && i < handshake.length; i++) {
          handshake.writeUInt8(patch.readUInt8(i), i);
        }
        console.log(
          chalk.yellow(`   ⚠ Patched handshake: ${patch.subarray(0, 8).toString('hex')}`)
        );
      }

      console.log(chalk.green(`   ✓ ${frames.length} frames built`));
      console.log(chalk.dim('4. Sending frames with 10ms delay...'));

      const labels = ['handshake', 'block1', 'block2', 'block3', 'block4'];

      for (let i = 0; i < frames.length; i++) {
        const f = frames[i];
        const headerHex = f.subarray(0, 8).toString('hex');
        const label = labels[i] ?? `frame${i}`;

        // For block4, also show the mode byte (offset 21) and config byte (offset 69)
        let extra = '';
        if (i === 4) {
          const modeByte = f.readUInt8(21);
          const configByte = f.readUInt8(69);
          const cfgSpeed = (configByte >> 4) & 0x0f;
          const cfgBrightness = configByte & 0x0f;
          extra = chalk.dim(
            ` | mode=0x${modeByte.toString(16).padStart(2, '0')} ` +
              `speed=${cfgSpeed} brightness=${cfgBrightness}`
          );
        }

        try {
          dm.sendFeatureReport(f);
          console.log(
            chalk.green(`   [${label}] ${f.length}B sent — header: ${headerHex}${extra}`)
          );
        } catch (err: unknown) {
          console.log(chalk.red(`   [${label}] FAILED: ${(err as Error).message}`));
        }
      }

      console.log(chalk.green('\n✓ All frames sent. Check the keyboard for visual changes.'));
      console.log(
        chalk.dim('  If nothing changed, firmware bytecodes may be wrong for this model.')
      );
      console.log(chalk.dim('  Try: pnpm dev:cli debug-effect static  → should show solid color'));
      console.log(
        chalk.dim('       pnpm dev:cli debug-effect rainbow → should show cycling rainbow')
      );

      dm.close();
    }
  );

// ---- Parse -----------------------------------------------------

program.parse();
