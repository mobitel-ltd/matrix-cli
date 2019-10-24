const { getLastRealSenderEvent } = require('../src/lib/utils');

describe('Utils test', () => {
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
        expect(res).toBeFalsy();
    });

    it('getLastRealSenderEvent return event if real user sent smth', () => {
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
        expect(res.expected).toBeTruthy();
    });

    it('getLastRealSenderEvent return correcy data if no users we put as unexpected', () => {
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
        expect(res.expected).toBeTruthy();
    });
});
