#!/usr/bin/env node

const ask = require('../lib/questions');
const chalk = require('chalk');
const logger = require('../lib/logger');
const Service = require('../lib/matrix-service');
const Actions = require('../lib/actions');
const utils = require('../lib/utils');

const select = async (service, actions = new Actions(service, ask)) => {
    const action = await ask.selectAction();
    if (utils.isStopAction(action)) {
        return;
    }
    await actions[action]();

    return select(service, actions);
};

const run = async () => {
    try {
        const options = await ask.options();

        const service = new Service(options);
        await service.getClient();

        await select(service);
        service && service.stop();

        logger.log(chalk.green('\nAll work completed!!!'));
    } catch (err) {
        logger.log(chalk.yellow('Something wrong, please try again'));
    } finally {
        process.exit();
    }
};

run();
