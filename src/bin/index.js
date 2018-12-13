#!/usr/bin/env node

const ask = require('../lib/questions');
const chalk = require('chalk');
const logger = require('../lib/logger');
const Service = require('../lib/matrix-service');
const Actions = require('../lib/actions');

const select = async (service, actions) => {
    const action = await ask.selectAction();
    if (actions.isStopAction(action)) {
        return;
    }
    await actions[action](service);

    return select(service, actions);
};

const run = async () => {
    try {
        const options = await ask.options();

        const service = new Service(options);
        await service.getClient();
        const actions = new Actions(service, ask);

        await select(service, actions);
        service && service.stop();

        logger.log(chalk.green('\nAll work completed!!!'));
    } catch (err) {
        logger.log(chalk.yellow('Something wrong, please try again'));
    } finally {
        process.exit();
    }
};

run();
