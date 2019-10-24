[![Maintainability](https://api.codeclimate.com/v1/badges/50893b9daa2a75ec53f6/maintainability)](https://codeclimate.com/github/grigori-gru/matrix-cli/maintainability)
[![Build Status](https://travis-ci.org/grigori-gru/matrix-cli.svg?branch=master)](https://travis-ci.org/grigori-gru/matrix-cli)

# Matrix-cli

Console util to work with [Matrix](https://matrix.org/blog/home/)

## Install

```sh
$ npm i -g matrix-mobitel-cli
```

## Start

```sh
matrix-cli
```

## How it works

Enter your domain in matrix, user name and password. Then choose expected action.

### Get room info

If you select this case, you will see info with amount about:

-   all rooms
-   rooms with only you with many messages
-   rooms with only you with no messages
-   rooms with more than one member with many messages
-   rooms with more than one member with no messages

### Get room id by alias

Input room alias part. For example in `#room_part:matrix.your-domain` you should print `room_part`.
If room exists in your domain, you will see room id. And if not found info about it.

### Leave

Select period with no activity.
From all rooms you get select which you're gonna leave, there is an "all" as parameter.
Then confirm or leave this action.
Next you can see how you leave it.

### Leave empty

If you have rooms where you don't ever have at least one message and only one user inside is you, then it helps you to leave all of them at once.
You can choose save all of them to a file after leaving, if you choose this after finish.

### Invite

Select rooms you need to invite in.
Select user from your freinds you want to invite.
Then confirm or leave this action.
Next you can see how you invite user in.

### Send

Select rooms you need to send message to.
Input message you want to send.
Then confirm or leave this action.
Next you can see how you send message.

### Stop

Helps to leave from menu. The same as `ctrl+c`

## Use as script to send message with options

```
git clone git@github.com:grigori-gru/matrix-cli.git
npm i
npm run start -d <your domain> -u <your username> -p <your password> -r <matrix-room name (only occurrence enough)>  -m <message>
```

or use options in .env:

```
DOMAIN="example.com"
USERNAME="test_user"
PASSWORD="password"
```

and this next:

```
npm run start -r <matrix-room name>  -m <message>
```
