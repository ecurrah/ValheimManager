
require('./src/types/typedef');

const Logger = require('chegs-simple-logger');
const AutoUpdate = require('auto-git-update');

const Backups = require('./src/backups');
const Discord = require('./src/discord');
const Installer = require('./src/installer');
const Launcher = require('./src/launcher');
const System = require('./src/launcher');
const ValFiles = require('./src/valheimFiles');

const autoGitUpdateConfig = {
    repository: 'https://github.com/chegele/ValheimManager',
    tempLocation: './tmp/',
    exitOnComplete: true
}

module.exports = class ValheimManager {

    /** @param {Configuration} config - The configuration for the manager */
    constructor(config) {

        // Validate the configuration file
        const configValidation = validateConfiguration(config);
        if (configValidation !== 'ok') throw new Error(configValidation);

        // Create instances of all tools and dependencies
        this.config = config;
        this.logger = new Logger(config.logging);
        this.autoManagerUpdate = new AutoUpdate(autoGitUpdateConfig);
        this.backups = new Backups(this);
        this.discord = new Discord(this);
        this.installer = new Installer(this);
        this.launcher = new Launcher(this);
        this.system = new System(this);
        this.valFiles = new ValFiles(this);

    }
    
}

/**
 * Synchronous / thread blocking validation of the config which can be used in the modules constructor.
 * @param {Configuration} config - The user provided configuration to be validated.
 * @returns {String} - A fully detailed error message to help an average user troubleshoot, or "ok".
 */
function validateConfiguration(config) {
    return 'ok';
}