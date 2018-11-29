const {prompt, List} = require('enquirer');

const getOptions = () => prompt([
    {
        type: 'input',
        name: 'domain',
        message: 'What is your matrix domain?',
    },
    {
        type: 'input',
        name: 'username',
        message: 'What is your username?',
    },
    {
        type: 'password',
        name: 'username',
        message: 'What is your password??',
    },
]);

const getLimitMonths = () => prompt({
    type: 'input',
    name: 'limitMonths',
    message: 'How many months ago from last activity in a room we should kick you? 6 months by default',
    initial: 6,
    format: parseInt,
    validate: num => num > 1 && num < 13,
});

const getInputUsers = async () => {
    const prompt = new List({
        type: 'input',
        name: 'inputUsers',
        message: 'Input name of users which activities in rooms we ignore (comma or space separated)',
        initial: null,
        format: parseInt,
    });

    return prompt.run();
};

module.exports = {
    getOptions,
    getLimitMonths,
    getInputUsers,
};
