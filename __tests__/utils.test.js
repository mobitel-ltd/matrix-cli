const fake = require('faker');
const {getIgnoreUsers, getLastRealSenderEvent, isLimit} = require('../src/utils');

describe.only('Utils test', () => {
    it('getLastRealSenderEvent', () => {
        const usersArr = ['abc', 'def', 'ghj'];
        const events = [
            {
                getSender: () => 'def',
            },
            {
                expected: true,
                getSender: () => 'def',
            },
        ];
        const res = getLastRealSenderEvent(events, usersArr);
        expect(res).toBeFalsy;
    });

    it('getLastRealSenderEvent', () => {
        const usersArr = ['abc', 'def', 'ghj'];
        const events = [
            {
                getSender: () => '123',
            },
            {
                expected: true,
                getSender: () => '4556',
            },
        ];
        const res = getLastRealSenderEvent(events, usersArr);
        expect(res.expected).toBeTruthy;
    });

    it('getLastRealSenderEvent', () => {
        const events = [
            {
                getSender: () => '123',
            },
            {
                expected: true,
                getSender: () => '4556',
            },
        ];
        const res = getLastRealSenderEvent(events, null);
        expect(res.expected).toBeTruthy;
    });

    it.only('isLimit works with string', () => {
        const elem = '13';
        const res = isLimit(elem);
        expect(res).toBeFalsy();
    });

    for (let index = 0; index < 20; index++) {
        it('expect getIgnoreUsers work correct', () => {
            const input = fake.random.arrayElement(['', undefined, null, NaN, ' ', '        ']);
            const res = getIgnoreUsers(input);
            expect(res).toEqual([]);
        });
    }
});
