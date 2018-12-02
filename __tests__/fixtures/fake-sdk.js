const moment = require('moment');
const Chance = require('chance');
const fake = require('faker');
const EventEmitter = require('events');
const delay = require('delay');
const {stub} = require('sinon');

const chance = new Chance();
const accessToken = 'accessToken';

const matrixClientStub = new EventEmitter();
matrixClientStub.startClient = () => {
    // console.log('START!!!');
    setTimeout(() => matrixClientStub.emit('sync', 'SYNCING'), 1000);
};
const ignoreUserName = 'some_user';
const limit = 10;
const correctLength = 10;
const getEvent = period => () => {
    const date = fake.date.between(...period);
    return {
        getTs: () => new Date(date).getTime(),
        getDate: () => date,
        getSender: () => fake.random.arrayElement([`@${ignoreUserName}1:matrix`, `@${ignoreUserName}2:matrix`]),
    };
};

const getRoom = period => () => ({
    roomId: fake.random.uuid(),
    name: fake.random.word(),
    timeline: Array.from({length: 10}, getEvent(period)),
});

const createRooms = (length, period) => Array.from({length}, getRoom(period));
const endDate = moment().subtract(limit, 'months');
const startDate = '2017-01-01';

const oldRooms = createRooms(correctLength, [startDate, endDate.subtract(1, 'day').format('YYYY-MM-DD')]);
const newRooms = createRooms(10, [endDate.add(1, 'day').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD')]);

const loginWithPassword = stub().resolves({access_token: accessToken});
// const leaveStub = stub().rejects(new Error());
const leaveStub = stub().onFirstCall().throws(new Error());
const inviteStub = stub();

matrixClientStub.getRooms = stub().resolves([...oldRooms, ...newRooms]);

matrixClientStub.leave = async () => {
    await delay(fake.random.number({min: 1000, max: 2000}));
    // throw new Error();
    return leaveStub;
};
matrixClientStub.getVisibleRooms = stub().resolves(newRooms);
matrixClientStub.invite = async () => {
    await delay(fake.random.number({min: 1000, max: 2000}));
    // throw new Error();
    return inviteStub;
};
matrixClientStub.getUser = stub().resolves('@user:matrix.example.com');
matrixClientStub.stopClient = stub();
const getFakeUser = () => chance.word({length: 2}) + '_' + fake.name.findName();
const users = Array.from({length: 30}, getFakeUser);

matrixClientStub.getUsers = stub().resolves(users);

const sdkStub = {
    createClient: (opts) => {
        if (typeof opts === 'string') {
            return stub().returns({loginWithPassword})(opts);
        }
        return matrixClientStub;
    },
};

module.exports = sdkStub;
