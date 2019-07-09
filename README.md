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

### Leave

Select period with no activity.
From all rooms you get select which you're gonna leave, there is an "all" as parameter.
Then confirm or leave this action.
Next you can see how you leave it.

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
