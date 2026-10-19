import { Config } from '@remotion/cli/config';
import { existsSync } from 'node:fs';

Config.setEntryPoint('src/index.js');
Config.setVideoImageFormat('jpeg');
Config.setCodec('h264');
Config.setOverwriteOutput(true);

// W sesjach w chmurze pobieranie Chrome Headless Shell bywa zablokowane.
// Wtedy używamy przeglądarki z Playwrighta, jeśli jest zainstalowana.
const lokalnaPrzegladarka = process.env.REMOTION_BROWSER || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
if (existsSync(lokalnaPrzegladarka)) Config.setBrowserExecutable(lokalnaPrzegladarka);
