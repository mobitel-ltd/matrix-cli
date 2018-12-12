const {prompt, List, BooleanPrompt, AutoComplete, MultiSelect, Select} = require('enquirer');
const chalk = require('chalk');
const utils = require('./utils');

const enable = (choices, fn) => choices.forEach(ch => (ch.enabled = fn(ch)));

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
const isInvite = boolPrompt('Do you really want to invite to ALL selected rooms???');

const userToInvite = async (users) => {
    const preparedUsers = users.map(({userId, displayName}) => ({name: userId, message: displayName}));
    const prompt = new AutoComplete({
        name: 'userId',
        message: chalk.blueBright('Select user to invite'),
        limit: 5,
        choices: preparedUsers,
    });

    return prompt.run();
};

const selectRoomsToInvite = async (rooms) => {
    const preparedRooms = rooms.map(({roomName}) => ({name: roomName, message: roomName}));
    const prompt = new MultiSelect({
        name: 'rooms',
        message: chalk.blueBright('Do you want to invite anybody to your known rooms?'),
        hint: chalk.blueBright('(Use <space> to select, <return> to submit)'),
        sort: true,
        choices: [
            {name: 'all',
                message: chalk.italic('All'),
                onChoice(state, choice, i) {
                    if (state.index === i && choice.enabled) {
                        enable(state.choices, ch => ch.name !== 'none');
                    }
                },
            },
            {name: 'none',
                message: chalk.italic('None'),
                onChoice(state, choice, i) {
                    if (state.index === i) {
                        if (choice.enabled) {
                            enable(state.choices, ch => ch.name === 'none');
                        }
                    }
                    if (state.keypress && state.keypress.name === 'a') choice.enabled = false;
                    if (state.index !== i && state.choices[state.index].enabled === true) {
                        choice.enabled = false;
                    }
                },
            },
            {role: 'separator'},
            ...preparedRooms,
        ],
        indicator(state, choice) {
            const style = choice.enabled ? chalk.cyan : chalk.gray;
            return style(state.symbols.indicator);
        },
    });

    const selectedRooms = await prompt.run();

    return rooms.filter(({roomName}) => selectedRooms.includes(roomName));
};

const selectAction = () => {
    const prompt = new Select({
        name: 'action',
        message: chalk.cyan('Select action'),
        choices: [utils.getLeaveAction(), utils.getInviteAction(), utils.getStopAction()],
    });

    return prompt.run();
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
    selectRoomsToInvite,
    selectAction,
};
