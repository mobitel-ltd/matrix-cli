const {prompt, List, BooleanPrompt} = require('enquirer');
const chalk = require('chalk');

const options = () => prompt([
    {
        type: 'input',
        name: 'domain',
        message: chalk.blueBright('What is your matrix domain?'),
    },
    {
        type: 'input',
        name: 'userName',
        message: chalk.blueBright('What is your username?'),
    },
    {
        type: 'password',
        name: 'password',
        message: chalk.blueBright('What is your password?'),
    },
]);

const limitMonths = async (initial) => {
    const result = await prompt({
        type: 'input',
        name: 'limit',
        message: chalk.blueBright('How many months ago from last activity in a room we should kick you?'),
        initial,
        validate(num) {
            return +num > 1 && +num < 13;
        },
    });

    return result.limit;
};

const inputUsers = async () => {
    const prompt = new List({
        name: 'inputUsers',
        message: chalk.blueBright('Input name of users which activities in rooms we ignore (comma or space separated)'),
    });

    const result = await prompt.run();
    return result
        .map(user => user.trim())
        .filter(Boolean);
};

const boolPrompt = question => async () => {
    const message = chalk.blueBright(`${question} Print y/n.`);
    const prompt = new BooleanPrompt({name: 'answer', message});

    return prompt.run();
};

const isShowRooms = boolPrompt('Show all rooms which you want to leave?');
const isLeave = boolPrompt('Do you really want to leave???');
const isShowErrors = boolPrompt('Show all errors?');
const isShowVisibles =
    boolPrompt('Do you want to invite anybody to your known rooms? You will see list of available rooms');
const isInvite = boolPrompt('Do you really want to invite to ALL your rooms???');

const userToInvite = async (service) => {
    const result = await prompt({
        type: 'input',
        name: 'name',
        message: chalk.blueBright('Input user to invite'),
        async validate(name) {
            const user = await service.getUser(name);
            return !!(user);
        },
    });

    const userId = await service.getUser(result.name);

    return userId;
};

module.exports = {
    isShowErrors,
    isLeave,
    isShowRooms,
    options,
    limitMonths,
    inputUsers,
    isShowVisibles,
    isInvite,
    userToInvite,
};
