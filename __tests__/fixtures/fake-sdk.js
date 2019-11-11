const moment = require('moment');
const Chance = require('chance');
const fake = require('faker');
const { stub, createStubInstance } = require('sinon');
const { MatrixClient, MatrixEvent, Room } = require('matrix-js-sdk');

const chance = new Chance();
const fakeDomain = fake.random.word();
const mainUserName = fake.random.word();

const accessToken = 'accessToken';

const realUser1 = 'some_user1';
const realUser2 = 'some_user2';
const existsMember = fake.random.arrayElement([realUser1, realUser2]);

const limit = 10;
const correctLength = 10;
const getEvent = (period, bot) => () => {
    const date = fake.date.between(...period);
    const eventsStub = createStubInstance(MatrixEvent, {
        getType: stub().returns('m.room.message'),
        getTs: stub().returns(new Date(date).getTime()),
        getDate: stub().returns(date),
        getSender: stub().returns(
            bot ||
                fake.random.arrayElement([`@${realUser1}:matrix.${fakeDomain}`, `@${realUser2}:matrix.${fakeDomain}`]),
        ),
        getContent: stub().resolves({}),
    });

    return eventsStub;
};

const getMembers = bot => {
    const constantlyMember = [
        {
            userId: fake.random.arrayElement([
                `@${realUser1}:matrix.${fakeDomain}`,
                `@${realUser2}:matrix.${fakeDomain}`,
            ]),
        },
        { userId: `@${mainUserName}:matrix.${fakeDomain}` },
    ];

    return bot ? [{ userId: bot }, ...constantlyMember] : constantlyMember;
};

const getRoom = (period, bot) => () => {
    const roomStub = createStubInstance(Room, {
        getJoinedMembers: stub().returns(getMembers(bot)),
    });

    return {
        ...roomStub,
        roomId: fake.random.uuid(),
        name: fake.random.word(),
        timeline: Array.from({ length: 10 }, getEvent(period, bot)),
    };
};

const createRooms = (length, period, bot) => Array.from({ length }, getRoom(period, bot));
const endDate = moment().subtract(limit, 'months');
const startDate = '2017-01-01';

const loginWithPassword = stub().resolves({ access_token: accessToken });
// const leaveStub = stub().rejects(new Error());

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

const existedAlias = fake.random.word();

const roomId = fake.random.uuid();
const createMatrixClientStub = ignoreUsers => {
    const botId = fake.random.arrayElement(ignoreUsers);

    const matrixClientStub = { ...createStubInstance(MatrixClient) };

    matrixClientStub.on.withArgs('sync').yields('SYNCING');
    matrixClientStub.leave.onFirstCall().rejects(new Error());

    const manyMembersNoMessages = createRooms(
        correctLength,
        [endDate.add(1, 'day').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD')],
        `@${botId}:${fakeDomain}`,
    );

    const oldRooms = createRooms(correctLength, [startDate, endDate.subtract(1, 'day').format('YYYY-MM-DD')]);
    const newRooms = createRooms(correctLength, [
        endDate.add(1, 'day').format('YYYY-MM-DD'),
        moment().format('YYYY-MM-DD'),
    ]);

    const manyMembersManyMessages = [...oldRooms, ...newRooms];
    const allRooms = [...manyMembersManyMessages, ...manyMembersNoMessages];

    matrixClientStub.getUser.resolves('@user:matrix.example.com');
    matrixClientStub.getRooms = stub().resolves(allRooms);
    matrixClientStub.getUsers.resolves(users);
    matrixClientStub.getRoomIdForAlias.throws();
    matrixClientStub.getRoomIdForAlias.withArgs(`#${existedAlias}:matrix.${fakeDomain}`).resolves({ room_id: roomId });

    return {
        matrixClientStub,
        allRooms,
        manyMembersNoMessages,
        manyMembersManyMessages,
    };
};

const sdkStub = stubClient => ({
    createClient: opts => {
        if (typeof opts === 'string') {
            return stub().returns({ loginWithPassword })(opts);
        }

        return stubClient;
    },
});

module.exports = {
    existsMember,
    users,
    createMatrixClientStub,
    correctLength,
    sdkStub,
    roomId,
    existedAlias,
    fakeDomain,
};
