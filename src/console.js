
// Import the dependencies
const ValheimManager = require('../index');
const defaultConfig = require('./types/defaultConfig');
const path = require('path');
const fs = require('fs-extra');
const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

// Get the config path argument. If nothing is provided, check for the default name in executing directory. 
const defaultConfigPath = path.resolve('./vmConfig.json');
let pathArg = process.argv.length > 2 ? process.argv[3] : null;
if (!pathArg && fs.existsSync(defaultConfigPath)) pathArg = defaultConfigPath;


/** Asynchronous container for running the script **/
async function execute() {
    
    // Ask the user to provide or create a config file
    if (!pathArg) {

        let question = 'Unable to identify the configuration file. What would you like to do?';
        question += `\n  - (1) Provide the path/name to the configuration file`;
        question += `\n  - (2) Generate a new configuration file`;
        question += `\n  - (3) Cancel execution of the Valheim Manager`;

        const response = await prompt(question, answer => {
            if (!['1', '2', '3'].includes(answer)) return 'You must select an option between 1 and 3.';
        });

        if (response == '3') process.exit();
        if (response == '2') pathArg = await setupConfig();
        if (response == '1') pathArg = await prompt('What is the path to the configuration file?', answer => {
            if (!fs.existsSync(path.resolve(answer))) return 'This file is not accessible or does not exist.';
        });
    }

    // Parse the configuration file. Configuration properties will be validated by the manager
    const configPath = path.resolve(pathArg);
    if (!fs.existsSync(configPath)) throw new Error('The provided configuration does not exist.\nPath: ' + configPath);
    const config = await fs.readJSON(configPath).catch(err => {
        throw new Error(`Failed to parse the configuration file. Maybe you provided the wrong path?\nPath: ${configPath}\n${err.stack}`);
    });

    // Start the valheim manager and proceed with setup, installation, and launch of the server.
    const manager = new ValheimManager(config);

    if (config.manager.autoOpenPorts) await manager.system.autoOpenServerPorts().catch(err => {
        console.log(`Your router may not have upnp services enabled. Try again after enabling this feature on your router or manually open the ports.`);
        process.exit();
    });

    if (!await manager.installer.installSteam()) process.exit();
    if (!await manager.installer.installValheim()) process.exit();
    if (!await manager.launcher.generateLauncher()) process.exit();
    if (!await manager.launcher.startValheim()) process.exit();
    await manager.launcher.enableAutoStart();

    // Monitor for commands
}


/////////////////////////////////////////////////
//    Script execution supporting functions    //
/////////////////////////////////////////////////


/**
 * Prompts the user to answer a question in the terminal
 * @param {String} question - The question to display to the user
 * @param {Function<String>} errorCheck - A callback function for validating the users response. 
 * @returns {String} The users validated response
 */
function prompt(question, errorCheck) {
    return new Promise(function(resolve, reject) { 
        rl.question(question + '\n > ', async answer => {
            console.log('');
            if (errorCheck != undefined) {
                const errors = await errorCheck(answer);
                if (errors) {
                    console.log(`There was an error processing that response - ${errors}`);
                    const newResponse = await prompt(question, errorCheck);
                    return resolve(newResponse);
                }
            }
            resolve(answer);
        });
    });
}


/**
 * Works with the user to fill in a valheim manager configuration file
 * @returns {String} The path to the newly created config file
 */
async function setupConfig() {

    // Gather the users preferences
    const saveLocation = await prompt('Where would you like to save this file?', answer => {
        if (!fs.existsSync(path.resolve(answer))) return 'This does not seem to be a valid path.';
    });
    const backupFrequency = await prompt('How often(in minutes) would you like to create backups?', answer => {
        if (isNaN(answer) || answer < 0) return 'This needs to be a number greater than 0.';
    });
    const backupRetention = await prompt('How many backups should be kept at one time?', answer => {
        if (isNaN(answer) || answer < 0) return 'This needs to be a number greater than 0.';
    });
    const worldName = await prompt('What would you like to name the valheim world?', answer => {
        if (answer.length < 1 || answer.length > 20) return 'Try a name between 1 and 20 characters long.';
    });
    const serverName = await prompt('What would you like the server name to be in the server browser?', answer => {
        if (answer.length < 1 || answer.length > 20) return 'Try a name between 1 and 20 characters long.';
    });
    const serverPassword = await prompt('What should the server password be?', answer => {
        if (answer.length < 4 || answer.length > 20) return 'Try a password between 4 and 20 characters long.';
    });
    const serverPort = await prompt('What port should the server use? The default port is 2456.', answer => {
        if (isNaN(answer) || answer < 1024 || answer > 65535) return 'The port should be between 1024 and 65535.';
    });
    const autoOpenPorts = await prompt('Would you like the manager to try automatically opening the ports?', answer => {
        if (!answer.toLowerCase().startsWith('y') && !answer.toLowerCase().startsWith('n')) return 'You need to answer with a yes or a no.';
    });
    const autoRestarts = await prompt('Would you like the manager to automatically restart the server if it stops?', answer => {
        if (!answer.toLowerCase().startsWith('y') && !answer.toLowerCase().startsWith('n')) return 'You need to answer with a yes or a no.';
    });

    // Construct the configuration object
    const config = defaultConfig;
    config.manager.configLocation = path.resolve(saveLocation, 'vmConfig.json');
    config.manager.serverLocation = path.resolve(saveLocation, 'server/');
    config.manager.backupFrequency = Number(backupFrequency);
    config.manager.backupRetention = Number(backupRetention);
    config.manager.autoOpenPorts = autoOpenPorts.toLowerCase().startsWith('y');
    config.manager.autoRestartServer = autoRestarts.toLowerCase().startsWith('y');
    config.launcher.port = Number(serverPort);
    config.launcher.world = worldName;
    config.launcher.name = serverName;
    config.launcher.password = serverPassword;
    config.logging.filePath = path.resolve(saveLocation, 'logs/');

    // Save the file and return the path
    await fs.writeFile(config.manager.configLocation, JSON.stringify(config, undefined, 2));
    return config.manager.configLocation;
}

module.exports.execute = execute;
execute();