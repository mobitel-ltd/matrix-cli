const ora = require('ora');
const sdk = require('matrix-js-sdk');
const {getBaseUrl, getUserId, getRoomsLastUpdate} = require('./utils');
const Listr = require('listr');

const spinLoginText = 'login with password';
const spinConnectText = 'start matrix client';
const spinSyncText = 'wait for sync with matrix server\n';

const getReadyClient = client => new Promise((resolve, reject) => {
    client.on('sync', (state) => {
        if (state === 'SYNCING') {
            resolve(client);
        }
    });
});

const getClient = async (domain, userName, password) => {
    let spinner;

    try {
        const baseUrl = getBaseUrl(domain);
        const userId = getUserId(userName, domain);
        const client = sdk.createClient(baseUrl);

        spinner = ora(spinLoginText);
        spinner.start();
        const {access_token: accessToken} = await client.loginWithPassword(userId, password);
        spinner.succeed();

        spinner = ora(spinConnectText);
        spinner.start();
        const matrixClient = sdk.createClient({baseUrl, accessToken, userId});
        await matrixClient.startClient({lazyLoadMembers: true});
        spinner.succeed();

        spinner = ora(spinSyncText);
        spinner.start();
        const readyClient = await getReadyClient(matrixClient);
        spinner.succeed();

        return readyClient;
    } catch (error) {
        spinner.fail();
        console.error(error);
        throw error;
    }
};

const getRooms = async (matrixClient, limit, ignoreUsers) => {
    const rooms = await matrixClient.getRooms();
    return getRoomsLastUpdate(rooms, limit, ignoreUsers);
};

const getTask = matrixClient => ({roomId, roomName}) => {
    const title = `Leaving room ${roomName}`;
    const task = () => matrixClient.leave(roomId);

    return {title, task};
};

const leaveRooms = async (matrixClient, rooms) => {
    // TEST ONLY
    // const [expectedRoom] = rooms;
    // const preparedTasks = [expectedRoom].map(getTask(matrixClient));
    try {
        const preparedTasks = rooms.map(getTask(matrixClient));
        const tasks = new Listr(preparedTasks, {concurrent: true, exitOnError: false});

        await tasks.run();
    } catch (err) {
        return err.errors;
    }
};

module.exports = {
    leaveRooms,
    getRooms,
    getClient,
};
