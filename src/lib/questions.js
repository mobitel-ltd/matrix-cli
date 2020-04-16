const { prompt, Input, List, BooleanPrompt, AutoComplete, MultiSelect, Select } = require('enquirer');
const chalk = require('chalk');
const utils = require('./utils');

const enable = (choices, fn) => choices.forEach(ch => (ch.enabled = fn(ch)));

const initialOptions = () =>
    prompt([
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
        {
            type: 'input',
            name: 'eventsCount',
            message: chalk.blueBright('Input events count for syncing'),
            initial: 50,
            validate(num) {
                const eventsCount = Number(num);
                return eventsCount && typeof Number(num) === 'number';
            },
            result: eventsCount => Number(eventsCount),
        },
        {
            type: 'input',
            name: 'ignoreUsers',
            message: chalk.blueBright('Input bot users with trailing comma'),
            initial: 'jira_bot',
            result: data =>
                data
                    .split(',')
                    .map(el => el.trim())
                    .map(el => el.toLowerCase()),
        },
    ]);

const limitMonths = async initial => {
    const result = await prompt({
        type: 'input',
        name: 'limit',
        message: chalk.blueBright('How many months ago from last activity in a room we should kick you?'),
        initial,
        validate(num) {
            const months = Number(num);
            return months > 0 && months < 13;
        },
    });

    return result.limit;
};

const inputOne = async () => {
    const prompt = new Input({
        name: 'inputOne',
        message: chalk.blueBright('Input user id to invite without any tabs'),
    });

    const data = await prompt.run();
    return data.trim();
};

const inputUsers = async () => {
    const prompt = new List({
        name: 'inputUsers',
        message: chalk.blueBright('Input name of users which activities in rooms we ignore (comma separated)'),
    });

    const result = await prompt.run();
    return result.map(user => user.trim()).filter(Boolean);
};

const boolPrompt = question => async () => {
    const message = chalk.blueBright(`${question} Print y/n.`);
    const prompt = new BooleanPrompt({ name: 'answer', message });

    return prompt.run();
};

const isShowRooms = boolPrompt('Show all rooms which you want to leave?');
const isLeave = boolPrompt('Do you really want to leave???');
const isSaveLeavedToFile = boolPrompt('Do you need to save getting rooms to a file???');
const isShowErrors = boolPrompt('Show all errors?');
const isShowVisibles = boolPrompt(
    'Do you want to invite anybody to your known rooms? You will see list of available rooms',
);
const isInvite = boolPrompt('Do you really want to invite to ALL selected rooms???');
const isDeleteAlias = boolPrompt('Do you really want to delete this alias?');
const isPowered = boolPrompt('Do you really want to power user in ALL rooms you are selected???');
const isJoin = boolPrompt('Do you really want to join to ALL rooms you are invited???');
const tryAgainForErrors = boolPrompt('Do you really want to do this command again for    failed rooms???');
const isSend = async message => await boolPrompt(`Do you really want to send ${message} to ALL selected rooms???`)();

const selectUser = async users => {
    const preparedUsers = users.map(user => {
        return typeof user === 'string' ?
            { name: user, message: user } :
            { name: user.userId, message: user.displayName }
    });

    const prompt = new AutoComplete({
        name: 'userId',
        message: chalk.blueBright('Select user'),
        limit: 5,
        choices: preparedUsers,
    });

    return prompt.run();
};

/**
 *
 * @param {Room[]} rooms rooms
 */
const selectRoomByInput = async rooms => {
    const preparedRooms = rooms.map(({ roomName }) => ({ name: roomName, message: roomName }));
    const prompt = new AutoComplete({
        name: 'roomId',
        message: chalk.blueBright('Select room'),
        limit: 5,
        choices: preparedRooms,
    });

    const selected = await prompt.run();

    return rooms.find(({ roomName }) => selected === roomName);
};

/**
 * @return {Promise<'allRooms' | 'singleRoomsManyMessages' | 'singleRoomsNoMessages' | 'manyMembersNoMessages' | 'manyMembersManyMessages'>} return selected strategy
 */
const selectStrategy = async () => {
    const prompt = new Select({
        name: 'action',
        message: chalk.cyan(
            'Select strategy you want to invite user, from all roooms or grouped rooms by messages and users',
        ),
        choices: [
            'allRooms',
            'singleRoomsManyMessages',
            'singleRoomsNoMessages',
            'manyMembersNoMessages',
            'manyMembersManyMessages',
        ],
    });

    return prompt.run();
};

const selectRooms = async rooms => {
    const preparedRooms = rooms.map(({ roomName }) => ({ name: roomName, message: roomName }));
    const prompt = new MultiSelect({
        name: 'rooms',
        message: chalk.blueBright('Select rooms'),
        hint: chalk.blueBright('(Use <space> to select, <return> to submit)'),
        sort: true,
        choices: [
            {
                name: 'all',
                message: chalk.italic('All'),
                onChoice(state, choice, i) {
                    if (state.index === i && choice.enabled) {
                        enable(state.choices, ch => ch.name !== 'none');
                    }
                },
            },
            {
                name: 'none',
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
            { role: 'separator' },
            ...preparedRooms,
        ],
        indicator(state, choice) {
            const style = choice.enabled ? chalk.cyan : chalk.gray;
            return style(state.symbols.indicator);
        },
    });

    const selectedRooms = await prompt.run();

    return rooms.filter(({ roomName }) => selectedRooms.includes(roomName));
};

const inputMessage = () => {
    const prompt = new Input({
        message: 'Input message to send',
        initial: 'message',
    });

    return prompt.run();
};

const selectAction = async () => {
    const prompt = new Select({
        name: 'action',
        message: chalk.cyan('Select action'),
        choices: utils.getActions(),
    });

    const res = await prompt.run();

    return utils.getMethod(res);
};

const inputRoomAlias = () => {
    const prompt = new Input({
        message: 'Input named part of room alias without "#" and ":your.domain"',
        initial: 'message',
    });

    return prompt.run();
};

/**
 * @return {Promise<'existing' | 'print'>} select user way
 */
const selectUserStrategy = () => {
    const prompt = new Select({
        name: 'action',
        message: chalk.cyan('Select user select way'),
        choices: ['existing', 'print'],
    });

    return prompt.run();
};

module.exports = {
    isSaveLeavedToFile,
    isShowErrors,
    isLeave,
    isShowRooms,
    initialOptions,
    limitMonths,
    inputUsers,
    isShowVisibles,
    isInvite,
    selectUser,
    selectRooms,
    selectAction,
    inputMessage,
    isSend,
    inputRoomAlias,
    selectStrategy,
    selectUserStrategy,
    inputOne,
    isJoin,
    tryAgainForErrors,
    isPowered,
    isDeleteAlias,
    selectRoomByInput,
};
