const ora = require('ora');
const sdk = require('matrix-js-sdk');
const {getBaseUrl, getUserId, getRoomsLastUpdate} = require('./utils');

const spinLoginText = 'login with password';
const spinConnectText = 'start matrix client';
const spinSyncText = 'wait for syncing with matrix server\n';

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

        spinner.start(spinConnectText);
        const matrixClient = sdk.createClient({baseUrl, accessToken, userId});
        await matrixClient.startClient({lazyLoadMembers: true});
        spinner.succeed();

        spinner.start(spinSyncText);
        return new Promise((resolve, reject) => {
            matrixClient.on('sync', (state) => {
                // console.log(state);
                if (state === 'SYNCING') {
                    spinner.succeed();
                    resolve(matrixClient);
                }
            });
        });
    } catch (error) {
        spinner.fail();
        console.error(error);
    }
};

const getRooms = async (matrixClient, limit, botName) => {
    const rooms = await matrixClient.getRooms();
    return getRoomsLastUpdate(rooms, limit, botName);
};

const leaveRooms = async (matrixClient, rooms) => {
    // TEST ONLY
    const [expectedRoom] = rooms;
    await Promise.all([expectedRoom]
    // await Promise.all(rooms
        .map(async (data) => {
            await matrixClient.leave(data.roomId);
            console.log('Room successfully leaved "%s"', data.roomName);
        }));

    return;
};

module.exports = {
    leaveRooms,
    getRooms,
    getClient,
};
