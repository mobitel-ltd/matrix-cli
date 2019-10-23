const moment = require('moment');
const Chance = require('chance');
const fake = require('faker');
const delay = require('delay');
const { stub, createStubInstance } = require('sinon');
const { MatrixClient, MatrixEvent, Room } = require('matrix-js-sdk');

const chance = new Chance();
const matrixClientStub = { ...createStubInstance(MatrixClient) };

const accessToken = 'accessToken';
matrixClientStub.on.withArgs('sync').yields('SYNCING');

const ignoreUserName = 'some_user';
const limit = 10;
const correctLength = 10;
const getEvent = period => () => {
    const date = fake.date.between(...period);
    const eventsStub = createStubInstance(MatrixEvent, {
        getType: stub().returns('m.room.message'),
        getTs: stub().returns(new Date(date).getTime()),
        getDate: stub().returns(date),
        getSender: stub().returns(
            fake.random.arrayElement([`@${ignoreUserName}1:matrix`, `@${ignoreUserName}2:matrix`]),
        ),
    });

    return eventsStub;
};

const getRoom = period => () => {
    const roomStub = createStubInstance(Room, {
        getJoinedMembers: stub().returns([
            { userId: `@${'roomMember'}1:matrix` },
            { userId: `@${'roomMember'}1:matrix` },
            { userId: `@${'roomMember'}1:matrix` },
        ]),
    });
    return {
        ...roomStub,
        roomId: fake.random.uuid(),
        name: fake.random.word(),
        timeline: Array.from({ length: 10 }, getEvent(period)),
    };
};

const createRooms = (length, period) => Array.from({ length }, getRoom(period));
const endDate = moment().subtract(limit, 'months');
const startDate = '2017-01-01';

const oldRooms = createRooms(correctLength, [startDate, endDate.subtract(1, 'day').format('YYYY-MM-DD')]);
const newRooms = createRooms(10, [endDate.add(1, 'day').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD')]);

const loginWithPassword = stub().resolves({ access_token: accessToken });
// const leaveStub = stub().rejects(new Error());
const allRooms = [...oldRooms, ...newRooms];
matrixClientStub.getRooms = stub().resolves(allRooms);

matrixClientStub.leave.onFirstCall().rejects(new Error());
matrixClientStub.leave.callsFake(async () => {
    await delay(100);
});

matrixClientStub.invite.callsFake(async () => {
    await delay(100);
});

matrixClientStub.getUser.resolves('@user:matrix.example.com');

const getFakeUser = () => ({
    userId: chance.word({ length: 2 }) + '_' + fake.name.firstName(),
    presence: fake.random.arrayElement(['offline', 'online']),
    presenceStatusMsg: null,
    displayName: fake.name.findName(),
    rawDisplayName: fake.name.findName(),
    avatarUrl: null,
    lastActiveAgo: 0,
    lastPresenceTs: 0,
    currentlyActive: false,
    events: { presence: null, profile: null },
    _modified: 1543825574680,
});

const users = Array.from({ length: 30 }, getFakeUser);

matrixClientStub.getUsers.resolves(users);

const sdkStub = stubClient => ({
    createClient: opts => {
        if (typeof opts === 'string') {
            return stub().returns({ loginWithPassword })(opts);
        }
        return stubClient;
    },
});

module.exports = {
    users,
    allRooms,
    matrixClientStub,
    correctLength,
    sdkStub,
};
