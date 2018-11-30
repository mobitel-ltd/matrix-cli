const chalk = require('chalk');

module.exports = logger => ({
    printRoomDate: ({roomName, date}) => {
        logger.log('\t-----------------------------------------------------');
        logger.log(chalk.blue('room name              '), chalk.yellow(roomName));
        logger.log(chalk.blue('date of last activity  '), chalk.yellow(date));
    },
    printRoom: ({roomName}) => {
        logger.log('\t-----------------------------------------------------');
        logger.log(chalk.blue('room name              '), chalk.yellow(roomName));
    },
});
